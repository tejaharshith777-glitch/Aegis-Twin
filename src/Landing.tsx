import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  AudioWaveform,
  Bot,
  BrainCircuit,
  Cloud,
  Code2,
  Database,
  FileSearch,
  Fingerprint,
  GitBranch,
  Mail,
  Menu,
  Network,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';

/* ---------- scroll-reveal hook ---------- */
function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ---------- animated counter ---------- */
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
          const eased = 1 - Math.pow(1 - t, 3);
          setValue(to * eased);
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  return (
    <span ref={ref}>
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ---------- animated gauge ---------- */
function Gauge({ percent, center, caption }: { percent: number; center: ReactNode; caption: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setArmed(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const r = 74;
  const circumference = Math.PI * r * 1.5; // 270° arc
  const offset = armed ? circumference * (1 - percent / 100) : circumference;

  return (
    <div className="lp-gauge">
      <svg ref={ref} viewBox="0 0 200 200" role="img" aria-label={caption}>
        <g transform="rotate(135 100 100)">
          <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="16" strokeDasharray={`${circumference} ${Math.PI * r * 2}`} strokeLinecap="butt" />
          <circle
            cx="100" cy="100" r={r} fill="none" stroke="#f4f4f2" strokeWidth="16"
            strokeDasharray={`${circumference} ${Math.PI * r * 2}`}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(.22,.9,.24,1)' }}
          />
        </g>
        {Array.from({ length: 28 }).map((_, i) => {
          const a = (135 + (i * 270) / 27) * (Math.PI / 180);
          return (
            <line
              key={i}
              x1={100 + Math.cos(a) * 88} y1={100 + Math.sin(a) * 88}
              x2={100 + Math.cos(a) * 94} y2={100 + Math.sin(a) * 94}
              stroke="rgba(255,255,255,.35)" strokeWidth="1.5"
            />
          );
        })}
      </svg>
      <div className="lp-gauge-center">
        {center}
        <span className="lp-gauge-caption">{caption}</span>
      </div>
    </div>
  );
}

/* ---------- lollipop chart ---------- */
function SlaChart() {
  const values = [62, 34, 71, 48, 92, 41, 66, 30];
  return (
    <div className="lp-sla" data-reveal>
      <div className="lp-sla-line"><span className="lp-sla-tag">SLA 99%</span><i /></div>
      <div className="lp-sla-bars">
        {values.map((v, i) => (
          <div className="lp-sla-bar" key={i} style={{ ['--h' as string]: `${v}%`, ['--d' as string]: `${i * 90}ms` }}>
            <span className="lp-sla-dot" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- hero headline with staggered words ---------- */
function Stagger({ text, from = 0 }: { text: string; from?: number }) {
  return (
    <>
      {text.split(' ').map((word, i) => (
        <span className="lp-word" key={i} style={{ ['--wd' as string]: `${(from + i) * 90}ms` }}>
          {word}&nbsp;
        </span>
      ))}
    </>
  );
}

const heroNav = [
  { label: 'Threat Triage', target: '#capabilities' },
  { label: 'Voice Briefings', target: '#intel' },
  { label: 'Evidence Lab', target: '#product' },
  { label: 'Live Telemetry', target: '#telemetry' },
];

const menuLinks = [
  { label: 'Home', target: '#top' },
  { label: 'Intelligence', target: '#intel' },
  { label: 'Capabilities', target: '#capabilities' },
  { label: 'Statistics', target: '#stats' },
  { label: 'Product', target: '#product' },
  { label: 'Telemetry', target: '#telemetry' },
];

const features = [
  {
    icon: ShieldCheck,
    title: 'Secure Triage',
    copy: 'Every signal is scored, correlated, and mapped to MITRE ATT&CK. Aegis assigns severity and a recommended directive in seconds.',
  },
  {
    icon: AudioWaveform,
    title: 'Voice Command',
    copy: 'Ask out loud and get a spoken briefing back. Hands-free triage keeps analysts moving while the incident is still live.',
  },
  {
    icon: FileSearch,
    title: 'Evidence Lab',
    copy: 'Drop logs, headers, or scripts straight into the console. The analyzer extracts indicators and returns a verdict instantly.',
  },
  {
    icon: Activity,
    title: 'Live Telemetry',
    copy: 'Sensor coverage, containment status, and posture metrics stream into a single command surface in real time.',
  },
];

const traits = [
  {
    icon: BrainCircuit,
    title: 'Reasoning Engine',
    copy: 'Multi-step triage logic weighs source, entity, and history before it ever raises an alarm. Context first, noise never.',
  },
  {
    icon: Zap,
    title: 'Autonomous Response',
    copy: 'Approved runbooks execute containment automatically. The twin handles branching and rollback without hand-holding.',
  },
  {
    icon: Fingerprint,
    title: 'End-to-End Privacy',
    copy: 'Evidence is processed inside your workspace boundary. Maintain total control over organizational data flow.',
  },
  {
    icon: Network,
    title: 'Production-Ready Stack',
    copy: 'Connect EDR, SIEM, identity, and DNS feeds through secure, ready integrations that scale with your fleet.',
  },
];

export default function Landing() {
  useReveal();
  const [menuOpen, setMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  /* hero parallax */
  useEffect(() => {
    const onScroll = () => {
      const el = heroRef.current;
      if (!el) return;
      const y = Math.min(window.scrollY, window.innerHeight);
      el.style.transform = `translateY(${y * 0.22}px) scale(${1 + y * 0.0002})`;
      el.style.opacity = `${Math.max(0.25, 1 - y / (window.innerHeight * 1.15))}`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const go = (target: string) => {
    setMenuOpen(false);
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="lp" id="top">
      <div className="lp-grid-lines" aria-hidden="true" />

      {/* ---------- top bar ---------- */}
      <header className="lp-topbar">
        <a className="lp-logo" href="#top" onClick={(e) => { e.preventDefault(); go('#top'); }}>
          <span className="lp-logo-mark"><Zap size={20} strokeWidth={2.6} /></span>
          aegis twin
        </a>
        <button className="lp-burger" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
          <Menu size={26} strokeWidth={1.7} />
        </button>
      </header>

      {/* ---------- overlay menu ---------- */}
      <div className={`lp-menu ${menuOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Site menu">
        <button className="lp-menu-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={28} /></button>
        <nav>
          {menuLinks.map((l, i) => (
            <button key={l.label} style={{ ['--md' as string]: `${i * 60}ms` }} onClick={() => go(l.target)}>
              <span className="lp-menu-index">0{i + 1}</span>{l.label}
            </button>
          ))}
          <a className="lp-menu-cta" href="#/console">Enter Command Center <ArrowUpRight size={22} /></a>
        </nav>
        <p className="lp-menu-foot">AEGIS TWIN © 2026 — VOICE-FIRST SECURITY OPERATIONS</p>
      </div>

      {/* ---------- hero ---------- */}
      <section className="lp-hero">
        <div className="lp-hero-bg" ref={heroRef} style={{ backgroundImage: 'url(lp-hero.jpg)' }} />
        <div className="lp-hero-shade" />

        <div className="lp-hero-side">
          <nav className="lp-hero-nav" aria-label="Highlights">
            {heroNav.map((item, i) => (
              <button key={item.label} style={{ ['--wd' as string]: `${400 + i * 120}ms` }} onClick={() => go(item.target)}>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="lp-hero-trust" style={{ ['--wd' as string]: '950ms' }}>
            <span><Radio size={15} /> NORTHSTAR LABS</span>
            <span><Fingerprint size={15} /> HELIX BANK</span>
          </div>
        </div>

        <div className="lp-hero-copy">
          <h1>
            <Stagger text="Command your" />
            <br />
            <Stagger text="defense with AI" from={3} />
          </h1>
          <p style={{ ['--wd' as string]: '760ms' }}>
            Deploy a voice-activated digital twin that triages incidents and briefs your analysts in seconds.
            <br />
            Scale your response with Aegis Twin today.
          </p>
        </div>

        <button className="lp-scroll-cue" aria-label="Scroll down" onClick={() => go('#intel')}>
          <ArrowDown size={18} />
        </button>
      </section>

      {/* ---------- marquee ---------- */}
      <div className="lp-marquee" aria-hidden="true">
        <div className="lp-marquee-track">
          {[0, 1].map((n) => (
            <span key={n}>
              AUTONOMOUS TRIAGE ✦ VOICE COMMAND ✦ EVIDENCE ANALYSIS ✦ MITRE MAPPING ✦ LIVE TELEMETRY ✦ INCIDENT BRIEFINGS ✦{' '}
            </span>
          ))}
        </div>
      </div>

      {/* ---------- statement ---------- */}
      <section className="lp-statement" id="intel">
        <div className="lp-statement-inner">
          <div className="lp-chip-row" data-reveal>
            {[Terminal, Sparkles, Bot, Database].map((Icon, i) => (
              <span className="lp-chip" key={i} style={{ zIndex: 10 - i }}><Icon size={20} strokeWidth={1.6} /></span>
            ))}
          </div>
          <h2 data-reveal>
            Integrate with the sharpest security signals. Aegis Twin fuses EDR, SIEM, identity, and DNS telemetry
            into one reasoning engine — then answers you out loud. Build defenses that don&apos;t just alert,
            they understand.
          </h2>
          <p data-reveal>
            Unlock voice-first security operations. Our engine keeps latency low and confidence high for every
            incident it touches.
          </p>
        </div>
      </section>

      {/* ---------- feature cards ---------- */}
      <section className="lp-features" id="capabilities">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <article className="lp-feature" key={f.title} data-reveal style={{ ['--rd' as string]: `${i * 110}ms` }}>
              <div className="lp-feature-art"><Icon size={92} strokeWidth={0.9} /></div>
              <h3>{f.title}</h3>
              <p>{f.copy}</p>
            </article>
          );
        })}
      </section>

      {/* ---------- stats ---------- */}
      <section className="lp-stats" id="stats">
        <div className="lp-stats-head">
          <p className="lp-label" data-reveal><span className="lp-hazard" /> STATISTICS</p>
          <h2 data-reveal>
            Quantifiable impact across every incident. We measure success by the speed and certainty of your
            response.
          </h2>
          <a className="lp-btn" href="#/console" data-reveal>
            <span className="lp-btn-glyph"><Terminal size={15} /></span> Launch Console
          </a>
        </div>
        <div className="lp-stats-cells">
          <div className="lp-stat" data-reveal>
            <strong><CountUp to={42} suffix="s" /></strong>
            <p>Median time from raw signal to triaged incident.</p>
            <i className="lp-corner" />
          </div>
          <div className="lp-stat" data-reveal style={{ ['--rd' as string]: '120ms' }}>
            <strong><CountUp to={12} suffix="x" /></strong>
            <p>Faster than manual alert review across the queue.</p>
            <i className="lp-corner" />
          </div>
          <div className="lp-stat" data-reveal style={{ ['--rd' as string]: '240ms' }}>
            <strong><CountUp to={99.5} decimals={1} suffix="%" /></strong>
            <p>Sensor coverage maintained across the entire fleet.</p>
            <i className="lp-corner" />
          </div>
        </div>
      </section>

      {/* ---------- product / pipeline ---------- */}
      <section className="lp-product" id="product">
        <div className="lp-product-head">
          <p className="lp-label" data-reveal><span className="lp-hazard" /> OUR PRODUCT</p>
          <h2 data-reveal>Build response at scale</h2>
          <p className="lp-sub" data-reveal>
            Design, run, and review sophisticated response playbooks through one visual command center.
            No swivel-chair operations — just pure signal.
          </p>
        </div>

        <div className="lp-canvas" data-reveal>
          <div className="lp-canvas-side">
            <span className="lp-canvas-stripes" />
            <button className="lp-tab active">AI AGENT</button>
            <button className="lp-tab">AI CHAT</button>
            <p className="lp-canvas-stack">STACK</p>
            <div className="lp-stack-grid">
              {[Cloud, Sparkles, Bot, Database, GitBranch, Terminal].map((Icon, i) => (
                <span key={i}><Icon size={16} strokeWidth={1.6} /></span>
              ))}
            </div>
          </div>

          <div className="lp-canvas-board">
            <div className="lp-board-toolbar">
              <span className="lp-tool">AGENT MODE ✦</span>
              <span className="lp-tool">TRIAGE-01 ⌁</span>
            </div>
            <div className="lp-flow">
              <div className="lp-flow-row">
                <div className="lp-node"><span className="lp-node-icon"><Mail size={18} /></span><em>Signal Intake</em><small>SIEM / EDR</small></div>
                <span className="lp-wire" />
                <div className="lp-node"><span className="lp-node-icon"><GitBranch size={18} /></span><em>Correlate</em><small>Entities</small></div>
                <span className="lp-wire" />
                <div className="lp-node lp-node-hero"><span className="lp-node-icon"><Zap size={18} /></span><em>Aegis Twin</em><small>Tools Agent</small></div>
                <span className="lp-wire" />
                <div className="lp-node"><span className="lp-node-icon"><Code2 size={18} /></span><em>Directive</em><small>Runbook</small></div>
              </div>
              <div className="lp-flow-branch">
                <div className="lp-node"><span className="lp-node-icon"><Send size={18} /></span><em>Notify</em><small>On-call channel</small></div>
                <span className="lp-wire" />
                <div className="lp-node"><span className="lp-node-icon"><ShieldCheck size={18} /></span><em>Contain</em><small>If confirmed</small></div>
                <span className="lp-wire" />
                <div className="lp-node"><span className="lp-node-icon"><AudioWaveform size={18} /></span><em>Voice Brief</em><small>Spoken summary</small></div>
              </div>
            </div>
            <a className="lp-canvas-cta" href="#/console">
              Enter the Command Center <ArrowRight size={17} />
            </a>
          </div>
        </div>

        <div className="lp-traits">
          {traits.map((t, i) => {
            const Icon = t.icon;
            return (
              <article className="lp-trait" key={t.title} data-reveal style={{ ['--rd' as string]: `${i * 110}ms` }}>
                <span className="lp-trait-icon"><Icon size={30} strokeWidth={1.2} /></span>
                <h3>{t.title}</h3>
                <p>{t.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ---------- telemetry ---------- */}
      <section className="lp-perf" id="telemetry">
        <div className="lp-product-head">
          <p className="lp-label" data-reveal><span className="lp-hazard" /> PRODUCT STATISTICS</p>
          <h2 data-reveal>Optimized for response</h2>
          <p className="lp-sub" data-reveal>
            Monitor every pulse in real time. Aegis Twin provides deep telemetry into triage accuracy, briefing
            latency, and signal efficiency.
          </p>
        </div>

        <div className="lp-perf-cards">
          <div className="lp-perf-card" data-reveal>
            <header>
              <span className="lp-perf-icon"><Activity size={18} /></span>
              <div><strong>System Load</strong><small>Active signal processing</small></div>
              <b>98.7%</b>
            </header>
            <Gauge percent={78} caption="Core feeds" center={<strong className="lp-gauge-big"><CountUp to={15} /></strong>} />
            <footer><span>99% <em>CACHE</em></span><span>6M <em>UPTIME</em></span></footer>
          </div>

          <div className="lp-perf-card" data-reveal style={{ ['--rd' as string]: '130ms' }}>
            <header>
              <span className="lp-perf-icon"><Radio size={18} /></span>
              <div><strong>SLA Response</strong><small>Global uptime monitoring</small></div>
              <b>99.99%</b>
            </header>
            <SlaChart />
            <footer><span>24/7 <em>WATCH</em></span><span>0 <em>MISSED</em></span></footer>
          </div>

          <div className="lp-perf-card" data-reveal style={{ ['--rd' as string]: '260ms' }}>
            <header>
              <span className="lp-perf-icon"><Database size={18} /></span>
              <div><strong>Signal Volume</strong><small>Monthly events throughput</small></div>
              <b>8.4M</b>
            </header>
            <Gauge percent={64} caption="events / sec" center={<strong className="lp-gauge-big"><CountUp to={345} /></strong>} />
            <footer><span>184 <em>NEW</em></span><span>12 <em>SOURCES</em></span></footer>
          </div>
        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="lp-footer">
        <div className="lp-footer-dark">
          <p className="lp-footer-year" data-reveal>Aegis Twin 2026</p>
          <h2 data-reveal>
            Voice-first security operations for teams that move faster than threats.
          </h2>
          <p className="lp-footer-address">CHENNAI · TAMIL NADU · INDIA</p>
        </div>
        <div className="lp-footer-light">
          <div className="lp-footer-links">
            <div>
              <p>QUICK LINKS</p>
              {menuLinks.map((l) => (
                <button key={l.label} onClick={() => go(l.target)}>{l.label} <ArrowUpRight size={14} /></button>
              ))}
            </div>
            <div>
              <p>OTHER LINKS</p>
              <a href="#/console">Command Center <ArrowUpRight size={14} /></a>
              <a href="https://github.com/tejaharshith777-glitch/Aegis-Twin" target="_blank" rel="noreferrer">GitHub Repo <ArrowUpRight size={14} /></a>
              <a href="https://github.com/tejaharshith777-glitch/Aegis-Twin#readme" target="_blank" rel="noreferrer">Documentation <ArrowUpRight size={14} /></a>
            </div>
          </div>
          <div className="lp-footer-image" style={{ backgroundImage: 'url(lp-footer.jpg)' }}>
            <span>Aug 16, 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
