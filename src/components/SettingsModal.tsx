import React, { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  Headphones,
  Key,
  Lock,
  Moon,
  Radio,
  RotateCcw,
  Settings,
  Shield,
  Sliders,
  Sun,
  User,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { audioService } from '../services/audioService';
import { logService } from '../services/logService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [sfxEnabled, setSfxEnabled] = useState(audioService.getSfxEnabled());
  const [speechRate, setSpeechRate] = useState(audioService.getSpeechRate());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>(audioService.getSelectedVoiceURI() || '');
  const [operatorName, setOperatorName] = useState('Alex Morgan');
  const [operatorRole, setOperatorRole] = useState('Security Administrator');
  const [autoContainment, setAutoContainment] = useState(false);
  const [defconSound, setDefconSound] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'audio' | 'ai' | 'keys'>('audio');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const updateVoices = () => {
      const v = audioService.getAvailableVoices();
      setVoices(v);
    };
    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  if (!isOpen) return null;

  const handleToggleSfx = () => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    audioService.setSfxEnabled(next);
    if (next) audioService.playClick();
  };

  const handleRateChange = (rate: number) => {
    setSpeechRate(rate);
    audioService.setSpeechRate(rate);
  };

  const handleVoiceChange = (uri: string) => {
    setSelectedVoice(uri);
    audioService.setSelectedVoiceURI(uri || null);
  };

  const handleTestVoice = () => {
    audioService.playClick();
    void audioService.playVoiceBriefing('DEFCON 1 alert test. Aegis Twin voice synthesis is fully operational.');
  };

  const handleTestSfx = (type: 'click' | 'success' | 'alert' | 'scan') => {
    if (type === 'click') audioService.playClick();
    if (type === 'success') audioService.playSuccess();
    if (type === 'alert') audioService.playAlert(1);
    if (type === 'scan') audioService.playScan();
  };

  const handleSave = () => {
    audioService.playSuccess();
    logService.addLog('INFO', 'SETTINGS', `Operator preferences updated: SFX=${sfxEnabled}, VoiceRate=${speechRate}x`);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <>
      <button className="drawer-backdrop" onClick={onClose} aria-label="Close settings" />
      <div className="settings-modal" role="dialog" aria-modal="true" aria-label="SOC Operator Settings">
        <div className="settings-modal-header">
          <div className="settings-modal-title">
            <span className="settings-badge"><Settings size={18} /></span>
            <div>
              <h2>SOC &amp; Operator Settings</h2>
              <p>Configure voice vocalization, synthesized sound effects, AI policies, and credentials.</p>
            </div>
          </div>
          <button className="console-btn close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="settings-body-wrap">
          <div className="settings-tabs">
            <button
              className={`settings-tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
              onClick={() => { audioService.playClick(); setActiveTab('audio'); }}
            >
              <Volume2 size={16} /> Audio &amp; Voice
            </button>
            <button
              className={`settings-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => { audioService.playClick(); setActiveTab('profile'); }}
            >
              <User size={16} /> Operator Profile
            </button>
            <button
              className={`settings-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => { audioService.playClick(); setActiveTab('ai'); }}
            >
              <Shield size={16} /> AI &amp; DEFCON Policy
            </button>
            <button
              className={`settings-tab-btn ${activeTab === 'keys' ? 'active' : ''}`}
              onClick={() => { audioService.playClick(); setActiveTab('keys'); }}
            >
              <Key size={16} /> API Connectors
            </button>
          </div>

          <div className="settings-content-panel">
            {activeTab === 'audio' && (
              <div className="settings-section">
                <h3>Audio &amp; Voice Synthesis</h3>
                <p className="settings-section-desc">Manage synthesized sound feedback and text-to-speech incident briefings.</p>

                <div className="setting-row">
                  <div>
                    <strong>UI Sound Effects (Web Audio API)</strong>
                    <span>Synthesizes crisp click sounds, sonar blips, and alert klaxons with zero latency.</span>
                  </div>
                  <button className={`toggle-btn ${sfxEnabled ? 'on' : 'off'}`} onClick={handleToggleSfx}>
                    {sfxEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    <span>{sfxEnabled ? 'Enabled' : 'Muted'}</span>
                  </button>
                </div>

                <div className="sound-test-grid">
                  <span>Test sound effects:</span>
                  <button onClick={() => handleTestSfx('click')}>Click</button>
                  <button onClick={() => handleTestSfx('success')}>Success Chime</button>
                  <button onClick={() => handleTestSfx('scan')}>Radar Scan</button>
                  <button onClick={() => handleTestSfx('alert')}>DEFCON Siren</button>
                </div>

                <div className="setting-row">
                  <div>
                    <strong>Voice Synthesis Speech Rate</strong>
                    <span>Adjust playback speed for spoken incident briefings ({speechRate.toFixed(2)}x).</span>
                  </div>
                  <div className="speed-selector">
                    {[0.8, 1.0, 1.2, 1.4].map((rate) => (
                      <button
                        key={rate}
                        className={`speed-pill ${speechRate === rate ? 'active' : ''}`}
                        onClick={() => handleRateChange(rate)}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="setting-row vertical">
                  <div>
                    <strong>Synthesizer Voice Model</strong>
                    <span>Select from available system voice engines for local spoken briefings.</span>
                  </div>
                  <select
                    className="voice-select"
                    value={selectedVoice}
                    onChange={(e) => handleVoiceChange(e.target.value)}
                  >
                    <option value="">Default Aegis Voice (Terrell / AI Balanced)</option>
                    {voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="voice-test-row">
                  <button className="test-voice-btn" onClick={handleTestVoice}>
                    <Headphones size={15} /> Play Voice Sample
                  </button>
                  <span>Previews the configured speech voice and pacing.</span>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="settings-section">
                <h3>Operator Profile</h3>
                <p className="settings-section-desc">Manage operator identity, duty shift, and access tier.</p>

                <div className="setting-row vertical">
                  <label>Operator Full Name</label>
                  <input
                    className="settings-input"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                  />
                </div>

                <div className="setting-row vertical">
                  <label>Security Role / Clearance</label>
                  <input
                    className="settings-input"
                    value={operatorRole}
                    onChange={(e) => setOperatorRole(e.target.value)}
                  />
                </div>

                <div className="profile-badge-preview">
                  <div className="profile-avatar-large">AM</div>
                  <div>
                    <strong>{operatorName}</strong>
                    <span>{operatorRole} · SOC Tier 3 Lead</span>
                    <small>Active Shift: 08:00 - 18:00 UTC · MFA Authenticated</small>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="settings-section">
                <h3>AI &amp; DEFCON Policy Configuration</h3>
                <p className="settings-section-desc">Fine-tune safety boundaries and automated containment permissions.</p>

                <div className="setting-row">
                  <div>
                    <strong>Require Human Operator Approval</strong>
                    <span>Every critical containment (host isolation, token kill) requires operator 1-click confirmation.</span>
                  </div>
                  <span className="policy-enforced-tag"><Lock size={12} /> ENFORCED</span>
                </div>

                <div className="setting-row">
                  <div>
                    <strong>DEFCON 1 Audio Siren Alert</strong>
                    <span>Play high-priority acoustic warning when critical breach indicators are correlated.</span>
                  </div>
                  <button
                    className={`toggle-btn ${defconSound ? 'on' : 'off'}`}
                    onClick={() => setDefconSound(!defconSound)}
                  >
                    <span>{defconSound ? 'Active' : 'Silent'}</span>
                  </button>
                </div>

                <div className="setting-row">
                  <div>
                    <strong>Prompt-Injection Isolation Sandbox</strong>
                    <span>Treat untrusted operator transcripts and uploaded log data as evidence only.</span>
                  </div>
                  <span className="policy-enforced-tag"><Lock size={12} /> ACTIVE</span>
                </div>
              </div>
            )}

            {activeTab === 'keys' && (
              <div className="settings-section">
                <h3>API Connector Status</h3>
                <p className="settings-section-desc">Provider credentials are kept securely in server environment variables (.env).</p>

                <div className="api-key-item">
                  <div className="api-key-header">
                    <strong>Deepgram Nova-3 (STT)</strong>
                    <span className="key-configured-badge"><Check size={11} /> READY</span>
                  </div>
                  <code>DEEPGRAM_API_KEY=••••••••••••••••</code>
                  <p>Voice ingestion with boosted cybersecurity terminology.</p>
                </div>

                <div className="api-key-item">
                  <div className="api-key-header">
                    <strong>Google Gemini 2.5 Flash</strong>
                    <span className="key-configured-badge"><Check size={11} /> READY</span>
                  </div>
                  <code>GEMINI_API_KEY=••••••••••••••••</code>
                  <p>Schema-constrained reasoning and MITRE ATT&amp;CK correlation.</p>
                </div>

                <div className="api-key-item">
                  <div className="api-key-header">
                    <strong>Murf AI Voice Studio (TTS)</strong>
                    <span className="key-configured-badge"><Check size={11} /> READY</span>
                  </div>
                  <code>MURF_API_KEY=••••••••••••••••</code>
                  <p>GEN2 spoken incident briefings with natural cadence.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="settings-modal-footer">
          <button className="console-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="save-settings-btn" onClick={handleSave}>
            {saveSuccess ? <Check size={16} /> : <Check size={16} />}
            <span>{saveSuccess ? 'Saved Successfully!' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </>
  );
};
