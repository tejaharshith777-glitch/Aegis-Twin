import React from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Gauge,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { audioService } from '../services/audioService';

export interface MetricDrilldownData {
  type: 'incidents' | 'signals' | 'triage' | 'health';
  title: string;
  value: string;
  detail: string;
  trend: string;
}

interface MetricDrilldownModalProps {
  data: MetricDrilldownData | null;
  isOpen: boolean;
  onClose: () => void;
  onRunTriage?: (query: string) => void;
  onOpenIncidents?: () => void;
}

export const MetricDrilldownModal: React.FC<MetricDrilldownModalProps> = ({
  data,
  isOpen,
  onClose,
  onRunTriage,
  onOpenIncidents,
}) => {
  if (!isOpen || !data) return null;

  const contentMap: Record<
    MetricDrilldownData['type'],
    {
      subtitle: string;
      breakdown: Array<{ label: string; value: string; note: string; tone?: string }>;
      suggestedQuery: string;
    }
  > = {
    incidents: {
      subtitle: 'Prioritized queue of active security events classified by DEFCON severity.',
      breakdown: [
        { label: 'DEFCON 1 (Critical)', value: '1 incident', note: 'INC-4281 (WIN-FIN-07 PowerShell)', tone: 'danger' },
        { label: 'DEFCON 2 (High)', value: '2 incidents', note: 'INC-4280 (Identity) & INC-4279 (Exfiltration)', tone: 'warning' },
        { label: 'DEFCON 3 (Medium/Low)', value: '2 incidents', note: 'INC-4278 (Phishing) & INC-4277 (Cloud)', tone: 'neutral' },
        { label: 'Contained Incidents', value: '2 contained', note: 'Network edge blocking active', tone: 'success' },
      ],
      suggestedQuery: 'Summarize all open priority incidents and recommend immediate containment steps.',
    },
    signals: {
      subtitle: 'Telemetry events correlated across EDR, Identity, CloudTrail, and Zeek network flows in the last 24h.',
      breakdown: [
        { label: 'EDR Process Events', value: '1,420 events', note: '99.8% normal process ancestry', tone: 'success' },
        { label: 'Authentication Attempts', value: '890 sign-ins', note: '47 failed attempts isolated', tone: 'warning' },
        { label: 'Network Flows Inspected', value: '412 flows', note: '2.8 GB outbound exfiltration flagged', tone: 'danger' },
        { label: 'Cloud Audit Logs', value: '125 API calls', note: 'Zero unauthorized role changes', tone: 'success' },
      ],
      suggestedQuery: 'Analyze telemetry signal spikes in the last 24 hours and highlight anomalies.',
    },
    triage: {
      subtitle: 'Operational triage velocity: speed from initial anomaly detection to containment recommendation.',
      breakdown: [
        { label: 'Voice Ingestion & STT', value: '0.42 sec', note: 'Deepgram Nova-3 transcription', tone: 'success' },
        { label: 'Cognitive Reasoning', value: '1.20 sec', note: 'Gemini policy reasoning & MITRE mapping', tone: 'success' },
        { label: 'Vocalization & Playback', value: '0.80 sec', note: 'Murf AI GEN2 briefing generation', tone: 'success' },
        { label: 'Operator Approval Time', value: '1 min 39s', note: 'Human review and approval dispatch', tone: 'neutral' },
      ],
      suggestedQuery: 'Review SOC mean time to triage and evaluate automated response performance.',
    },
    health: {
      subtitle: 'Fleet-wide control effectiveness, agent heartbeat status, and zero-trust policy compliance.',
      breakdown: [
        { label: 'EDR Agent Health', value: '99.5%', note: '1,284 / 1,291 sensors actively reporting', tone: 'success' },
        { label: 'Perimeter WAF & Firewall', value: '100.0%', note: 'Edge rules synchronized with zero latency', tone: 'success' },
        { label: 'SSO & MFA Challenge Engine', value: '99.9%', note: 'FIDO2 / WebAuthn conditional access active', tone: 'success' },
        { label: 'Backup & Shadow Copy Integrity', value: '98.2%', note: 'Immutable air-gapped snapshots online', tone: 'success' },
      ],
      suggestedQuery: 'Audit fleet control health and generate a gap analysis report.',
    },
  };

  const item = contentMap[data.type];

  return (
    <>
      <button className="drawer-backdrop" onClick={onClose} aria-label="Close metric details" />
      <div className="metric-drilldown-modal" role="dialog" aria-modal="true" aria-label="Metric Drilldown">
        <div className="metric-modal-header">
          <div className="metric-modal-title">
            <span className="metric-drill-badge"><Activity size={18} /></span>
            <div>
              <h2>{data.title} — Metric Drilldown</h2>
              <p>{item.subtitle}</p>
            </div>
          </div>
          <button className="console-btn close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="metric-hero-stat">
          <div>
            <span>Current Value</span>
            <strong>{data.value}</strong>
            <small>{data.detail}</small>
          </div>
          <div className="stat-trend-box">
            <span>24h Trend</span>
            <strong className="trend-text">{data.trend}</strong>
          </div>
        </div>

        <div className="metric-breakdown-section">
          <h4>Component Breakdown</h4>
          <div className="metric-breakdown-list">
            {item.breakdown.map((row) => (
              <div key={row.label} className="breakdown-row">
                <div>
                  <strong>{row.label}</strong>
                  <small>{row.note}</small>
                </div>
                <span className={`breakdown-val ${row.tone || ''}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="metric-modal-footer-actions">
          {data.type === 'incidents' && (
            <button
              className="runbook-btn secondary"
              onClick={() => {
                audioService.playClick();
                onClose();
                onOpenIncidents?.();
              }}
            >
              View Full Incident Queue
            </button>
          )}
          <button
            className="ask-aegis-btn"
            onClick={() => {
              audioService.playClick();
              onClose();
              onRunTriage?.(item.suggestedQuery);
            }}
          >
            <Sparkles size={15} /> Triage Metric with Aegis <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </>
  );
};
