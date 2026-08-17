import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from './config.js';

export type EventActor = 'operator' | 'aegis' | 'system';

export interface AegisEvent {
  seq: number;
  id: string;
  at: string;
  type: string;
  actor: EventActor;
  caseId?: string;
  payload: Record<string, any>;
}

export interface IncidentState {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Investigating' | 'Contained' | 'Monitoring' | 'Resolved';
  source: string;
  entity: string;
  detectedAt: string;
  ago: string;
  assignee: string;
  score: number;
  origin: 'seed' | 'telemetry' | 'manual';
  evidenceCount: number;
}

export interface AssetState {
  id: string;
  name: string;
  type: string;
  platform: string;
  owner: string;
  criticality: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'online' | 'offline' | 'isolated';
  lastSeen: string;
  riskScore: number;
  discovered: boolean;
}

export interface CaseState {
  caseId: string;
  openedAt: string;
  closedAt?: string;
  query: string;
  transcriptSource: 'deepgram' | 'browser' | 'typed' | 'file';
  operator: string;
  result: any;
  timings: { totalMs: number; triageMs: number; voiceMs?: number };
  incidentId?: string;
  status: 'open' | 'action_in_flight' | 'contained' | 'closed';
  timeline: Array<{
    at: string;
    stage: string;
    actor: EventActor;
    engine: string;
    latencyMs?: number;
    detail: string;
    enforcementId?: string;
  }>;
}

export interface ProviderStat {
  calls: number;
  failures: number;
  parseFailures: number;
  latenciesMs: number[];
  lastError?: string;
  degradedSince?: string;
}

export interface AegisProjection {
  seq: number;
  incidents: Map<string, IncidentState>;
  assets: Map<string, AssetState>;
  cases: Map<string, CaseState>;
  blockedIndicators: Set<string>;
  counters: {
    incidentSeq: number;
    caseSeq: number;
    telemetry24hCount: number;
  };
  providerStats: Map<string, ProviderStat>;
  listeners: Array<(event: AegisEvent) => void>;
}

class AegisStore {
  private dataDir: string;
  private eventsPath: string;
  private snapshotPath: string;
  private lockPath: string;
  private lockFd: number | null = null;
  private snapshotTimer: NodeJS.Timeout | null = null;

  public projection: AegisProjection = {
    seq: 0,
    incidents: new Map(),
    assets: new Map(),
    cases: new Map(),
    blockedIndicators: new Set(),
    counters: { incidentSeq: 4281, caseSeq: 100, telemetry24hCount: 0 },
    providerStats: new Map([
      ['Deepgram', { calls: 0, failures: 0, parseFailures: 0, latenciesMs: [] }],
      ['Gemini', { calls: 0, failures: 0, parseFailures: 0, latenciesMs: [] }],
      ['Murf AI', { calls: 0, failures: 0, parseFailures: 0, latenciesMs: [] }],
      ['Aegis Local Engine', { calls: 0, failures: 0, parseFailures: 0, latenciesMs: [] }],
    ]),
    listeners: [],
  };

  constructor() {
    this.dataDir = config.dataDir;
    this.eventsPath = path.join(this.dataDir, 'events.jsonl');
    this.snapshotPath = path.join(this.dataDir, 'snapshot.json');
    this.lockPath = path.join(this.dataDir, '.lock');
    this.init();
  }

