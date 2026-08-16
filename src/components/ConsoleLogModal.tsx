import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Check,
  ChevronRight,
  Clock,
  Code,
  Copy,
  Download,
  Filter,
  Pause,
  Play,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Terminal,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { logService } from '../services/logService';
import { audioService } from '../services/audioService';
import { LogEntry, LogLevel } from '../types';

interface ConsoleLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConsoleLogModal: React.FC<ConsoleLogModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>(() => logService.getLogs());
  const [isStreaming, setIsStreaming] = useState<boolean>(() => logService.isLiveStreaming());
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      setLogs(logService.getLogs());
      setIsStreaming(logService.isLiveStreaming());
    };
    const unsubscribe = logService.subscribe(update);
    return () => unsubscribe();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchLevel = selectedLevel === 'ALL' || log.level === selectedLevel;
      const matchSearch =
        !searchQuery ||
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.timestamp.includes(searchQuery);
      return matchLevel && matchSearch;
    });
  }, [logs, selectedLevel, searchQuery]);

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: logs.length };
    logs.forEach((log) => {
      counts[log.level] = (counts[log.level] || 0) + 1;
    });
    return counts;
  }, [logs]);

  const handleToggleStream = () => {
    audioService.playClick();
    logService.setLiveStreaming(!isStreaming);
  };

  const handleClear = () => {
    audioService.playClick();
    logService.clearLogs();
  };

  const handleExport = (format: 'json' | 'csv' | 'txt') => {
    audioService.playClick();
    const data = logService.exportLogs(format);
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aegis-console-logs-${Date.now()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyLogs = () => {
    audioService.playClick();
    const text = logService.exportLogs('txt');
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInjectTelemetry = () => {
    audioService.playScan();
    const mockEvents: Array<{ level: LogLevel; source: string; message: string; payload?: Record<string, unknown> }> = [
      { level: 'CRITICAL', source: 'FIREWALL_WAF', message: 'SYN Flood attack detected from botnet subnet 194.26.29.0/24. 8,400 req/sec.', payload: { rps: 8400, threat: 'DDoS SYN Flood' } },
      { level: 'WARN', source: 'CLOUD_TRAIL', message: 'Sensitive IAM Policy modified: AdministratorAccess granted to temporary role temp-deploy-09', payload: { role: 'temp-deploy-09', policy: 'AdministratorAccess' } },
      { level: 'AGENT', source: 'AEGIS_COGNITION', message: 'Executing schema-constrained cognitive triage on newly observed telemetry vector.', payload: { schema: 'v2.1', engine: 'Gemini-2.5-Flash' } },
      { level: 'SUCCESS', source: 'ZERO_TRUST', message: 'Enclave microsegmentation rule enforced on subnet DB-PROD-CLUSTER.', payload: { subnet: '10.240.8.0/22', action: 'ISOLATE' } },
    ];
    const item = mockEvents[Math.floor(Math.random() * mockEvents.length)];
    logService.addLog(item.level, item.source, item.message, item.payload);
  };

  if (!isOpen) return null;

  return (
    <>
      <button className="drawer-backdrop" onClick={onClose} aria-label="Close console" />
      <div className="console-modal" role="dialog" aria-modal="true" aria-label="SOC Console & Telemetry Stream">
        <div className="console-modal-header">
          <div className="console-header-brand">
            <span className="terminal-badge"><Terminal size={18} /></span>
            <div>
              <div className="console-title-row">
                <h2>SOC Live Console &amp; Telemetry Stream</h2>
                <span className={`live-pulse-badge ${isStreaming ? 'streaming' : 'paused'}`}>
                  <i /> {isStreaming ? 'LIVE STREAM' : 'STREAM PAUSED'}
                </span>
              </div>
              <p>Real-time event logging, EDR sensor streams, and AI cognitive execution audit.</p>
            </div>
          </div>
          <div className="console-header-actions">
            <button
              className={`console-btn ${isStreaming ? 'active' : ''}`}
              onClick={handleToggleStream}
              title={isStreaming ? 'Pause streaming' : 'Resume streaming'}
            >
              {isStreaming ? <Pause size={14} /> : <Play size={14} />}
              <span>{isStreaming ? 'Pause' : 'Resume'}</span>
            </button>
            <button className="console-btn" onClick={handleInjectTelemetry} title="Inject test security telemetry">
              <Zap size={14} />
              <span>Simulate Event</span>
            </button>
            <button className="console-btn" onClick={() => handleExport('json')} title="Export logs as JSON">
              <Download size={14} />
              <span>JSON</span>
            </button>
            <button className="console-btn" onClick={() => handleExport('csv')} title="Export logs as CSV">
              <Download size={14} />
              <span>CSV</span>
            </button>
            <button className="console-btn" onClick={handleCopyLogs} title="Copy all logs">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button className="console-btn danger" onClick={handleClear} title="Clear logs">
              <Trash2 size={14} />
            </button>
            <button className="console-btn close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="console-toolbar">
          <div className="console-search">
            <Search size={14} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search console logs by message, source, or IP..."
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}><X size={13} /></button>
            )}
          </div>
          <div className="console-level-filters">
            {['ALL', 'CRITICAL', 'WARN', 'AGENT', 'EDR', 'NETWORK', 'AUTH', 'INFO', 'SUCCESS'].map((lvl) => {
              const count = levelCounts[lvl] || 0;
              if (lvl !== 'ALL' && count === 0) return null;
              return (
                <button
                  key={lvl}
                  className={`level-pill ${selectedLevel === lvl ? 'active' : ''} ${lvl.toLowerCase()}`}
                  onClick={() => {
                    audioService.playClick();
                    setSelectedLevel(lvl);
                  }}
                >
                  <span>{lvl}</span>
                  <em>{count}</em>
                </button>
              );
            })}
          </div>
        </div>

        <div className="console-body" ref={logContainerRef}>
          {filteredLogs.length === 0 ? (
            <div className="console-empty">
              <Terminal size={32} />
              <p>No log records match your filter.</p>
              <span>Adjust your search query or clear the level filter.</span>
            </div>
          ) : (
            <div className="console-log-list">
              {filteredLogs.map((log) => {
                const isSelected = selectedLog?.id === log.id;
                return (
                  <div
                    key={log.id}
                    className={`console-log-row ${log.level.toLowerCase()} ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      audioService.playClick();
                      setSelectedLog(isSelected ? null : log);
                    }}
                  >
                    <span className="log-time">{log.timestamp}</span>
                    <span className={`log-level-tag ${log.level.toLowerCase()}`}>{log.level}</span>
                    <span className="log-source">[{log.source}]</span>
                    <span className="log-msg">{log.message}</span>
                    {log.payload && (
                      <span className="log-payload-indicator" title="Click to view JSON payload">
                        <Code size={12} /> JSON
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedLog && (
          <div className="console-payload-drawer">
            <div className="payload-drawer-header">
              <div>
                <strong>Event Payload Inspector</strong>
                <span>ID: {selectedLog.id} · [{selectedLog.source}]</span>
              </div>
              <button onClick={() => setSelectedLog(null)}><X size={15} /></button>
            </div>
            <div className="payload-drawer-content">
              <div className="payload-meta-grid">
                <div><span>Level</span><strong className={`log-level-tag ${selectedLog.level.toLowerCase()}`}>{selectedLog.level}</strong></div>
                <div><span>Timestamp</span><code>{selectedLog.timestamp}</code></div>
                <div><span>Source</span><code>{selectedLog.source}</code></div>
              </div>
              <p className="payload-message">{selectedLog.message}</p>
              {selectedLog.payload ? (
                <pre className="payload-json">{JSON.stringify(selectedLog.payload, null, 2)}</pre>
              ) : (
                <div className="no-payload">No structured JSON payload attached to this telemetry event.</div>
              )}
            </div>
          </div>
        )}

        <div className="console-footer">
          <div className="console-footer-stats">
            <span>Showing <strong>{filteredLogs.length}</strong> of <strong>{logs.length}</strong> events</span>
            <span>·</span>
            <span>Buffer limit: <strong>300</strong> events</span>
          </div>
          <div className="console-footer-note">
            <Clock size={12} /> Live timestamps synchronized with SOC atomic clock
          </div>
        </div>
      </div>
    </>
  );
};
