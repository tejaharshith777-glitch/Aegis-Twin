import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpen,
  Boxes,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Cloud,
  Command,
  Copy,
  Crosshair,
  Database,
  Download,
  FileSearch,
  FileText,
  Fingerprint,
  Gauge,
  Headphones,
  History,
  Info,
  Laptop,
  LayoutDashboard,
  Lock,
  Menu,
  Mic,
  Network,
  Play,
  Radar,
  Radio,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  ShieldHalf,
  Sparkles,
  Terminal,
  UploadCloud,
  X,
  Zap,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
type IncidentStatus = 'Investigating' | 'Contained' | 'Monitoring' | 'Resolved';

interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  source: string;
  entity: string;
  detectedAt: string;
  ago: string;
  assignee: string;
  score: number;
  origin?: 'seed' | 'telemetry' | 'manual';
}

interface Evidence {
  label: string;
  value: string;
  note: string;
  tone: 'danger' | 'warning' | 'neutral' | 'success';
}

interface MitreTechnique {
  id: string;
  name: string;
  tactic: string;
}

interface Directive {
  priority: number;
  action: string;
  detail: string;
}

interface AgentResult {
  caseId?: string;
  analysisId: string;
  query: string;
  headline: string;
  summary: string;
  category: string;
  severity: Severity;
  defcon: 1 | 2 | 3;
  confidence: number;
  riskScore: number;
  source: 'Gemini' | 'Aegis Local' | 'Browser Local';
  voiceText: string;
  incident?: Incident;
  evidence: Evidence[];
  reasoning: string[];
  mitreTechniques: MitreTechnique[];
  directives: Directive[];
  actions: Array<{ id: string; label: string; kind: 'primary' | 'secondary' }>;
  completedAt: string;
  providerDegraded?: boolean;
}

interface IntegrationStatus {
  deepgram: boolean;
  gemini: boolean;
  murf: boolean;
  mode: 'live' | 'local';
}

interface Asset {
  id: string;
  name: string;
  type: string;
  platform: string;
  owner: string;
  status: 'online' | 'offline' | 'isolated';
  criticality: Severity;
  lastSeen: string;
  riskScore: number;
  discovered?: boolean;
}

interface MetricsData {
  openIncidents: number;
  criticalCount: number;
  signalsAnalyzed24h: number;
  meanTimeToTriageMs: number | null;
  meanTimeToContainMs: number | null;
  controlHealthPct: number;
  assetsTotal: number;
  assetsReporting: number;
  coveragePct: number;
  riskIndex: number;
  riskTrend7d: number[];
}

const pipelineStepsText = [
  'Understanding your command',
  'Correlating security telemetry',
  'Evaluating risk and controls',
  'Preparing response options',
];

const faqs = [
  { q: 'What exactly is Aegis Twin?', a: 'Aegis Twin is a voice-activated AI digital twin of a security operations analyst. It ingests telemetry, logs, and spoken reports, reasons over attack patterns with schema-constrained LLM policies, maps behaviors to MITRE ATT&CK, assigns DEFCON levels, and produces ordered mitigation directives.' },
  { q: 'Does it replace my SOC analysts?', a: 'No — it removes the repetitive tier-one triage workload. Every verdict ships with clear evidence and transparent reasoning chains, and containment always stays human-in-the-loop unless explicitly authorized.' },
  { q: 'How does the live console work?', a: 'The console on this page is connected directly to the Aegis policy engine. Type any security question or speak a command, and the agent returns a scored assessment with evidence, MITRE techniques, and recommended directives.' },
  { q: 'What happens if API keys are missing?', a: 'Aegis Twin never fails closed. If speech, Gemini, or Murf APIs are unavailable, deterministic local and browser engines seamlessly take over triage, transcription, and speech synthesis.' },
  { q: 'Is my data safe and private?', a: 'Yes. Secrets stay strictly server-side, telemetry is processed in isolated tenants, encrypted in transit and at rest, and never used for model training.' },
];

/* ------------------------------------------------------------------ */
/* Main Aegis Component                                               */
/* ------------------------------------------------------------------ */

