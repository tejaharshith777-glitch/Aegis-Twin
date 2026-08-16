import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  BrainCircuit,
  Check,
  ChevronDown,
  Cloud,
  Crosshair,
  Database,
  Fingerprint,
  Gauge,
  Globe,
  Layers,
  LockKeyhole,
  Menu,
  Network,
  Play,
  Radar,
  Send,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: string;
  source: string;
  entity: string;
  ago: string;
  assignee: string;
  score: number;
}

interface AgentResult {
  analysisId: string;
  headline: string;
  summary: string;
  category: string;
  severity: Severity;
  confidence: number;
  riskScore: number;
  source: string;
  evidence: Array<{ label: string; value: string; note: string; tone: string }>;
  reasoning: string[];
  mitreTechniques: Array<{ id: string; name: string; tactic: string }>;
  directives: Array<{ priority: number; action: string; detail: string }>;
  actions: Array<{ id: string; label: string; kind: 'primary' | 'secondary' }>;
}

/* ------------------------------------------------------------------ */
/* Static data                                                         */
/* ------------------------------------------------------------------ */

const asset = (file: string) => `${import.meta.env.BASE_URL}img/${file}`;

const fallbackIncidents: Incident[] = [
  { id: 'INC-4281', title: 'Suspicious PowerShell execution', severity: 'Critical', status: 'Investigating', source: 'EDR', entity: 'WIN-FIN-07', ago: '2m ago', assignee: 'Aegis Twin', score: 96 },
  { id: 'INC-4280', title: 'Identity anomaly detected', severity: 'High', status: 'Investigating', source: 'Identity', entity: 'm.chen@northstar.io', ago: '9m ago', assignee: 'Maya Chen', score: 87 },
  { id: 'INC-4279', title: 'Potential data exfiltration', severity: 'High', status: 'Contained', source: 'Network', entity: 'ENG-LT-142', ago: '27m ago', assignee: 'Aegis Twin', score: 82 },
  { id: 'INC-4278', title: 'Malicious attachment blocked', severity: 'Medium', status: 'Monitoring', source: 'Email', entity: 'r.patel@northstar.io', ago: '46m ago', assignee: 'Sam Okafor', score: 61 },
  { id: 'INC-4277', title: 'Unusual cloud permission change', severity: 'Low', status: 'Resolved', source: 'Cloud', entity: 'prod-data-reader', ago: '1h ago', assignee: 'Aegis Twin', score: 32 },
];

const partners = ['NORTHSTAR', 'HELIX LABS', 'QUANTA GRID', 'VERTEX OPS', 'IRONGATE', 'NOVA CLOUD', 'SENTIENT AI', 'BLACKROCK SEC'];

const capabilities = [
  { icon: ShieldCheck, title: 'Threat Triage', text: 'Aegis reads raw alerts, correlates telemetry, and returns a full incident assessment with MITRE mapping in seconds — not hours.' },
  { icon: BrainCircuit, title: 'Agent Reasoning', text: 'A transparent chain of reasoning accompanies every verdict, so analysts can audit exactly how the twin reached its conclusion.' },
  { icon: Cloud, title: 'Cloud Scale', text: 'From a single endpoint to a global fleet, the same triage engine scales elastically with zero re-architecture on your side.' },
  { icon: Database, title: 'Evidence Mining', text: 'Drop in logs, CSV exports, or JSON captures. Aegis validates every record and turns raw evidence into ranked, actionable signal.' },
];

const caseStudies = [
  {
    img: 'case-finance.png',
    alt: 'Glass skyscraper at night with cyan light streaks',
    year: '//2026',
    title: 'Northstar Financial SOC',
    text: 'Cut mean time-to-triage from 43 minutes to under 90 seconds by putting Aegis Twin in front of the tier-one alert queue.',
    stat: '96% faster triage',
  },
  {
    img: 'case-health.png',
    alt: 'Server corridor with glowing emerald racks',
    year: '//2026',
    title: 'Helix Health Data Fabric',
    text: 'Automated evidence validation across 40M daily log lines with zero-touch escalation for anything above severity High.',
    stat: '40M records / day',
  },
  {
    img: 'case-cloud.png',
    alt: 'Abstract wavy lines with a cyan glow',
    year: '//2026',
    title: 'Quanta Grid Cloud Defense',
    text: 'Deployed a custom containment workflow that isolates compromised workloads before a human ever opens the ticket.',
    stat: '85% fewer escalations',
  },
];

const approach = [
  { icon: Crosshair, title: 'Prime Logic', text: 'High-fidelity model alignment keeps every verdict consistent, explainable, and reproducible under audit.' },
  { icon: Fingerprint, title: 'Total Clarity', text: 'Full observability into how your telemetry is parsed, scored, and escalated by the agent.' },
  { icon: Zap, title: 'Fast Cycles', text: 'Go from a raw alert feed to an autonomous triage lane in days, not quarters, with pre-built playbooks.' },
];

