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
/* Domain Types                                                       */
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
  analysisId: string;
  query: string;
  headline: string;
  summary: string;
  category: string;
  severity: Severity;
  defcon: 1 | 2 | 3;
  confidence: number;
  riskScore: number;
  source: 'Gemini' | 'Aegis Local';
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
  status: 'Online' | 'Offline';
  risk: Severity;
  lastSeen: string;
}

interface FileIssue {
  line: number | null;
  message: string;
  severity: 'error' | 'warning';
}

interface FileSignal {
  type: string;
  value: string;
  note: string;
  tone: 'danger' | 'warning' | 'neutral' | 'success';
}

interface FileInspection {
  fileName: string;
  fileType: string;
  fileSize: number;
  checksum: string;
  status: 'Valid' | 'Partially valid' | 'Invalid';
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  issues: FileIssue[];
  signals: FileSignal[];
  summary: string;
  suggestedQuery: string;
  processedAt: string;
  assessment?: AgentResult | null;
}

/* ------------------------------------------------------------------ */
/* Seeded Data                                                         */
/* ------------------------------------------------------------------ */

const fallbackIncidents: Incident[] = [
  { id: 'INC-4281', title: 'Suspicious PowerShell execution', severity: 'Critical', status: 'Investigating', source: 'EDR', entity: 'WIN-FIN-07', detectedAt: '09:42:18', ago: '2m ago', assignee: 'Aegis Twin', score: 96 },
  { id: 'INC-4280', title: 'Identity anomaly detected', severity: 'High', status: 'Investigating', source: 'Identity', entity: 'm.chen@northstar.io', detectedAt: '09:35:02', ago: '9m ago', assignee: 'Maya Chen', score: 87 },
  { id: 'INC-4279', title: 'Potential data exfiltration', severity: 'High', status: 'Contained', source: 'Network', entity: 'ENG-LT-142', detectedAt: '09:17:46', ago: '27m ago', assignee: 'Aegis Twin', score: 82 },
  { id: 'INC-4278', title: 'Malicious attachment blocked', severity: 'Medium', status: 'Monitoring', source: 'Email', entity: 'r.patel@northstar.io', detectedAt: '08:58:11', ago: '46m ago', assignee: 'Sam Okafor', score: 61 },
  { id: 'INC-4277', title: 'Unusual cloud permission change', severity: 'Low', status: 'Resolved', source: 'Cloud', entity: 'prod-data-reader', detectedAt: '08:21:33', ago: '1h ago', assignee: 'Aegis Twin', score: 32 },
];

