import React, { useState } from 'react';
import {
  Activity,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  Database,
  Laptop,
  Radio,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { audioService } from '../services/audioService';
import { logService } from '../services/logService';

interface SensorCoverageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SensorCoverageModal: React.FC<SensorCoverageModalProps> = ({ isOpen, onClose }) => {
  const [recovering, setRecovering] = useState<string | null>(null);
  const [offlineAssets, setOfflineAssets] = useState([
    { id: 'AST-0208', name: 'HR-LT-044', type: 'Endpoint', os: 'Windows 11', owner: 'People Operations', lastSeen: '43m ago', reason: 'Sleep mode' },
    { id: 'AST-0189', name: 'DEV-SRV-09', type: 'Server', os: 'Ubuntu 22.04', owner: 'DevOps Team', lastSeen: '1h 12m ago', reason: 'Kernel reboot' },
    { id: 'AST-0094', name: 'TEST-DB-02', type: 'Database', os: 'Postgres 15', owner: 'QA Team', lastSeen: '2h ago', reason: 'Maintenance' },
  ]);

  if (!isOpen) return null;

  const sensorLayers = [
    { name: 'EDR Agent Coverage (CrowdStrike / Defender)', active: 1284, total: 1291, pct: 99.5, status: 'Optimal' },
    { name: 'Network Flow & Zeek Sensors', active: 48, total: 48, pct: 100.0, status: 'Optimal' },
    { name: 'CloudTrail & CloudWatch Audit Loggers', active: 32, total: 32, pct: 100.0, status: 'Optimal' },
    { name: 'Identity Provider Telemetry (Okta / Entra)', active: 12, total: 12, pct: 100.0, status: 'Optimal' },
    { name: 'Email Gateway Quarantine Sensors', active: 8, total: 8, pct: 100.0, status: 'Optimal' },
  ];

  const handleRecover = async (assetId: string) => {
    audioService.playScan();
    setRecovering(assetId);
    logService.addLog('AGENT', 'SENSOR_RECOVERY', `Pinging agent wake-up packet on ${assetId}...`);
    await new Promise((r) => setTimeout(r, 1200));
    setOfflineAssets((prev) => prev.filter((a) => a.id !== assetId));
    setRecovering(null);
    audioService.playSuccess();
    logService.addLog('SUCCESS', 'SENSOR_RECOVERY', `Asset ${assetId} sensor telemetry restored and verified online.`);
  };

  return (
    <>
      <button className="drawer-backdrop" onClick={onClose} aria-label="Close sensor coverage" />
      <div className="coverage-modal" role="dialog" aria-modal="true" aria-label="SOC Sensor & Telemetry Coverage">
        <div className="coverage-modal-header">
          <div className="coverage-modal-title">
            <span className="coverage-modal-badge"><Radio size={18} /></span>
            <div>
              <h2>SOC Sensor &amp; Telemetry Coverage</h2>
              <p>Fleet-wide agent health, sensor packet loss, and offline asset telemetry recovery.</p>
            </div>
          </div>
          <button className="console-btn close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="coverage-overview-cards">
          <div className="cov-card">
            <span>Sensor Fleet Health</span>
            <strong>99.5%</strong>
            <small className="good"><CheckCircle2 size={12} /> Above 99.0% SLA Target</small>
          </div>
          <div className="cov-card">
            <span>Reporting Assets</span>
            <strong>1,284 / 1,291</strong>
            <small>7 offline endpoints/servers</small>
          </div>
          <div className="cov-card">
            <span>Telemetry Ingestion</span>
            <strong>4.2 GB / hr</strong>
            <small className="good">0 packet drops</small>
          </div>
        </div>

        <div className="sensor-layers-section">
          <h3>Telemetry Sensor Subsystems</h3>
          <div className="sensor-layer-list">
            {sensorLayers.map((layer) => (
              <div key={layer.name} className="sensor-layer-row">
                <div className="sensor-layer-name">
                  <strong>{layer.name}</strong>
                  <span>{layer.active} of {layer.total} online ({layer.pct}%)</span>
                </div>
                <div className="sensor-progress-bar">
                  <span style={{ width: `${layer.pct}%` }} />
                </div>
                <em className="status-optimal"><ShieldCheck size={13} /> {layer.status}</em>
              </div>
            ))}
          </div>
        </div>

        <div className="offline-assets-section">
          <div className="offline-header">
            <h3>Offline Assets Requiring Telemetry Sync ({offlineAssets.length})</h3>
            <span>Auto-recovery polling every 60s</span>
          </div>
          {offlineAssets.length === 0 ? (
            <div className="all-online-box">
              <ShieldCheck size={24} />
              <strong>All 1,291 sensors are currently reporting active telemetry!</strong>
            </div>
          ) : (
            <div className="offline-list">
              {offlineAssets.map((asset) => (
                <div key={asset.id} className="offline-row">
                  <div className="offline-info">
                    <Laptop size={16} />
                    <div>
                      <strong>{asset.name} <code>({asset.id})</code></strong>
                      <small>{asset.os} · {asset.owner} · Last seen {asset.lastSeen} ({asset.reason})</small>
                    </div>
                  </div>
                  <button
                    className="recover-btn"
                    disabled={recovering === asset.id}
                    onClick={() => handleRecover(asset.id)}
                  >
                    {recovering === asset.id ? <span className="btn-spinner" /> : <RefreshCw size={13} />}
                    <span>{recovering === asset.id ? 'Pinging...' : 'Restore Telemetry'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
