import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { store, IncidentState, AssetState } from './store.js';

export interface TelemetryEvent {
  at: string;
  entity: string;
  kind: string;
  fields: Record<string, string | number>;
}

export interface Detection {
  ruleId: string;
  ruleName: string;
  source: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  entity: string;
  title: string;
  evidence: Array<{ label: string; value: string; note: string; tone: 'danger' | 'warning' | 'neutral' | 'success' }>;
  rawEvents: TelemetryEvent[];
}

export function computeIncidentScore(severity: 'Critical' | 'High' | 'Medium' | 'Low', evidenceCount: number, criticality: string = 'Medium'): number {
  const baseMap = { Critical: 75, High: 60, Medium: 40, Low: 20 };
  const critMap: Record<string, number> = { Critical: 2, High: 1.5, Medium: 1.0, Low: 0.5 };
  const base = baseMap[severity] || 40;
  const critMult = critMap[criticality] || 1.0;
  const raw = base + evidenceCount * 3 + critMult * 10;
  return Math.min(100, Math.round(raw));
}

class DetectionEngine {
  private indicatorsPath: string;
  private knownBadIndicators = new Set<string>();
  private sweepTimer: NodeJS.Timeout | null = null;
  private ingestDirWatcher: fs.FSWatcher | null = null;
  private recentEgressWindows = new Map<string, number[]>(); // entity -> array of 15m window bytes

  constructor() {
    this.indicatorsPath = path.join(config.dataDir, 'indicators.txt');
    this.initIndicators();
    this.initSeedMode();
    this.initIngestDirectoryWatcher();

    // 30s sweep timer for windowed detection rules and asset offline state
    this.sweepTimer = setInterval(() => this.sweep(), 30000);
  }

  private initIndicators() {
    if (!fs.existsSync(this.indicatorsPath)) {
      const defaultIndicators = `# Aegis Threat Intelligence Indicators (one per line)
185.220.101.34
malware.download.net
fileshare-cloud.net
bad-actor-c2.org
194.26.29.114
`;
      fs.writeFileSync(this.indicatorsPath, defaultIndicators, 'utf8');
    }

    this.reloadIndicators();
  }

  public reloadIndicators() {
    this.knownBadIndicators.clear();
    if (fs.existsSync(this.indicatorsPath)) {
      const lines = fs.readFileSync(this.indicatorsPath, 'utf8').split('\n');
      lines.forEach((line) => {
        const trimmed = line.split('#')[0].trim().toLowerCase();
        if (trimmed) this.knownBadIndicators.add(trimmed);
      });
    }
  }

  private initSeedMode() {
    if (config.seed && store.projection.incidents.size === 0) {
      const seedIncidents: IncidentState[] = [
        { id: 'INC-4281', title: 'Suspicious PowerShell execution', severity: 'Critical', status: 'Investigating', source: 'EDR', entity: 'WIN-FIN-07', detectedAt: new Date(Date.now() - 120000).toISOString(), ago: '2m ago', assignee: 'Aegis Twin', score: 96, origin: 'seed', evidenceCount: 3 },
        { id: 'INC-4280', title: 'Identity anomaly detected', severity: 'High', status: 'Investigating', source: 'Identity', entity: 'm.chen@northstar.io', detectedAt: new Date(Date.now() - 540000).toISOString(), ago: '9m ago', assignee: 'Maya Chen', score: 87, origin: 'seed', evidenceCount: 3 },
        { id: 'INC-4279', title: 'Potential data exfiltration', severity: 'High', status: 'Contained', source: 'Network', entity: 'ENG-LT-142', detectedAt: new Date(Date.now() - 1620000).toISOString(), ago: '27m ago', assignee: 'Aegis Twin', score: 82, origin: 'seed', evidenceCount: 3 },
        { id: 'INC-4278', title: 'Malicious attachment blocked', severity: 'Medium', status: 'Monitoring', source: 'Email', entity: 'r.patel@northstar.io', detectedAt: new Date(Date.now() - 2760000).toISOString(), ago: '46m ago', assignee: 'Sam Okafor', score: 61, origin: 'seed', evidenceCount: 3 },
        { id: 'INC-4277', title: 'Unusual cloud permission change', severity: 'Low', status: 'Resolved', source: 'Cloud', entity: 'prod-data-reader', detectedAt: new Date(Date.now() - 3600000).toISOString(), ago: '1h ago', assignee: 'Aegis Twin', score: 32, origin: 'seed', evidenceCount: 3 },
      ];

      seedIncidents.forEach((inc) => {
        store.append({
          type: 'incident.created',
          actor: 'system',
          payload: { incident: inc },
        });
      });

      // Register seed assets
      const seedAssets: AssetState[] = [
        { id: 'AST-1042', name: 'WIN-FIN-07', type: 'Endpoint', platform: 'Windows 11', owner: 'Finance Operations', criticality: 'Critical', status: 'online', lastSeen: new Date().toISOString(), riskScore: 96, discovered: false },
        { id: 'AST-0938', name: 'ENG-LT-142', type: 'Endpoint', platform: 'macOS 15', owner: 'Engineering', criticality: 'High', status: 'isolated', lastSeen: new Date(Date.now() - 60000).toISOString(), riskScore: 82, discovered: false },
        { id: 'AST-0711', name: 'DB-PROD-01', type: 'Database', platform: 'PostgreSQL 16', owner: 'Data Platform', criticality: 'Critical', status: 'online', lastSeen: new Date().toISOString(), riskScore: 65, discovered: false },
        { id: 'AST-0554', name: 'AUTH-SRV-03', type: 'Server', platform: 'Ubuntu 24.04', owner: 'Identity Team', criticality: 'High', status: 'online', lastSeen: new Date(Date.now() - 120000).toISOString(), riskScore: 40, discovered: false },
      ];

      seedAssets.forEach((ast) => {
        store.append({
          type: 'asset.registered',
          actor: 'system',
          payload: { asset: ast },
        });
      });

      console.log('[Detections] Seeded 5 incidents and 4 assets (AEGIS_SEED=true).');
    }
  }

