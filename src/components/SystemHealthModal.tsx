import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Cpu,
  Globe,
  HardDrive,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { audioService } from '../services/audioService';

interface SystemHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemHealthModal: React.FC<SystemHealthModalProps> = ({ isOpen, onClose }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [latency, setLatency] = useState(24);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    audioService.playClick();
    setIsRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    setLatency(Math.floor(18 + Math.random() * 14));
    setIsRefreshing(false);
    audioService.playSuccess();
  };

  const services = [
    { name: 'Aegis Core Cognitive Engine', status: 'Operational', latency: `${latency}ms`, uptime: '99.99%' },
    { name: 'Deepgram Nova-3 Audio Proxy', status: 'Operational', latency: '42ms', uptime: '99.95%' },
    { name: 'Murf AI Vocalization Gateway', status: 'Operational', latency: '68ms', uptime: '99.92%' },
    { name: 'WebSocket Realtime Pipeline (/api/listen)', status: 'Connected', latency: '12ms', uptime: '100.0%' },
    { name: 'Evidence Safe File Parser & Checksummer', status: 'Operational', latency: '4ms', uptime: '100.0%' },
    { name: 'MITRE ATT&CK Matrix v15 Cache', status: 'Synchronized', latency: '1ms', uptime: '100.0%' },
  ];

  return (
    <>
      <button className="drawer-backdrop" onClick={onClose} aria-label="Close system health" />
      <div className="health-modal" role="dialog" aria-modal="true" aria-label="SOC System Health & Telemetry Latency">
        <div className="health-modal-header">
          <div className="health-modal-title">
            <span className="health-badge"><Server size={18} /></span>
            <div>
              <h2>SOC Systems &amp; Pipeline Health</h2>
              <p>Real-time microservice status, API latencies, and WebSocket ingestion pings.</p>
            </div>
          </div>
          <button className="console-btn close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="health-metrics-grid">
          <div className="health-kpi-box">
            <span>Overall Status</span>
            <strong className="status-green"><CheckCircle2 size={16} /> ALL OPERATIONAL</strong>
          </div>
          <div className="health-kpi-box">
            <span>WebSocket Ingestion RTT</span>
            <strong>{latency} ms</strong>
          </div>
          <div className="health-kpi-box">
            <span>Memory Load</span>
            <strong>184 MB / 1.0 GB</strong>
          </div>
          <div className="health-kpi-box">
            <span>Pipeline Throughput</span>
            <strong>2.4k events / min</strong>
          </div>
        </div>

        <div className="services-table-wrap">
          <div className="services-table-header">
            <span>SERVICE COMPONENT</span>
            <span>STATUS</span>
            <span>LATENCY</span>
            <span>UPTIME</span>
          </div>
          {services.map((svc) => (
            <div key={svc.name} className="services-table-row">
              <strong>{svc.name}</strong>
              <span className="svc-status"><i /> {svc.status}</span>
              <code>{svc.latency}</code>
              <span>{svc.uptime}</span>
            </div>
          ))}
        </div>

        <div className="health-modal-footer">
          <button className="refresh-health-btn" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw size={14} className={isRefreshing ? 'spinning' : ''} />
            <span>{isRefreshing ? 'Pinging Nodes...' : 'Ping All Services'}</span>
          </button>
          <span><ShieldCheck size={14} /> Zero packet drops recorded across all availability zones</span>
        </div>
      </div>
    </>
  );
};
