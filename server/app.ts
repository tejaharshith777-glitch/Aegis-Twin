/**
 * server/app.ts
 * Express application — all routes, middleware, and rate limiting.
 * Exported for both the local HTTP server (server/index.ts) and
 * the Vercel serverless handler (api/server.ts).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import express, { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { config } from './config.js';
import { store, AegisEvent } from './store.js';
import { detectionEngine, TelemetryEvent } from './detections.js';
import { executeAction } from './actions.js';
import { generateMarkdownReport } from './report.js';
import { triageWithGemini, synthesizeWithMurf, integrationStatus } from './integrations.js';
import { parseEvidenceFile } from './fileAnalyzer.js';

export const app = express();
app.use(compression());
app.use(express.json({ limit: '2mb' }));

if (config.trustProxy) {
  app.set('trust proxy', 1);
}

/* ── Security Headers ──────────────────────────────────────────────────── */
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; connect-src 'self' ws: wss: https:; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval';"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'microphone=(self)');
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

/* ── Structured Logging ───────────────────────────────────────────────── */
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = crypto.randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'info',
        msg: `${req.method} ${req.path}`,
        requestId,
        route: req.path,
        status: res.statusCode,
        durationMs,
      })
    );
  });
  next();
});

/* ── Token-Bucket Rate Limiter ────────────────────────────────────────── */
const rateBucket = new Map<string, { tokens: number; lastRefill: number }>();

function checkRateLimit(
  key: string,
  capacity: number,
  refillPerMin: number
): { allowed: boolean; retryAfterS: number } {
  const now = Date.now();
  let bucket = rateBucket.get(key);
  if (!bucket) {
    bucket = { tokens: capacity, lastRefill: now };
    rateBucket.set(key, bucket);
  }

  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * (refillPerMin / 60));
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, retryAfterS: 0 };
  }

  const retryAfterS = Math.ceil((1 - bucket.tokens) / (refillPerMin / 60));
  return { allowed: false, retryAfterS };
}

function rateLimitMiddleware(bucketName: string, capacity: number, refillPerMin: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientKey = `${bucketName}:${req.ip}`;
    const result = checkRateLimit(clientKey, capacity, refillPerMin);
    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfterS.toString());
      res
        .status(429)
        .json({ error: 'Too many requests. Please slow down.', retryAfter: result.retryAfterS });
      return;
    }
    next();
  };
}

/* ── Operator Session ─────────────────────────────────────────────────── */
function getOperatorNameFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/aegis_session=([^;]+)/);
  const token = match ? match[1] : (req.headers['x-operator-token'] as string);
  if (!token) return null;
  return config.operatorTokens.get(token) || null;
}

function requireOperatorSession(req: Request, res: Response, next: NextFunction) {
  const name = getOperatorNameFromRequest(req);
  if (!name && !config.openRead) {
    res.status(401).json({ error: 'Operator authentication required.', code: 'UNAUTHORIZED' });
    return;
  }
  (req as any).operatorName = name || 'operator';
  next();
}

/* ── Session Endpoints ────────────────────────────────────────────────── */
app.post('/api/session', (req: Request, res: Response) => {
  const token = req.body?.token;
  if (!token || !config.operatorTokens.has(token)) {
    res.status(401).json({ error: 'Invalid operator token.' });
    return;
  }
  const name = config.operatorTokens.get(token)!;
  res.cookie('aegis_session', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: req.secure,
    maxAge: 7 * 24 * 3600 * 1000,
  });
  res.json({ ok: true, name });
});

app.get('/api/session', (req: Request, res: Response) => {
  const name = getOperatorNameFromRequest(req);
  res.json({ name: name || 'operator', authenticated: Boolean(name) });
});

/* ── Telemetry Ingestion ──────────────────────────────────────────────── */
app.post(
  '/api/telemetry/ingest',
  rateLimitMiddleware('ingest', 120, 120),
  (req: Request, res: Response) => {
    const events = req.body?.events;
    const source = req.body?.source || 'api';

    if (!Array.isArray(events) || events.length === 0) {
      res.status(400).json({ error: 'Payload must contain a non-empty array of events.' });
      return;
    }
    if (events.length > 1000) {
      res.status(400).json({ error: 'Batch limit exceeded. Maximum 1,000 events per request.' });
      return;
    }

    const result = detectionEngine.processTelemetryBatch(source, events as TelemetryEvent[]);
    res.json(result);
  }
);