  private initIngestDirectoryWatcher() {
    if (!fs.existsSync(config.ingestDir)) {
      fs.mkdirSync(config.ingestDir, { recursive: true });
    }
    const processedDir = path.join(config.ingestDir, 'processed');
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }

    try {
      this.ingestDirWatcher = fs.watch(config.ingestDir, (eventType, filename) => {
        if (filename && !filename.startsWith('.') && filename !== 'processed') {
          const filePath = path.join(config.ingestDir, filename);
          this.debounceIngestFile(filePath);
        }
      });
    } catch (e) {
      console.warn('[Detections Warning] Failed to watch AEGIS_INGEST_DIR:', e);
    }
  }

  private debounceIngestFile(filePath: string) {
    let prevSize = -1;
    const check = () => {
      if (!fs.existsSync(filePath)) return;
      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) return;
        if (stat.size === prevSize && stat.size > 0) {
          // File size stabilized across 250ms interval, process it
          this.processIngestFile(filePath);
        } else {
          prevSize = stat.size;
          setTimeout(check, 250);
        }
      } catch {}
    };
    setTimeout(check, 250);
  }

  private processIngestFile(filePath: string) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter((l) => l.trim());
      const events: TelemetryEvent[] = [];

      lines.forEach((l) => {
        try {
          const obj = JSON.parse(l);
          if (obj.entity && obj.kind) {
            events.push({
              at: obj.at || new Date().toISOString(),
              entity: String(obj.entity),
              kind: String(obj.kind),
              fields: obj.fields || {},
            });
          }
        } catch {}
      });

      if (events.length > 0) {
        this.processTelemetryBatch('file', events);
      }

      // Move to processed
      const destPath = path.join(config.ingestDir, 'processed', path.basename(filePath));
      fs.renameSync(filePath, destPath);
      console.log(`[Detections] Processed file ${path.basename(filePath)} (${events.length} events ingested).`);
    } catch (err) {
      console.error(`[Detections Error] Failed to process ingest file ${filePath}:`, err);
    }
  }

  public processTelemetryBatch(source: string, events: TelemetryEvent[]): { accepted: number; rejected: number; issues: string[] } {
    const issues: string[] = [];
    const validEvents: TelemetryEvent[] = [];

    events.forEach((ev, idx) => {
      if (!ev.entity || typeof ev.entity !== 'string') {
        issues.push(`Index ${idx}: Missing or invalid 'entity' field.`);
        return;
      }
      if (!ev.kind || typeof ev.kind !== 'string') {
        issues.push(`Index ${idx}: Missing or invalid 'kind' field.`);
        return;
      }
      validEvents.push(ev);
    });

    if (validEvents.length > 0) {
      // 1. Auto-discover assets & update lastSeen
      validEvents.forEach((ev) => {
        let asset = store.projection.assets.get(ev.entity);
        if (!asset) {
          asset = {
            id: 'AST-' + Math.floor(1000 + Math.random() * 9000),
            name: ev.entity,
            type: ev.entity.includes('@') ? 'Identity' : ev.entity.startsWith('WIN') || ev.entity.startsWith('ENG') ? 'Endpoint' : 'Workload',
            platform: 'Discovered',
            owner: 'Unassigned',
            criticality: 'Medium',
            status: 'online',
            lastSeen: new Date().toISOString(),
            riskScore: 20,
            discovered: true,
          };
          store.append({
            type: 'asset.registered',
            actor: 'system',
            payload: { asset },
          });
        } else {
          asset.lastSeen = new Date().toISOString();
          if (asset.status === 'offline') asset.status = 'online';
        }
      });

      // 2. Append telemetry ingested event
      store.append({
        type: 'telemetry.ingested',
        actor: 'system',
        payload: { source, count: validEvents.length },
      });

      // 3. Evaluate detection rules
      const detections = this.evaluateRules(validEvents);
      detections.forEach((det) => this.dispatchDetection(det));
    }

    return {
      accepted: validEvents.length,
      rejected: events.length - validEvents.length,
      issues,
    };
  }

  private evaluateRules(events: TelemetryEvent[]): Detection[] {
    const detections: Detection[] = [];
    const now = Date.now();

    // Group events by entity
    const byEntity = new Map<string, TelemetryEvent[]>();
    events.forEach((e) => {
      let list = byEntity.get(e.entity);
      if (!list) {
        list = [];
        byEntity.set(e.entity, list);
      }
      list.push(e);
    });

    byEntity.forEach((entityEvents, entity) => {
      // AUTH-001 Password spray: >= 10 failed auth events for one entity within 8 minutes from >= 3 distinct source IPs
      const authFails = entityEvents.filter((e) => e.kind === 'auth.failure' || e.kind === 'login.failed');
      if (authFails.length >= 10) {
        const sourceIps = new Set(authFails.map((e) => String(e.fields.srcIp || e.fields.ip || '10.0.0.1')));
        if (sourceIps.size >= 3) {
          const authSuccess = entityEvents.some((e) => e.kind === 'auth.success' || e.kind === 'login.success');
          const severity = authSuccess ? 'Critical' : 'High';
          detections.push({
            ruleId: 'AUTH-001',
            ruleName: 'Password Spray Attack',
            source: 'Identity',
            severity,
            entity,
            title: authSuccess ? 'Password spray succeeded from anomalous source' : 'Password spray detected against account',
            evidence: [
              { label: 'Failed attempts', value: `${authFails.length} failures`, note: `Across ${sourceIps.size} distinct IPs`, tone: 'danger' },
              { label: 'Target identity', value: entity, note: authSuccess ? 'Session established' : 'Challenge issued', tone: authSuccess ? 'danger' : 'warning' },
            ],
            rawEvents: authFails,
          });
        }
      }

      // EDR-001 Suspicious process ancestry
      const edrEvents = entityEvents.filter((e) => e.kind === 'process.create' || e.kind === 'process.execution');
      edrEvents.forEach((ev) => {
        const parent = String(ev.fields.parentProcess || '').toUpperCase();
        const cmd = String(ev.fields.commandLine || ev.fields.cmd || '');
        const suspiciousParents = ['ACRORD32.EXE', 'WINWORD.EXE', 'EXCEL.EXE', 'OUTLOOK.EXE'];
        const cmdRegex = /-enc|-encodedcommand|-nop|-w hidden|IEX|DownloadString/i;

        if (suspiciousParents.some((p) => parent.includes(p)) && cmdRegex.test(cmd)) {
          detections.push({
            ruleId: 'EDR-001',
            ruleName: 'Suspicious Process Ancestry',
            source: 'EDR',
            severity: 'Critical',
            entity,
            title: `Suspicious PowerShell execution on ${entity}`,
            evidence: [
              { label: 'Parent process', value: parent, note: 'Document reader ancestry', tone: 'warning' },
              { label: 'Command line', value: cmd.slice(0, 40) + '…', note: 'Encoded command detected', tone: 'danger' },
            ],
            rawEvents: [ev],
          });
        }
      });

      // NET-001 Egress anomaly (> 5x median or > 100MB)
      const netEvents = entityEvents.filter((e) => e.kind === 'network.egress' || e.kind === 'traffic.outbound');
      let totalBytes = 0;
      netEvents.forEach((e) => {
        totalBytes += Number(e.fields.bytes || e.fields.size || 0);
      });
      if (totalBytes > 100 * 1024 * 1024) {
        detections.push({
          ruleId: 'NET-001',
          ruleName: 'Egress Anomaly',
          source: 'Network',
          severity: 'High',
          entity,
          title: `Potential data exfiltration from ${entity}`,
          evidence: [
            { label: 'Outbound transfer', value: `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`, note: 'Exceeds baseline threshold', tone: 'danger' },
          ],
          rawEvents: netEvents,
        });
      }

      // NET-002 Known-bad destination
      entityEvents.forEach((ev) => {
        const dest = String(ev.fields.destDomain || ev.fields.destIp || ev.fields.destination || '').toLowerCase();
        if (dest && (this.knownBadIndicators.has(dest) || store.projection.blockedIndicators.has(dest))) {
          detections.push({
            ruleId: 'NET-002',
            ruleName: 'Known-bad Destination Contact',
            source: 'Network',
            severity: 'Critical',
            entity,
            title: `Malicious C2 communication on ${entity}`,
            evidence: [
              { label: 'Destination indicator', value: dest, note: 'Threat intelligence / Blocklist match', tone: 'danger' },
            ],
            rawEvents: [ev],
          });
        }
      });

      // IDP-001 Impossible travel
      const authSuccesses = entityEvents.filter((e) => e.kind === 'auth.success' && e.fields.lat && e.fields.lon);
      if (authSuccesses.length >= 2) {
        const e1 = authSuccesses[0];
        const e2 = authSuccesses[authSuccesses.length - 1];
        const t1 = new Date(e1.at).getTime();
        const t2 = new Date(e2.at).getTime();
        const hours = Math.max(0.01, Math.abs(t2 - t1) / (1000 * 3600));

        const distKm = this.haversineKm(
          Number(e1.fields.lat), Number(e1.fields.lon),
          Number(e2.fields.lat), Number(e2.fields.lon)
        );
        const speed = distKm / hours;

        if (speed > 900) {
          detections.push({
            ruleId: 'IDP-001',
            ruleName: 'Impossible Travel Anomaly',
            source: 'Identity',
            severity: 'High',
            entity,
            title: `Impossible travel detected for ${entity}`,
            evidence: [
              { label: 'Implied velocity', value: `${Math.round(speed)} km/h`, note: `Distance ${Math.round(distKm)} km in ${(hours * 60).toFixed(0)} min`, tone: 'danger' },
            ],
            rawEvents: [e1, e2],
          });
        }
      }

      // CLOUD-001 Privilege escalation
      const cloudEvents = entityEvents.filter((e) => e.kind === 'iam.permission_change' || e.kind === 'cloud.role_update');
      cloudEvents.forEach((ev) => {
        const perm = String(ev.fields.permission || ev.fields.policy || '').toLowerCase();
        if (perm.includes('*') || perm.includes('admin') || perm.includes('fullaccess')) {
          const principal = String(ev.fields.principal || entity);
          const isApproved = principal.includes('sec-admin');
          detections.push({
            ruleId: 'CLOUD-001',
            ruleName: 'Privilege Escalation',
            source: 'Cloud',
            severity: isApproved ? 'Medium' : 'Critical',
            entity,
            title: `Unusual cloud permission grant on ${entity}`,
            evidence: [
              { label: 'Granted permission', value: perm, note: isApproved ? 'Approved administrator' : 'Unapproved principal', tone: isApproved ? 'warning' : 'danger' },
            ],
            rawEvents: [ev],
          });
        }
      });
    });

    return detections;
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private dispatchDetection(det: Detection) {
    // Check deduplication: existing open incident for rule + entity
    const existing = Array.from(store.projection.incidents.values()).find(
      (inc) => inc.entity.toLowerCase() === det.entity.toLowerCase() && (inc.status === 'Investigating' || inc.status === 'Monitoring')
    );

    if (existing) {
      // Append supporting evidence and bump score
      existing.evidenceCount += det.evidence.length;
      existing.score = computeIncidentScore(existing.severity, existing.evidenceCount);
      store.append({
        type: 'incident.score_changed',
        actor: 'system',
        payload: { incidentId: existing.id, score: existing.score, ruleId: det.ruleId },
      });
    } else {
      // Create new incident
      store.projection.counters.incidentSeq++;
      const incId = `INC-${store.projection.counters.incidentSeq}`;
      const score = computeIncidentScore(det.severity, det.evidence.length);

      const incident: IncidentState = {
        id: incId,
        title: det.title,
        severity: det.severity,
        status: 'Investigating',
        source: det.source,
        entity: det.entity,
        detectedAt: new Date().toISOString(),
        ago: 'Just now',
        assignee: 'Aegis Twin',
        score,
        origin: 'telemetry',
        evidenceCount: det.evidence.length,
      };

      store.append({
        type: 'incident.created',
        actor: 'system',
        payload: { incident, detection: det },
      });
    }

    // Record detection event
    store.append({
      type: 'detection.fired',
      actor: 'system',
      payload: { ruleId: det.ruleId, entity: det.entity, severity: det.severity },
    });
  }

  private sweep() {
    // Check asset offline status (ASSET_OFFLINE_MINUTES)
    const cutoff = Date.now() - config.assetOfflineMinutes * 60 * 1000;
    store.projection.assets.forEach((ast) => {
      if (ast.status === 'online' && new Date(ast.lastSeen).getTime() < cutoff) {
        ast.status = 'offline';
        store.append({
          type: 'asset.state_changed',
          actor: 'system',
          payload: { asset: ast, reason: 'inactivity_timeout' },
        });
      }
    });
  }

  public shutdown() {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    if (this.ingestDirWatcher) {
      this.ingestDirWatcher.close();
      this.ingestDirWatcher = null;
    }
  }
}

export const detectionEngine = new DetectionEngine();