const featureTabs = [
  {
    key: 'DISCOVER',
    icon: Radar,
    title: 'Map every signal before it becomes an incident.',
    text: 'The discovery engine crawls your alert feeds, identity events, and network flows to build a live knowledge graph of what normal looks like — so the abnormal stands out instantly.',
    bullets: ['Continuous asset and identity inventory', 'Baseline behavioral fingerprints', 'Silent-log and blind-spot detection'],
  },
  {
    key: 'ANALYZE',
    icon: BrainCircuit,
    title: 'Reason over evidence like a senior analyst.',
    text: 'Every query is decomposed, correlated against MITRE ATT&CK, and scored for risk and confidence. The twin shows its work: evidence, reasoning chain, and technique mapping.',
    bullets: ['MITRE ATT&CK technique mapping', 'Confidence and risk scoring', 'Transparent reasoning chains'],
  },
  {
    key: 'CONTAIN',
    icon: LockKeyhole,
    title: 'Approve containment with one click.',
    text: 'Aegis proposes prioritized directives — isolate the host, revoke the token, block the domain — and dispatches them to your control plane the moment you approve.',
    bullets: ['One-click containment workflows', 'Human-in-the-loop approvals', 'Automatic rollback windows'],
  },
  {
    key: 'REPORT',
    icon: Layers,
    title: 'Briefings written before you ask.',
    text: 'Executive-ready incident briefs are generated automatically, with timelines, blast radius, and remediation status kept current as the situation evolves.',
    bullets: ['Auto-generated incident briefs', 'Live timeline reconstruction', 'Compliance-ready audit trail'],
  },
];

const integrations = ['Splunk', 'CrowdStrike', 'Microsoft Sentinel', 'Okta', 'AWS GuardDuty', 'Cloudflare', 'PagerDuty', 'Slack', 'Jira', 'Elastic', 'Datadog', 'GitHub'];

const testimonials = [
  { org: 'Vertex Ops', title: 'Triage that finally scales', text: 'We routed our entire tier-one queue through Aegis. Analysts now open tickets that already contain the verdict, the evidence, and the fix.', icon: Network },
  { org: 'Helix Labs', title: 'Saved us an analyst team', text: 'Instead of hiring four more responders, we deployed the twin. It handles the noise so our humans handle the judgment calls.', icon: Activity },
  { org: 'Irongate Security', title: 'Precision in every verdict', text: 'The reasoning chain on each assessment is what sold us. We can audit every decision the agent makes, line by line.', icon: Shield },
  { org: 'Nova Cloud', title: 'Enterprise-grade by default', text: 'Containment approvals in Slack, briefs in the morning inbox, full MITRE mapping on everything. It just fits how a real SOC works.', icon: Server },
];

const faqs = [
  { q: 'What exactly is Aegis Twin?', a: 'Aegis Twin is an AI security-operations agent. It ingests alerts, logs, and evidence files, performs full triage with MITRE ATT&CK mapping, and proposes containment directives you approve with one click. Think of it as a digital twin of your best analyst, on shift 24/7.' },
  { q: 'Does it replace my SOC analysts?', a: 'No — it removes the repetitive tier-one workload. Every verdict ships with the evidence and reasoning chain, and containment always stays human-in-the-loop unless you explicitly enable autonomous mode for a playbook.' },
  { q: 'How does the live console work?', a: 'The console on this page is wired to the real Aegis triage engine. Type any security question or paste alert context, and the agent returns a scored assessment with evidence, MITRE techniques, and recommended directives.' },
  { q: 'What data sources can it ingest?', a: 'Native connectors cover major EDR, SIEM, identity, and cloud providers. You can also drop raw JSON, CSV, or log files straight into the evidence analyzer for instant validation and triage.' },
  { q: 'Is my data used to train models?', a: 'Never. Your telemetry is processed in an isolated tenant, encrypted in transit and at rest, and is contractually excluded from any model training pipeline.' },
  { q: 'How fast can we deploy?', a: 'Most teams connect their first alert feed in under an hour and run a fully automated triage lane within the first week using our pre-built playbooks.' },
];

const quickCommands = [
  'Triage the PowerShell alert on WIN-FIN-07',
  'Is m.chen@northstar.io compromised?',
  'Summarize data exfiltration risk on ENG-LT-142',
  'Assess the blocked phishing attachment',
];

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

function useRevealOnScroll() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function useCountUp(target: number, decimals = 0, duration = 1600) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const run = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Number((target * eased).toFixed(decimals)));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (!('IntersectionObserver' in window)) {
      run();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          run();
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [target, decimals, duration]);

  return { ref, value };
}

