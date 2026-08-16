import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Gauge,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  X,
  Zap,
} from 'lucide-react';
import { audioService } from '../services/audioService';
import { logService } from '../services/logService';

interface PostureBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunTriage?: (query: string) => void;
}

export const PostureBreakdownModal: React.FC<PostureBreakdownModalProps> = ({
  isOpen,
  onClose,
  onRunTriage,
}) => {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [riskScore, setRiskScore] = useState(28);

  if (!isOpen) return null;

  const handleRecalculate = async () => {
    audioService.playScan();
    setIsRecalculating(true);
    logService.addLog('AGENT', 'POSTURE_ENGINE', 'Initiating full Bayesian risk matrix recalculation...');
    await new Promise((r) => setTimeout(r, 1200));
    setRiskScore(26);
    setIsRecalculating(false);
    audioService.playSuccess();
    logService.addLog('SUCCESS', 'POSTURE_ENGINE', 'Risk score recalculated: updated to 26 (LOW RISK · Improved by 2 points).');
  };

  const threatVectors = [
    { name: 'Endpoint & Process Ancestry', score: 42, max: 100, trend: 'Improving', color: 'mint', weight: '35%' },
    { name: 'Identity & Access Anomalies', score: 36, max: 100, trend: 'Stable', color: 'amber', weight: '25%' },
    { name: 'Network Egress & Exfiltration', score: 18, max: 100, trend: 'Optimal', color: 'mint', weight: '20%' },
    { name: 'Cloud Infrastructure & IAM', score: 12, max: 100, trend: 'Optimal', color: 'blue', weight: '20%' },
  ];

  return (
    <>
      <button className="drawer-backdrop" onClick={onClose} aria-label="Close posture details" />
      <div className="posture-modal" role="dialog" aria-modal="true" aria-label="Security Posture Breakdown">
        <div className="posture-modal-header">
          <div className="posture-modal-title">
            <span className="posture-badge"><Gauge size={18} /></span>
            <div>
              <h2>SOC Posture Index &amp; Threat Breakdown</h2>
              <p>Multi-dimensional threat scoring correlating 1,291 assets, 5 incidents, and MITRE tactics.</p>
            </div>
          </div>
          <button className="console-btn close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="posture-score-hero">
          <div className="posture-hero-left">
            <div className="hero-ring-score">
              <strong>{riskScore}</strong>
              <span>LOW RISK</span>
            </div>
            <div className="hero-score-copy">
              <span className="trend-badge"><TrendingDown size={12} /> ↓ 6 points (24h)</span>
              <h3>Environment Posture: Healthy</h3>
              <p>Risk calculation aggregates active alerts, asset criticality weights, and control plane enforcement status.</p>
            </div>
          </div>
          <button className="recalc-btn" onClick={handleRecalculate} disabled={isRecalculating}>
            <RefreshCw size={14} className={isRecalculating ? 'spinning' : ''} />
            <span>{isRecalculating ? 'Recalculating Matrix...' : 'Recalculate Posture'}</span>
          </button>
        </div>

        <div className="threat-vectors-section">
          <h3>Domain Threat Breakdown</h3>
          <div className="vector-grid">
            {threatVectors.map((v) => (
              <div key={v.name} className="vector-card">
                <div className="vector-card-top">
                  <strong>{v.name}</strong>
                  <span className="vector-weight">Weight: {v.weight}</span>
                </div>
                <div className="vector-bar-wrap">
                  <div className="vector-bar">
                    <span style={{ width: `${v.score}%` }} className={v.color} />
                  </div>
                  <strong>{v.score}/100</strong>
                </div>
                <div className="vector-footer">
                  <span>Status: <em className={v.color}>{v.trend}</em></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="posture-ask-aegis">
          <Sparkles size={16} />
          <div>
            <strong>Ask Aegis for a full Posture Briefing</strong>
            <p>Generate a comprehensive voice-ready summary of your active security surface.</p>
          </div>
          <button
            className="ask-aegis-btn"
            onClick={() => {
              audioService.playClick();
              onClose();
              onRunTriage?.('Give me a detailed security posture and threat surface briefing.');
            }}
          >
            Run Posture Triage <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </>
  );
};