  private init() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true, mode: 0o700 });
    }

    this.acquireLock();
    this.loadAndReplay();

    // Start 60s periodic snapshot timer
    this.snapshotTimer = setInterval(() => this.snapshot(), 60000);
  }

  private acquireLock() {
    try {
      if (fs.existsSync(this.lockPath)) {
        const pidStr = fs.readFileSync(this.lockPath, 'utf8').trim();
        const pid = parseInt(pidStr, 10);
        if (!isNaN(pid)) {
          try {
            process.kill(pid, 0); // Check if pid is alive
            console.error(`[Store Error] Another instance is running with PID ${pid}. Refusing to start.`);
            process.exit(1);
          } catch {
            // PID is dead, stale lockfile
            fs.unlinkSync(this.lockPath);
          }
        }
      }
      this.lockFd = fs.openSync(this.lockPath, 'wx');
      fs.writeSync(this.lockFd, process.pid.toString());
    } catch (err: any) {
      if (err.code === 'EEXIST') {
        console.error('[Store Error] Exclusive lock file exists. Another Aegis process is running.');
        process.exit(1);
      }
      throw err;
    }
  }

  public releaseLock() {
    if (this.lockFd !== null) {
      try {
        fs.closeSync(this.lockFd);
      } catch {}
      this.lockFd = null;
    }
    if (fs.existsSync(this.lockPath)) {
      try {
        fs.unlinkSync(this.lockPath);
      } catch {}
    }
  }

  private loadAndReplay() {
    const startTime = Date.now();
    let loadedSeq = 0;

    // 1. Try loading snapshot if exists
    if (fs.existsSync(this.snapshotPath)) {
      try {
        const raw = fs.readFileSync(this.snapshotPath, 'utf8');
        const snap = JSON.parse(raw);
        if (snap && typeof snap.seq === 'number') {
          loadedSeq = snap.seq;
          this.projection.seq = snap.seq;
          if (snap.incidents) this.projection.incidents = new Map(snap.incidents);
          if (snap.assets) this.projection.assets = new Map(snap.assets);
          if (snap.cases) this.projection.cases = new Map(snap.cases);
          if (snap.blockedIndicators) this.projection.blockedIndicators = new Set(snap.blockedIndicators);
          if (snap.counters) this.projection.counters = snap.counters;
        }
      } catch (e) {
        console.warn('[Store Warning] Failed to parse snapshot.json; falling back to full replay.');
      }
    }

    // 2. Replay events.jsonl for events > loadedSeq
    let restoredEvents = 0;
    if (fs.existsSync(this.eventsPath)) {
      const lines = fs.readFileSync(this.eventsPath, 'utf8').split('\n');
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        try {
          const event: AegisEvent = JSON.parse(trimmed);
          if (event && event.seq > loadedSeq) {
            this.applyEventToProjection(event, false);
            restoredEvents++;
          }
        } catch (err) {
          if (index === lines.length - 1 || index === lines.length - 2) {
            console.warn(`[Store Warning] Discarded torn final line in events.jsonl at line ${index + 1}`);
          } else {
            console.error(`[Store Error] Malformed JSONL line at ${index + 1}: ${line}`);
          }
        }
      });
    }

    // 3. Check file size for rotation requirement (>50MB)
    this.checkRotation();

    const elapsed = Date.now() - startTime;
    console.log(`[Store] Restored ${restoredEvents} events (total seq ${this.projection.seq}), ${this.projection.incidents.size} incidents, ${this.projection.cases.size} cases in ${elapsed}ms.`);
  }

  private checkRotation() {
    if (!fs.existsSync(this.eventsPath)) return;
    try {
      const stat = fs.statSync(this.eventsPath);
      if (stat.size >= 50 * 1024 * 1024) {
        const rotatedName = `events-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;
        const rotatedPath = path.join(this.dataDir, rotatedName);
        fs.renameSync(this.eventsPath, rotatedPath);
        console.log(`[Store] Rotated 50MB events log to ${rotatedName}`);
      }
    } catch (err) {
      console.error('[Store Error] Failed to rotate event log:', err);
    }
  }

  public append(eventInput: Omit<AegisEvent, 'seq' | 'id' | 'at'> & { at?: string }): AegisEvent {
    this.projection.seq++;
    const fullEvent: AegisEvent = {
      seq: this.projection.seq,
      id: crypto.randomUUID(),
      at: eventInput.at || new Date().toISOString(),
      type: eventInput.type,
      actor: eventInput.actor,
      caseId: eventInput.caseId,
      payload: eventInput.payload,
    };

    // Fsync-safe append
    const line = JSON.stringify(fullEvent) + '\n';
    const fd = fs.openSync(this.eventsPath, 'a');
    try {
      fs.writeSync(fd, line);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }

    this.applyEventToProjection(fullEvent, true);
    return fullEvent;
  }

  private applyEventToProjection(event: AegisEvent, isLive: boolean) {
    this.projection.seq = Math.max(this.projection.seq, event.seq);
    const { type, payload } = event;

    switch (type) {
      case 'incident.created': {
        this.projection.incidents.set(payload.incident.id, payload.incident);
        break;
      }
      case 'incident.status_changed': {
        const inc = this.projection.incidents.get(payload.incidentId);
        if (inc) {
          inc.status = payload.status;
        }
        break;
      }
      case 'incident.score_changed': {
        const inc = this.projection.incidents.get(payload.incidentId);
        if (inc) {
          inc.score = payload.score;
        }
        break;
      }
      case 'asset.registered':
      case 'asset.state_changed': {
        if (payload.asset) {
          this.projection.assets.set(payload.asset.id, payload.asset);
        }
        break;
      }
      case 'telemetry.ingested': {
        this.projection.counters.telemetry24hCount += payload.count || 1;
        break;
      }
      case 'case.opened': {
        if (payload.case) {
          this.projection.cases.set(payload.case.caseId, payload.case);
        }
        break;
      }
      case 'case.action_requested':
      case 'case.action_executed':
      case 'case.action_failed':
      case 'case.verified': {
        const c = this.projection.cases.get(event.caseId || payload.caseId);
        if (c) {
          c.timeline.push({
            at: event.at,
            stage: type,
            actor: event.actor,
            engine: payload.engine || 'Aegis System',
            latencyMs: payload.latencyMs,
            detail: payload.detail || type,
            enforcementId: payload.enforcementId,
          });
          if (type === 'case.action_executed') c.status = 'action_in_flight';
          if (type === 'case.verified') c.status = 'contained';
        }

        if (type === 'case.verified' && payload.action === 'block' && payload.indicator) {
          this.projection.blockedIndicators.add(payload.indicator.toLowerCase());
        }
        break;
      }
      case 'case.closed': {
        const c = this.projection.cases.get(event.caseId || payload.caseId);
        if (c) {
          c.status = 'closed';
          c.closedAt = event.at;
        }
        break;
      }
    }

    if (isLive) {
      this.projection.listeners.forEach((listener) => {
        try {
          listener(event);
        } catch {}
      });
    }
  }

  public snapshot() {
    try {
      const snapObj = {
        seq: this.projection.seq,
        incidents: Array.from(this.projection.incidents.entries()),
        assets: Array.from(this.projection.assets.entries()),
        cases: Array.from(this.projection.cases.entries()),
        blockedIndicators: Array.from(this.projection.blockedIndicators.values()),
        counters: this.projection.counters,
        savedAt: new Date().toISOString(),
      };

      const tmpPath = this.snapshotPath + '.tmp';
      fs.writeFileSync(tmpPath, JSON.stringify(snapObj, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.snapshotPath);
    } catch (err) {
      console.error('[Store Error] Failed to write atomic snapshot:', err);
    }
  }

  public recordProviderCall(provider: string, durationMs: number, success: boolean, parseSuccess = true, errMessage?: string) {
    let stat = this.projection.providerStats.get(provider);
    if (!stat) {
      stat = { calls: 0, failures: 0, parseFailures: 0, latenciesMs: [] };
      this.projection.providerStats.set(provider, stat);
    }

    stat.calls++;
    if (!success) {
      stat.failures++;
      stat.lastError = errMessage || 'Request failed';
    }
    if (!parseSuccess) {
      stat.parseFailures++;
    }

    stat.latenciesMs.push(durationMs);
    if (stat.latenciesMs.length > 100) stat.latenciesMs.shift();
  }

  public shutdown() {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }
    this.snapshot();
    this.releaseLock();
    console.log('[Store] Gracefully shut down and released lockfile.');
  }
}

export const store = new AegisStore();