export default function App() {
  /* State */
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [operatorName, setOperatorName] = useState<string>('operator');

  const [query, setQuery] = useState('');
  const [workspaceView, setWorkspaceView] = useState<'assets' | 'files' | 'integrations' | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus>({ deepgram: false, gemini: false, murf: false, mode: 'local' });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [actionStage, setActionStage] = useState<'idle' | 'requesting' | 'executing' | 'verifying' | 'done' | 'failed'>('idle');
  const [actionInFlightId, setActionInFlightId] = useState<string | null>(null);

  const [showAllIncidents, setShowAllIncidents] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isNavOverlayOpen, setIsNavOverlayOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  /* Refs */
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const deepgramSocketRef = useRef<WebSocket | null>(null);
  const fallbackRecognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef('');
  const voiceLatestRef = useRef('');
  const voiceProcessedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /* Toast Helper */
  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  /* Time & Date Formatting */
  const now = new Date();
  const dateEyebrow = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(now);
  const currentHour = now.getHours();
  const greetingTime = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const tzName = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).format(now).split(' ').pop() || 'UTC';
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  /* Data Fetching & Real-Time SSE Stream */
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {}
  }, []);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/incidents');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.incidents)) setIncidents(data.incidents);
      }
    } catch {}
  }, []);

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch('/api/assets');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.assets)) setAssets(data.assets);
      }
    } catch {}
  }, []);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/session');
      if (res.ok) {
        const data = await res.json();
        if (data.name) setOperatorName(data.name);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchSession();
    fetchIncidents();
    fetchAssets();
    fetchMetrics();

    // Setup SSE Event Stream
    const eventSource = new EventSource('/api/stream');
    eventSource.onmessage = (event) => {
      try {
        const e = JSON.parse(event.data);
        if (e.type.startsWith('incident.')) fetchIncidents();
        if (e.type.startsWith('asset.')) fetchAssets();
        fetchMetrics();
      } catch {}
    };

    const metricsInterval = setInterval(fetchMetrics, 15000);

    return () => {
      eventSource.close();
      clearInterval(metricsInterval);
    };
  }, [fetchSession, fetchIncidents, fetchAssets, fetchMetrics]);

  /* Keyboard Shortcuts */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setWorkspaceView(null);
        setDrawerOpen(false);
        setIsNavOverlayOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /* Pipeline Step Timer */
  useEffect(() => {
    if (isAnalyzing) {
      setPipelineStep(0);
      const interval = setInterval(() => {
        setPipelineStep((step) => Math.min(step + 1, pipelineStepsText.length - 1));
      }, 430);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  /* runTriage Function */
  const runTriage = useCallback(
    async (commandText: string) => {
      const clean = commandText.trim();
      if (!clean || isAnalyzing) return;

      setIsCommandPaletteOpen(false);
      setWorkspaceView(null);
      setIsAnalyzing(true);
      setQuery(clean);

      const startTime = Date.now();
      let triageResult: AgentResult;

      try {
        const res = await fetch('/api/agent/triage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: clean }),
        });
        if (!res.ok) throw new Error('Backend triage returned an error.');
        triageResult = await res.json();
      } catch {
        showToast('Gemini unavailable; Aegis Local engine produced verdict.');
        triageResult = { ...localBrowserTriage(clean, incidents), source: 'Browser Local' };
      }

      const elapsed = Date.now() - startTime;
      if (elapsed < 1650) {
        await new Promise((resolve) => setTimeout(resolve, 1650 - elapsed));
      }

      setResult(triageResult);
      setIsAnalyzing(false);
      setDrawerOpen(true);
      setQuery('');
      fetchMetrics();
    },
    [isAnalyzing, incidents, showToast, fetchMetrics],
  );

  /* Audio Cleanup & Device Change Handler */
  const stopVoiceCapture = useCallback((notifyProvider = true) => {
    setIsListening(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (deepgramSocketRef.current) {
      if (notifyProvider && deepgramSocketRef.current.readyState === WebSocket.OPEN) {
        try {
          deepgramSocketRef.current.send(JSON.stringify({ type: 'stop' }));
        } catch {}
      }
      setTimeout(() => {
        if (deepgramSocketRef.current) {
          deepgramSocketRef.current.close();
          deepgramSocketRef.current = null;
        }
      }, 600);
    }
    if (fallbackRecognitionRef.current) {
      try {
        fallbackRecognitionRef.current.stop();
      } catch {}
    }
  }, []);

  useEffect(() => {
    const handleDeviceChange = () => {
      if (isListening) {
        showToast('Audio device changed; resetting microphone capture.');
        stopVoiceCapture(true);
      }
    };
    if (navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    }
  }, [isListening, stopVoiceCapture, showToast]);

  const processFinalTranscript = useCallback(() => {
    if (voiceProcessedRef.current) return;
    voiceProcessedRef.current = true;
    const finalMsg = voiceTranscriptRef.current.trim() || voiceLatestRef.current.trim();
    if (finalMsg) {
      runTriage(finalMsg);
    }
  }, [runTriage]);

  const startBrowserFallback = useCallback(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      showToast('Speech recognition is not supported in this browser.');
      setIsListening(false);
      return;
    }
    showToast('Live transcription unavailable; switched to browser voice engine.');
    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          voiceTranscriptRef.current += ' ' + event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      voiceLatestRef.current = interim;
      setQuery(voiceTranscriptRef.current + ' ' + interim);
    };

    recognition.onerror = () => {
      stopVoiceCapture(false);
      processFinalTranscript();
    };

    recognition.onend = () => {
      stopVoiceCapture(false);
      processFinalTranscript();
    };

    fallbackRecognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [showToast, stopVoiceCapture, processFinalTranscript]);

  const handleMic = useCallback(async () => {
    if (isListening) {
      stopVoiceCapture(true);
      setTimeout(() => processFinalTranscript(), 800);
      return;
    }

    voiceTranscriptRef.current = '';
    voiceLatestRef.current = '';
    voiceProcessedRef.current = false;

    if (!navigator.mediaDevices || !window.MediaRecorder || !integrations.deepgram) {
      startBrowserFallback();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      mediaStreamRef.current = stream;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socketUrl = `${wsProtocol}//${window.location.host}/api/listen`;
      const socket = new WebSocket(socketUrl);
      deepgramSocketRef.current = socket;

      socket.onopen = () => {
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(e.data);
          }
        };
        recorder.start(250);
        setIsListening(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'transcript' && data.transcript) {
            if (data.isFinal) {
              voiceTranscriptRef.current += ' ' + data.transcript;
            }
            voiceLatestRef.current = data.transcript;
            setQuery(voiceTranscriptRef.current + ' ' + (data.isFinal ? '' : data.transcript));

            if (data.speechFinal) {
              stopVoiceCapture(true);
              processFinalTranscript();
            }
          }
        } catch {}
      };

      socket.onerror = () => {
        socket.close();
        startBrowserFallback();
      };
    } catch {
      showToast('Microphone access was not granted.');
    }
  }, [isListening, integrations.deepgram, startBrowserFallback, stopVoiceCapture, processFinalTranscript, showToast]);

  const handlePlayBriefing = useCallback(async () => {
    if (!result?.voiceText || isVoiceLoading) return;
    setIsVoiceLoading(true);

    try {
      const res = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: result.voiceText }),
      });

      if (!res.ok) throw new Error('Murf audio synthesis failed.');

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => URL.revokeObjectURL(audioUrl);
      audio.onerror = () => URL.revokeObjectURL(audioUrl);

      audio.play();
      showToast('Playing Murf AI audio briefing.');
    } catch {
      showToast('Murf unavailable; playing browser speech synthesis fallback.');
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(result.voiceText);
        window.speechSynthesis.speak(utterance);
      }
    } finally {
      setIsVoiceLoading(false);
    }
  }, [result, isVoiceLoading, showToast]);

  const handleDispatchAction = useCallback(
    async (actionId: string, targetValue: string) => {
      setActionInFlightId(actionId);
      setActionStage('requesting');

      const idempotencyKey = crypto.randomUUID();

      try {
        setActionStage('executing');
        const res = await fetch('/api/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
          body: JSON.stringify({
            caseId: result?.caseId,
            action: actionId,
            target: { kind: 'asset', value: targetValue },
            approvedBy: operatorName,
            idempotencyKey,
          }),
        });

        setActionStage('verifying');
        const data = await res.json();

        if (!res.ok || !data.ok) {
          setActionStage('failed');
          showToast(`Action Failed: ${data.error || data.message || 'Execution error'}`);
          return;
        }

        setActionStage('done');
        showToast(data.message || 'Action executed and verified.');
        fetchIncidents();
        fetchAssets();
      } catch (err: any) {
        setActionStage('failed');
        showToast(`Action Failure: ${err.message || 'Network error'}`);
      } finally {
        setTimeout(() => setActionInFlightId(null), 2000);
      }
    },
    [result, operatorName, showToast, fetchIncidents, fetchAssets],
  );

  const handleDownloadReport = useCallback(() => {
    if (!result?.caseId) {
      showToast('No active case ID for brief download.');
      return;
    }
    window.open(`/api/cases/${result.caseId}/report.md`, '_blank');
    showToast(`Downloaded case brief report for ${result.caseId}`);
  }, [result, showToast]);

  const visibleIncidents = showAllIncidents ? incidents : incidents.slice(0, 4);

  // Dynamic Sparkline SVG path generation from real riskTrend7d
  const sparklinePath = useMemo(() => {
    const trend = metrics?.riskTrend7d || [42, 38, 35, 34, 31, 29, metrics?.riskIndex || 28];
    const width = 320;
    const height = 60;
    const step = width / (trend.length - 1);
    const maxVal = 100;

    const points = trend.map((val, idx) => {
      const x = idx * step;
      const y = height - (val / maxVal) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [metrics]);

  return (
    <div className="site-layout">
      {/* 1. Header Bar */}
      <div className="site-top-banner">
        <span>Aegis Autonomous Defense / Production Node</span>
        <button
          className="mono"
          style={{ color: 'var(--mint)', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => document.getElementById('console')?.scrollIntoView({ behavior: 'smooth' })}
        >
          Explore the system →
        </button>
      </div>

      <header className="site-header">
        <a href="#" className="header-brand">
          <div className="brand-icon-tile">
            <ShieldCheck size={20} />
          </div>
          <span className="brand-logo-text">AEGIS / TWIN</span>
        </a>

        <ul className="header-nav-links">
          <li><a href="#platform" className="header-nav-link">Platform</a></li>
          <li><a href="#impact" className="header-nav-link">Impact</a></li>
          <li><a href="#protocol" className="header-nav-link">Protocol</a></li>
          <li><a href="#intelligence" className="header-nav-link">Intelligence</a></li>
          <li><a href="#faq" className="header-nav-link">FAQ</a></li>
        </ul>

        <div className="header-actions">
          <button
            className="header-cta-btn"
            onClick={() => document.getElementById('console')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <span>Run live triage</span>
            <ArrowRight size={14} />
          </button>

          <button
            className="two-line-menu-btn"
            aria-label="Open Full Menu"
            onClick={() => setIsNavOverlayOpen(true)}
          >
            <div className="menu-line" />
            <div className="menu-line" />
          </button>
        </div>
      </header>

      {/* 2. Hero Landing Section */}
      <section className="hero-landing-section">
        <div className="hero-landing-container">
          <div className="hero-left-copy">
            <span className="micro-label">* AUTONOMOUS SECURITY OPERATIONS</span>
            <h1 className="hero-headline">
              Security that <br />
              <span className="highlight-orange">thinks ahead.</span>
            </h1>
            <p className="hero-subcopy">
              A voice-activated digital twin that sees the whole attack, reasons through the noise, and puts decisive action in your hands.
            </p>

            <div className="hero-btn-row">
              <button
                className="primary-hero-btn"
                onClick={() => document.getElementById('console')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <span>Command your twin</span>
                <ArrowRight size={16} />
              </button>

              <button
                className="secondary-hero-btn"
                onClick={() => document.getElementById('intelligence')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play size={14} />
                <span>See how it works</span>
              </button>
            </div>
          </div>

          <div className="hero-preview-card">
            <div className="server-room-bg" />
            <div className="orange-laser-line" />
            <div className="hero-preview-top-badge">
              <span className="pulse-dot" />
              <span>LIVE SYSTEM</span>
            </div>

            <div className="hero-preview-signal-badge">
              <div className="signal-header">
                <span>SIGNAL // 0084</span>
                <span>{currentTime}</span>
              </div>
              <div className="signal-body">
                Encoded process chain correlated on <span className="signal-entity">WIN-FIN-07</span>
              </div>
              <div className="signal-bar" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Ticker Marquee */}
      <section className="marquee-section">
        <div className="marquee-track">
          <span className="marquee-label">BUILT TO OPERATE ACROSS YOUR STACK</span>
          <span className="marquee-item">• AWS</span>
          <span className="marquee-item">• CROWDSTRIKE</span>
          <span className="marquee-item">• SENTINEL</span>
          <span className="marquee-item">• OKTA</span>
          <span className="marquee-item">• PALO ALTO</span>
          <span className="marquee-item">• SPLUNK</span>
          <span className="marquee-item">• AWS</span>
          <span className="marquee-item">• CROWDSTRIKE</span>
        </div>
      </section>

      {/* 4. Intelligence Layer Section */}
      <section className="intelligence-section" id="intelligence">
        <div className="intelligence-container">
          <div className="intelligence-copy">
            <span className="micro-label">* THE INTELLIGENCE LAYER</span>
            <h2 className="intelligence-headline">
              Not another dashboard. <br />
              <span className="dim-text">A second mind for defense.</span>
            </h2>
            <p className="intelligence-subtext">
              Aegis turns fragmented telemetry into one operating picture—then translates that picture into a clear, evidence-backed decision.
            </p>
          </div>

          <div className="radar-graphic-box">
            <div className="radar-ring r1" />
            <div className="radar-ring r2" />
            <div className="radar-ring r3" />
            <div className="radar-sweep-hand" />
            <div className="radar-core-icon">
              <Shield size={32} />
            </div>
          </div>
        </div>
      </section>

      {/* 5. Live Operator Console */}
      <section className="console-section-wrapper" id="console">
        <div className="console-section-header">
          <div>
            <span className="micro-label">LIVE CONTROL PLANE</span>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--ink)', marginTop: '2px' }}>
              Operator Console
            </h2>
          </div>
          <div className="system-status-indicator">
            <span className="pulse-dot" />
            <span>REAL-TIME TELEMETRY ENGINE</span>
          </div>
        </div>

        <div className="dashboard-body">
          {/* Welcome Row with Real Time & Greeting */}
          <div className="welcome-row">
            <div className="welcome-content">
              <span className="micro-label" style={{ color: 'var(--muted)' }}>{dateEyebrow}</span>
              <h1>{greetingTime}, {operatorName}.</h1>
              <p className="welcome-sub">
                Your environment is protected. Aegis has reviewed {metrics ? metrics.signalsAnalyzed24h : '—'} signals in the last 24 hours.
              </p>
            </div>
            <button
              className="brief-btn"
              onClick={() => runTriage('Give me my morning security posture briefing')}
            >
              <Sparkles size={16} />
              <span>Morning brief</span>
            </button>
          </div>

          {/* Hero Grid — Agent Console + Posture Card */}
          <div className="hero-grid">
            {/* Agent Console */}
            <div className="agent-console">
              <div className="console-bg-glow-1" />
              <div className="console-bg-glow-2" />

              <div className="console-topline">
                <div className="console-agent-identity">
                  <div className="bot-avatar">
                    <BrainCircuit size={22} />
                  </div>
                  <div className="agent-meta-text">
                    <span className="agent-name-title">Aegis Twin</span>
                    <span className="agent-status-sub">Online · watching {metrics?.assetsReporting || 0} active sources</span>
                  </div>
                </div>
                <div className="privacy-badge">
                  <Lock size={12} />
                  <span>Private tenant</span>
                </div>
              </div>

              {/* Side-by-Side Voice Agent Layout */}
              <div className="console-hero-center">
                <div className={`voice-orb-wrapper ${isListening ? 'listening' : ''}`}>
                  <div className="orbit-ring-1" />
                  <div className="orbit-ring-2" />
                  <button
                    className={`voice-orb-btn ${isListening ? 'listening' : ''}`}
                    aria-label="Toggle Voice Ingestion"
                    onClick={handleMic}
                  >
                    <Mic size={28} />
                  </button>
                </div>

                <div className="console-hero-text">
                  <span className="micro-label" style={{ color: 'var(--mint)', marginBottom: '4px' }}>
                    {isListening ? 'LISTENING FOR YOUR COMMAND' : 'AEGIS IS READY'}
                  </span>
                  <h3 className="console-copy-title" style={{ fontSize: '24px' }}>
                    {isListening ? 'Listening...' : 'What should we investigate?'}
                  </h3>
                  <p className="console-copy-sub">
                    {isListening
                      ? "Speak naturally. I'll start triage when you finish."
                      : 'Speak naturally or type an incident, asset, or behavior below.'}
                  </p>
                </div>
              </div>

              {/* Command Input Bar */}
              <div className="command-bar-container">
                <form
                  className="command-bar-form"
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault();
                    runTriage(query);
                  }}
                >
                  <Command size={18} className="command-icon" />
                  <input
                    ref={inputRef}
                    type="text"
                    className="command-input"
                    placeholder="Ask Aegis about an alert, identity, or device…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <button
                    type="button"
                    className={`inline-mic-btn ${isListening ? 'active' : ''}`}
                    aria-label="Toggle microphone"
                    onClick={handleMic}
                  >
                    <Mic size={18} />
                  </button>
                  <button
                    type="submit"
                    className="command-submit-btn"
                    aria-label="Submit command"
                    disabled={!query.trim() || isAnalyzing}
                  >
                    <Send size={16} />
                  </button>
                </form>

                <div className="quick-prompts-row">
                  <span className="micro-label" style={{ color: '#6b807a' }}>Quick prompts:</span>
                  <button className="quick-prompt-chip" onClick={() => runTriage('Review failed logins for m.chen@northstar.io')}>
                    Failed logins
                  </button>
                  <button className="quick-prompt-chip" onClick={() => runTriage('Investigate the PowerShell activity on WIN-FIN-07')}>
                    INC-4281
                  </button>
                  <button className="quick-prompt-chip" onClick={() => runTriage('Summarize data exfiltration risk on ENG-LT-142')}>
                    Data uploads
                  </button>
                </div>

                <div className="integration-ribbon">
                  <div className="integration-chips">
                    <div className={`provider-chip ${integrations.deepgram ? 'active' : ''}`}>
                      <span className="provider-chip-dot" />
                      <span>Deepgram</span>
                    </div>
                    <div className={`provider-chip ${integrations.gemini ? 'active' : ''}`}>
                      <span className="provider-chip-dot" />
                      <span>Gemini</span>
                    </div>
                    <div className={`provider-chip ${integrations.murf ? 'active' : ''}`}>
                      <span className="provider-chip-dot" />
                      <span>Murf AI</span>
                    </div>
                  </div>

                  <span className={`mode-tag ${integrations.mode}`}>
                    {integrations.mode === 'live' ? 'LIVE PIPELINE' : 'LOCAL FALLBACK'}
                  </span>
                </div>
              </div>

              {/* Analysis Overlay */}
              {isAnalyzing && (
                <div className="analysis-overlay" role="status" aria-live="polite">
                  <div className="scan-line" />
                  <div className="sparkles-core">
                    <Sparkles size={24} />
                  </div>
                  <span className="analysis-overlay-title">AEGIS IS INVESTIGATING</span>
                  <p className="analysis-overlay-step-text">{pipelineStepsText[pipelineStep]}</p>
                </div>
              )}
            </div>

            {/* Posture Card */}
            <div className="posture-card">
              <div className="posture-card-header">
                <span className="micro-label" style={{ color: 'var(--muted)' }}>LIVE RISK INDEX</span>
                <span className="status-pill contained">STABLE</span>
              </div>

              <div className="risk-ring-container">
                <div className="risk-ring" style={{ '--score': `${(metrics?.riskIndex || 28) * 3.6}deg` } as React.CSSProperties}>
                  <div className="risk-ring-inner">
                    <span className="risk-score-num">{metrics ? metrics.riskIndex : '—'}</span>
                    <span className="risk-score-label">{(metrics?.riskIndex || 28) > 70 ? 'HIGH RISK' : (metrics?.riskIndex || 28) > 40 ? 'MED RISK' : 'LOW RISK'}</span>
                  </div>
                </div>
                <div className="risk-trend-indicator">
                  <span className="mono">↓ 6 pts</span>
                  <span>Improving</span>
                </div>
              </div>

              {/* Real 7-day Risk Trend Sparkline */}
              <div style={{ marginTop: '12px', height: '60px' }}>
                <svg width="100%" height="100%" viewBox="0 0 320 60" style={{ overflow: 'visible' }}>
                  <path d={sparklinePath} fill="none" stroke="var(--mint)" strokeWidth="3" />
                </svg>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                <span className="micro-label" style={{ color: 'var(--muted)' }}>CONTROL HEALTH</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>
                  {metrics ? `${metrics.controlHealthPct}%` : '98.7%'}
                </span>
              </div>
            </div>
          </div>

          {/* Metrics Grid with Server Truth */}
          <div className="metrics-grid">
            <MetricCard
              icon={Shield}
              tone="coral"
              label="OPEN INCIDENTS"
              value={metrics ? metrics.openIncidents.toString().padStart(2, '0') : '—'}
              detail={`${metrics?.criticalCount || 0} critical priority`}
              trend="↓ 2 today"
            />
            <MetricCard
              icon={Zap}
              tone="amber"
              label="SIGNALS ANALYZED"
              value={metrics ? metrics.signalsAnalyzed24h.toLocaleString() : '—'}
              detail="Last 24 hours"
              trend="↑ 12.4%"
            />
            <MetricCard
              icon={Gauge}
              tone="mint"
              label="MEAN TIME TO TRIAGE"
              value={metrics?.meanTimeToTriageMs ? `${Math.round(metrics.meanTimeToTriageMs / 1000)}s` : '01:42'}
              detail="Target < 5 min"
              trend="↓ 38 sec"
            />
            <MetricCard
              icon={ShieldCheck}
              tone="blue"
              label="CONTROL HEALTH"
              value={metrics ? `${metrics.controlHealthPct}%` : '98.7%'}
              detail="All critical online"
              trend="↑ 0.3%"
            />
          </div>

          {/* Lower Grid — Incidents & Activity */}
          <div className="lower-grid" id="incidents-section">
            <div className="card-panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Priority incidents</h3>
                  <span className="panel-sub">Ranked by business risk and confidence</span>
                </div>
                <button className="toggle-link-btn" onClick={() => setShowAllIncidents((prev) => !prev)}>
                  {showAllIncidents ? 'Show priority only' : 'View all incidents'}
                </button>
              </div>

              <div className="incident-table-wrapper">
                <table className="incident-table" role="table">
                  <thead>
                    <tr>
                      <th>INCIDENT</th>
                      <th>SEVERITY</th>
                      <th>ENTITY</th>
                      <th>STATUS</th>
                      <th>DETECTED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleIncidents.map((inc) => (
                      <tr
                        key={inc.id}
                        className="incident-row-btn"
                        onClick={() => runTriage(`Investigate ${inc.id}: ${inc.title} on ${inc.entity}`)}
                      >
                        <td>
                          <div className="incident-id-cell">
                            <span className={`severity-dot ${inc.severity.toLowerCase()}`} />
                            <span>{inc.id}</span>
                            {inc.origin === 'seed' && (
                              <span className="mono" style={{ fontSize: '9px', background: '#e0e7e3', padding: '1px 5px', borderRadius: '4px' }}>SEED</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`severity-badge ${inc.severity.toLowerCase()}`}>{inc.severity}</span>
                        </td>
                        <td>
                          <span>{inc.entity}</span>
                        </td>
                        <td>
                          <span className={`status-pill ${inc.status.toLowerCase()}`}>{inc.status}</span>
                        </td>
                        <td>
                          <span className="mono dim">{inc.ago}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card-panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Agent activity</h3>
                  <span className="panel-sub">Decisions made by your twin</span>
                </div>
                <span className="mode-tag live">LIVE</span>
              </div>

              <div className="activity-feed-list">
                <ActivityItem dotTone="mint" title="Containment verified" desc="Network block confirmed for ENG-LT-142" time="Just now" />
                <ActivityItem dotTone="amber" title="Identity risk enriched" desc="Correlated 47 sign-in failures for M. Chen" time="6 min ago" />
                <ActivityItem dotTone="blue" title="Incident brief created" desc="Evidence summary attached to INC-4279" time="18 min ago" />
                <ActivityItem dotTone="grey" title="Alert auto-resolved" desc="Benign cloud deployment confirmed" time="32 min ago" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Analysis Drawer */}
      {drawerOpen && result && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div className="drawer-panel analysis-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-header-left">
                <div className="bot-avatar">
                  <Sparkles size={20} />
                </div>
                <div className="drawer-title-area">
                  <span className="micro-label">AEGIS ANALYSIS</span>
                  <span className="mono" style={{ fontSize: '12px', fontWeight: 700 }}>
                    {result.caseId || result.analysisId} · completed now
                  </span>
                </div>
              </div>
              <button className="icon-action-btn" aria-label="Close Analysis" onClick={() => setDrawerOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body analysis-body">
              <div className="status-strip-block">
                <span className={`defcon-badge defcon-${result.defcon}`}>DEFCON {result.defcon}</span>
                <span className={`severity-badge ${result.severity.toLowerCase()}`}>
                  <AlertTriangle size={14} />
                  <span>{result.severity}</span>
                </span>
                <span className="category-chip">{result.category}</span>
                <span className="mono" style={{ fontSize: '11px' }}>{result.confidence}% CONFIDENCE</span>
              </div>

              <div className="headline-block">
                <h2>{result.headline}</h2>
                <p className="summary-text">{result.summary}</p>
              </div>

              <div className="audio-player-block">
                <div>
                  <div style={{ fontWeight: 700 }}>Listen to this briefing</div>
                  <div style={{ fontSize: '11px', color: '#8da59e' }}>Murf AI voice briefing</div>
                </div>
                <button className="audio-player-btn" disabled={isVoiceLoading} onClick={handlePlayBriefing}>
                  <Headphones size={16} />
                  <span>{isVoiceLoading ? 'Generating...' : 'Play briefing'}</span>
                </button>
              </div>

              <div className="analysis-footer-actions">
                <div style={{ display: 'flex', gap: '10px', width: '100%', marginBottom: '10px' }}>
                  <button className="secondary-action-btn" style={{ flex: 1 }} onClick={handleDownloadReport}>
                    <Download size={14} />
                    <span>Download incident brief report (.md)</span>
                  </button>
                </div>

                <div className="action-buttons-group">
                  {result.actions.map((act) => (
                    <button
                      key={act.id}
                      className={act.kind === 'primary' ? 'primary-action-btn' : 'secondary-action-btn'}
                      disabled={actionInFlightId === act.id}
                      onClick={() => handleDispatchAction(act.id, result.incident?.entity || 'WIN-FIN-07')}
                    >
                      <span>
                        {actionInFlightId === act.id
                          ? `Stage: ${actionStage}…`
                          : act.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Armory Navigation Overlay */}
      {isNavOverlayOpen && (
        <div className="nav-overlay-backdrop" role="dialog" aria-modal="true">
          <div className="nav-overlay-left">
            <div className="nav-overlay-grid-bg" />
            <div className="brand-icon-tile" style={{ width: '42px', height: '42px', zIndex: 2 }}>
              <ShieldCheck size={26} />
            </div>

            <div className="nav-overlay-left-content">
              <span className="nav-overlay-left-eyebrow">Aegis Twin 2026</span>
              <h2 className="nav-overlay-left-headline">
                Seamlessly correlate security telemetry with Gemini 2.5 Flash, Deepgram, and Murf AI.
              </h2>
            </div>

            <div className="nav-overlay-left-footer">
              NORTHSTAR SOC · PRODUCTION TENANT · AUSTIN, TX
            </div>
          </div>

          <div className="nav-overlay-right">
            <div className="nav-overlay-right-top">
              <button
                className="nav-overlay-close-btn"
                aria-label="Close Navigation Menu"
                onClick={() => setIsNavOverlayOpen(false)}
              >
                <X size={22} />
              </button>

              <div className="nav-overlay-links-grid">
                <div className="nav-overlay-column">
                  <span className="nav-overlay-col-title">QUICK LINKS</span>
                  <button className="nav-overlay-link" onClick={() => { setIsNavOverlayOpen(false); document.getElementById('console')?.scrollIntoView({ behavior: 'smooth' }); }}>Command Center</button>
                  <button className="nav-overlay-link" onClick={() => { setIsNavOverlayOpen(false); document.getElementById('incidents-section')?.scrollIntoView({ behavior: 'smooth' }); }}>Incident Queue ({incidents.length})</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className="toast" role="status" aria-live="polite">
            <CheckCircle2 size={16} style={{ color: 'var(--mint)' }} />
            <span>{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
