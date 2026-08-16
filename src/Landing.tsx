import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AudioWaveform,
  BrainCircuit,
  Cloud,
  FileSearch,
  Fingerprint,
  GitBranch,
  LockKeyhole,
  Mail,
  Menu,
  Mic,
  Network,
  Radio,
  Send,
  Shield,
  ShieldCheck,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import footerImg from './assets/lp-footer.jpg';
import heroImg from './assets/lp-hero.jpg';
import mindImg from './assets/lp-mind.jpg';
import socImg from './assets/lp-soc.jpg';
import speechImg from './assets/lp-speech.jpg';
import voiceImg from './assets/lp-voice.jpg';

const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- utilities ---------- */
function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver(
      (entries) => { entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); } }); },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function CountUp({ to, decimals = 0, suffix = '', duration = 1600 }: { to: number; decimals?: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          setValue(to * (1 - Math.pow(1 - t, 3)));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, duration]);
  return <span ref={ref}>{value.toFixed(decimals)}{suffix}</span>;
}

function WordStagger({ text, from = 0 }: { text: string; from?: number }) {
  return <>{text.split(' ').map((w, i) => <span data-word key={i} style={{ ['--wd' as string]: `${(from + i) * 90}ms` }}>{w}&nbsp;</span>)}</>;
}

/* ---------- chapter data ---------- */
const CHAPTERS = [
  { id: 'ch-hero', label: 'Home' },
  { id: 'ch-problem', label: 'The Problem' },
  { id: 'ch-overview', label: 'Aegis Overview' },
  { id: 'ch-deepgram', label: 'Deepgram' },
  { id: 'ch-gemini', label: 'Gemini' },
  { id: 'ch-murf', label: 'Murf AI' },
  { id: 'ch-demo', label: 'Live Demo' },
  { id: 'ch-evidence', label: 'Evidence Lab' },
  { id: 'ch-safety', label: 'Human Control' },
  { id: 'ch-launch', label: 'Launch' },
] as const;

