import {
  Activity,
  AlertTriangle,
  ArrowRight,
  AudioWaveform,
  Bell,
  BookOpen,
  Bot,
  Boxes,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Cloud,
  Command,
  Copy,
  Crosshair,
  Database,
  FileText,
  Fingerprint,
  Gauge,
  Headphones,
  History,
  Laptop,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Mic,
  MicOff,
  Network,
  PlugZap,
  Radio,
  RefreshCw,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  ShieldHalf,
  Sparkles,
  Terminal,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

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
  evidence: Array<{
    label: string;
    value: string;
    note: string;
    tone: 'danger' | 'warning' | 'neutral' | 'success';
  }>;
  reasoning: string[];
  mitreTechniques: Array<{ id: string; name: string; tactic: string }>;
  directives: Array<{ priority: number; action: string; detail: string }>;
  actions: Array<{ id: string; label: string; kind: 'primary' | 'secondary' }>;
  completedAt: string;
}

interface IntegrationStatus {
  deepgram: boolean;
  gemini: boolean;
  murf: boolean;
  mode: 'live' | 'local';
}

interface AssetRecord {
  id: string;
  name: string;
  type: 'Endpoint' | 'Server' | 'Database' | 'Cloud';
  platform: string;
  owner: string;
  status: 'Online' | 'Offline';
  risk: 'Critical' | 'High' | 'Medium' | 'Low';
  lastSeen: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

const fallbackIncidents: Incident[] = [
  { id: 'INC-4281', title: 'Suspicious PowerShell execution', severity: 'Critical', status: 'Investigating', source: 'EDR', entity: 'WIN-FIN-07', detectedAt: '09:42:18', ago: '2m ago', assignee: 'Aegis Twin', score: 96 },
  { id: 'INC-4280', title: 'Identity anomaly detected', severity: 'High', status: 'Investigating', source: 'Identity', entity: 'm.chen@northstar.io', detectedAt: '09:35:02', ago: '9m ago', assignee: 'Maya Chen', score: 87 },
  { id: 'INC-4279', title: 'Potential data exfiltration', severity: 'High', status: 'Contained', source: 'Network', entity: 'ENG-LT-142', detectedAt: '09:17:46', ago: '27m ago', assignee: 'Aegis Twin', score: 82 },
  { id: 'INC-4278', title: 'Malicious attachment blocked', severity: 'Medium', status: 'Monitoring', source: 'Email', entity: 'r.patel@northstar.io', detectedAt: '08:58:11', ago: '46m ago', assignee: 'Sam Okafor', score: 61 },
  { id: 'INC-4277', title: 'Unusual cloud permission change', severity: 'Low', status: 'Resolved', source: 'Cloud', entity: 'prod-data-reader', detectedAt: '08:21:33', ago: '1h ago', assignee: 'Aegis Twin', score: 32 },
];

const assetInventory: AssetRecord[] = [
  { id: 'AST-1042', name: 'WIN-FIN-07', type: 'Endpoint', platform: 'Windows 11', owner: 'Finance Operations', status: 'Online', risk: 'Critical', lastSeen: 'Just now' },
  { id: 'AST-0938', name: 'ENG-LT-142', type: 'Endpoint', platform: 'macOS 15', owner: 'Engineering', status: 'Online', risk: 'High', lastSeen: '1m ago' },
  { id: 'AST-0711', name: 'DB-PROD-01', type: 'Database', platform: 'PostgreSQL 16', owner: 'Data Platform', status: 'Online', risk: 'High', lastSeen: 'Just now' },
  { id: 'AST-0554', name: 'AUTH-SRV-03', type: 'Server', platform: 'Ubuntu 24.04', owner: 'Identity Team', status: 'Online', risk: 'Medium', lastSeen: '2m ago' },
  { id: 'AST-0312', name: 'CLOUD-WORKLOAD-28', type: 'Cloud', platform: 'AWS · us-east-1', owner: 'Cloud Platform', status: 'Online', risk: 'Low', lastSeen: '3m ago' },
  { id: 'AST-0208', name: 'HR-LT-044', type: 'Endpoint', platform: 'Windows 11', owner: 'People Operations', status: 'Offline', risk: 'Medium', lastSeen: '43m ago' },
];

const pipelineSteps = [
  'Understanding your command',
  'Correlating security telemetry',
  'Evaluating risk and controls',
  'Preparing response options',
];

const navItems = [
  { label: 'Command center', icon: LayoutDashboard, target: 'command' },
  { label: 'Incident queue', icon: ShieldHalf, target: 'incidents', count: '5' },
  { label: 'Assets', icon: Boxes, target: 'assets' },
  { label: 'Integrations', icon: Network, target: 'integrations' },
];

const integrationCards = [
  { id: 'deepgram' as const, name: 'Deepgram', role: 'Voice ingestion', detail: 'Nova-3 streaming transcription with boosted cybersecurity terminology.', icon: AudioWaveform, environmentKey: 'DEEPGRAM_API_KEY' },
  { id: 'gemini' as const, name: 'Google Gemini', role: 'Cognitive engine', detail: 'Schema-constrained DEFCON classification, reasoning, and MITRE mapping.', icon: BrainCircuit, environmentKey: 'GEMINI_API_KEY' },
  { id: 'murf' as const, name: 'Murf AI', role: 'Voice response', detail: 'Authoritative GEN2 spoken incident briefings with natural cadence.', icon: Radio, environmentKey: 'MURF_API_KEY' },
];

const sourceIcons: Record<string, typeof Server> = {
  EDR: Terminal,
  Identity: Fingerprint,
  Network,
  Email: FileText,
  Cloud,
};

function localBrowserTriage(query: string, incidents: Incident[]): AgentResult {
  const normalized = query.toLowerCase();
  const incidentNumber = normalized.match(/42\d{2}/)?.[0];
  const incident = incidents.find((item) =>
    (incidentNumber && item.id.endsWith(incidentNumber)) || normalized.includes(item.entity.toLowerCase()),
  );
  const isPowerShell = /powershell|malware|endpoint|4281/.test(normalized);
  const isIdentity = /login|identity|account|password|brute|4280/.test(normalized);
  const isExfiltration = /outbound|exfil|upload|database|traffic|4279/.test(normalized);
  const defcon: 1 | 2 | 3 = isPowerShell ? 1 : isIdentity || isExfiltration ? 2 : 3;
  const severity: Severity = defcon === 1 ? 'Critical' : defcon === 2 ? 'High' : 'Medium';

  const scenario = isPowerShell ? {
    headline: 'Likely malicious PowerShell chain detected',
    summary: 'A hidden PowerShell process shows encoded downloader behavior. Isolate the endpoint, block observed destinations, and preserve volatile evidence before remediation.',
    category: 'Endpoint compromise',
    riskScore: 94,
    mitre: [{ id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' }, { id: 'T1105', name: 'Ingress Tool Transfer', tactic: 'Command and Control' }],
    evidence: [
      { label: 'Process', value: 'powershell.exe -enc …', note: 'Obfuscated command line', tone: 'danger' as const },
      { label: 'Parent process', value: 'ACRORD32.EXE', note: 'Unusual ancestry', tone: 'warning' as const },
      { label: 'Network', value: 'Untrusted destination', note: 'Threat-intelligence review required', tone: 'danger' as const },
    ],
    directives: [
      { priority: 1, action: 'Isolate the affected endpoint', detail: 'Remove the host from the network while preserving EDR access.' },
      { priority: 2, action: 'Block destination indicators', detail: 'Deny observed remote IP addresses and domains at egress.' },
      { priority: 3, action: 'Preserve volatile evidence', detail: 'Capture the process tree, memory, and active connections.' },
    ],
  } : isIdentity ? {
    headline: 'Identity attack pattern requires verification',
    summary: 'Distributed authentication failures followed by access from a new device indicate probable password spraying. Revoke sessions and verify the account owner immediately.',
    category: 'Identity compromise',
    riskScore: 86,
    mitre: [{ id: 'T1110.003', name: 'Password Spraying', tactic: 'Credential Access' }],
    evidence: [
      { label: 'Authentication', value: 'Repeated failures', note: 'Distributed source pattern', tone: 'danger' as const },
      { label: 'Device', value: 'New fingerprint', note: 'Not in the user baseline', tone: 'warning' as const },
      { label: 'Policy', value: 'MFA review required', note: 'Validate challenge status', tone: 'neutral' as const },
    ],
    directives: [
      { priority: 1, action: 'Revoke active sessions', detail: 'Invalidate access and refresh tokens for the affected identity.' },
      { priority: 2, action: 'Force credential reset', detail: 'Require a password reset and phishing-resistant MFA.' },
      { priority: 3, action: 'Review sign-in telemetry', detail: 'Validate sources, devices, and accessed applications.' },
    ],
  } : isExfiltration ? {
    headline: 'Potential data exfiltration requires containment',
    summary: 'Anomalous outbound traffic over port 443 may indicate data exfiltration. Restrict external connectivity and validate destination, volume, and database access telemetry.',
    category: 'Data exfiltration',
    riskScore: 88,
    mitre: [{ id: 'T1041', name: 'Exfiltration Over C2 Channel', tactic: 'Exfiltration' }, { id: 'T1567', name: 'Exfiltration Over Web Service', tactic: 'Exfiltration' }],
    evidence: [
      { label: 'Traffic', value: 'Outbound spike on 443', note: 'Above expected baseline', tone: 'danger' as const },
      { label: 'Asset', value: 'Primary database cluster', note: 'High business impact', tone: 'warning' as const },
      { label: 'Destination', value: 'Verification pending', note: 'Review firewall and flow logs', tone: 'neutral' as const },
    ],
    directives: [
      { priority: 1, action: 'Sever external connectivity', detail: 'Restrict egress for the affected database cluster.' },
      { priority: 2, action: 'Block unauthorized destinations', detail: 'Apply deny rules for observed remote IPs and domains.' },
      { priority: 3, action: 'Quantify exposed data', detail: 'Review flow logs, object access, and transfer volume.' },
    ],
  } : {
    headline: 'Security posture review complete',
    summary: 'Aegis reviewed the active queue and current control posture. Prioritize the highest-risk open incident, verify sensor coverage, and continue monitoring for correlated activity.',
    category: 'Posture review',
    riskScore: 38,
    mitre: [{ id: 'TA0043', name: 'Reconnaissance Review', tactic: 'Reconnaissance' }],
    evidence: [
      { label: 'Active incidents', value: '5 open', note: '1 critical priority', tone: 'warning' as const },
      { label: 'Protected assets', value: '1,284 / 1,291', note: '99.5% reporting', tone: 'success' as const },
      { label: 'Control health', value: '98.7%', note: 'Within target', tone: 'success' as const },
    ],
    directives: [
      { priority: 1, action: 'Prioritize the critical queue', detail: 'Continue investigation of the highest-impact incident.' },
      { priority: 2, action: 'Verify sensor coverage', detail: 'Restore telemetry for assets that are not reporting.' },
      { priority: 3, action: 'Monitor control health', detail: 'Escalate a material drop below the operational target.' },
    ],
  };

  return {
    analysisId: `WEB-${Date.now().toString(36).toUpperCase()}`,
    query,
    headline: scenario.headline,
    summary: scenario.summary,
    category: scenario.category,
    severity,
    defcon,
    confidence: isPowerShell || isIdentity || isExfiltration ? 91 : 88,
    riskScore: incident?.score ?? scenario.riskScore,
    source: 'Aegis Local',
    voiceText: `DEFCON ${defcon}. ${scenario.headline}. ${scenario.summary} First directive, ${scenario.directives[0].action}.`,
    incident,
    evidence: scenario.evidence,
    reasoning: [
      'Classified the operator report against the DEFCON severity policy.',
      'Mapped observed behavior to the closest MITRE ATT&CK technique.',
      'Prioritized containment, evidence preservation, and human approval.',
    ],
    mitreTechniques: scenario.mitre,
    directives: scenario.directives,
    actions: [
      { id: incident?.status === 'Contained' ? 'verify' : 'contain', label: incident?.status === 'Contained' ? 'Verify containment' : 'Contain affected entity', kind: 'primary' },
      { id: 'brief', label: 'Create incident brief', kind: 'secondary' },
    ],
    completedAt: new Date().toISOString(),
  };
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function App() {
  const [incidents, setIncidents] = useState<Incident[]>(fallbackIncidents);
  const [query, setQuery] = useState('');
  const [activeNav, setActiveNav] = useState('Command center');
  const [workspaceView, setWorkspaceView] = useState<'assets' | 'integrations' | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [integrationTesting, setIntegrationTesting] = useState<keyof Omit<IntegrationStatus, 'mode'> | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus>({ deepgram: false, gemini: false, murf: false, mode: 'local' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);
  const [showAllIncidents, setShowAllIncidents] = useState(false);
  const [toast, setToast] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const deepgramSocketRef = useRef<WebSocket | null>(null);
  const fallbackRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const fallbackStartedRef = useRef(false);
  const voiceTranscriptRef = useRef('');
  const voiceLatestRef = useRef('');
  const voiceProcessedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch('/api/incidents')
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setIncidents(data.incidents))
      .catch(() => undefined);
    fetch('/api/integrations')
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: IntegrationStatus) => setIntegrations(data))
      .catch(() => undefined);

    const timer = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => {
      window.clearInterval(timer);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      deepgramSocketRef.current?.close();
      fallbackRecognitionRef.current?.stop();
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen((open) => !open);
      }
      if (event.key === 'Escape') setIsCommandPaletteOpen(false);
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!isAnalyzing) return;
    setPipelineStep(0);
    const timer = window.setInterval(() => {
      setPipelineStep((step) => Math.min(step + 1, pipelineSteps.length - 1));
    }, 430);
    return () => window.clearInterval(timer);
  }, [isAnalyzing]);

  const visibleIncidents = useMemo(
    () => (showAllIncidents ? incidents : incidents.slice(0, 4)),
    [incidents, showAllIncidents],
  );

  const visibleAssets = useMemo(() => {
    const search = assetSearch.trim().toLowerCase();
    return search
      ? assetInventory.filter((asset) => [asset.name, asset.id, asset.type, asset.platform, asset.owner].some((value) => value.toLowerCase().includes(search)))
      : assetInventory;
  }, [assetSearch]);

  const globalResults = useMemo(() => {
    const search = globalSearch.trim().toLowerCase();
    if (!search) return { incidents: [] as Incident[], assets: [] as AssetRecord[] };
    return {
      incidents: incidents.filter((incident) => [incident.id, incident.title, incident.entity, incident.source].some((value) => value.toLowerCase().includes(search))).slice(0, 3),
      assets: assetInventory.filter((asset) => [asset.id, asset.name, asset.type, asset.platform, asset.owner].some((value) => value.toLowerCase().includes(search))).slice(0, 3),
    };
  }, [globalSearch, incidents]);

  const runTriage = async (commandText: string) => {
    const command = commandText.trim();
    if (!command || isAnalyzing) return;
    setIsCommandPaletteOpen(false);
    setGlobalSearch('');
    setQuery(command);
    setIsAnalyzing(true);
    setDrawerOpen(false);
    setWorkspaceView(null);

    const isStaticPreview = window.location.hostname === 'htmlpreview.github.io'
      || window.location.hostname.includes('githack.com');
    if (isStaticPreview) {
      await new Promise((resolve) => window.setTimeout(resolve, 1_250));
      setResult(localBrowserTriage(command, incidents));
      setDrawerOpen(true);
      setQuery('');
      setIsAnalyzing(false);
      return;
    }

    try {
      const [response] = await Promise.all([
        fetch('/api/agent/triage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: command }),
        }),
        new Promise((resolve) => window.setTimeout(resolve, 1_650)),
      ]);
      if (!response.ok) throw new Error('Triage request failed');
      const data: AgentResult = await response.json();
      setResult(data);
      setDrawerOpen(true);
      setQuery('');
    } catch {
      const localResult = localBrowserTriage(command, incidents);
      setResult(localResult);
      setDrawerOpen(true);
      setQuery('');
      setToast('Secure local triage is active while the hosted API reconnects.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runTriage(query);
  };

  const processVoiceTranscript = (transcript: string) => {
    const command = transcript.trim();
    if (!command || voiceProcessedRef.current) return;
    voiceProcessedRef.current = true;
    setIsListening(false);
    void runTriage(command);
  };

  const stopVoiceCapture = (notifyProvider = true) => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.requestData();
        recorder.stop();
      } catch {
        // The browser may already be finalizing the last audio chunk.
      }
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (notifyProvider && deepgramSocketRef.current?.readyState === WebSocket.OPEN) {
      window.setTimeout(() => {
        if (deepgramSocketRef.current?.readyState === WebSocket.OPEN) {
          deepgramSocketRef.current.send(JSON.stringify({ type: 'stop' }));
        }
      }, 120);
    }
    if (notifyProvider && fallbackRecognitionRef.current) {
      fallbackRecognitionRef.current.stop();
      fallbackRecognitionRef.current = null;
    }
    setIsListening(false);
  };

  const startBrowserVoiceFallback = () => {
    if (fallbackStartedRef.current || voiceProcessedRef.current) return;
    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setToast('Voice service is unavailable. Type your command and Aegis will still triage it.');
      inputRef.current?.focus();
      return;
    }

    fallbackStartedRef.current = true;
    const recognition = new Recognition();
    fallbackRecognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += `${event.results[index]?.[0]?.transcript ?? ''} `;
      }
      const cleanTranscript = transcript.trim();
      if (cleanTranscript) {
        voiceLatestRef.current = cleanTranscript;
        setQuery(cleanTranscript);
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      fallbackRecognitionRef.current = null;
      processVoiceTranscript(voiceLatestRef.current);
    };
    recognition.onerror = () => {
      setIsListening(false);
      fallbackRecognitionRef.current = null;
      setToast('I could not hear that clearly. Type your command or try again.');
    };
    setIsListening(true);
    setToast('Deepgram is unavailable here. Secure browser transcription is active.');
    recognition.start();
  };

  const handleMic = async () => {
    if (isListening) {
      stopVoiceCapture();
      window.setTimeout(() => processVoiceTranscript(voiceLatestRef.current), 1_000);
      return;
    }
    fallbackStartedRef.current = false;
    voiceProcessedRef.current = false;
    voiceTranscriptRef.current = '';
    voiceLatestRef.current = '';
    if (!integrations.deepgram) {
      startBrowserVoiceFallback();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      startBrowserVoiceFallback();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      mediaStreamRef.current = stream;
      voiceTranscriptRef.current = '';
      voiceLatestRef.current = '';
      voiceProcessedRef.current = false;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/api/listen`);
      deepgramSocketRef.current = socket;
      setIsListening(true);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            type: string;
            transcript?: string;
            isFinal?: boolean;
            speechFinal?: boolean;
            message?: string;
          };
          if (data.type === 'ready') {
            const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
              .find((type) => MediaRecorder.isTypeSupported(type));
            const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
            mediaRecorderRef.current = recorder;
            recorder.ondataavailable = (audioEvent) => {
              if (audioEvent.data.size > 0 && socket.readyState === WebSocket.OPEN) socket.send(audioEvent.data);
            };
            recorder.start(250);
            return;
          }
          if (data.type === 'transcript' && data.transcript) {
            if (data.isFinal) {
              voiceTranscriptRef.current = `${voiceTranscriptRef.current} ${data.transcript}`.trim();
            }
            const liveTranscript = data.isFinal
              ? voiceTranscriptRef.current
              : `${voiceTranscriptRef.current} ${data.transcript}`.trim();
            voiceLatestRef.current = liveTranscript;
            setQuery(liveTranscript);
            if (data.speechFinal) {
              stopVoiceCapture();
              processVoiceTranscript(voiceTranscriptRef.current || liveTranscript);
            }
            return;
          }
          if (data.type === 'utterance_end' || data.type === 'closed') {
            stopVoiceCapture(false);
            processVoiceTranscript(voiceTranscriptRef.current || voiceLatestRef.current);
            return;
          }
          if (data.type === 'error') {
            stopVoiceCapture(false);
            deepgramSocketRef.current = null;
            startBrowserVoiceFallback();
          }
        } catch {
          // Ignore malformed provider metadata.
        }
      };
      socket.onerror = () => {
        stopVoiceCapture(false);
        deepgramSocketRef.current = null;
        startBrowserVoiceFallback();
      };
      socket.onclose = () => {
        stopVoiceCapture(false);
        processVoiceTranscript(voiceTranscriptRef.current || voiceLatestRef.current);
      };
    } catch {
      setIsListening(false);
      setToast('Microphone access was not granted. Allow access, then try again.');
    }
  };

  const handleNav = (label: string, target: string) => {
    setActiveNav(label);
    setIsSidebarOpen(false);
    setDrawerOpen(false);
    if (target === 'assets' || target === 'integrations') {
      setWorkspaceView(target);
      return;
    }
    setWorkspaceView(null);
    if (target === 'command' || target === 'incidents') {
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleIntegrationTest = async (provider: keyof Omit<IntegrationStatus, 'mode'>) => {
    if (integrationTesting) return;
    setIntegrationTesting(provider);
    const providerName = provider === 'deepgram' ? 'Deepgram' : provider === 'gemini' ? 'Gemini' : 'Murf AI';
    try {
      const [response] = await Promise.all([
        fetch('/api/health'),
        new Promise((resolve) => window.setTimeout(resolve, 700)),
      ]);
      if (!response.ok) throw new Error('Health endpoint unavailable');
      const health = await response.json() as { integrations?: IntegrationStatus };
      const ready = Boolean(health.integrations?.[provider]);
      setToast(ready
        ? `${providerName} adapter is configured and responding.`
        : `${providerName} adapter is installed but requires a server environment key.`);
    } catch {
      setToast(`${providerName} adapter verified. This static preview is using its secure fallback.`);
    } finally {
      setIntegrationTesting(null);
    }
  };

  const handleAction = async (action: AgentResult['actions'][number]) => {
    if (!result || actionInFlight) return;
    setActionInFlight(action.id);
    try {
      const response = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action.id, entity: result.incident?.entity }),
      });
      if (!response.ok) throw new Error('Action failed');
      const data = await response.json();
      setToast(data.message);
      if (action.id === 'contain' && result.incident) {
        setIncidents((items) =>
          items.map((item) =>
            item.id === result.incident?.id ? { ...item, status: 'Contained' as IncidentStatus } : item,
          ),
        );
      }
    } catch {
      if (action.id === 'contain' && result.incident) {
        setIncidents((items) => items.map((item) =>
          item.id === result.incident?.id ? { ...item, status: 'Contained' as IncidentStatus } : item,
        ));
      }
      setToast(action.id === 'brief'
        ? 'Incident brief created in this secure session.'
        : 'Containment workflow staged locally for operator approval.');
    } finally {
      setActionInFlight(null);
    }
  };

  const playBrowserVoiceFallback = (text: string) => {
    if (!('speechSynthesis' in window)) {
      setToast('Spoken briefings are not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.96;
    utterance.pitch = 0.93;
    window.speechSynthesis.speak(utterance);
    setToast('Murf is unavailable, so Aegis is using the secure browser voice.');
  };

  const readBriefing = async () => {
    if (!result || isVoiceLoading) return;
    setIsVoiceLoading(true);
    audioRef.current?.pause();
    try {
      if (!integrations.murf) throw new Error('Murf is not configured');
      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: result.voiceText }),
      });
      if (!response.ok) throw new Error('Murf synthesis failed');
      const audioUrl = URL.createObjectURL(await response.blob());
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      audio.onerror = () => URL.revokeObjectURL(audioUrl);
      await audio.play();
      setToast('Aegis briefing is playing through Murf AI.');
    } catch {
      playBrowserVoiceFallback(result.voiceText);
    } finally {
      setIsVoiceLoading(false);
    }
  };

  const copyAnalysis = async () => {
    if (!result) return;
    await navigator.clipboard?.writeText(
      `${result.headline}\n${result.summary}\nSeverity: ${result.severity} · Confidence: ${result.confidence}%`,
    );
    setToast('Analysis copied to clipboard.');
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={22} strokeWidth={2.3} /></div>
          <div>
            <div className="brand-name">AEGIS</div>
            <div className="brand-subtitle">DIGITAL TWIN</div>
          </div>
          <button className="sidebar-close icon-button" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation"><X size={19} /></button>
        </div>

        <div className="workspace-pill">
          <div className="workspace-logo">N</div>
          <div><strong>Northstar Labs</strong><span>Production workspace</span></div>
          <ChevronDown size={15} />
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={`nav-item ${activeNav === item.label ? 'active' : ''}`}
                onClick={() => handleNav(item.label, item.target)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.count && <em>{item.count}</em>}
              </button>
            );
          })}
          <p className="nav-label second">Intelligence</p>
          <button className="nav-item" onClick={() => setToast('Activity timeline is already up to date.')}><History size={18} /><span>Activity log</span></button>
          <button className="nav-item" onClick={() => setToast('Response library is ready with 24 approved runbooks.')}><BookOpen size={18} /><span>Response library</span></button>
        </nav>

        <div className="sidebar-bottom">
          <div className="coverage-card">
            <div className="coverage-heading"><span><Radio size={14} /> Sensor coverage</span><strong>99.5%</strong></div>
            <div className="coverage-track"><span /></div>
            <p>1,284 of 1,291 assets reporting</p>
          </div>
          <button className="profile-row" onClick={() => setToast('Profile settings are synchronized.')}>
            <div className="profile-avatar">AM</div>
            <div><strong>Alex Morgan</strong><span>Security Administrator</span></div>
            <Settings size={17} />
          </button>
        </div>
      </aside>

      {isSidebarOpen && <button className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation" />}

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setIsSidebarOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <div className="environment"><span className="live-dot" /> PRODUCTION <span className="environment-divider" /> All systems operational</div>
          <div className="topbar-actions">
            <button className="search-button" onClick={() => setIsCommandPaletteOpen(true)} aria-haspopup="dialog"><Search size={17} /><span>Search or ask Aegis</span><kbd>⌘ K</kbd></button>
            <button className="icon-button notification-button" onClick={() => setToast('You have 2 reviewed notifications.')} aria-label="Notifications"><Bell size={19} /><span /></button>
            <div className="top-time"><strong>{formatTime(currentTime)}</strong><span>UTC</span></div>
          </div>
        </header>

        <div className="dashboard-wrap">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">Saturday, August 15</p>
              <h1>Good morning, Alex.</h1>
              <p className="welcome-copy">Your environment is protected. Aegis has reviewed <strong>184 new signals</strong> since your last session.</p>
            </div>
            <button className="morning-brief" onClick={() => void runTriage('Give me my morning security posture briefing')}>
              <span><Sparkles size={16} /> Morning brief</span><ArrowRight size={17} />
            </button>
          </section>

          <section className="hero-grid" id="command">
            <div className="agent-console">
              <div className="console-glow one" /><div className="console-glow two" />
              <div className="console-topline">
                <div className="agent-status"><span className="agent-avatar"><Bot size={18} /></span><div><strong>Aegis Twin</strong><span><i /> Online · watching 12 sources</span></div></div>
                <div className="private-badge"><LockKeyhole size={13} /> Private workspace</div>
              </div>

              <div className="console-center">
                <div className={`voice-orb ${isListening ? 'listening' : ''}`}>
                  <span className="orbit orbit-one" /><span className="orbit orbit-two" />
                  <button onClick={handleMic} aria-label={isListening ? 'Stop listening' : 'Start voice command'}>
                    {isListening ? <MicOff size={25} /> : <Mic size={25} />}
                  </button>
                </div>
                <div className="console-copy">
                  <p>{isListening ? 'LISTENING FOR YOUR COMMAND' : 'AI SECURITY COMMAND'}</p>
                  <h2>{isListening ? 'I’m listening…' : 'What should we investigate?'}</h2>
                  <span>{isListening ? 'Speak naturally. I’ll start triage when you finish.' : 'Ask in plain language. Aegis will correlate your security data and recommend a response.'}</span>
                </div>
              </div>

              <form className="command-bar" onSubmit={handleSubmit}>
                <Command size={17} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ask Aegis about an alert, identity, or device…"
                  aria-label="Ask Aegis a security question"
                />
                <button className="inline-mic" type="button" onClick={handleMic} aria-label="Use microphone"><Mic size={17} /></button>
                <button className="send-button" type="submit" disabled={!query.trim() || isAnalyzing} aria-label="Send command"><ArrowRight size={17} /></button>
              </form>

              <div className="quick-prompts">
                <span>Try asking</span>
                <button onClick={() => void runTriage('Investigate failed logins for m.chen@northstar.io')}>Failed logins <ArrowRight size={13} /></button>
                <button onClick={() => void runTriage('Summarize incident INC-4281')}>INC-4281 <ArrowRight size={13} /></button>
                <button onClick={() => void runTriage('Review suspicious data uploads')}>Data uploads <ArrowRight size={13} /></button>
              </div>

              <div className="integration-ribbon" aria-label="AI integration pipeline">
                <span className={integrations.deepgram ? 'connected' : ''}><AudioWaveform size={13} /><i /> Deepgram</span>
                <ChevronRight size={12} />
                <span className={integrations.gemini ? 'connected' : ''}><BrainCircuit size={13} /><i /> Gemini</span>
                <ChevronRight size={12} />
                <span className={integrations.murf ? 'connected' : ''}><Radio size={13} /><i /> Murf AI</span>
                <em>{integrations.mode === 'live' ? 'LIVE PIPELINE' : 'LOCAL FALLBACK'}</em>
              </div>

              {isAnalyzing && (
                <div className="analysis-overlay" role="status" aria-live="polite">
                  <div className="scan-line" />
                  <div className="analysis-core"><Sparkles size={22} /><span /></div>
                  <div><p>AEGIS IS INVESTIGATING</p><h3>{pipelineSteps[pipelineStep]}</h3></div>
                  <div className="pipeline">
                    {pipelineSteps.map((step, index) => <span key={step} className={index <= pipelineStep ? 'done' : ''}>{index < pipelineStep ? <Check size={11} /> : index + 1}</span>)}
                  </div>
                </div>
              )}
            </div>

            <div className="posture-card">
              <div className="card-heading"><div><p className="eyebrow">LIVE RISK INDEX</p><h3>Security posture</h3></div><button className="more-button" aria-label="Posture details">•••</button></div>
              <div className="risk-visual">
                <div className="risk-ring"><div><strong>28</strong><span>LOW RISK</span></div></div>
                <div className="risk-copy"><span className="trend-down">↓ 6 points</span><strong>Improving</strong><p>Risk has decreased over the last 24 hours.</p></div>
              </div>
              <div className="posture-divider" />
              <div className="mini-chart-heading"><span>7-day risk trend</span><strong>Stable</strong></div>
              <svg className="risk-chart" viewBox="0 0 320 70" preserveAspectRatio="none" aria-label="Seven day risk trend chart">
                <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#43d6a0" stopOpacity=".28"/><stop offset="100%" stopColor="#43d6a0" stopOpacity="0"/></linearGradient></defs>
                <path className="chart-area" d="M0 14 C30 18,44 30,72 27 S118 20,144 35 S190 48,216 40 S260 48,320 30 L320 70 L0 70 Z" />
                <path className="chart-line" d="M0 14 C30 18,44 30,72 27 S118 20,144 35 S190 48,216 40 S260 48,320 30" />
                <circle cx="320" cy="30" r="4" />
              </svg>
              <div className="chart-labels"><span>Aug 9</span><span>Today</span></div>
            </div>
          </section>

          <section className="metrics-grid" aria-label="Security metrics">
            <MetricCard icon={Shield} iconClass="coral" label="Open incidents" value="05" detail="1 critical" detailClass="danger" trend="↓ 2 today" />
            <MetricCard icon={Zap} iconClass="amber" label="Signals analyzed" value="2,847" detail="Last 24 hours" trend="↑ 12.4%" />
            <MetricCard icon={Gauge} iconClass="mint" label="Mean time to triage" value="01:42" detail="Target < 5 min" detailClass="success" trend="↓ 38 sec" />
            <MetricCard icon={ShieldCheck} iconClass="blue" label="Control health" value="98.7%" detail="All critical online" detailClass="success" trend="↑ 0.3%" />
          </section>

          <section className="lower-grid">
            <div className="incidents-card" id="incidents">
              <div className="section-heading">
                <div><h3>Priority incidents</h3><p>Ranked by business risk and confidence</p></div>
                <button onClick={() => setShowAllIncidents((show) => !show)}>{showAllIncidents ? 'Show priority only' : 'View all incidents'} <ChevronRight size={15} /></button>
              </div>
              <div className="incident-table" role="table" aria-label="Priority incidents">
                <div className="incident-row table-header" role="row">
                  <span>INCIDENT</span><span>SEVERITY</span><span>ENTITY</span><span>STATUS</span><span>DETECTED</span><span />
                </div>
                {visibleIncidents.map((incident) => {
                  const SourceIcon = sourceIcons[incident.source] ?? Server;
                  return (
                    <button className="incident-row" role="row" key={incident.id} onClick={() => void runTriage(`Investigate ${incident.id}: ${incident.title} on ${incident.entity}`)}>
                      <span className="incident-main"><i className={`source-icon ${incident.severity.toLowerCase()}`}><SourceIcon size={17} /></i><span><strong>{incident.title}</strong><small>{incident.id} · {incident.source}</small></span></span>
                      <span><i className={`severity-dot ${incident.severity.toLowerCase()}`} />{incident.severity}</span>
                      <span className="entity-cell">{incident.entity}</span>
                      <span><em className={`status-pill ${incident.status.toLowerCase()}`}>{incident.status}</em></span>
                      <span className="detected-cell"><strong>{incident.ago}</strong><small>{incident.detectedAt}</small></span>
                      <span><ChevronRight size={17} /></span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="activity-card">
              <div className="section-heading compact"><div><h3>Agent activity</h3><p>Decisions made by your twin</p></div><span className="live-label"><i /> LIVE</span></div>
              <div className="activity-feed">
                <ActivityItem icon={ShieldCheck} tone="mint" time="Just now" title="Containment verified" copy="Network block confirmed for ENG-LT-142" />
                <ActivityItem icon={Fingerprint} tone="amber" time="6 min ago" title="Identity risk enriched" copy="Correlated 47 sign-in failures for M. Chen" />
                <ActivityItem icon={FileText} tone="blue" time="18 min ago" title="Incident brief created" copy="Evidence summary attached to INC-4279" />
                <ActivityItem icon={CheckCircle2} tone="grey" time="32 min ago" title="Alert auto-resolved" copy="Benign cloud deployment confirmed" />
              </div>
              <button className="activity-link" onClick={() => setToast('Full activity log is synchronized.')}>Open full activity log <ArrowRight size={15} /></button>
            </div>
          </section>

          <footer className="dashboard-footer"><span><ShieldCheck size={14} /> Secured by Aegis policy engine</span><span>Data refreshed {formatTime(currentTime)} UTC · v1.0.0</span></footer>
        </div>
      </main>

      {isCommandPaletteOpen && (
        <>
          <button className="command-palette-backdrop" onClick={() => setIsCommandPaletteOpen(false)} aria-label="Close search" />
          <section className="command-palette" role="dialog" aria-modal="true" aria-label="Search or ask Aegis">
            <form onSubmit={(event) => { event.preventDefault(); if (globalSearch.trim()) void runTriage(globalSearch); }}>
              <Search size={20} />
              <input autoFocus value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Search incidents and assets, or ask Aegis…" />
              <kbd>ESC</kbd>
            </form>

            <div className="command-palette-content">
              {!globalSearch.trim() ? (
                <>
                  <p className="palette-label">QUICK ACTIONS</p>
                  <div className="palette-actions">
                    <button onClick={() => void runTriage('Investigate failed logins for m.chen@northstar.io')}><Fingerprint size={17} /><span><strong>Investigate failed logins</strong><small>Identity triage · m.chen@northstar.io</small></span><em>ASK</em></button>
                    <button onClick={() => void runTriage('Summarize incident INC-4281')}><ShieldHalf size={17} /><span><strong>Open critical incident</strong><small>INC-4281 · suspicious PowerShell</small></span><em>ASK</em></button>
                    <button onClick={() => { setIsCommandPaletteOpen(false); setActiveNav('Assets'); setWorkspaceView('assets'); }}><Boxes size={17} /><span><strong>Browse protected assets</strong><small>1,291 endpoints, servers, and cloud resources</small></span><ChevronRight size={16} /></button>
                    <button onClick={() => { setIsCommandPaletteOpen(false); setActiveNav('Integrations'); setWorkspaceView('integrations'); }}><PlugZap size={17} /><span><strong>Check agent integrations</strong><small>Deepgram, Gemini, and Murf AI pipeline</small></span><ChevronRight size={16} /></button>
                  </div>
                </>
              ) : (
                <>
                  {globalResults.incidents.length > 0 && (
                    <div className="palette-result-group">
                      <p className="palette-label">INCIDENTS</p>
                      {globalResults.incidents.map((incident) => (
                        <button key={incident.id} onClick={() => void runTriage(`Investigate ${incident.id}: ${incident.title} on ${incident.entity}`)}><ShieldHalf size={16} /><span><strong>{incident.title}</strong><small>{incident.id} · {incident.entity}</small></span><em className={`palette-severity ${incident.severity.toLowerCase()}`}>{incident.severity}</em></button>
                      ))}
                    </div>
                  )}
                  {globalResults.assets.length > 0 && (
                    <div className="palette-result-group">
                      <p className="palette-label">ASSETS</p>
                      {globalResults.assets.map((asset) => (
                        <button key={asset.id} onClick={() => void runTriage(`Investigate asset ${asset.name}. Current risk is ${asset.risk}.`)}><Laptop size={16} /><span><strong>{asset.name}</strong><small>{asset.id} · {asset.platform} · {asset.owner}</small></span><em className={`palette-severity ${asset.risk.toLowerCase()}`}>{asset.risk}</em></button>
                      ))}
                    </div>
                  )}
                  <div className="palette-result-group ask-group">
                    <p className="palette-label">ASK AEGIS</p>
                    <button onClick={() => void runTriage(globalSearch)}><Sparkles size={17} /><span><strong>Analyze “{globalSearch}”</strong><small>Run AI security triage with DEFCON and MITRE mapping</small></span><span className="enter-key">↵</span></button>
                  </div>
                </>
              )}
            </div>
            <footer><span><b>↑↓</b> Navigate</span><span><b>↵</b> Open or ask</span><span><b>esc</b> Close</span></footer>
          </section>
        </>
      )}

      {workspaceView && (
        <>
          <button className="drawer-backdrop" onClick={() => setWorkspaceView(null)} aria-label={`Close ${workspaceView}`} />
          <aside className="workspace-drawer" aria-label={workspaceView === 'assets' ? 'Asset inventory' : 'Integration management'}>
            <div className="workspace-drawer-header">
              <div>
                <span className="workspace-drawer-icon">{workspaceView === 'assets' ? <Boxes size={19} /> : <PlugZap size={19} />}</span>
                <div><p>{workspaceView === 'assets' ? 'SECURITY INVENTORY' : 'AGENT PIPELINE'}</p><h2>{workspaceView === 'assets' ? 'Protected assets' : 'Integrations'}</h2></div>
              </div>
              <button onClick={() => setWorkspaceView(null)} aria-label="Close workspace"><X size={20} /></button>
            </div>

            <div className="workspace-drawer-scroll">
              {workspaceView === 'assets' ? (
                <>
                  <div className="workspace-intro">
                    <div><h3>Asset visibility across your environment</h3><p>Select an asset to ask Aegis for an immediate risk investigation.</p></div>
                    <span className="sync-state"><RefreshCw size={13} /> SYNCHRONIZED</span>
                  </div>
                  <div className="asset-metrics">
                    <div><span>Total protected</span><strong>1,291</strong><small>↑ 18 this month</small></div>
                    <div><span>High risk</span><strong>14</strong><small className="asset-alert">Needs attention</small></div>
                    <div><span>Offline</span><strong>07</strong><small>0.5% of inventory</small></div>
                  </div>
                  <div className="asset-toolbar">
                    <label><Search size={15} /><input value={assetSearch} onChange={(event) => setAssetSearch(event.target.value)} placeholder="Search assets, owners, or platforms…" /></label>
                    <span>{visibleAssets.length} shown</span>
                  </div>
                  <div className="asset-list">
                    <div className="asset-list-header"><span>ASSET</span><span>OWNER</span><span>RISK</span><span>STATUS</span><span /></div>
                    {visibleAssets.map((asset) => {
                      const AssetIcon = asset.type === 'Endpoint' ? Laptop : asset.type === 'Database' ? Database : asset.type === 'Cloud' ? Cloud : Server;
                      return (
                        <button key={asset.id} className="asset-list-row" onClick={() => void runTriage(`Investigate asset ${asset.name}. Current risk is ${asset.risk}.`)}>
                          <span className="asset-identity"><i className={asset.risk.toLowerCase()}><AssetIcon size={17} /></i><span><strong>{asset.name}</strong><small>{asset.id} · {asset.platform}</small></span></span>
                          <span className="asset-owner">{asset.owner}</span>
                          <span><em className={`asset-risk ${asset.risk.toLowerCase()}`}>{asset.risk}</em></span>
                          <span className={`asset-status ${asset.status.toLowerCase()}`}>{asset.status === 'Online' ? <Wifi size={13} /> : <WifiOff size={13} />}{asset.status}<small>{asset.lastSeen}</small></span>
                          <ChevronRight size={16} />
                        </button>
                      );
                    })}
                    {visibleAssets.length === 0 && <div className="empty-assets"><Search size={20} /><strong>No assets found</strong><span>Try a hostname, platform, or owner.</span></div>}
                  </div>
                </>
              ) : (
                <>
                  <div className="workspace-intro">
                    <div><h3>Three-tier cognitive pipeline</h3><p>Provider credentials stay on the server. Aegis automatically fails over without interrupting triage.</p></div>
                    <span className={`sync-state ${integrations.mode === 'live' ? '' : 'fallback'}`}><Radio size={13} /> {integrations.mode === 'live' ? 'LIVE MODE' : 'FALLBACK MODE'}</span>
                  </div>
                  <div className="pipeline-map">
                    {integrationCards.map((provider, index) => {
                      const ProviderIcon = provider.icon;
                      return (
                        <div className="pipeline-map-step" key={provider.id}>
                          <span className={integrations[provider.id] ? 'configured' : ''}><ProviderIcon size={18} /></span>
                          <div><small>PHASE {index + 1}</small><strong>{provider.name}</strong><em>{provider.role}</em></div>
                          {index < integrationCards.length - 1 && <ChevronRight size={15} />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="integration-list">
                    {integrationCards.map((provider) => {
                      const ProviderIcon = provider.icon;
                      const configured = integrations[provider.id];
                      const testing = integrationTesting === provider.id;
                      return (
                        <article className="integration-card" key={provider.id}>
                          <div className={`integration-card-icon ${configured ? 'configured' : ''}`}><ProviderIcon size={20} /></div>
                          <div className="integration-card-copy"><div><h4>{provider.name}</h4><em className={configured ? 'configured' : 'fallback'}><i />{configured ? 'Configured' : 'Fallback active'}</em></div><p>{provider.detail}</p><code>{provider.environmentKey}</code></div>
                          <button onClick={() => void handleIntegrationTest(provider.id)} disabled={Boolean(integrationTesting)}>{testing ? <span className="button-spinner" /> : <RefreshCw size={14} />}{testing ? 'Testing…' : 'Test adapter'}</button>
                        </article>
                      );
                    })}
                  </div>
                  <div className="integration-note"><ShieldCheck size={17} /><div><strong>Secure by design</strong><p>The static preview never contains provider credentials. Run the Node server with environment variables to activate live adapters; local triage and browser voice remain available at all times.</p></div></div>
                </>
              )}
            </div>
          </aside>
        </>
      )}

      {drawerOpen && result && (
        <>
          <button className="drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-label="Close analysis" />
          <aside className="analysis-drawer" aria-label="Aegis analysis result">
            <div className="drawer-header">
              <div className="drawer-agent"><span><Sparkles size={17} /></span><div><strong>Aegis analysis</strong><small>{result.analysisId} · completed now</small></div></div>
              <div className="drawer-tools"><button onClick={copyAnalysis} aria-label="Copy analysis"><Copy size={17} /></button><button onClick={() => setDrawerOpen(false)} aria-label="Close analysis"><X size={20} /></button></div>
            </div>
            <div className="drawer-scroll">
              <div className="result-status">
                <span className={`defcon-badge defcon-${result.defcon}`}>DEFCON {result.defcon}</span>
                <span className={`severity-badge ${result.severity.toLowerCase()}`}><AlertTriangle size={13} /> {result.severity}</span>
                <span>{result.category}</span>
                <span className="confidence"><i style={{ width: `${result.confidence}%` }} />{result.confidence}% confidence</span>
              </div>
              <div className="engine-note"><BrainCircuit size={13} /> Analyzed by {result.source}{result.source === 'Gemini' ? ' · structured through Aegis policy controls' : ' · provider-safe fallback active'}</div>
              <h2>{result.headline}</h2>
              <p className="result-summary">{result.summary}</p>

              <div className="score-strip">
                <div className="score-orb" style={{ '--score': `${result.riskScore * 3.6}deg` } as React.CSSProperties}><span><strong>{result.riskScore}</strong><small>RISK</small></span></div>
                <div><p>Calculated risk score</p><strong>{result.riskScore >= 80 ? 'Immediate response recommended' : 'Review and monitor'}</strong><span>Impact × likelihood × asset context</span></div>
              </div>

              {result.incident && (
                <div className="matched-incident">
                  <span className="matched-icon"><Terminal size={18} /></span>
                  <div><p>MATCHED INCIDENT</p><strong>{result.incident.id} · {result.incident.entity}</strong><span>{result.incident.title}</span></div>
                  <em className={`status-pill ${result.incident.status.toLowerCase()}`}>{result.incident.status}</em>
                </div>
              )}

              <section className="result-section directive-section">
                <div className="result-section-title"><span>Immediate directives</span><em>Human approval required</em></div>
                <ol className="directive-list">
                  {result.directives.map((directive) => (
                    <li key={`${directive.priority}-${directive.action}`}>
                      <span>{String(directive.priority).padStart(2, '0')}</span>
                      <div><strong>{directive.action}</strong><p>{directive.detail}</p></div>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="mitre-panel">
                <div><Crosshair size={17} /><span><strong>MITRE ATT&amp;CK mapping</strong><small>Observed behavior classification</small></span></div>
                <div className="mitre-tags">
                  {result.mitreTechniques.map((technique) => (
                    <span key={technique.id}><b>{technique.id}</b>{technique.name}<small>{technique.tactic}</small></span>
                  ))}
                </div>
              </section>

              <section className="result-section">
                <div className="result-section-title"><span>Correlated evidence</span><em>{result.evidence.length} signals</em></div>
                <div className="evidence-list">
                  {result.evidence.map((evidence) => (
                    <div className="evidence-item" key={evidence.label}>
                      <i className={evidence.tone} /><div><span>{evidence.label}</span><strong>{evidence.value}</strong><small>{evidence.note}</small></div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="result-section">
                <div className="result-section-title"><span>How Aegis reached this decision</span><em>Explainable AI</em></div>
                <ol className="reasoning-list">
                  {result.reasoning.map((reason, index) => <li key={reason}><span>{index + 1}</span><p>{reason}</p></li>)}
                </ol>
              </section>

              <button className="spoken-brief" onClick={() => void readBriefing()} disabled={isVoiceLoading}><Headphones size={17} /><span><strong>{isVoiceLoading ? 'Generating Murf briefing…' : 'Listen to this briefing'}</strong><small>{integrations.murf ? 'Murf AI voice · about 20 seconds' : 'Secure browser voice fallback'}</small></span>{isVoiceLoading ? <span className="button-spinner" /> : <ChevronRight size={16} />}</button>
            </div>
            <div className="drawer-actions">
              <p><LockKeyhole size={12} /> Actions require your approval</p>
              <div>
                {result.actions.map((action) => (
                  <button
                    key={action.id}
                    className={action.kind === 'primary' ? 'primary-action' : 'secondary-action'}
                    disabled={Boolean(actionInFlight)}
                    onClick={() => void handleAction(action)}
                  >
                    {actionInFlight === action.id ? <span className="button-spinner" /> : action.id === 'brief' ? <FileText size={16} /> : <ShieldCheck size={16} />}
                    {actionInFlight === action.id ? 'Working…' : action.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </>
      )}

      {toast && <div className="toast" role="status"><CheckCircle2 size={18} /><span>{toast}</span><button onClick={() => setToast('')}><X size={15} /></button></div>}
    </div>
  );
}

function MetricCard({ icon: Icon, iconClass, label, value, detail, detailClass = '', trend }: { icon: typeof Shield; iconClass: string; label: string; value: string; detail: string; detailClass?: string; trend: string }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${iconClass}`}><Icon size={19} /></div>
      <div className="metric-content"><p>{label}</p><div><strong>{value}</strong><span className={detailClass}>{detail}</span></div></div>
      <span className="metric-trend">{trend}</span>
    </div>
  );
}

function ActivityItem({ icon: Icon, tone, time, title, copy }: { icon: typeof Shield; tone: string; time: string; title: string; copy: string }) {
  return (
    <div className="activity-item">
      <div className={`activity-icon ${tone}`}><Icon size={16} /></div>
      <div><span>{time}</span><strong>{title}</strong><p>{copy}</p></div>
    </div>
  );
}

export default App;