function useTypewriter(phrases: string[], speed = 46, hold = 2100) {
  const [text, setText] = useState('');
  useEffect(() => {
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timer: number;
    const step = () => {
      const phrase = phrases[phraseIndex];
      if (!deleting) {
        charIndex += 1;
        setText(phrase.slice(0, charIndex));
        if (charIndex === phrase.length) {
          deleting = true;
          timer = window.setTimeout(step, hold);
          return;
        }
        timer = window.setTimeout(step, speed);
      } else {
        charIndex -= 2;
        if (charIndex <= 0) {
          charIndex = 0;
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
        }
        setText(phrase.slice(0, Math.max(charIndex, 0)));
        timer = window.setTimeout(step, deleting ? 22 : 300);
      }
    };
    timer = window.setTimeout(step, 400);
    return () => window.clearTimeout(timer);
  }, [phrases, speed, hold]);
  return text;
}

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

function Stat({ target, suffix, decimals, label }: { target: number; suffix: string; decimals?: number; label: string }) {
  const { ref, value } = useCountUp(target, decimals ?? 0);
  return (
    <div className="stat-card" data-reveal>
      <div className="stat-value">
        <span ref={ref}>{decimals ? value.toFixed(decimals) : Math.round(value)}</span>
        <em>{suffix}</em>
      </div>
      <p>{label}</p>
      <div className="stat-bar"><i /></div>
    </div>
  );
}

function SectionHead({ kicker, title, text }: { kicker: string; title: string; text?: string }) {
  return (
    <header className="section-head" data-reveal>
      <span className="kicker"><i className="kicker-dot" />{kicker}</span>
      <h2>{title}</h2>
      {text ? <p>{text}</p> : null}
    </header>
  );
}

function SeverityPill({ severity }: { severity: Severity }) {
  return <span className={`pill sev-${severity.toLowerCase()}`}>{severity}</span>;
}