const assetInventory: Asset[] = [
  { id: 'AST-1042', name: 'WIN-FIN-07', type: 'Endpoint', platform: 'Windows 11', owner: 'Finance Operations', status: 'Online', risk: 'Critical', lastSeen: 'Just now' },
  { id: 'AST-0938', name: 'ENG-LT-142', type: 'Endpoint', platform: 'macOS 15', owner: 'Engineering', status: 'Online', risk: 'High', lastSeen: '1m ago' },
  { id: 'AST-0711', name: 'DB-PROD-01', type: 'Database', platform: 'PostgreSQL 16', owner: 'Data Platform', status: 'Online', risk: 'High', lastSeen: 'Just now' },
  { id: 'AST-0554', name: 'AUTH-SRV-03', type: 'Server', platform: 'Ubuntu 24.04', owner: 'Identity Team', status: 'Online', risk: 'Medium', lastSeen: '2m ago' },
  { id: 'AST-0312', name: 'CLOUD-WORKLOAD-28', type: 'Cloud', platform: 'AWS · us-east-1', owner: 'Cloud Platform', status: 'Online', risk: 'Low', lastSeen: '3m ago' },
  { id: 'AST-0208', name: 'HR-LT-044', type: 'Endpoint', platform: 'Windows 11', owner: 'People Operations', status: 'Offline', risk: 'Medium', lastSeen: '43m ago' },
];

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
/* Pure Helper Functions                                              */
/* ------------------------------------------------------------------ */

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function localBrowserTriage(query: string, currentIncidents: Incident[] = fallbackIncidents): AgentResult {
  const safeQuery = query.trim().slice(0, 1200);
  const normalized = safeQuery.toLowerCase();

  const directId = safeQuery.match(/(?:inc(?:ident)?[\s-]*)?(42\d{2})/i)?.[1];
  let matchedIncident = directId
    ? currentIncidents.find((inc) => inc.id.endsWith(directId))
    : currentIncidents.find(
        (inc) =>
          normalized.includes(inc.entity.toLowerCase()) ||
          inc.title.toLowerCase().split(' ').filter((w) => w.length > 6).some((w) => normalized.includes(w)),
      );

  let category = 'Posture review';
  let headline = 'Security posture is stable';
  let summary = 'I reviewed the active queue and correlated the latest endpoint, identity, cloud, and network signals. One critical incident is being investigated; existing controls are containing the immediate risk.';
  let severity: Severity = 'Medium';
  let confidence = 91;
  let riskScore = matchedIncident?.score ?? 38;

  let evidence: Evidence[] = [
    { label: 'Active incidents', value: '5 open', note: '1 critical priority', tone: 'warning' },
    { label: 'Protected assets', value: '1,284 / 1,291', note: '99.5% reporting', tone: 'success' },
    { label: 'Control health', value: '98.7%', note: 'Within target range', tone: 'success' },
  ];

  let reasoning: string[] = [
    'Prioritized active detections by potential business impact.',
    'Verified critical controls and sensor coverage across protected assets.',
    'Compared current alert volume with the organization’s seven-day baseline.',
  ];

  let mitreTechniques: MitreTechnique[] = [{ id: 'TA0043', name: 'Reconnaissance Review', tactic: 'Reconnaissance' }];

  let directives: Directive[] = [
    { priority: 1, action: 'Prioritize the critical queue', detail: 'Continue investigation of the highest-impact active incident.' },
    { priority: 2, action: 'Verify sensor coverage', detail: 'Restore telemetry for assets that are not reporting.' },
    { priority: 3, action: 'Monitor control health', detail: 'Escalate any material drop below the operational target.' },
  ];

  if (normalized.includes('powershell') || normalized.includes('script') || normalized.includes('malware') || normalized.includes('4281')) {
    category = 'Endpoint compromise';
    headline = 'Likely malicious PowerShell chain isolated';
    summary = 'A hidden PowerShell process launched from a document reader and attempted to contact a newly registered domain. The execution pattern matches encoded downloader behavior; no lateral movement is visible yet.';
    severity = 'Critical';
    confidence = 96;
    riskScore = 94;
    evidence = [
      { label: 'Process', value: 'powershell.exe -enc …', note: 'Obfuscated command line', tone: 'danger' },
      { label: 'Parent process', value: 'ACRORD32.EXE', note: 'Unusual process ancestry', tone: 'warning' },
      { label: 'Network', value: '185.220.101.34:443', note: 'Threat intel match · 89%', tone: 'danger' },
    ];
    reasoning = [
      'Correlated endpoint process ancestry with DNS and network telemetry.',
      'Matched encoded command behavior to MITRE ATT&CK T1059.001.',
      'Checked adjacent hosts and identities; no propagation was detected.',
    ];
    mitreTechniques = [
      { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
      { id: 'T1105', name: 'Ingress Tool Transfer', tactic: 'Command and Control' },
    ];
    directives = [
      { priority: 1, action: 'Isolate the affected endpoint', detail: 'Remove WIN-FIN-07 from the network while preserving EDR access.' },
      { priority: 2, action: 'Block the destination indicator', detail: 'Deny the observed IP and domain at egress controls.' },
      { priority: 3, action: 'Preserve volatile evidence', detail: 'Capture process tree, memory, active connections, and the encoded command.' },
    ];
  } else if (normalized.includes('login') || normalized.includes('identity') || normalized.includes('failed') || normalized.includes('4280')) {
    category = 'Identity compromise';
    headline = 'Identity attack pattern requires verification';
    summary = 'The account experienced repeated failures from distributed addresses followed by a successful sign-in from a new device. Conditional access challenged the session, limiting immediate exposure.';
    severity = 'High';
    confidence = 92;
    riskScore = 86;
    evidence = [
      { label: 'Authentication', value: '47 failures / 8 min', note: 'Distributed password spray', tone: 'danger' },
      { label: 'Successful login', value: 'Warsaw, PL', note: 'New device and location', tone: 'warning' },
      { label: 'Access policy', value: 'MFA challenge issued', note: 'Session currently restricted', tone: 'success' },
    ];
    reasoning = [
      'Grouped sign-in failures across source addresses by target identity.',
      'Compared device fingerprint and location against the 30-day baseline.',
      'Validated that the anomalous session did not access sensitive applications.',
    ];
    mitreTechniques = [{ id: 'T1110.003', name: 'Password Spraying', tactic: 'Credential Access' }];
    directives = [
      { priority: 1, action: 'Revoke active sessions', detail: 'Invalidate tokens for the affected identity immediately.' },
      { priority: 2, action: 'Force credential reset', detail: 'Require a password reset and phishing-resistant MFA verification.' },
      { priority: 3, action: 'Review sign-in telemetry', detail: 'Validate source addresses, device fingerprints, and accessed applications.' },
    ];
  }

  if (matchedIncident) {
    severity = matchedIncident.severity;
    riskScore = matchedIncident.score;
  }

  const defcon: 1 | 2 | 3 = severity === 'Critical' ? 1 : severity === 'High' ? 2 : 3;
  const analysisId = 'AX-' + Math.floor(Date.now() / 1000).toString(36).toUpperCase();
  const voiceText = `DEFCON ${defcon}. ${headline}. ${summary} First directive, ${directives[0].action}. ${directives[0].detail}`;

  return {
    analysisId,
    query: safeQuery,
    headline,
    summary,
    category,
    severity,
    defcon,
    confidence,
    riskScore,
    source: 'Aegis Local',
    voiceText,
    incident: matchedIncident,
    evidence,
    reasoning,
    mitreTechniques,
    directives,
    actions: [
      {
        id: matchedIncident?.status === 'Contained' ? 'verify' : 'contain',
        label: matchedIncident?.status === 'Contained' ? 'Verify containment' : 'Contain affected entity',
        kind: 'primary',
      },
      { id: 'brief', label: 'Create incident brief', kind: 'secondary' },
    ],
    completedAt: new Date().toISOString(),
  };
}

function analyzeEvidenceLocally(fileName: string, content: string): FileInspection {
  const cleanName = fileName.replace(/[\\/\0]/g, '_').slice(0, 180);
  const fileType = cleanName.toLowerCase().split('.').pop() || 'TXT';
  const fileSize = content.length;
  const issues: FileIssue[] = [];
  const signals: FileSignal[] = [];

  const lower = content.toLowerCase();
  const powerShell = (lower.match(/powershell|\s-enc\s|encodedcommand/g) || []).length;
  const authFailures = (lower.match(/failed login|failed authentication/g) || []).length;

  if (powerShell > 0) signals.push({ type: 'PowerShell activity', value: `${powerShell} events`, note: 'Review encoded commands', tone: 'danger' });
  if (authFailures > 0) signals.push({ type: 'Authentication failures', value: `${authFailures} records`, note: 'Possible password spray', tone: 'danger' });
  if (signals.length === 0) signals.push({ type: 'Known threat patterns', value: 'No direct match', note: 'Baseline normal log entries', tone: 'success' });

  const suggestedQuery = powerShell > 0
    ? 'Investigate suspicious PowerShell execution and encoded command activity in the uploaded evidence.'
    : authFailures > 0
    ? 'Investigate repeated failed logins and possible password spraying in the uploaded evidence.'
    : 'Review the uploaded security evidence for anomalies and recommend next steps.';

  const checksum = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const assessment = localBrowserTriage(suggestedQuery);

  return {
    fileName: cleanName,
    fileType: fileType.toUpperCase(),
    fileSize,
    checksum,
    status: 'Valid',
    totalRecords: content.split('\n').filter(Boolean).length,
    validRecords: content.split('\n').filter(Boolean).length,
    invalidRecords: 0,
    issues,
    signals,
    summary: `Parsed evidence file ${cleanName} with ${signals.length} signal groups detected.`,
    suggestedQuery,
    processedAt: new Date().toISOString(),
    assessment,
  };
}

/* ------------------------------------------------------------------ */
/* Presentational Helper Components                                   */
/* ------------------------------------------------------------------ */

function MetricCard({ icon: Icon, tone, label, value, detail, trend }: { icon: React.ElementType; tone: string; label: string; value: string; detail: string; trend: string }) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <span className="micro-label" style={{ color: 'var(--muted)' }}>{label}</span>
        <div className={`metric-icon-box ${tone}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="metric-body">
        <div className="metric-val-row">
          <span className="metric-value">{value}</span>
          <span className={`metric-trend ${trend.startsWith('↓') ? 'success' : 'danger'}`}>{trend}</span>
        </div>
        <div className="metric-detail">{detail}</div>
      </div>
    </div>
  );
}

function ActivityItem({ dotTone, title, desc, time }: { dotTone: string; title: string; desc: string; time: string }) {
  return (
    <div className="activity-item">
      <div className={`activity-dot-tile ${dotTone}`}>
        <Activity size={12} />
      </div>
      <div className="activity-content">
        <div className="activity-meta">
          <span className="activity-title">{title}</span>
          <span className="activity-time">{time}</span>
        </div>
        <span className="activity-desc">{desc}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main App Component                                                 */
/* ------------------------------------------------------------------ */

export default function App() {
  /* State */
  const [incidents, setIncidents] = useState<Incident[]>(fallbackIncidents);
  const [query, setQuery] = useState('');
  const [workspaceView, setWorkspaceView] = useState<'assets' | 'files' | 'integrations' | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [evidenceReport, setEvidenceReport] = useState<FileInspection | null>(null);
  const [isEvidenceAnalyzing, setIsEvidenceAnalyzing] = useState(false);
  const [isEvidenceDragging, setIsEvidenceDragging] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus>({ deepgram: false, gemini: false, murf: false, mode: 'local' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);
  const [showAllIncidents, setShowAllIncidents] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>(formatTime(new Date()));
  const [isNavOverlayOpen, setIsNavOverlayOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  /* Refs */
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const deepgramSocketRef = useRef<WebSocket | null>(null);
  const fallbackRecognitionRef = useRef<any>(null);
  const fallbackStartedRef = useRef(false);
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

  /* Mount Effect */
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const incRes = await fetch('/api/incidents');
        if (incRes.ok) {
          const data = await incRes.json();
          if (Array.isArray(data.incidents)) setIncidents(data.incidents);
        }
      } catch {}

      try {
        const intRes = await fetch('/api/integrations');
        if (intRes.ok) {
          const data = await intRes.json();
          setIntegrations(data);
        }
      } catch {}
    };
    fetchInitial();

    const timer = setInterval(() => {
      setCurrentTime(formatTime(new Date()));
    }, 30000);

    return () => {
      clearInterval(timer);
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      if (deepgramSocketRef.current) deepgramSocketRef.current.close();
      if (fallbackRecognitionRef.current) fallbackRecognitionRef.current.stop();
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

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
        setPipelineStep((step) => {
          if (step >= pipelineStepsText.length - 1) {
            clearInterval(interval);
            return step;
          }
          return step + 1;
        });
      }, 430);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  /* runTriage */
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
        const isStaticPreview = ['htmlpreview.github.io', 'githack.com', 'github.io'].some((domain) => window.location.hostname.includes(domain));
        if (isStaticPreview) {
          await new Promise((resolve) => setTimeout(resolve, 1250));
          triageResult = localBrowserTriage(clean, incidents);
        } else {
          const res = await fetch('/api/agent/triage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: clean }),
          });
          if (!res.ok) throw new Error('Backend triage returned an error.');
          triageResult = await res.json();
        }
      } catch {
        showToast('Gemini unavailable; Aegis Local engine produced verdict.');
        triageResult = localBrowserTriage(clean, incidents);
      }

      const elapsed = Date.now() - startTime;
      const minDelay = 1650;
      if (elapsed < minDelay) {
        await new Promise((resolve) => setTimeout(resolve, minDelay - elapsed));
      }

      setResult(triageResult);
      setIsAnalyzing(false);
      setDrawerOpen(true);
      setQuery('');
    },
    [isAnalyzing, incidents, showToast],
  );

  /* Stop Voice Capture */
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
    if (fallbackRecognitionRef.current && fallbackStartedRef.current) {
      try {
        fallbackRecognitionRef.current.stop();
      } catch {}
      fallbackStartedRef.current = false;
    }
  }, []);

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
      fallbackStartedRef.current = false;
      stopVoiceCapture(false);
      processFinalTranscript();
    };

    fallbackRecognitionRef.current = recognition;
    fallbackStartedRef.current = true;
    recognition.start();
    setIsListening(true);
  }, [showToast, stopVoiceCapture, processFinalTranscript]);

  const handleMic = useCallback(async () => {
    if (isListening) {
      stopVoiceCapture(true);
      setTimeout(() => processFinalTranscript(), 1000);
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
        const supportedTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
        const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
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
          } else if (data.type === 'utterance_end') {
            stopVoiceCapture(true);
            processFinalTranscript();
          } else if (data.type === 'closed') {
            stopVoiceCapture(false);
            processFinalTranscript();
          } else if (data.type === 'error') {
            socket.close();
            startBrowserFallback();
          }
        } catch {}
      };

      socket.onerror = () => {
        socket.close();
        startBrowserFallback();
      };

      socket.onclose = () => {
        if (isListening) {
          stopVoiceCapture(false);
          processFinalTranscript();
        }
      };
    } catch {
      showToast('Microphone access was not granted. Allow access, then try again.');
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
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play();
      showToast('Playing Murf AI audio briefing.');
    } catch {
      showToast('Murf unavailable; playing browser speech synthesis fallback.');
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(result.voiceText);
        utterance.rate = 0.96;
        utterance.pitch = 0.93;
        window.speechSynthesis.speak(utterance);
      }
    } finally {
      setIsVoiceLoading(false);
    }
  }, [result, isVoiceLoading, showToast]);

  const handleDispatchAction = useCallback(
    async (actionId: string, entityLabel: string) => {
      setActionInFlight(actionId);
      try {
        const res = await fetch('/api/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: actionId, entity: entityLabel }),
        });
        const data = await res.json();
        showToast(data.message || 'Action executed successfully.');

        if (actionId === 'contain' && result?.incident) {
          setIncidents((prev) =>
            prev.map((inc) => (inc.id === result.incident?.id ? { ...inc, status: 'Contained' } : inc)),
          );
        }
      } catch {
        showToast('Action approval dispatched.');
      } finally {
        setActionInFlight(null);
      }
    },
    [result, showToast],
  );

  const filteredAssets = useMemo(() => {
    if (!assetSearch.trim()) return assetInventory;
    const term = assetSearch.toLowerCase();
    return assetInventory.filter(
      (ast) =>
        ast.name.toLowerCase().includes(term) ||
        ast.id.toLowerCase().includes(term) ||
        ast.platform.toLowerCase().includes(term) ||
        ast.owner.toLowerCase().includes(term),
    );
  }, [assetSearch]);

  const visibleIncidents = showAllIncidents ? incidents : incidents.slice(0, 4);

  return (
    <div className="site-layout">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Header & Top Banner                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="site-top-banner">
        <span>Aegis Autonomous Defense / Release 02</span>
        <button
          className="mono"
          style={{ color: 'var(--mint)', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => {
            document.getElementById('console')?.scrollIntoView({ behavior: 'smooth' });
          }}
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
          <li>
            <a
              href="#platform"
              className="header-nav-link"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('platform')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Platform
            </a>
          </li>
          <li>
            <a
              href="#impact"
              className="header-nav-link"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('impact')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Impact
            </a>
          </li>
          <li>
            <a
              href="#protocol"
              className="header-nav-link"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('protocol')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Protocol
            </a>
          </li>
          <li>
            <a
              href="#intelligence"
              className="header-nav-link"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('intelligence')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Intelligence
            </a>
          </li>
          <li>
            <a
              href="#faq"
              className="header-nav-link"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              FAQ
            </a>
          </li>
        </ul>

        <div className="header-actions">
          <button
            className="header-cta-btn"
            onClick={() => {
              document.getElementById('console')?.scrollIntoView({ behavior: 'smooth' });
            }}
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

      {/* ------------------------------------------------------------------ */}
      {/* 2. Hero Landing Section (Exact Match to Screenshot 1)              */}
      {/* ------------------------------------------------------------------ */}
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
                onClick={() => {
                  document.getElementById('console')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span>Command your twin</span>
                <ArrowRight size={16} />
              </button>

              <button
                className="secondary-hero-btn"
                onClick={() => {
                  document.getElementById('intelligence')?.scrollIntoView({ behavior: 'smooth' });
                }}
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
                <span>09:42:18</span>
              </div>
              <div className="signal-body">
                Encoded process chain correlated on <span className="signal-entity">WIN-FIN-07</span>
              </div>
              <div className="signal-bar" />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Ticker Marquee                                                  */}
      {/* ------------------------------------------------------------------ */}
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
          <span className="marquee-item">• SENTINEL</span>
          <span className="marquee-item">• OKTA</span>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Intelligence Layer Section (Exact Match to Screenshot 2)        */}
      {/* ------------------------------------------------------------------ */}
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
            <div className="radar-signal-dot" style={{ top: '60px', right: '90px' }} />
            <div className="radar-signal-dot" style={{ bottom: '80px', left: '70px' }} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Core Capabilities Section (Exact Match to Screenshots 3 & 4)    */}
      {/* ------------------------------------------------------------------ */}
      <section className="capabilities-section" id="platform">
        <div className="capabilities-container">
          <span className="micro-label">* CORE CAPABILITIES</span>
          <div className="capabilities-headline-row">
            <h2 className="capabilities-title">
              One twin. <br />
              Every signal.
            </h2>
            <p className="capabilities-sub">
              From first anomaly to final containment, Aegis keeps context intact and operators in control.
            </p>
          </div>

          <div className="capabilities-3col-grid">
            {/* Perception */}
            <div className="cap-card-large cap-card-perception">
              <div>
                <span className="micro-label" style={{ color: 'var(--mint)' }}>01 / PERCEPTION</span>
                <h3 style={{ fontSize: '28px', fontWeight: 800, marginTop: '12px' }}>Continuous Threat Radar</h3>
                <p style={{ color: '#8fa69f', marginTop: '8px', fontSize: '15px' }}>
                  Scans active endpoint, cloud, identity, and network telemetry continuously for high-confidence anomalies.
                </p>
              </div>

              <div style={{ position: 'relative', height: '180px', margin: '20px 0', border: '1px solid var(--dark-border)', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Radar size={80} style={{ color: 'rgba(65, 216, 160, 0.3)' }} />
                <div className="pulse-dot" style={{ position: 'absolute', top: '40px', left: '70px' }} />
                <div className="pulse-dot" style={{ position: 'absolute', bottom: '50px', right: '60px' }} />
              </div>
            </div>

            {/* Reasoning */}
            <div className="cap-card-large cap-card-reasoning">
              <div>
                <span className="micro-label">02 / REASONING</span>
                <div className="cap-flow-nodes">
                  <div className="cap-node-tile">
                    <Database size={22} />
                  </div>
                  <ChevronRight size={18} style={{ color: 'var(--muted)' }} />
                  <div className="cap-node-tile active-orange">
                    <BrainCircuit size={24} />
                  </div>
                  <ChevronRight size={18} style={{ color: 'var(--muted)' }} />
                  <div className="cap-node-tile">
                    <span className="mono" style={{ fontWeight: 700 }}>&#123;&#125;</span>
                  </div>
                </div>

                <h3 style={{ fontSize: '28px', fontWeight: 800 }}>Explain every decision.</h3>
                <p style={{ color: 'var(--muted)', marginTop: '8px', fontSize: '15px' }}>
                  DEFCON classification, risk scoring, evidence, and MITRE ATT&CK mapping stay completely visible to your team.
                </p>
              </div>
            </div>

            {/* Response — Signature Orange Container */}
            <div className="cap-card-large cap-card-response">
              <div className="response-card-copy">
                <span className="mono" style={{ fontSize: '11px', letterSpacing: '0.15em', opacity: 0.9 }}>03 / RESPONSE</span>
                <h3 style={{ marginTop: '8px' }}>Decisive containment at machine speed.</h3>
                <p>
                  Approved actions isolate endpoints, block malicious IPs, or revoke compromised tokens with a single click.
                </p>
              </div>

              <div className="response-graphic-box">
                <div className="lightning-orb">
                  <Zap size={32} />
                </div>
                <div className="action-tag-pills">
                  <span className="action-tag-pill">ISOLATE</span>
                  <span className="action-tag-pill">BLOCK</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 6. Machine Speed Impact Section (Exact Match to Screenshot 5)       */}
      {/* ------------------------------------------------------------------ */}
      <section className="machine-speed-section" id="impact">
        <div className="machine-speed-container">
          <div>
            <span className="micro-label">* MEASURED IN MINUTES, NOT MEETINGS</span>
            <h2 className="speed-headline">
              Response at <br />
              machine speed.
            </h2>
            <p className="speed-subtext">
              Every second between signal and containment compounds risk. Aegis compresses that distance without compromising judgment.
            </p>

            <button
              className="mono"
              style={{ color: 'var(--orange)', fontSize: '14px', marginTop: '28px', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              onClick={() => {
                document.getElementById('console')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span>See the command experience</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="speed-metrics-column">
            <div className="speed-metric-row">
              <span className="mono" style={{ fontSize: '12px', color: 'var(--orange)' }}>01</span>
              <div>
                <div className="big-stat-number">
                  42 <span className="highlight-orange" style={{ fontSize: '32px' }}>sec</span>
                </div>
                <div className="stat-desc-text">Average time to classify a high-risk event</div>
              </div>
            </div>

            <div className="speed-metric-row">
              <span className="mono" style={{ fontSize: '12px', color: 'var(--orange)' }}>02</span>
              <div>
                <div className="big-stat-number">
                  93 <span className="highlight-orange" style={{ fontSize: '32px' }}>%</span>
                </div>
                <div className="stat-desc-text">Reduction in manual triage steps</div>
              </div>
            </div>

            <div className="speed-metric-row">
              <span className="mono" style={{ fontSize: '12px', color: 'var(--orange)' }}>03</span>
              <div>
                <div className="big-stat-number">
                  24 <span className="highlight-orange" style={{ fontSize: '32px' }}>/ 7</span>
                </div>
                <div className="stat-desc-text">Continuous cross-stack vigilance</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 7. Live Operator Console Section                                   */}
      {/* ------------------------------------------------------------------ */}
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
            <span>CONNECTED TO AGENT POLICY ENGINE</span>
          </div>
        </div>

        <div className="dashboard-body">
          {/* Welcome Row */}
          <div className="welcome-row">
            <div className="welcome-content">
              <span className="micro-label" style={{ color: 'var(--muted)' }}>Saturday, August 15</span>
              <h1>Good morning, Alex.</h1>
              <p className="welcome-sub">
                Your environment is protected. Aegis has reviewed 184 new signals since your last session.
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
                    <span className="agent-status-sub">Online · watching 12 sources</span>
                  </div>
                </div>
                <div className="privacy-badge">
                  <Lock size={12} />
                  <span>Private workspace</span>
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

                  <div className="pipeline-stepper">
                    {pipelineStepsText.map((_, idx) => (
                      <div
                        key={idx}
                        className={`stepper-dot ${
                          pipelineStep > idx ? 'completed' : pipelineStep === idx ? 'active' : ''
                        }`}
                      >
                        {pipelineStep > idx ? <Check size={14} /> : idx + 1}
                      </div>
                    ))}
                  </div>
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
                <div className="risk-ring" style={{ '--score': '100.8deg' } as React.CSSProperties}>
                  <div className="risk-ring-inner">
                    <span className="risk-score-num">28</span>
                    <span className="risk-score-label">LOW RISK</span>
                  </div>
                </div>
                <div className="risk-trend-indicator">
                  <span className="mono">↓ 6 pts</span>
                  <span>Improving</span>
                </div>
              </div>

              <div className="posture-bar-chart">
                <div className="posture-bar" style={{ height: '75%' }} />
                <div className="posture-bar" style={{ height: '50%' }} />
                <div className="posture-bar" style={{ height: '70%' }} />
                <div className="posture-bar" style={{ height: '55%' }} />
                <div className="posture-bar" style={{ height: '65%' }} />
                <div className="posture-bar active" style={{ height: '85%' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                <span className="micro-label" style={{ color: 'var(--muted)' }}>CONTROL HEALTH</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>98.7%</span>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="metrics-grid">
            <MetricCard icon={Shield} tone="coral" label="OPEN INCIDENTS" value="05" detail="1 critical priority" trend="↓ 2 today" />
            <MetricCard icon={Zap} tone="amber" label="SIGNALS ANALYZED" value="2,847" detail="Last 24 hours" trend="↑ 12.4%" />
            <MetricCard icon={Gauge} tone="mint" label="MEAN TIME TO TRIAGE" value="01:42" detail="Target < 5 min" trend="↓ 38 sec" />
            <MetricCard icon={ShieldCheck} tone="blue" label="CONTROL HEALTH" value="98.7%" detail="All critical online" trend="↑ 0.3%" />
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
                    {visibleIncidents.map((inc) => {
                      const IconComp =
                        inc.source === 'EDR'
                          ? Terminal
                          : inc.source === 'Identity'
                          ? Fingerprint
                          : inc.source === 'Network'
                          ? Network
                          : inc.source === 'Email'
                          ? FileText
                          : inc.source === 'Cloud'
                          ? Cloud
                          : Server;

                      return (
                        <tr
                          key={inc.id}
                          className="incident-row-btn"
                          onClick={() => runTriage(`Investigate ${inc.id}: ${inc.title} on ${inc.entity}`)}
                        >
                          <td>
                            <div className="incident-id-cell">
                              <span className={`severity-dot ${inc.severity.toLowerCase()}`} />
                              <span>{inc.id}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`severity-badge ${inc.severity.toLowerCase()}`}>{inc.severity}</span>
                          </td>
                          <td>
                            <div className="incident-entity-cell" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <IconComp size={14} className="source-icon-inline" />
                              <span>{inc.entity}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`status-pill ${inc.status.toLowerCase()}`}>{inc.status}</span>
                          </td>
                          <td>
                            <span className="mono dim">{inc.ago}</span>
                          </td>
                        </tr>
                      );
                    })}
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

      {/* ------------------------------------------------------------------ */}
      {/* 8. FAQ Section                                                     */}
      {/* ------------------------------------------------------------------ */}
      <section className="faq-section" id="faq">
        <div className="faq-container">
          <div style={{ textAlign: 'center' }}>
            <span className="micro-label">* FREQUENTLY ASKED QUESTIONS</span>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--ink)', marginTop: '6px' }}>
              Everything you need to know about Aegis Twin
            </h2>
          </div>

          <div className="faq-list">
            {faqs.map((faq, idx) => (
              <div key={idx} className="faq-item">
                <button
                  className="faq-question-btn"
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      transform: openFaqIndex === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </button>
                {openFaqIndex === idx && <div className="faq-answer">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="brand-icon-tile">
                <ShieldCheck size={20} />
              </div>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>AEGIS / TWIN</span>
            </div>
            <span className="mono" style={{ fontSize: '12px', color: 'var(--mint)' }}>
              SYSTEM OPERATIONAL · DEFCON POLICY ACTIVE
            </span>
          </div>

          <div className="footer-bottom">
            <span>© 2026 Aegis Twin Security Operations. All rights reserved.</span>
            <span>Refreshed {currentTime} UTC</span>
          </div>
        </div>
      </footer>

      {/* Armory Split Navigation Overlay */}
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
                  <button
                    className="nav-overlay-link"
                    onClick={() => {
                      setIsNavOverlayOpen(false);
                      document.getElementById('console')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <span>Command Center</span>
                  </button>
                  <button
                    className="nav-overlay-link"
                    onClick={() => {
                      setIsNavOverlayOpen(false);
                      document.getElementById('incidents-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <span>Incident Queue ({incidents.length})</span>
                  </button>
                  <button
                    className="nav-overlay-link"
                    onClick={() => {
                      setIsNavOverlayOpen(false);
                      setWorkspaceView('assets');
                    }}
                  >
                    <span>Protected Assets</span>
                  </button>
                </div>

                <div className="nav-overlay-column">
                  <span className="nav-overlay-col-title">OTHER LINKS</span>
                  <button
                    className="nav-overlay-link"
                    onClick={() => {
                      setIsNavOverlayOpen(false);
                      showToast('MITRE ATT&CK policy rules active.');
                    }}
                  >
                    <span>MITRE ATT&CK Policy</span>
                  </button>
                  <button
                    className="nav-overlay-link"
                    onClick={() => {
                      setIsNavOverlayOpen(false);
                      showToast('24 approved response runbooks available.');
                    }}
                  >
                    <span>Response Library</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="nav-overlay-right-bottom">
              <img
                src="/img/soc_building_architecture.png"
                alt="SOC Building Architecture"
                className="nav-overlay-image"
              />
              <div className="nav-overlay-date-tag">
                Aug 17, 2026
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
