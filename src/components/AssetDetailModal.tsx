import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Cloud,
  Database,
  Globe,
  Laptop,
  Lock,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import { AssetRecord } from '../types';
import { audioService } from '../services/audioService';
import { logService } from '../services/logService';

interface AssetDetailModalProps {
  asset: AssetRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onRunTriage: (query: string) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  asset,
  isOpen,
  onClose,
  onRunTriage,
}) => {
  const [isolated, setIsolated] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  if (!isOpen || !asset) return null;

  const AssetIcon =
    asset.type === 'Endpoint' ? Laptop : asset.type === 'Database' ? Database : asset.type === 'Cloud' ? Cloud : Server;

  const handleIsolate = async () => {
    audioService.playAlert(1);
    setIsolated(true);
    setActionMessage('Host isolation command dispatched to EDR sensor. Network traffic sever active.');
    logService.addLog('CRITICAL', 'EDR_ISOLATE', `Host ${asset.name} (${asset.id}) quarantined from corporate subnet.`);
  };

  const handleScan = async () => {
    audioService.playScan();
    setScanning(true);
    setActionMessage('Initiated full memory and disk heuristic scan...');
    logService.addLog('AGENT', 'EDR_SCAN', `Full forensic scan triggered on host ${asset.name} (${asset.ip})`);
    await new Promise((r) => setTimeout(r, 1500));
    setScanning(false);
    audioService.playSuccess();
    setActionMessage('Forensic scan complete: 0 hidden rootkits found.');
  };

  const handleTriageWithTwin = () => {
    audioService.playClick();
    onClose();
    onRunTriage(`Investigate security posture and active alerts on asset ${asset.name} (${asset.id})`);
  };

  return (
    <>
      <button className="drawer-backdrop" onClick={onClose} aria-label="Close asset details" />
      <div className="asset-detail-modal" role="dialog" aria-modal="true" aria-label="Asset Telemetry & Controls">
        <div className="asset-modal-header">
          <div className="asset-modal-title">
            <span className={`asset-badge-large ${asset.risk.toLowerCase()}`}>
              <AssetIcon size={22} />
            </span>
            <div>
              <div className="asset-name-row">
                <h2>{asset.name}</h2>
                <code className="asset-id-pill">{asset.id}</code>
                <span className={`risk-tag ${asset.risk.toLowerCase()}`}>{asset.risk} RISK</span>
              </div>
              <p>{asset.platform} · Managed by {asset.owner}</p>
            </div>
          </div>
          <button className="console-btn close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="asset-telemetry-grid">
          <div className="asset-spec-box">
            <span>IP Address</span>
            <strong>{asset.ip}</strong>
          </div>
          <div className="asset-spec-box">
            <span>EDR Agent Status</span>
            <strong className="good"><ShieldCheck size={13} /> {asset.edrStatus}</strong>
          </div>
          <div className="asset-spec-box">
            <span>Network Status</span>
            <strong>{isolated ? <span className="danger-text">QUARANTINED</span> : asset.status}</strong>
          </div>
          <div className="asset-spec-box">
            <span>Last Telemetry Beat</span>
            <strong>{asset.lastSeen}</strong>
          </div>
        </div>

        {actionMessage && (
          <div className="asset-action-banner">
            <CheckCircle2 size={16} />
            <span>{actionMessage}</span>
          </div>
        )}

        <div className="asset-ports-section">
          <h4>Open Listening Ports &amp; Services</h4>
          <div className="ports-tags">
            {(asset.openPorts || [22, 80, 443, 3389]).map((port) => (
              <span key={port} className="port-tag">
                Port {port} {port === 443 ? '(HTTPS)' : port === 22 ? '(SSH)' : port === 3389 ? '(RDP)' : '(HTTP)'}
              </span>
            ))}
          </div>
        </div>

        <div className="asset-controls-section">
          <h4>Operator Remediation Controls</h4>
          <div className="asset-action-buttons">
            <button
              className={`asset-control-btn ${isolated ? 'quarantined' : 'danger'}`}
              onClick={handleIsolate}
              disabled={isolated}
            >
              <Lock size={15} />
              <span>{isolated ? 'Host Isolated from Network' : 'Isolate Host from Subnet'}</span>
            </button>
            <button
              className="asset-control-btn secondary"
              onClick={handleScan}
              disabled={scanning}
            >
              {scanning ? <span className="btn-spinner" /> : <RefreshCw size={15} />}
              <span>{scanning ? 'Scanning Filesystem...' : 'Run Deep EDR Scan'}</span>
            </button>
          </div>
        </div>

        <div className="asset-twin-ask">
          <Sparkles size={16} />
          <div>
            <strong>Ask Aegis Twin to investigate this host</strong>
            <p>Correlate process ancestry, network connections, and identity tokens for {asset.name}.</p>
          </div>
          <button className="ask-aegis-btn" onClick={handleTriageWithTwin}>
            Investigate Asset <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </>
  );
};
