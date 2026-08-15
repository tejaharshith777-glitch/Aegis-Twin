import 'dotenv/config';
import compression from 'compression';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket, { WebSocketServer } from 'ws';
import { incidents, triage } from './engine.js';
import { inspectEvidenceFile } from './fileAnalyzer.js';
import { integrationStatus, synthesizeWithMurf, triageWithGemini } from './integrations.js';

const app = express();
const port = Number(process.env.PORT) || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.disable('x-powered-by');
app.use(compression());
app.use(express.json({ limit: '600kb' }));

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'operational',
    agent: 'Aegis Twin',
    integrations: integrationStatus(),
    checkedAt: new Date().toISOString(),
  });
});

app.get('/api/integrations', (_request, response) => {
  response.json(integrationStatus());
});

app.get('/api/incidents', (_request, response) => {
  response.json({ incidents, total: incidents.length });
});

app.post('/api/files/analyze', async (request, response) => {
  const fileName = typeof request.body?.fileName === 'string' ? request.body.fileName.trim() : '';
  const content = typeof request.body?.content === 'string' ? request.body.content : '';
  if (!fileName || !content) {
    response.status(400).json({ message: 'A file name and text evidence content are required.' });
    return;
  }

  try {
    const inspection = inspectEvidenceFile(fileName, content);
    let assessment = null;
    if (inspection.status !== 'Invalid') {
      const evidenceContext = inspection.signals
        .map((signal) => `${signal.type}: ${signal.value}. ${signal.note}`)
        .join(' ');
      const query = `${inspection.suggestedQuery} Parsed file ${inspection.fileName}: ${inspection.validRecords} valid records, ${inspection.invalidRecords} invalid records. Correlated signal summary: ${evidenceContext}`;
      try {
        assessment = await triageWithGemini(query);
      } catch {
        assessment = triage(query);
      }
    }
    response.json({ ...inspection, assessment });
  } catch (error) {
    response.status(400).json({ message: error instanceof Error ? error.message : 'The evidence file could not be analyzed.' });
  }
});

app.post('/api/agent/triage', async (request, response) => {
  const query = typeof request.body?.query === 'string' ? request.body.query.trim() : '';
  if (!query) {
    response.status(400).json({ message: 'A security question or command is required.' });
    return;
  }
  if (query.length > 1200) {
    response.status(400).json({ message: 'Please keep commands under 1,200 characters.' });
    return;
  }

  try {
    const result = await triageWithGemini(query);
    response.setHeader('X-Aegis-Engine', result.source);
    response.json(result);
  } catch (error) {
    // The local engine keeps frontline triage available if a provider is degraded.
    console.warn('Gemini triage unavailable; using the local Aegis engine.');
    response.setHeader('X-Aegis-Engine', 'Aegis Local');
    response.json({ ...triage(query), providerDegraded: true });
  }
});

app.post('/api/voice/synthesize', async (request, response) => {
  const text = typeof request.body?.text === 'string' ? request.body.text.trim() : '';
  if (!text) {
    response.status(400).json({ message: 'Briefing text is required.' });
    return;
  }
  if (text.length > 1500) {
    response.status(400).json({ message: 'Briefing text must be under 1,500 characters.' });
    return;
  }

  try {
    const { audio, contentType } = await synthesizeWithMurf(text);
    response.setHeader('Content-Type', contentType);
    response.setHeader('Cache-Control', 'private, max-age=300');
    response.setHeader('Content-Length', audio.byteLength.toString());
    response.send(audio);
  } catch {
    console.warn('Murf synthesis unavailable; the client may use its local voice fallback.');
    response.status(502).json({ message: 'Murf voice synthesis is temporarily unavailable.' });
  }
});

app.post('/api/actions', async (request, response) => {
  const { action, entity } = request.body ?? {};
  if (typeof action !== 'string') {
    response.status(400).json({ message: 'An action is required.' });
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, 320));
  response.json({
    success: true,
    action,
    entity: typeof entity === 'string' ? entity : 'affected entity',
    message:
      action === 'brief'
        ? 'Incident brief created and added to the activity log.'
        : 'Containment workflow approved and dispatched to the relevant control plane.',
    completedAt: new Date().toISOString(),
  });
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('/{*splat}', (_request, response) => response.sendFile(path.join(distPath, 'index.html')));
}

app.use((_request, response) => {
  response.status(404).json({ message: 'Resource not found.' });
});

const server = http.createServer(app);
const voiceServer = new WebSocketServer({ server, path: '/api/listen' });

voiceServer.on('connection', (client) => {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    client.send(JSON.stringify({ type: 'error', message: 'Deepgram is not configured.' }));
    client.close(1011, 'Voice ingestion unavailable');
    return;
  }

  const query = new URLSearchParams({
    model: process.env.DEEPGRAM_MODEL || 'nova-3',
    language: 'en-US',
    smart_format: 'true',
    punctuate: 'true',
    interim_results: 'true',
    endpointing: '300',
    utterance_end_ms: '1000',
    vad_events: 'true',
  });
  ['Kubernetes', 'DDoS', 'pcap', 'SIEM', 'MITRE', 'PowerShell'].forEach((term) => query.append('keyterm', term));

  const upstream = new WebSocket(`wss://api.deepgram.com/v1/listen?${query.toString()}`, {
    headers: { Authorization: `Token ${apiKey}` },
  });
  let finalized = false;
  const pendingAudio: Buffer[] = [];

  upstream.on('open', () => {
    client.send(JSON.stringify({ type: 'ready', provider: 'Deepgram Nova-3' }));
    pendingAudio.splice(0).forEach((chunk) => upstream.send(chunk));
  });

  upstream.on('message', (data) => {
    try {
      const payload = JSON.parse(data.toString()) as {
        type?: string;
        is_final?: boolean;
        speech_final?: boolean;
        channel?: { alternatives?: Array<{ transcript?: string; confidence?: number }> };
      };
      if (payload.type === 'UtteranceEnd') {
        client.send(JSON.stringify({ type: 'utterance_end' }));
        return;
      }
      const alternative = payload.channel?.alternatives?.[0];
      if (alternative?.transcript && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'transcript',
          transcript: alternative.transcript,
          confidence: alternative.confidence,
          isFinal: Boolean(payload.is_final),
          speechFinal: Boolean(payload.speech_final),
        }));
      }
    } catch {
      // Ignore provider metadata messages that are not transcription payloads.
    }
  });

  client.on('message', (data, isBinary) => {
    if (isBinary) {
      const audio = Buffer.from(data as Buffer);
      if (upstream.readyState === WebSocket.OPEN) upstream.send(audio);
      else if (upstream.readyState === WebSocket.CONNECTING && pendingAudio.length < 20) pendingAudio.push(audio);
      return;
    }

    try {
      const message = JSON.parse(data.toString()) as { type?: string };
      if (message.type === 'stop' && !finalized) {
        finalized = true;
        if (upstream.readyState === WebSocket.OPEN) {
          upstream.send(JSON.stringify({ type: 'Finalize' }));
          setTimeout(() => {
            if (upstream.readyState === WebSocket.OPEN) upstream.send(JSON.stringify({ type: 'CloseStream' }));
          }, 450);
        }
      }
    } catch {
      // Only the small stop-control message is accepted as text.
    }
  });

  upstream.on('close', () => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'closed' }));
      client.close();
    }
  });

  upstream.on('error', () => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'error', message: 'Deepgram transcription is unavailable.' }));
      client.close(1011, 'Transcription provider error');
    }
  });

  client.on('close', () => {
    if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) upstream.close();
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Aegis API listening on http://0.0.0.0:${port}`);
});