const demoIncidents = [
  { id: 'ps1', label: 'Encoded PowerShell', defcon: 1, severity: 'Critical', risk: 96, confidence: 94, category: 'Endpoint compromise', mitre: [{ id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' }, { id: 'T1105', name: 'Ingress Tool Transfer', tactic: 'C2' }], evidence: ['powershell.exe -enc …', 'Parent: ACRORD32.EXE', 'Untrusted destination'], directives: ['Isolate the affected endpoint', 'Block destination indicators', 'Preserve volatile evidence'] },
  { id: 'ps2', label: 'Password Spraying', defcon: 2, severity: 'High', risk: 86, confidence: 89, category: 'Identity compromise', mitre: [{ id: 'T1110.003', name: 'Password Spraying', tactic: 'Credential Access' }], evidence: ['Repeated auth failures', 'New device fingerprint', 'MFA challenge bypassed'], directives: ['Revoke active sessions', 'Force credential reset', 'Review sign-in telemetry'] },
  { id: 'ps3', label: 'Outbound Database Transfer', defcon: 2, severity: 'High', risk: 82, confidence: 91, category: 'Data exfiltration', mitre: [{ id: 'T1048', name: 'Exfiltration Over C2', tactic: 'Exfiltration' }], evidence: ['Anomalous outbound traffic', 'Large DB dump detected', 'Destination: unknown ASN'], directives: ['Block outbound connection', 'Audit database access logs', 'Notify data owner'] },
];

const ovSteps = [
  { icon: Mic, label: 'Voice Command', desc: 'Operator speaks naturally' },
  { icon: AudioWaveform, label: 'Deepgram', desc: 'Nova-3 transcription' },
  { icon: BrainCircuit, label: 'Gemini', desc: 'DEFCON & MITRE decision' },
  { icon: Radio, label: 'Murf AI', desc: 'Spoken incident briefing' },
  { icon: ShieldCheck, label: 'Human Approves', desc: 'Action executed' },
];

const INVESTIGATION_STEPS = [
  { label: 'Collect evidence', copy: 'Pull raw signals from EDR, identity, network, and email sources.' },
  { label: 'Correlate telemetry', copy: 'Join entity history, process ancestry, and destination reputation.' },
  { label: 'Classify and score', copy: 'DEFCON severity, MITRE ATT&CK mapping, and risk scoring.' },
  { label: 'Verdict and directives', copy: 'Final call with containment steps and operator approval gates.' },
];

const TICKER = [
  'INC-4279 · ENCODED POWERSHELL · DEFCON 1',
  'IDENTITY SPRAY DETECTED · 14K AUTH FAILURES',
  'MITRE T1059.001 MAPPED · EXECUTION',
  'OUTBOUND EXFIL BLOCKED · UNKNOWN ASN',
  'MEAN TIME TO TRIAGE · 42 SECONDS',
  'VOICE BRIEFING GENERATED · MURF GEN2',
  'SHA-256 EVIDENCE VERIFIED · 5 RECORDS',
  'DEEPGRAM NOVA-3 · LATENCY 218MS',
];

const TRANSCRIPT_SEGMENTS: { text: string; cls: string }[] = [
  { text: 'Aegis, investigate ', cls: '' },
  { text: 'encoded PowerShell', cls: 'tx-em' },
  { text: ' activity on ', cls: '' },
  { text: 'WIN-FIN-07', cls: 'tx-strong' },
  { text: '.', cls: '' },
];
const TRANSCRIPT_TOTAL = TRANSCRIPT_SEGMENTS.reduce((n, s) => n + s.text.length, 0);

/* =====================================================================
   LANDING COMPONENT
   ===================================================================== */
export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [ch, setCh] = useState(0);
  const [demoIdx, setDemoIdx] = useState(0);
  const [safetyApproved, setSafetyApproved] = useState(false);
  const [investigation, setInvestigation] = useState<'idle' | 'running' | 'done'>('idle');
  const [invStep, setInvStep] = useState(0);
  const [ovActive, setOvActive] = useState(-1);
  const [gmActive, setGmActive] = useState(0);
  const [typed, setTyped] = useState(reduceMotion ? TRANSCRIPT_TOTAL : 0);
  const [clock, setClock] = useState(() => new Date());
  const tiltRef = useRef<HTMLDivElement>(null);

  useReveal([demoIdx, investigation]);

  useEffect(() => { document.body.style.overflow = menuOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [menuOpen]);

  /* ---------- live SOC clock ---------- */
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  /* ---------- chapter detection ---------- */
  useEffect(() => {
    const els = CHAPTERS.map(c => document.getElementById(c.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = CHAPTERS.findIndex(c => c.id === entry.target.id);
            if (idx >= 0) setCh(idx);
          }
        });
      },
      { threshold: 0.35, rootMargin: '0px 0px -10% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* ---------- progress bar ---------- */
  useEffect(() => {
    const bar = document.getElementById('lp-progress');
    if (!bar) return;
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = `${(window.scrollY / h) * 100}%`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ---------- parallax layers ---------- */
  useEffect(() => {
    if (reduceMotion) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
    if (!els.length) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        els.forEach((el) => {
          const speed = Number(el.dataset.parallax ?? 0.1);
          el.style.transform = `translate3d(0, ${y * speed}px, 0)`;
        });
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  /* ---------- hero visual mouse tilt ---------- */
  useEffect(() => {
    const el = tiltRef.current;
    if (!el || reduceMotion) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateY(${px * 7}deg) rotateX(${-py * 7}deg)`;
    };
    const onLeave = () => { el.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg)'; };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); };
  }, []);

  /* ---------- overview step sequencing ---------- */
  useEffect(() => {
    const ovEl = document.getElementById('ch-overview');
    if (!ovEl) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          ovSteps.forEach((_, i) => {
            setTimeout(() => setOvActive(i), i * 900);
          });
        }
      },
      { threshold: 0.3 },
    );
    io.observe(ovEl);
    return () => io.disconnect();
  }, []);

  /* ---------- gemini step sequencing ---------- */
  useEffect(() => {
    const el = document.getElementById('ch-gemini');
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const steps = 5;
          for (let i = 0; i < steps; i++) {
            setTimeout(() => setGmActive(i), i * 700);
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ---------- deepgram live transcript typing ---------- */
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const el = document.getElementById('dg-transcript');
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setTyping(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduceMotion) { setTyped(TRANSCRIPT_TOTAL); return; }
    if (!typing) return;
    setTyped(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(i);
      if (i >= TRANSCRIPT_TOTAL) clearInterval(id);
    }, 38);
    return () => clearInterval(id);
  }, [typing]);

  /* ---------- demo full-investigation sequencing (page 4) ---------- */
  useEffect(() => {
    if (investigation !== 'running') return;
    const id = window.setInterval(() => {
      setInvStep((step) => Math.min(step + 1, INVESTIGATION_STEPS.length));
    }, 640);
    return () => window.clearInterval(id);
  }, [investigation]);

  useEffect(() => {
    if (investigation === 'running' && invStep >= INVESTIGATION_STEPS.length) {
      setInvestigation('done');
    }
  }, [invStep, investigation]);

  const startInvestigation = () => {
    setInvStep(0);
    setInvestigation('running');
    requestAnimationFrame(() => {
      document.getElementById('ch-demo')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  };

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
  const goPrev = () => { if (ch > 0) scrollTo(CHAPTERS[ch - 1].id); };
  const goNext = () => { if (ch < CHAPTERS.length - 1) scrollTo(CHAPTERS[ch + 1].id); };

  const demo = demoIncidents[demoIdx];
  const clockStr = `${clock.toISOString().slice(0, 10)} · ${clock.toISOString().slice(11, 19)} UTC`;

  return (
    <div className="lp">
      {/* progress bar */}
      <div id="lp-progress" className="lp-progress-bar" />

      {/* chapter indicator */}
      <div className="lp-chapter-indicator" aria-hidden="true">
        <span>{String(ch + 1).padStart(2, '0')} / {String(CHAPTERS.length).padStart(2, '0')}</span>
        <div className="lp-chapter-line" />
      </div>

      {/* prev / next */}
      <div className="lp-ch-nav" aria-label="Chapter navigation">
        <button onClick={goPrev} disabled={ch === 0} aria-label="Previous chapter"><ArrowLeft size={15} /></button>
        <button onClick={goNext} disabled={ch === CHAPTERS.length - 1} aria-label="Next chapter"><ArrowRight size={15} /></button>
      </div>

      {/* ---------- top bar ---------- */}
      <header className="lp-topbar">
        <a className="lp-logo" href="#ch-hero" onClick={(e) => { e.preventDefault(); scrollTo('ch-hero'); }}>
          <span className="lp-logo-mark"><Zap size={18} strokeWidth={2.6} /></span>
          aegis twin
        </a>
        <button className="lp-burger" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
          <Menu size={24} strokeWidth={1.7} />
        </button>
      </header>

      {/* ---------- overlay menu (10 links) ---------- */}
      <div className={`lp-menu ${menuOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Site menu">
        <button className="lp-menu-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={26} /></button>
        <nav>
          {CHAPTERS.map((c, i) => (
            <button key={c.id} style={{ ['--md' as string]: `${i * 60}ms` }} onClick={() => scrollTo(c.id)}>
              <span className="lp-menu-idx">{String(i + 1).padStart(2, '0')}</span>{c.label}
            </button>
          ))}
          <a className="lp-menu-cta" href="#/console">Enter Command Center <ArrowUpRight size={20} /></a>
        </nav>
        <p className="lp-menu-foot">AEGIS TWIN © 2026 — VOICE-FIRST SECURITY OPERATIONS</p>
      </div>

      {/* =================================================================
          CHAPTER 01 — HERO
          ================================================================= */}
      <section className="ch-hero" id="ch-hero">
        <div className="ch-hero-left">
          <div className="ch-hero-tag glitch" data-reveal data-text="AEGIS TWIN / 2026">AEGIS TWIN / 2026</div>
          <h1 data-reveal>
            <WordStagger text="Your security team," from={0} /><br />
            <WordStagger text="moving at" from={3} /><br />
            <WordStagger text="machine speed." from={5} />
          </h1>
          <p data-reveal>
            Deploy a voice-activated digital twin that triages incidents and briefs your analysts in seconds.
            Scale your response with Aegis Twin today.
          </p>
          <div className="ch-hero-actions" data-reveal>
            <a className="ch-btn" href="#/console">Enter Command Center <ArrowRight size={16} /></a>
            <button className="ch-btn ch-btn-outline" onClick={() => scrollTo('ch-overview')}>Explore System <ArrowDown size={16} /></button>
          </div>
          <div className="ch-hero-badges" data-reveal>
            <span>Deepgram</span>
            <span>Gemini</span>
            <span>Murf AI</span>
          </div>
          <div className="ch-hero-clock" data-reveal>
            <span className="ch-hero-clock-dot" />
            SYSTEM ONLINE · {clockStr}
          </div>
        </div>
        <div className="ch-hero-right">
          <div className="ch-hero-img-frame" ref={tiltRef}>
            <img className="ch-hero-img" src={heroImg} alt="Aegis Twin security operations visual" data-parallax="0.045" />
            <div className="ch-hero-radar" aria-hidden="true" />
            <div className="ch-hero-scanline" aria-hidden="true" />
          </div>
          <div className="ch-hero-grid-bg" aria-hidden="true" />
          <div className="ch-hero-particles" aria-hidden="true">
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} style={{
                left: `${(i * 37 + 11) % 100}%`,
                top: `${(i * 53 + 17) % 100}%`,
                animationDelay: `${(i * 431) % 5000}ms`,
                animationDuration: `${4200 + ((i * 271) % 3000)}ms`,
              }} />
            ))}
          </div>
          <div className="ch-hero-metric" data-reveal>
            <strong><CountUp to={42} suffix="s" /></strong>
            <small>MEAN TIME TO TRIAGE</small>
          </div>
          <div className="ch-hero-scroll"><ArrowDown size={20} /></div>
        </div>
      </section>

      {/* ---------- live threat ticker ---------- */}
      <div className="lp-ticker" aria-hidden="true">
        <div className="lp-ticker-track">
          {[0, 1].map((g) => (
            <div className="lp-ticker-group" key={g}>
              {TICKER.map((t, i) => (
                <span className="lp-ticker-item" key={i}>{t}<span className="lp-ticker-sep">✦</span></span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* =================================================================
          CHAPTER 02 — THE SECURITY PROBLEM
          ================================================================= */}
      <section className="ch-problem" id="ch-problem">
        <div className="ch-problem-quote" data-reveal>
          &ldquo;Attackers move in seconds.<br />
          Security teams still move between tabs.&rdquo;
        </div>
        <p data-reveal>
          Analysts lose time switching between SIEM, EDR, identity, firewall, email, and cloud-security
          systems. Every context switch costs seconds — and seconds cost breaches.
        </p>
        <div className="ch-problem-viz" data-reveal>
          <div className="ch-problem-node"><Terminal size={22} /><strong>SIEM</strong></div>
          <div className="ch-problem-wire" />
          <div className="ch-problem-node"><ShieldCheck size={22} /><strong>EDR</strong></div>
          <div className="ch-problem-wire" />
          <div className="ch-problem-node"><Fingerprint size={22} /><strong>IDENTITY</strong></div>
          <div className="ch-problem-wire" />
          <div className="ch-problem-node"><Network size={22} /><strong>NETWORK</strong></div>
          <div className="ch-problem-wire" />
          <div className="ch-problem-node"><Mail size={22} /><strong>EMAIL</strong></div>
          <div className="ch-problem-wire" />
          <div className="ch-problem-node"><Cloud size={22} /><strong>CLOUD</strong></div>
          <div className="ch-problem-wire" />
          <div className="ch-problem-union"><Zap size={18} /> ONE UNIFIED INCIDENT</div>
        </div>
      </section>

      {/* =================================================================
          CHAPTER 03 — AEGIS TWIN OVERVIEW
          ================================================================= */}
      <section className="ch-overview" id="ch-overview">
        <div className="ch-overview-text">
          <h2 data-reveal>Aegis Twin in one flow</h2>
          <p data-reveal>
            Your voice becomes a command. Deepgram transcribes it, Gemini reasons through the
            telemetry, Murf reads the briefing back, and you approve the action — all within one
            secure workspace.
          </p>
          <a className="ch-btn" href="#/console" data-reveal>Open Command Center <ArrowRight size={16} /></a>
        </div>
        <div className="ch-overview-diagram">
          {ovSteps.map((step, i) => (
            <div key={step.label}>
              {i > 0 && <div className="ch-ov-connector" />}
              <div className={`ch-ov-step ${ovActive >= i ? 'active' : ''}`}>
                <span className="ch-ov-step-icon"><step.icon size={20} /></span>
                <div>
                  <div className="ch-ov-step-label">{step.label}</div>
                  <div className="ch-ov-step-desc">{step.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =================================================================
          CHAPTER 04 — DEEPGRAM / VOICE INGESTION
          ================================================================= */}
      <section className="ch-deepgram" id="ch-deepgram">
        <div className="ch-dg-header" data-reveal>
          <h2>Deepgram / Voice Ingestion</h2>
          <small>NOVA-3 STREAMING TRANSCRIPTION</small>
        </div>
        <div className="ch-dg-visual">
          <div>
            <div className="ch-dg-waveform" data-reveal>
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="ch-dg-bar" style={{ animationDelay: `${i * 0.04}s`, height: `${20 + ((i * 37) % 65)}%` }} />
              ))}
            </div>
            <div className="ch-dg-transcript" id="dg-transcript" data-reveal>
              {TRANSCRIPT_SEGMENTS.map((seg, i) => {
                const before = TRANSCRIPT_SEGMENTS.slice(0, i).reduce((n, s) => n + s.text.length, 0);
                const visible = Math.max(0, Math.min(seg.text.length, typed - before));
                return <span key={i} className={seg.cls}>{seg.text.slice(0, visible)}</span>;
              })}
              <span className="tx-caret" aria-hidden="true" />
            </div>
            <div className="ch-dg-latency" data-reveal>
              Latency: <strong>218ms</strong> &middot; Confidence: <strong>97.3%</strong>
            </div>
          </div>
          <div>
            <figure className="lp-figure" data-reveal>
              <img src={voiceImg} alt="Live audio signal waveform" loading="lazy" />
              <figcaption>LIVE AUDIO SIGNAL · WEBSOCKET STREAM</figcaption>
            </figure>
            <div className="ch-dg-terms" data-reveal>
              <span>DDoS</span>
              <span>Kubernetes</span>
              <span>PowerShell</span>
              <span>SIEM</span>
              <span>EDR</span>
              <span>PCAP</span>
              <span>MITRE</span>
            </div>
            <div className="ch-dg-cta" data-reveal>
              <a className="ch-btn" href="#/console">Open Voice Command <Mic size={16} /></a>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          CHAPTER 05 — GEMINI / COGNITIVE ENGINE
          ================================================================= */}
      <section className="ch-gemini" id="ch-gemini">
        <h2 data-reveal>Gemini / Cognitive Engine</h2>
        <div className="ch-gm-grid">
          <div>
            <div className="ch-gemini-pipeline" data-reveal>
              <div className={`ch-gm-node ${gmActive >= 0 ? 'active' : ''}`}>
                <Terminal size={20} />
                <strong>Alert In</strong>
                <small>SIGNAL</small>
              </div>
              <span className="ch-gm-arrow">&rarr;</span>
              <div className={`ch-gm-node ${gmActive >= 1 ? 'active' : ''}`}>
                <BrainCircuit size={20} />
                <strong>DEFCON</strong>
                <small>CLASSIFY</small>
              </div>
              <span className="ch-gm-arrow">&rarr;</span>
              <div className={`ch-gm-node ${gmActive >= 2 ? 'active' : ''}`}>
                <Activity size={20} />
                <strong>Risk</strong>
                <small>SCORE</small>
              </div>
              <span className="ch-gm-arrow">&rarr;</span>
              <div className={`ch-gm-node ${gmActive >= 3 ? 'active' : ''}`}>
                <GitBranch size={20} />
                <strong>MITRE</strong>
                <small>MAP</small>
              </div>
              <span className="ch-gm-arrow">&rarr;</span>
              <div className={`ch-gm-node ${gmActive >= 4 ? 'active' : ''}`}>
                <ShieldCheck size={20} />
                <strong>Directive</strong>
                <small>ACTION</small>
              </div>
            </div>
            <div className="ch-gm-output" data-reveal>
              <div className="ch-gm-card"><small>DEFCON LEVEL</small><strong>1</strong></div>
              <div className="ch-gm-card"><small>RISK SCORE</small><strong>96</strong></div>
              <div className="ch-gm-card"><small>CONFIDENCE</small><strong>94%</strong></div>
              <div className="ch-gm-card"><small>CATEGORY</small><strong>Endpoint</strong></div>
            </div>
          </div>
          <figure className="lp-figure ch-gm-figure" data-reveal>
            <img src={mindImg} alt="Neural reasoning decision graph" loading="lazy" />
            <figcaption>GEMINI COGNITION · STRUCTURED REASONING GRAPH</figcaption>
          </figure>
        </div>
      </section>

      {/* =================================================================
          CHAPTER 06 — MURF AI / SPOKEN RESPONSE
          ================================================================= */}
      <section className="ch-murf" id="ch-murf">
        <h2 data-reveal>Murf AI / Spoken Response</h2>
        <div className="ch-murf-sub" data-reveal>AUTHORITATIVE VOICE BRIEFING</div>
        <div className="ch-murf-grid">
          <div>
            <div className="ch-murf-briefing" data-reveal>
              <p>
                &ldquo;<em>DEFCON one</em>. Critical PowerShell activity detected.
                Isolate the affected endpoint. Preserve memory and process evidence
                before remediation.&rdquo;
              </p>
              <div className="ch-murf-wave">
                {Array.from({ length: 28 }).map((_, i) => (
                  <span key={i} style={{ animationDelay: `${i * 0.06}s`, height: `${15 + ((i * 29) % 70)}%` }} />
                ))}
              </div>
            </div>
            <div className="ch-murf-status" data-reveal>
              <span className="ch-murf-dot" />
              Voice generation active &middot; ~18s briefing
            </div>
            <div className="ch-murf-fallback" data-reveal>
              Browser voice fallback available
            </div>
            <div data-reveal style={{ marginTop: 24 }}>
              <a className="ch-btn" href="#/console">Listen in Command Center <Radio size={16} /></a>
            </div>
          </div>
          <figure className="lp-figure" data-reveal>
            <img src={speechImg} alt="Broadcast of the spoken incident briefing" loading="lazy" />
            <figcaption>MURF GEN2 · SPOKEN INCIDENT BRIEFING</figcaption>
          </figure>
        </div>
      </section>

      {/* =================================================================
          CHAPTER 07 — INTERACTIVE LIVE INCIDENT DEMO
          ================================================================= */}
      <section className="ch-demo" id="ch-demo">
        <div className="ch-demo-bg" aria-hidden="true"><img src={socImg} alt="" loading="lazy" /></div>
        <h2 data-reveal>Live Incident Demo</h2>
        <div className="ch-demo-tabs" data-reveal>
          {demoIncidents.map((inc, i) => (
            <button key={inc.id} className={`ch-demo-tab ${i === demoIdx ? 'active' : ''}`} onClick={() => setDemoIdx(i)}>
              {inc.label}
            </button>
          ))}
        </div>
        {investigation === 'idle' ? (
        <div className="ch-demo-panel" data-reveal key={demo.id}>
          <div className="ch-demo-panel-left">
            <div className="ch-demo-defcon">DEFCON {demo.defcon}</div>
            <div className="ch-demo-metrics">
              <div className="ch-demo-metric"><small>RISK SCORE</small><strong><CountUp key={`risk-${demo.id}`} to={demo.risk} /></strong></div>
              <div className="ch-demo-metric"><small>CONFIDENCE</small><strong><CountUp key={`conf-${demo.id}`} to={demo.confidence} suffix="%" /></strong></div>
              <div className="ch-demo-metric"><small>SEVERITY</small><strong>{demo.severity}</strong></div>
              <div className="ch-demo-metric"><small>CATEGORY</small><strong>{demo.category}</strong></div>
            </div>
            <div className="ch-demo-mitre">
              {demo.mitre.map(m => <span key={m.id}>{m.id} {m.name}</span>)}
            </div>
            <div className="ch-demo-actions">
              <button className="ch-btn" style={{ fontSize: 12, padding: '10px 16px' }} onClick={startInvestigation}>Run Full Investigation <ArrowRight size={13} /></button>
              <a className="ch-btn ch-btn-outline" href="#/console" style={{ fontSize: 12, padding: '10px 16px' }}>Open Command Center</a>
            </div>
          </div>
          <div className="ch-demo-panel-right">
            <div className="ch-demo-evidence">
              <small>CORRELATED EVIDENCE</small>
              <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                {demo.evidence.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
            <div className="ch-demo-evidence">
              <small>IMMEDIATE DIRECTIVES</small>
              <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                {demo.directives.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
            <a className="ch-btn ch-btn-outline" href="#/console" style={{ fontSize: 12, padding: '10px 16px', alignSelf: 'flex-start' }}>
              Listen to Briefing <Radio size={14} />
            </a>
          </div>
        </div>
      ) : (
        <div className="ch-demo-investigation" data-reveal key={`investigation-${demo.id}`}>
          <div className="ch-inv-head">
            <span className="ch-inv-pagetag">PAGE 04 · FULL INVESTIGATION</span>
            <div className="ch-inv-title">
              <h3>{demo.label}</h3>
              <em>DEFCON {demo.defcon}</em>
            </div>
          </div>
          <div className="ch-inv-steps">
            {INVESTIGATION_STEPS.map((step, index) => (
              <div
                key={step.label}
                className={`ch-inv-step ${index < invStep ? 'done' : index === invStep ? 'active' : ''}`}
              >
                <span>{index < invStep ? '✓' : String(index + 1).padStart(2, '0')}</span>
                <div><strong>{step.label}</strong><small>{step.copy}</small></div>
              </div>
            ))}
          </div>
          {investigation === 'done' ? (
            <div className="ch-inv-result">
              <div className="ch-demo-metrics">
                <div className="ch-demo-metric"><small>RISK SCORE</small><strong><CountUp to={demo.risk} /></strong></div>
                <div className="ch-demo-metric"><small>CONFIDENCE</small><strong><CountUp to={demo.confidence} suffix="%" /></strong></div>
                <div className="ch-demo-metric"><small>SEVERITY</small><strong>{demo.severity}</strong></div>
                <div className="ch-demo-metric"><small>CATEGORY</small><strong>{demo.category}</strong></div>
              </div>
              <div className="ch-demo-mitre">
                {demo.mitre.map(m => <span key={m.id}>{m.id} {m.name}</span>)}
              </div>
              <div className="ch-inv-columns">
                <div className="ch-demo-evidence">
                  <small>CORRELATED EVIDENCE</small>
                  <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                    {demo.evidence.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
                <div className="ch-demo-evidence">
                  <small>IMMEDIATE DIRECTIVES</small>
                  <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                    {demo.directives.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
              </div>
              <div className="ch-inv-timeline">
                <small>INVESTIGATION TIMELINE</small>
                <div><span>T+00:04</span>Signal triaged into the active incident queue</div>
                <div><span>T+00:19</span>Telemetry correlated across EDR, identity, and network</div>
                <div><span>T+00:37</span>MITRE mapping and DEFCON {demo.defcon} verdict produced</div>
                <div><span>T+00:41</span>Directives staged for operator approval</div>
              </div>
              <div className="ch-inv-actions">
                <button className="ch-btn ch-btn-outline" style={{ fontSize: 12, padding: '10px 16px' }} onClick={() => setInvestigation('idle')}>
                  <ArrowLeft size={13} /> Back to incidents
                </button>
                <a className="ch-btn" href="#/console" style={{ fontSize: 12, padding: '10px 16px' }}>
                  Run it live in the Command Center <ArrowRight size={13} />
                </a>
              </div>
            </div>
          ) : (
            <div className="ch-inv-running" role="status" aria-live="polite">
              <span className="ch-inv-spinner" />
              <p>AEGIS IS INVESTIGATING</p>
              <h4>{INVESTIGATION_STEPS[Math.min(invStep, INVESTIGATION_STEPS.length - 1)].label}…</h4>
            </div>
          )}
        </div>
      )}
      </section>

      {/* =================================================================
          CHAPTER 08 — EVIDENCE FILE LAB
          ================================================================= */}
      <section className="ch-evidence" id="ch-evidence">
        <h2 data-reveal>Evidence File Lab</h2>
        <div className="ch-evidence-types" data-reveal>
          <span>CSV</span><span>JSON</span><span>LOG</span><span>TXT</span>
        </div>
        <div className="ch-evidence-demo">
          <div className="ch-evidence-file" data-reveal>
            <em># identity_audit.jsonl</em><br />
            <span className="ok">✓</span> {"{"}"user":"m.chen","action":"login","status":"success"{"}"}<br />
            <span className="ok">✓</span> {"{"}"user":"r.patel","action":"mfa","status":"pass"{"}"}<br />
            <span className="err">✗</span> {"{"}"user":"unknown","action":"login","status":"fail"{"}"} &lt;-- <em>invalid</em><br />
            <span className="err">✗</span> prompt-injection attempt detected &lt;-- <em>isolated</em><br />
            <span className="ok">✓</span> {"{"}"user":"admin","action":"token_refresh","status":"success"{"}"}
          </div>
          <div className="ch-evidence-report" data-reveal>
            <h4>ANALYSIS REPORT</h4>
            <div className="ch-evidence-row"><span>Total records</span><strong>5</strong></div>
            <div className="ch-evidence-row"><span>Valid records</span><strong>3</strong></div>
            <div className="ch-evidence-row"><span>Invalid lines</span><strong>1</strong></div>
            <div className="ch-evidence-row"><span>Prompt injections</span><strong>1 (isolated)</strong></div>
            <div className="ch-evidence-row"><span>SHA-256 checksum</span><strong style={{ fontSize: 9 }}>a3f8…c2e1</strong></div>
            <div className="ch-evi-defcon">
              Assessment: <strong>DEFCON 2</strong> &middot; Identity attack pattern
            </div>
            <div style={{ marginTop: 16 }}>
              <a className="ch-btn" href="#/console" style={{ fontSize: 12, padding: '10px 16px' }}>
                Open Evidence Files <FileSearch size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          CHAPTER 09 — HUMAN CONTROL AND SYSTEM SAFETY
          ================================================================= */}
      <section className="ch-safety" id="ch-safety">
        <h2 data-reveal>&ldquo;Fast does not mean autonomous.&rdquo;</h2>
        <p data-reveal>
          Aegis can analyze, classify, explain, and recommend — but it cannot silently
          disable an employee, isolate a production server, change firewall rules, or
          modify a cloud control plane.
        </p>
        <div className="ch-safety-flow" data-reveal>
          <div className={`ch-safety-step ${safetyApproved ? '' : ''}`}>
            <Terminal size={18} /><strong>Analyze</strong><small>Signal processing</small>
          </div>
          <span className="ch-safety-arrow">&rarr;</span>
          <div className={`ch-safety-step ${safetyApproved ? '' : ''}`}>
            <Send size={18} /><strong>Recommend</strong><small>Directives</small>
          </div>
          <span className="ch-safety-arrow">&rarr;</span>
          <div className={`ch-safety-step ${safetyApproved ? 'active' : ''}`}>
            <ShieldCheck size={20} /><strong>Human Reviews</strong><small>Approval</small>
          </div>
          <span className="ch-safety-arrow">&rarr;</span>
          <div className={`ch-safety-step ${safetyApproved ? 'active' : ''}`}>
            <Zap size={18} /><strong>Human Authorizes</strong><small>Verified</small>
          </div>
          <span className="ch-safety-arrow">&rarr;</span>
          <div className={`ch-safety-step ${safetyApproved ? 'active' : ''}`}>
            <Shield size={18} /><strong>Action Executes</strong><small>Logged</small>
          </div>
        </div>
        {!safetyApproved ? (
          <button className="ch-safety-approve" onClick={() => setSafetyApproved(true)} data-reveal>
            Approve Action (Demo)
          </button>
        ) : (
          <div className="ch-safety-approve done" data-reveal>
            &#10003; Action Approved &middot; Audit logged
          </div>
        )}
        <div className="ch-safety-lock" data-reveal>
          <LockKeyhole size={12} /> Aegis cannot act without your approval
        </div>
      </section>

      {/* =================================================================
          CHAPTER 10 — FINAL CTA / PROJECT DETAILS
          ================================================================= */}
      <section className="ch-launch" id="ch-launch">
        <div className="ch-launch-bg" data-parallax="0.02" aria-hidden="true">
          <img src={footerImg} alt="" loading="lazy" />
          <div className="ch-launch-bg-shade" />
        </div>
        <h2 data-reveal className="glitch" data-text="Ready for the first five minutes?">Ready for the first five minutes?</h2>
        <p className="ch-launch-sub" data-reveal>Give your team a cognitive edge.</p>
        <div className="ch-launch-actions" data-reveal>
          <a className="ch-btn" href="#/console">Launch Aegis Twin <ArrowRight size={16} /></a>
          <a className="ch-btn ch-btn-outline" href="#/console">Open Command Center <ArrowUpRight size={16} /></a>
          <a className="ch-btn ch-btn-outline" href="https://github.com/tejaharshith777-glitch/Aegis-Twin" target="_blank" rel="noreferrer">
            View GitHub <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="ch-launch-details" data-reveal>
          <div className="ch-launch-dl">
            <dt>ARCHITECTURE</dt>
            <dd>Voice → Deepgram → Gemini → Murf → Human approval → Action</dd>
          </div>
          <div className="ch-launch-dl">
            <dt>TECHNOLOGY</dt>
            <dd>React &middot; TypeScript &middot; Vite &middot; Node.js &middot; WebSockets</dd>
          </div>
          <div className="ch-launch-dl">
            <dt>SECURITY</dt>
            <dd>End-to-end privacy &middot; No credential storage &middot; Audit trail</dd>
          </div>
          <div className="ch-launch-dl">
            <dt>DEPLOYMENT</dt>
            <dd>GitHub Pages &middot; Live API &middot; Static preview</dd>
          </div>
        </div>
        <footer className="ch-launch-footer" data-reveal>
          <span>
            <strong>AEGIS/ TWIN</strong>
            <a href="https://deepgram.com" target="_blank" rel="noreferrer">Deepgram</a>
            <a href="https://deepmind.google/gemini" target="_blank" rel="noreferrer">Gemini</a>
            <a href="https://murf.ai" target="_blank" rel="noreferrer">Murf AI</a>
            <a href="https://github.com/tejaharshith777-glitch/Aegis-Twin" target="_blank" rel="noreferrer">GitHub</a>
            <a href="#/console">Command Center</a>
          </span>
          <span>Chennai, India / 2026</span>
        </footer>
      </section>
    </div>
  );
}