function Marquee({ items, reverse }: { items: string[]; reverse?: boolean }) {
  const doubled = useMemo(() => [...items, ...items], [items]);
  return (
    <div className="marquee" aria-hidden="true">
      <div className={`marquee-track ${reverse ? 'reverse' : ''}`}>
        {doubled.map((item, index) => (
          <span key={`${item}-${index}`} className="marquee-item">
            <Sparkles size={13} />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Live console                                                        */
/* ------------------------------------------------------------------ */

type ConsoleTab = 'console' | 'incidents' | 'telemetry';

interface LogLine {
  id: number;
  tone: 'sys' | 'user' | 'ok' | 'warn' | 'err';
  text: string;
}

let logCounter = 0;

function LiveConsole() {
  const [tab, setTab] = useState<ConsoleTab>('console');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>(fallbackIncidents);
  const [online, setOnline] = useState<boolean | null>(null);
  const [actionState, setActionState] = useState<Record<string, 'pending' | 'done'>>({});
  const [logs, setLogs] = useState<LogLine[]>([
    { id: ++logCounter, tone: 'sys', text: 'aegis-twin core v2.4.0 — session initialized' },
    { id: ++logCounter, tone: 'sys', text: 'telemetry link established · 5 feeds subscribed' },
    { id: ++logCounter, tone: 'ok', text: 'ready. type a command or pick a quick action below.' },
  ]);
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const pushLog = useCallback((tone: LogLine['tone'], text: string) => {
    setLogs((previous) => [...previous.slice(-40), { id: ++logCounter, tone, text }]);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [logs]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('offline'))))
      .then(() => {
        if (!cancelled) {
          setOnline(true);
          pushLog('ok', 'api link verified — live triage engine connected');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOnline(false);
          pushLog('warn', 'api unreachable — running in demo mode with cached telemetry');
        }
      });
    fetch('/api/incidents')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('offline'))))
      .then((data: { incidents?: Incident[] }) => {
        if (!cancelled && Array.isArray(data.incidents) && data.incidents.length) setIncidents(data.incidents);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pushLog]);

  const localAssessment = useCallback((text: string): AgentResult => {
    const lower = text.toLowerCase();
    const severity: Severity = /power(shell)?|exfil|ransom|critical/.test(lower) ? 'Critical' : /compromis|anomal|phish/.test(lower) ? 'High' : 'Medium';
    return {
      analysisId: `LOCAL-${Date.now().toString(36).toUpperCase()}`,
      headline: severity === 'Critical' ? 'Active threat pattern identified' : 'Suspicious activity assessed',
      summary: 'Demo-mode assessment generated locally. Connect the Aegis API for full model-backed triage with live telemetry correlation.',
      category: 'Behavioral analysis',
      severity,
      confidence: severity === 'Critical' ? 91 : 78,
      riskScore: severity === 'Critical' ? 92 : 68,
      source: 'Aegis Local',
      evidence: [
        { label: 'Signal match', value: 'Pattern correlation', note: 'Query matched known threat-behavior heuristics.', tone: 'warning' },
        { label: 'Scope', value: 'Single entity', note: 'No lateral movement indicators in cached telemetry.', tone: 'neutral' },
      ],
      reasoning: [
        'Parsed the operator query and extracted candidate entities.',
        'Correlated against cached incident telemetry and baselines.',
        'Scored severity from matched behavioral heuristics.',
      ],
      mitreTechniques: [{ id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'Execution' }],
      directives: [
        { priority: 1, action: 'Isolate the affected entity', detail: 'Quarantine pending confirmation from live telemetry.' },
        { priority: 2, action: 'Collect volatile evidence', detail: 'Capture memory and process tree before remediation.' },
      ],
      actions: [
        { id: 'contain', label: 'Approve containment', kind: 'primary' },
        { id: 'brief', label: 'Generate brief', kind: 'secondary' },
      ],
    };
  }, []);

  const runTriage = useCallback(
    async (raw?: string) => {
      const text = (raw ?? query).trim();
      if (!text || busy) return;
      setBusy(true);
      setActionState({});
      setQuery('');
      pushLog('user', `> ${text}`);
      pushLog('sys', 'dispatching to triage engine…');
      try {
        const response = await fetch('/api/agent/triage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: text }),
        });
        if (!response.ok) throw new Error('bad response');
        const data = (await response.json()) as AgentResult;
        setResult(data);
        pushLog('ok', `assessment ${data.analysisId} complete · ${data.severity} · confidence ${data.confidence}%`);
      } catch {
        const local = localAssessment(text);
        setResult(local);
        pushLog('warn', `engine offline — local assessment ${local.analysisId} generated`);
      } finally {
        setBusy(false);
        window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
      }
    },
    [busy, query, pushLog, localAssessment],
  );

  const runAction = useCallback(
    async (actionId: string, label: string) => {
      setActionState((previous) => ({ ...previous, [actionId]: 'pending' }));
      pushLog('sys', `executing action: ${label.toLowerCase()}…`);
      try {
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: actionId, entity: result?.headline ?? 'incident' }),
        });
        const data = response.ok ? ((await response.json()) as { message?: string }) : null;
        pushLog('ok', data?.message ?? `${label} completed and logged to the audit trail.`);
      } catch {
        pushLog('ok', `${label} queued locally — will sync when the control plane reconnects.`);
      } finally {
        setActionState((previous) => ({ ...previous, [actionId]: 'done' }));
      }
    },
    [pushLog, result],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void runTriage();
  };

  return (
    <div className="console-shell" data-reveal>
      <div className="console-chrome">
        <div className="chrome-dots"><i /><i /><i /></div>
        <div className="console-tabs" role="tablist" aria-label="Console views">
          {(
            [
              ['console', 'CONSOLE', Terminal],
              ['incidents', 'INCIDENTS', AlertTriangle],
              ['telemetry', 'TELEMETRY', Activity],
            ] as Array<[ConsoleTab, string, typeof Terminal]>
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`console-tab ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
        <span className={`link-state ${online === false ? 'off' : ''}`}>
          <i />
          {online === null ? 'LINKING' : online ? 'LIVE LINK' : 'DEMO MODE'}
        </span>
      </div>

      {tab === 'console' && (
        <div className="console-body">
          <div className="console-log" aria-live="polite">
            {logs.map((line) => (
              <p key={line.id} className={`log-line log-${line.tone}`}>
                <span className="log-prefix">
                  {line.tone === 'user' ? '❯' : line.tone === 'ok' ? '✓' : line.tone === 'warn' ? '!' : line.tone === 'err' ? '✕' : '·'}
                </span>
                {line.text}
              </p>
            ))}
            {busy && (
              <p className="log-line log-sys thinking">
                <span className="log-prefix">·</span>
                analyzing<span className="dots"><i>.</i><i>.</i><i>.</i></span>
              </p>
            )}
            <div ref={logEndRef} />
          </div>

          {result && (
            <div className="assessment" ref={resultRef}>
              <div className="assessment-top">
                <div>
                  <span className="assessment-id">{result.analysisId} · {result.source}</span>
                  <h4>{result.headline}</h4>
                </div>
                <div className="assessment-scores">
                  <SeverityPill severity={result.severity} />
                  <span className="score-chip"><Gauge size={13} /> Risk {result.riskScore}</span>
                  <span className="score-chip"><Check size={13} /> {result.confidence}% conf.</span>
                </div>
              </div>
              <p className="assessment-summary">{result.summary}</p>

              {result.evidence.length > 0 && (
                <div className="evidence-grid">
                  {result.evidence.slice(0, 4).map((item) => (
                    <div key={item.label} className={`evidence-card tone-${item.tone}`}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <p>{item.note}</p>
                    </div>
                  ))}
                </div>
              )}

              {result.mitreTechniques.length > 0 && (
                <div className="mitre-row">
                  {result.mitreTechniques.map((technique) => (
                    <span key={technique.id} className="mitre-chip">
                      <Crosshair size={12} />
                      {technique.id} · {technique.name}
                    </span>
                  ))}
                </div>
              )}

              {result.directives.length > 0 && (
                <ol className="directives">
                  {result.directives.slice(0, 3).map((directive) => (
                    <li key={directive.priority}>
                      <strong>{directive.action}</strong>
                      <span>{directive.detail}</span>
                    </li>
                  ))}
                </ol>
              )}

              <div className="assessment-actions">
                {result.actions.map((action) => {
                  const state = actionState[action.id];
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className={`btn ${action.kind === 'primary' ? 'btn-solid' : 'btn-ghost'} btn-sm`}
                      disabled={state === 'pending' || state === 'done'}
                      onClick={() => void runAction(action.id, action.label)}
                    >
                      {state === 'done' ? <Check size={14} /> : state === 'pending' ? <span className="spinner" /> : <Zap size={14} />}
                      {state === 'done' ? 'Completed' : action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <form className="console-input" onSubmit={submit}>
            <Terminal size={16} className="input-icon" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask Aegis about an alert, identity, or device…"
              maxLength={1200}
              aria-label="Command input"
            />
            <button type="submit" className="btn btn-solid btn-sm" disabled={busy || !query.trim()}>
              {busy ? <span className="spinner" /> : <Send size={14} />}
              Run
            </button>
          </form>

          <div className="quick-commands">
            {quickCommands.map((command) => (
              <button key={command} type="button" onClick={() => void runTriage(command)} disabled={busy}>
                <Play size={11} />
                {command}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'incidents' && (
        <div className="console-body">
          <div className="incident-table" role="table" aria-label="Live incidents">
            <div className="incident-row head" role="row">
              <span>ID</span><span>Incident</span><span>Severity</span><span>Entity</span><span>Status</span><span>Score</span>
            </div>
            {incidents.map((incident, index) => (
              <button
                key={incident.id}
                type="button"
                className="incident-row"
                style={{ animationDelay: `${index * 70}ms` }}
                onClick={() => {
                  setTab('console');
                  void runTriage(`Triage incident ${incident.id}: ${incident.title} on ${incident.entity}`);
                }}
              >
                <span className="mono">{incident.id}</span>
                <span className="incident-title">{incident.title}<em>{incident.source} · {incident.ago}</em></span>
                <span><SeverityPill severity={incident.severity} /></span>
                <span className="mono dim">{incident.entity}</span>
                <span className={`status-chip st-${incident.status.toLowerCase()}`}>{incident.status}</span>
                <span className="score-cell">
                  <i style={{ width: `${incident.score}%` }} />
                  <b>{incident.score}</b>
                </span>
              </button>
            ))}
          </div>
          <p className="table-hint"><Sparkles size={13} /> Click any incident to send it straight to the triage console.</p>
        </div>
      )}

      {tab === 'telemetry' && (
        <div className="console-body">
          <div className="telemetry-grid">
            <div className="tele-card">
              <span className="tele-label">SYSTEM LOAD</span>
              <div className="ring" style={{ ['--pct' as never]: '73' }}>
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <circle cx="60" cy="60" r="52" className="ring-bg" />
                  <circle cx="60" cy="60" r="52" className="ring-fg" />
                </svg>
                <strong>73%</strong>
              </div>
              <p>Active neural processing across 12 cores</p>
            </div>
            <div className="tele-card">
              <span className="tele-label">FEED THROUGHPUT</span>
              <div className="eq" aria-hidden="true">
                {Array.from({ length: 14 }).map((_, index) => (
                  <i key={index} style={{ animationDelay: `${index * 90}ms` }} />
                ))}
              </div>
              <p>8.4M events ingested in the last 24 hours</p>
            </div>
            <div className="tele-card">
              <span className="tele-label">SLA RESPONSE</span>
              <strong className="tele-big">99.99<em>%</em></strong>
              <div className="tick-row" aria-hidden="true">
                {Array.from({ length: 24 }).map((_, index) => (
                  <i key={index} className={index === 17 ? 'warn' : ''} style={{ animationDelay: `${index * 60}ms` }} />
                ))}
              </div>
              <p>Global uptime across all triage regions</p>
            </div>
            <div className="tele-card">
              <span className="tele-label">CONTAINMENT LANES</span>
              <ul className="lane-list">
                {[
                  ['Endpoint isolation', 96],
                  ['Token revocation', 88],
                  ['Network egress block', 74],
                  ['Mail purge', 61],
                ].map(([label, pct]) => (
                  <li key={String(label)}>
                    <span>{label}</span>
                    <div className="lane-bar"><i style={{ width: `${pct}%` }} /></div>
                    <b>{pct}%</b>
                  </li>
                ))}
              </ul>
              <p>Playbook readiness by control plane</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

const heroPhrases = [
  'triage alerts in seconds.',
  'map threats to MITRE ATT&CK.',
  'contain incidents autonomously.',
  'brief your board before breakfast.',
];

export default function App() {
  useRevealOnScroll();
  const typed = useTypewriter(heroPhrases);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const top = window.scrollY;
      setScrolled(top > 24);
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(height > 0 ? Math.min(top / height, 1) : 0);
      if (heroRef.current) {
        heroRef.current.style.setProperty('--parallax', `${Math.min(top * 0.18, 120)}px`);
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goTo = useCallback((id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const subscribe = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !email.includes('@')) return;
    setSubscribed(true);
    setEmail('');
    window.setTimeout(() => setSubscribed(false), 4200);
  };

  const navLinks: Array<[string, string]> = [
    ['Capabilities', 'capabilities'],
    ['Case Studies', 'cases'],
    ['Console', 'console'],
    ['Platform', 'platform'],
    ['FAQ', 'faq'],
  ];

  return (
    <div className="site">
      <div className="scroll-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-orb orb-a" aria-hidden="true" />
      <div className="bg-orb orb-b" aria-hidden="true" />

      {/* ---------------- NAV ---------------- */}
      <nav className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
        <button type="button" className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="brand-mark"><Shield size={17} /></span>
          aegis<b>twin</b>
        </button>
        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {navLinks.map(([label, id]) => (
            <button key={id} type="button" onClick={() => goTo(id)}>{label}</button>
          ))}
          <button type="button" className="btn btn-solid btn-sm nav-cta" onClick={() => goTo('console')}>
            Launch Console
            <ArrowRight size={14} />
          </button>
        </div>
        <button type="button" className="nav-burger" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen((v) => !v)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* ---------------- HERO ---------------- */}
      <section className="hero" ref={heroRef}>
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="hero-tags" data-reveal>
              {['AI Triage', 'Autonomous Agents', 'MITRE Mapping', 'Live Containment'].map((tag, index) => (
                <span key={tag} style={{ animationDelay: `${index * 120}ms` }}>{tag}</span>
              ))}
            </div>
            <h1 data-reveal>
              Power your defense
              <br />
              with <span className="grad">an AI twin</span>
            </h1>
            <p className="hero-type" data-reveal>
              Deploy a security agent that can <span className="typed">{typed}</span><span className="caret" aria-hidden="true" />
            </p>
            <p className="hero-sub" data-reveal>
              Aegis Twin sits in front of your alert queue, reasons over evidence like a senior analyst,
              and hands you verdicts with the fix attached. Scale your security intelligence today.
            </p>
            <div className="hero-cta" data-reveal>
              <button type="button" className="btn btn-solid" onClick={() => goTo('console')}>
                Try the Live Console
                <ArrowRight size={16} />
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => goTo('cases')}>
                <Play size={15} />
                See it in action
              </button>
            </div>
            <div className="hero-mini-stats" data-reveal>
              <div><strong>90s</strong><span>median triage</span></div>
              <i />
              <div><strong>24/7</strong><span>agent on shift</span></div>
              <i />
              <div><strong>0</strong><span>alerts ignored</span></div>
            </div>
          </div>

          <div className="hero-visual" data-reveal>
            <div className="hero-img-wrap">
              <img src={asset('hero-core.png')} alt="Aegis Twin AI security core hologram" loading="eager" />
              <div className="hero-float card-a">
                <ShieldCheck size={15} />
                <div><strong>Threat contained</strong><span>WIN-FIN-07 isolated · 47s</span></div>
              </div>
              <div className="hero-float card-b">
                <Activity size={15} />
                <div><strong>8.4M events</strong><span>correlated today</span></div>
              </div>
              <div className="hero-ring" aria-hidden="true" />
              <div className="hero-ring ring-2" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="partner-strip" data-reveal>
          <span>TRUSTED BY SECURITY TEAMS AT</span>
          <Marquee items={partners} />
        </div>
      </section>

      {/* ---------------- CAPABILITIES ---------------- */}
      <section className="section" id="capabilities">
        <SectionHead
          kicker="CAPABILITIES"
          title="One agent, four disciplines"
          text="Aegis blends detection engineering, threat intel, and incident response into a single autonomous teammate."
        />
        <div className="cap-grid">
          {capabilities.map((cap, index) => (
            <article key={cap.title} className="cap-card" data-reveal style={{ transitionDelay: `${index * 90}ms` }}>
              <div className="cap-icon"><cap.icon size={20} /></div>
              <h3>{cap.title}</h3>
              <p>{cap.text}</p>
              <button type="button" className="cap-link" onClick={() => goTo('console')}>
                Explore <ArrowRight size={13} />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------- STATS ---------------- */}
      <section className="section stats-section">
        <div className="stats-head" data-reveal>
          <span className="kicker"><i className="kicker-dot" />STATISTICS</span>
          <h2>Quantifiable impact across every deployment. We measure success by the speed and scale of your security ops.</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => goTo('cases')}>
            View case studies <ArrowRight size={14} />
          </button>
        </div>
        <div className="stats-grid">
          <Stat target={240} suffix="ms" label="Average latency for a full triage verdict, including evidence correlation." />
          <Stat target={12} suffix="x" label="Increase in tier-one alert processing speed versus manual triage." />
          <Stat target={99.99} suffix="%" decimals={2} label="Uptime across the agent infrastructure powering critical response lanes." />
        </div>
      </section>

      {/* ---------------- CASE STUDIES ---------------- */}
      <section className="section" id="cases">
        <SectionHead
          kicker="CASE STUDIES"
          title="Proven security outcomes"
          text="We partner with security leaders to deploy bespoke AI agents that dissolve alert fatigue and drive measurable resilience."
        />
        <div className="case-grid">
          {caseStudies.map((item, index) => (
            <article key={item.title} className="case-card" data-reveal style={{ transitionDelay: `${index * 110}ms` }}>
              <div className="case-img">
                <img src={asset(item.img)} alt={item.alt} loading="lazy" />
                <span className="case-stat">{item.stat}</span>
              </div>
              <span className="case-year">{item.year}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <button type="button" className="cap-link" onClick={() => goTo('console')}>
                Run a similar triage <ArrowRight size={13} />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------- CONSOLE ---------------- */}
      <section className="section console-section" id="console">
        <SectionHead
          kicker="LIVE PRODUCT"
          title="The command console"
          text="This is the real thing — type a security question, click an incident, approve a containment. Every button is wired to the Aegis engine."
        />
        <LiveConsole />
      </section>

      {/* ---------------- APPROACH ---------------- */}
      <section className="section approach-section">
        <div className="approach-grid">
          <div className="approach-copy">
            <SectionHead
              kicker="OUR APPROACH"
              title="Built for the long term"
              text="We don't just ship detections; we architect autonomous defense ecosystems that improve with every incident."
            />
            <div className="approach-list">
              {approach.map((item, index) => (
                <div key={item.title} className="approach-item" data-reveal style={{ transitionDelay: `${index * 100}ms` }}>
                  <div className="cap-icon sm"><item.icon size={17} /></div>
                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="approach-visual" data-reveal>
            <img src={asset('approach.png')} alt="Security operations command center with holographic dashboards" loading="lazy" />
            <div className="approach-badge">
              <Globe size={15} />
              <div><strong>14 regions</strong><span>global triage mesh</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- PLATFORM TABS ---------------- */}
      <section className="section" id="platform">
        <SectionHead
          kicker="PLATFORM"
          title="Engineered for autonomy"
          text="Go beyond dashboards. Aegis provides the full lifecycle — discovery, analysis, containment, and reporting — in one agent."
        />
        <div className="tabs-row" data-reveal role="tablist" aria-label="Platform stages">
          {featureTabs.map((feature, index) => (
            <button
              key={feature.key}
              type="button"
              role="tab"
              aria-selected={activeTab === index}
              className={`stage-tab ${activeTab === index ? 'active' : ''}`}
              onClick={() => setActiveTab(index)}
            >
              <feature.icon size={15} />
              {feature.key}
            </button>
          ))}
        </div>
        <div className="tab-panel" data-reveal key={featureTabs[activeTab].key}>
          <div className="tab-copy">
            <h3>{featureTabs[activeTab].title}</h3>
            <p>{featureTabs[activeTab].text}</p>
            <ul>
              {featureTabs[activeTab].bullets.map((bullet) => (
                <li key={bullet}><Check size={15} />{bullet}</li>
              ))}
            </ul>
            <button type="button" className="btn btn-solid btn-sm" onClick={() => goTo('console')}>
              Try it now <ArrowRight size={14} />
            </button>
          </div>
          <div className="tab-visual" aria-hidden="true">
            <div className="node-canvas">
              <div className="node n1"><Radar size={14} />Signal In</div>
              <div className="node n2"><BrainCircuit size={14} />Aegis Agent</div>
              <div className="node n3"><LockKeyhole size={14} />Contain</div>
              <div className="node n4"><Layers size={14} />Brief</div>
              <svg className="node-wires" viewBox="0 0 400 220" preserveAspectRatio="none">
                <path d="M90 60 C 160 60 160 110 200 110" className="wire" />
                <path d="M200 110 C 250 110 250 55 310 55" className="wire w2" />
                <path d="M200 110 C 250 110 250 170 310 170" className="wire w3" />
              </svg>
              <span className="pulse-dot p1" />
              <span className="pulse-dot p2" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- INTEGRATIONS ---------------- */}
      <section className="section integrations-section">
        <SectionHead
          kicker="INTEGRATIONS"
          title="Lives where you already work"
          text="Aegis bridges your telemetry and your tools — from SIEM to chat — with secure, production-ready connectors."
        />
        <div data-reveal>
          <Marquee items={integrations} />
          <Marquee items={[...integrations].reverse()} reverse />
        </div>
      </section>

      {/* ---------------- TESTIMONIALS ---------------- */}
      <section className="section">
        <SectionHead
          kicker="TESTIMONIALS"
          title="Trusted by the defenders"
          text="From high-growth startups to enterprise SOCs, Aegis Twin is the chosen teammate for teams that refuse to drown in alerts."
        />
        <div className="testi-grid">
          {testimonials.map((item, index) => (
            <article key={item.org} className="testi-card" data-reveal style={{ transitionDelay: `${index * 90}ms` }}>
              <div className="testi-head">
                <div className="cap-icon sm"><item.icon size={16} /></div>
                <span>{item.org}</span>
              </div>
              <h4>{item.title}</h4>
              <p>“{item.text}”</p>
              <div className="testi-stars" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, star) => (
                  <Sparkles key={star} size={13} />
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="section faq-section" id="faq">
        <SectionHead
          kicker="FAQ"
          title="Common inquiries"
          text="Everything you need to know about deploying, scaling, and securing your operations with Aegis Twin."
        />
        <div className="faq-list" data-reveal>
          {faqs.map((faq, index) => {
            const open = openFaq === index;
            return (
              <div key={faq.q} className={`faq-item ${open ? 'open' : ''}`}>
                <button type="button" onClick={() => setOpenFaq(open ? null : index)} aria-expanded={open}>
                  <span>{faq.q}</span>
                  <ChevronDown size={17} className="faq-chev" />
                </button>
                <div className="faq-answer" style={{ maxHeight: open ? '220px' : '0px' }}>
                  <p>{faq.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="section cta-section" id="contact">
        <div className="cta-card" data-reveal>
          <div className="cta-glow" aria-hidden="true" />
          <span className="kicker light"><i className="kicker-dot" />GET STARTED</span>
          <h2>Get smarter about autonomous defense</h2>
          <p>Weekly insights on AI triage, agent playbooks, and real SOC builds. No fluff — just what works.</p>
          <form className="cta-form" onSubmit={subscribe}>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              aria-label="Email address"
              required
            />
            <button type="submit" className="btn btn-solid">
              {subscribed ? <Check size={15} /> : <Send size={15} />}
              {subscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          </form>
          {subscribed && <p className="cta-ok"><Check size={13} /> You're on the list — first briefing lands this week.</p>}
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <button type="button" className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <span className="brand-mark"><Shield size={17} /></span>
              aegis<b>twin</b>
            </button>
            <p>The AI security-operations twin. Triage, contain, and brief — autonomously, transparently, at machine speed.</p>
            <span className="footer-badge"><span className="live-dot" /> All systems operational</span>
          </div>
          <div className="footer-col">
            <span>Product</span>
            {navLinks.map(([label, id]) => (
              <button key={id} type="button" onClick={() => goTo(id)}>{label}</button>
            ))}
          </div>
          <div className="footer-col">
            <span>Platform</span>
            {featureTabs.map((feature, index) => (
              <button
                key={feature.key}
                type="button"
                onClick={() => {
                  setActiveTab(index);
                  goTo('platform');
                }}
              >
                {feature.key.charAt(0) + feature.key.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="footer-col">
            <span>Company</span>
            <button type="button" onClick={() => goTo('contact')}>Contact</button>
            <button type="button" onClick={() => goTo('faq')}>Support</button>
            <button type="button" onClick={() => goTo('cases')}>Customers</button>
          </div>
        </div>
        <div className="footer-bottom">
          <span>©2026 Aegis Twin. All rights reserved.</span>
          <span className="mono">SEC-OPS · BUILD 2.4.0</span>
        </div>
      </footer>

      <BackToTop />
    </div>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button
      type="button"
      className={`back-top ${visible ? 'show' : ''}`}
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <ArrowUp size={17} />
    </button>
  );
}
