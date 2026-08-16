import React from 'react';
import {
  Boxes,
  Building2,
  Check,
  ChevronRight,
  Globe2,
  Lock,
  Plus,
  Shield,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { WorkspaceConfig } from '../types';
import { audioService } from '../services/audioService';
import { logService } from '../services/logService';

export const availableWorkspaces: WorkspaceConfig[] = [
  {
    id: 'northstar-prod',
    name: 'Northstar Labs',
    subtitle: 'Production Enclave · AWS & On-Prem (1,291 assets)',
    logo: 'N',
    assetCount: 1291,
    incidentCount: 5,
    healthScore: 98.7,
  },
  {
    id: 'fintech-core',
    name: 'FinTech Core Banking',
    subtitle: 'PCI-DSS Tier-1 Enclave · Multi-Region (840 assets)',
    logo: 'F',
    assetCount: 840,
    incidentCount: 2,
    healthScore: 99.4,
  },
  {
    id: 'cloudgov-eu',
    name: 'CloudGov EU (Frankfurt)',
    subtitle: 'GDPR / Sovereign GovCloud (460 assets)',
    logo: 'E',
    assetCount: 460,
    incidentCount: 1,
    healthScore: 99.9,
  },
  {
    id: 'staging-soc',
    name: 'Red Team Attack Sandbox',
    subtitle: 'Isolated Simulation Ground · Active Chaos Drills',
    logo: 'S',
    assetCount: 150,
    incidentCount: 8,
    healthScore: 84.2,
  },
];

interface WorkspaceModalProps {
  isOpen: boolean;
  activeWorkspace: WorkspaceConfig;
  onSelectWorkspace: (ws: WorkspaceConfig) => void;
  onClose: () => void;
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  isOpen,
  activeWorkspace,
  onSelectWorkspace,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <button className="drawer-backdrop" onClick={onClose} aria-label="Close workspace selector" />
      <div className="workspace-modal" role="dialog" aria-modal="true" aria-label="Select Security Workspace">
        <div className="workspace-modal-header">
          <div className="workspace-modal-title">
            <span className="ws-modal-icon"><Building2 size={18} /></span>
            <div>
              <h2>Switch SOC Workspace &amp; Enclave</h2>
              <p>Select an isolated security tenant or connected hybrid cloud environment.</p>
            </div>
          </div>
          <button className="console-btn close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="workspace-modal-list">
          {availableWorkspaces.map((ws) => {
            const isSelected = ws.id === activeWorkspace.id;
            return (
              <div
                key={ws.id}
                className={`workspace-card-option ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  audioService.playSuccess();
                  logService.addLog('INFO', 'WORKSPACE', `Switched active SOC workspace to "${ws.name}" (${ws.id})`);
                  onSelectWorkspace(ws);
                  onClose();
                }}
              >
                <div className="ws-logo-badge">{ws.logo}</div>
                <div className="ws-info">
                  <div className="ws-name-row">
                    <strong>{ws.name}</strong>
                    {isSelected && <span className="ws-active-tag"><Check size={11} /> ACTIVE</span>}
                  </div>
                  <p>{ws.subtitle}</p>
                  <div className="ws-metrics-row">
                    <span><Boxes size={12} /> {ws.assetCount.toLocaleString()} Assets</span>
                    <span><Shield size={12} /> {ws.incidentCount} Open Alerts</span>
                    <span><ShieldCheck size={12} /> {ws.healthScore}% Control Health</span>
                  </div>
                </div>
                <ChevronRight size={18} className="ws-arrow" />
              </div>
            );
          })}
        </div>

        <div className="workspace-modal-footer">
          <button
            className="ws-add-btn"
            onClick={() => {
              audioService.playClick();
              alert('New workspace provisioning request submitted to Security Operations Director.');
            }}
          >
            <Plus size={15} /> Provision New Cloud Tenant
          </button>
          <span><Lock size={12} /> End-to-end tenant isolation enforced with mutual TLS</span>
        </div>
      </div>
    </>
  );
};
