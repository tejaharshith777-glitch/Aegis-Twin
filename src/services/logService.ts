import { LogEntry, LogLevel } from '../types';

class LogService {
  private logs: LogEntry[] = [];
  private listeners: Set<() => void> = new Set();
  private maxLogs = 300;
  private isStreaming = true;
  private intervalId: number | null = null;

  constructor() {
    // Initialize with rich baseline SOC logs
    const now = Date.now();
    const initialEvents: Array<{ offsetMs: number; level: LogLevel; source: string; message: string; payload?: Record<string, unknown> }> = [
      { offsetMs: 380000, level: 'INFO', source: 'AEGIS_BOOT', message: 'Aegis Twin cognitive engine initialized with schema constraint enforcement.' },
      { offsetMs: 340000, level: 'SUCCESS', source: 'EDR_SENSOR', message: 'Sensor health check OK: 1,284 / 1,291 agents reporting active telemetry.' },
      { offsetMs: 290000, level: 'INFO', source: 'DEEPGRAM_STT', message: 'Deepgram Nova-3 voice pipeline ready on secure same-origin WebSocket proxy.' },
      { offsetMs: 240000, level: 'INFO', source: 'MITRE_ENGINE', message: 'MITRE ATT&CK enterprise matrix v15 cached with 204 technique mappings.' },
      { offsetMs: 180000, level: 'WARN', source: 'AUTH_GATEWAY', message: '47 failed login attempts detected across 3 distributed IPs for m.chen@northstar.io', payload: { user: 'm.chen@northstar.io', attempts: 47, ips: ['185.220.101.34', '91.214.124.17'] } },
      { offsetMs: 120000, level: 'CRITICAL', source: 'EDR_SENSOR', message: 'DEFCON 1 signal: Encoded PowerShell process spawned by ACRORD32.EXE on WIN-FIN-07', payload: { host: 'WIN-FIN-07', pid: 4912, command: 'powershell.exe -enc JABzAD0ATg...' } },
      { offsetMs: 90000, level: 'AGENT', source: 'AEGIS_AGENT', message: 'Correlation complete: matched INC-4281 (Severity: Critical, Risk: 96, DEFCON: 1).' },
      { offsetMs: 60000, level: 'SUCCESS', source: 'FIREWALL_EGRESS', message: 'Automated containment stage 1: Blocked C2 destination 185.220.101.34 at edge proxy.' },
      { offsetMs: 30000, level: 'INFO', source: 'MURF_VOICE', message: 'GEN2 voice briefing ready for operator playback (duration: 18.4s).' },
      { offsetMs: 10000, level: 'INFO', source: 'HEARTBEAT', message: 'SOC Telemetry heartbeat synced. 0 packet drops in last 60s.' },
    ];

    this.logs = initialEvents.map((evt, idx) => ({
      id: `log-${now - evt.offsetMs}-${idx}`,
      timestamp: new Date(now - evt.offsetMs).toLocaleTimeString() + '.' + String(Math.floor((now - evt.offsetMs) % 1000)).padStart(3, '0'),
      level: evt.level,
      source: evt.source,
      message: evt.message,
      payload: evt.payload,
    }));

    this.startLiveSimulation();
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public isLiveStreaming(): boolean {
    return this.isStreaming;
  }

  public setLiveStreaming(streaming: boolean) {
    this.isStreaming = streaming;
    if (streaming) {
      this.startLiveSimulation();
    } else {
      this.stopLiveSimulation();
    }
    this.notify();
  }

  public addLog(level: LogLevel, source: string, message: string, payload?: Record<string, unknown>): LogEntry {
    const now = new Date();
    const timeStr = now.toLocaleTimeString() + '.' + String(now.getMilliseconds()).padStart(3, '0');
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: timeStr,
      level,
      source,
      message,
      payload,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Structured color logging to developer browser console
    if (typeof console !== 'undefined') {
      const colors: Record<LogLevel, string> = {
        CRITICAL: '#ff4d4f',
        WARN: '#faad14',
        SUCCESS: '#52c41a',
        INFO: '#1890ff',
        AGENT: '#722ed1',
        NETWORK: '#13c2c2',
        EDR: '#eb2f96',
        AUTH: '#fa8c16',
      };
      console.log(
        `%c[AEGIS-${source}] %c${level}%c ${message}`,
        `color: #41d8a0; font-weight: bold;`,
        `color: ${colors[level] || '#fff'}; font-weight: bold; background: rgba(0,0,0,0.2); padding: 1px 4px; border-radius: 3px;`,
        'color: inherit;',
        payload ? payload : '',
      );
    }

    this.notify();
    return entry;
  }

  public clearLogs() {
    this.logs = [];
    this.addLog('INFO', 'SYSTEM', 'Console logs cleared by operator.');
  }

  public exportLogs(format: 'json' | 'txt' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    }
    if (format === 'csv') {
      const header = 'ID,Timestamp,Level,Source,Message\n';
      const rows = this.logs.map((l) => `"${l.id}","${l.timestamp}","${l.level}","${l.source}","${l.message.replace(/"/g, '""')}"`).join('\n');
      return header + rows;
    }
    return this.logs.map((l) => `[${l.timestamp}] [${l.level}] [${l.source}] ${l.message}`).join('\n');
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // ignore
      }
    });
  }

  private startLiveSimulation() {
    if (this.intervalId !== null || typeof window === 'undefined') return;

    const backgroundPool: Array<{ level: LogLevel; source: string; message: () => string }> = [
      { level: 'INFO', source: 'HEARTBEAT', message: () => `Sensor telemetry pulse verified across ${1280 + Math.floor(Math.random() * 8)} endpoints.` },
      { level: 'NETWORK', source: 'ZEEK_FLOW', message: () => `NetFlow packet audit: inspected ${(1200 + Math.random() * 400).toFixed(0)} MB on VPC-PROD-01. No exfiltration signatures.` },
      { level: 'AUTH', source: 'OKTA_STREAM', message: () => `SSO Session check: user token refresh for admin.${Math.floor(Math.random() * 20)}@northstar.io verified with FIDO2.` },
      { level: 'EDR', source: 'CROWDSTRIKE', message: () => `Endpoint scan pass: 0 new high-entropy binaries found in /System/Library or C:\\Windows\\System32.` },
      { level: 'INFO', source: 'CLOUD_GUARD', message: () => `AWS GuardDuty: CloudTrail audit completed. 0 unauthorized AssumeRole actions.` },
      { level: 'SUCCESS', source: 'POLICY_AGENT', message: () => `Zero-trust boundary compliance: 99.8% within operational baseline.` },
    ];

    this.intervalId = window.setInterval(() => {
      if (!this.isStreaming) return;
      const pick = backgroundPool[Math.floor(Math.random() * backgroundPool.length)];
      if (pick) {
        this.addLog(pick.level, pick.source, pick.message());
      }
    }, 14_000);
  }

  private stopLiveSimulation() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const logService = new LogService();