/* ── Assets API ───────────────────────────────────────────────────────── */
app.get('/api/assets', (_req: Request, res: Response) => {
  const assets = Array.from(store.projection.assets.values());
  res.json({ assets });
});

app.post('/api/assets', requireOperatorSession, (req: Request, res: Response) => {
  const { id, name, type, platform, owner, criticality } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Asset name is required.' });
    return;
  }

  const asset = {
    id: id || 'AST-' + Math.floor(1000 + Math.random() * 9000),
    name,
    type: type || 'Endpoint',
    platform: platform || 'Linux',
    owner: owner || 'Operations',
    criticality: criticality || 'Medium',
    status: 'online' as const,
    lastSeen: new Date().toISOString(),
    riskScore: 20,
    discovered: false,
  };

  store.append({ type: 'asset.registered', actor: 'operator', payload: { asset } });
  res.json({ ok: true, asset });
});

/* ── Incidents API ────────────────────────────────────────────────────── */
app.get('/api/incidents', (_req: Request, res: Response) => {
  const incidents = Array.from(store.projection.incidents.values());
  res.json({ incidents });
});

/* ── Actions API ──────────────────────────────────────────────────────── */
app.post(
  '/api/actions',
  requireOperatorSession,
  rateLimitMiddleware('actions', 30, 30),
  async (req: Request, res: Response) => {
    const { caseId, action, target, idempotencyKey } = req.body;
    const approvedBy = (req as any).operatorName || 'operator';

    if (!action || !target || !target.value) {
      res.status(400).json({ error: 'action and target.value are required.' });
      return;
    }

    const result = await executeAction({
      caseId,
      action,
      target,
      approvedBy,
      idempotencyKey: idempotencyKey || (req.headers['idempotency-key'] as string) || '',
    });

    if (!result.ok) {
      res.status(502).json({ error: result.message, caseId });
      return;
    }

    res.json(result);
  }
);

/* ── Agent Triage API ─────────────────────────────────────────────────── */
app.post(
  '/api/agent/triage',
  rateLimitMiddleware('triage', 20, 20),
  async (req: Request, res: Response) => {
    const query = req.body?.query;
    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: 'query parameter is required.' });
      return;
    }
    if (query.length > 1200) {
      res.status(400).json({ error: 'Query length exceeds 1,200 character limit.' });
      return;
    }

    const operator = getOperatorNameFromRequest(req) || 'operator';
    const startTime = Date.now();
    const result = await triageWithGemini(query);
    const triageMs = Date.now() - startTime;

    store.projection.counters.caseSeq++;
    const caseId = `CASE-${store.projection.counters.caseSeq}`;

    const caseData = {
      caseId,
      openedAt: new Date().toISOString(),
      query,
      transcriptSource: 'typed' as const,
      operator,
      result,
      timings: { totalMs: triageMs, triageMs },
      incidentId: result.incident?.id,
      status: 'open' as const,
      timeline: [
        {
          at: new Date().toISOString(),
          stage: 'case.opened',
          actor: 'operator' as const,
          engine: result.source,
          latencyMs: triageMs,
          detail: `Triage performed via ${result.source}`,
        },
      ],
    };

    store.append({ type: 'case.opened', actor: 'operator', caseId, payload: { case: caseData } });
    res.json({ ...result, caseId });
  }
);

/* ── Cases & Reports API ──────────────────────────────────────────────── */
app.get('/api/cases', (_req: Request, res: Response) => {
  const cases = Array.from(store.projection.cases.values()).reverse();
  res.json({ cases });
});

app.get('/api/cases/:id', (req: Request, res: Response) => {
  const c = store.projection.cases.get(req.params.id as string);
  if (!c) { res.status(404).json({ error: 'Case not found.' }); return; }
  res.json(c);
});

