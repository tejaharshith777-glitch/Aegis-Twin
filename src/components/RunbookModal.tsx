import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Play,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import { standardRunbooks } from '../services/runbookService';
import { audioService } from '../services/audioService';
import { logService } from '../services/logService';
import { Runbook } from '../types';

interface RunbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunTriage?: (query: string) => void;
}

export const RunbookModal: React.FC<RunbookModalProps> = ({ isOpen, onClose, onRunTriage }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [selectedRunbook, setSelectedRunbook] = useState<Runbook>(standardRunbooks[0]);
  const [executingStep, setExecutingStep] = useState<number | null>(null);
  const [executionComplete, setExecutionComplete] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);

  if (!isOpen) return null;

  const categories = ['All', 'Endpoint', 'Identity', 'Network', 'Cloud', 'Ransomware', 'Forensics'];

  const filteredRunbooks = standardRunbooks.filter((rb) => {
    const matchCat = selectedCategory === 'All' || rb.category === selectedCategory;
    const matchSearch =
      !search ||
      rb.name.toLowerCase().includes(search.toLowerCase()) ||
      rb.description.toLowerCase().includes(search.toLowerCase()) ||
      rb.id.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleExecuteRunbook = async (isDryRun = false) => {
    audioService.playAlert(2);
    setExecutionComplete(false);
    setExecutionLogs([]);
    const prefix = isDryRun ? '[DRY-RUN]' : '[LIVE-EXEC]';

    logService.addLog(
      'AGENT',
      'RUNBOOK_DISPATCH',
      `${prefix} Dispatched runbook ${selectedRunbook.id}: ${selectedRunbook.name}`
    );

    for (let i = 0; i < selectedRunbook.steps.length; i++) {
      setExecutingStep(i);
      audioService.playClick();
      const stepText = selectedRunbook.steps[i];
      setExecutionLogs((prev) => [...prev, `${prefix} Step ${i + 1}/${selectedRunbook.steps.length}: ${stepText}`]);
      logService.addLog('INFO', 'RUNBOOK_STEP', `${selectedRunbook.id} Step ${i + 1}: ${stepText}`);
      await new Promise((r) => setTimeout(r, 650));
    }

    setExecutingStep(null);
    setExecutionComplete(true);
    audioService.playSuccess();
    logService.addLog(
      'SUCCESS',
      'RUNBOOK_COMPLETE',
      `${prefix} Successfully executed ${selectedRunbook.id} in ${selectedRunbook.estimatedTime}. All assertions passed.`
    );
  };

  return (
    <>
      <button className="drawer-backdrop" onClick={onClose} aria-label="Close runbooks" />
      <div className="runbook-modal" role="dialog" aria-modal="true" aria-label="Security Response Runbook Library">
        <div className="runbook-header">
          <div className="runbook-header-title">
            <span className="runbook-badge"><BookOpen size={18} /></span>
            <div>
              <h2>SOC Response &amp; Mitigation Runbooks</h2>
              <p>24 pre-approved deterministic mitigation runbooks with automated control plane integrations.</p>
            </div>
          </div>
          <button className="console-btn close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="runbook-body-grid">
          <div className="runbook-sidebar-list">
            <div className="runbook-search">
              <Search size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search runbooks..."
              />
            </div>
            <div className="runbook-cats">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`runbook-cat-pill ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => {
                    audioService.playClick();
                    setSelectedCategory(cat);
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="runbook-items-scroll">
              {filteredRunbooks.map((rb) => {
                const isSelected = selectedRunbook.id === rb.id;
                return (
                  <button
                    key={rb.id}
                    className={`runbook-nav-item ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      audioService.playClick();
                      setSelectedRunbook(rb);
                      setExecutionComplete(false);
                      setExecutionLogs([]);
                    }}
                  >
                    <div className="runbook-nav-top">
                      <code>{rb.id}</code>
                      <span className={`runbook-tag ${rb.category.toLowerCase()}`}>{rb.category}</span>
                    </div>
                    <strong>{rb.name}</strong>
                    <p>{rb.description}</p>
                    <div className="runbook-nav-meta">
                      <span><Clock size={11} /> {rb.estimatedTime}</span>
                      {rb.automated && <span className="auto-pill"><Zap size={10} /> Auto</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="runbook-detail-panel">
            <div className="runbook-detail-header">
              <div>
                <div className="runbook-detail-sub">
                  <code>{selectedRunbook.id}</code>
                  <span className={`runbook-tag ${selectedRunbook.category.toLowerCase()}`}>{selectedRunbook.category}</span>
                  <span>Est. Time: {selectedRunbook.estimatedTime}</span>
                </div>
                <h3>{selectedRunbook.name}</h3>
                <p>{selectedRunbook.description}</p>
              </div>
              <div className="runbook-detail-actions">
                <button
                  className="runbook-btn secondary"
                  onClick={() => handleExecuteRunbook(true)}
                  disabled={executingStep !== null}
                >
                  <RotateCcw size={14} /> Simulate Dry Run
                </button>
                <button
                  className="runbook-btn primary"
                  onClick={() => handleExecuteRunbook(false)}
                  disabled={executingStep !== null}
                >
                  <Play size={14} /> Execute Runbook
                </button>
              </div>
            </div>

            <div className="runbook-steps-card">
              <h4>Ordered Execution Steps</h4>
              <div className="runbook-steps-list">
                {selectedRunbook.steps.map((step, idx) => {
                  const isRunning = executingStep === idx;
                  const isDone = executionComplete || (executingStep !== null && executingStep > idx);
                  return (
                    <div
                      key={idx}
                      className={`runbook-step-row ${isRunning ? 'running' : ''} ${isDone ? 'completed' : ''}`}
                    >
                      <span className="step-num">
                        {isDone ? <CheckCircle2 size={15} /> : isRunning ? <span className="step-spinner" /> : `0${idx + 1}`}
                      </span>
                      <div className="step-content">
                        <strong>Step {idx + 1}</strong>
                        <p>{step}</p>
                      </div>
                      {isRunning && <span className="step-executing-label">Executing...</span>}
                      {isDone && <span className="step-done-label">Verified</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {executionLogs.length > 0 && (
              <div className="runbook-exec-terminal">
                <div className="terminal-header">
                  <Terminal size={14} />
                  <span>Execution Audit Stream</span>
                  {executionComplete && <em className="complete-tag">PASSED</em>}
                </div>
                <div className="terminal-body">
                  {executionLogs.map((line, idx) => (
                    <div key={idx} className="terminal-line">
                      <span className="prompt">&gt;</span> {line}
                    </div>
                  ))}
                  {executionComplete && (
                    <div className="terminal-line success">
                      [SUCCESS] Runbook {selectedRunbook.id} finished with 0 errors. All containment boundaries applied.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="runbook-ai-prompt-box">
              <Sparkles size={16} />
              <div>
                <strong>Need AI reasoning on this runbook?</strong>
                <p>Ask Aegis Twin to assess entity context and customize parameter values for this workflow.</p>
              </div>
              <button
                className="ask-aegis-btn"
                onClick={() => {
                  audioService.playClick();
                  onClose();
                  onRunTriage?.(`Assess the environment and recommend specific parameters for executing runbook ${selectedRunbook.id}: ${selectedRunbook.name}`);
                }}
              >
                Assess with Aegis <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