app.get('/api/cases/:id/report.md', (req: Request, res: Response) => {
  const c = store.projection.cases.get(req.params.id as string);
  if (!c) { res.status(404).json({ error: 'Case not found.' }); return; }
  const markdown = generateMarkdownReport(c);
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="${c.caseId}_report.md"`);
  res.send(markdown);
});

app.get('/api/cases/:id/report.json', (req: Request, res: Response) => {
  const c = store.projection.cases.get(req.params.id as string);
  if (!c) { res.status(404).json({ error: 'Case not found.' }); return; }
  res.json(c);
});

/* ── Evidence File Analyzer ───────────────────────────────────────────── */
app.post('/api/files/analyze', rateLimitMiddleware('file', 10, 10), async (req: Request, res: Response) => {
  const { fileName, content } = req.body;
  if (!fileName || !content) {
    res.status(400).json({ error: 'fileName and content are required.' });
    return;
  }
  const inspection = parseEvidenceFile(fileName, content);
  store.append({
    type: 'evidence.analyzed',
    actor: 'operator',
    payload: { fileName: inspection.fileName, signalsCount: inspection.signals.length },
  });
  res.json(inspection);
});

/* ── Audio Voice Synthesis ────────────────────────────────────────────── */
app.post('/api/voice/synthesize', rateLimitMiddleware('voice', 10, 10), async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) { res.status(400).json({ error: 'text parameter is required.' }); return; }
  try {
    const { audio, contentType } = await synthesizeWithMurf(text);
    res.setHeader('Content-Type', contentType);
    res.send(audio);
  } catch (err: any) {
    res.status(502).json({ error: err.message || 'Murf synthesis failed.' });
  }
});

/* ── Metrics API ──────────────────────────────────────────────────────── */
app.get('/api/metrics', (_req: Request, res: Response) => {
  const incidents = Array.from(store.projection.incidents.values());
  const assets = Array.from(store.projection.assets.values());

  const openIncidents = incidents.filter((i) => i.status === 'Investigating' || i.status === 'Monitoring').length;
  const criticalCount = incidents.filter((i) => i.severity === 'Critical' && i.status !== 'Resolved').length;

  const assetsTotal = assets.length;
  const assetsReporting = assets.filter((a) => a.status === 'online' || a.status === 'isolated').length;
  const coveragePct = assetsTotal > 0 ? Math.round((assetsReporting / assetsTotal) * 1000) / 10 : 99.5;

  const scores = incidents.filter((i) => i.status !== 'Resolved').map((i) => i.score);
  const riskIndex = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 28;
  const riskTrend7d = [42, 38, 35, 34, 31, 29, riskIndex];

  const providerStatsObj: Record<string, any> = {};
  store.projection.providerStats.forEach((val, key) => {
    const p50 = val.latenciesMs.length > 0 ? val.latenciesMs[Math.floor(val.latenciesMs.length / 2)] : 0;
    providerStatsObj[key] = { calls: val.calls, failures: val.failures, p50LatencyMs: p50, lastError: val.lastError || null };
  });

  res.json({
    openIncidents,
    criticalCount,
    signalsAnalyzed24h: store.projection.counters.telemetry24hCount,
    meanTimeToTriageMs: 102000,
    meanTimeToContainMs: 240000,
    controlHealthPct: 98.7,
    assetsTotal,
    assetsReporting,
    coveragePct,
    riskIndex,
    riskTrend7d,
    providerStats: providerStatsObj,
  });
});

/* ── System Health API ────────────────────────────────────────────────── */
app.get('/api/health', async (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    uptimeS: Math.floor(process.uptime()),
    eventCount: store.projection.seq,
    integrations: integrationStatus(),
  });
});

/* ── Server-Sent Events (SSE) ─────────────────────────────────────────── */
app.get('/api/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const listener = (event: AegisEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  store.projection.listeners.push(listener);

  req.on('close', () => {
    const idx = store.projection.listeners.indexOf(listener);
    if (idx !== -1) store.projection.listeners.splice(idx, 1);
  });
});

/* ── Static Assets (production local server only) ─────────────────────── */
const distDir = path.resolve('./dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*path', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distDir, 'index.html'));
    }
  });
}

export default app;
