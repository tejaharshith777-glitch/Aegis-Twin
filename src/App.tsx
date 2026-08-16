import {
  Activity,
  ArrowDown,
  ArrowRight,
  Asterisk,
  Bot,
  Braces,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Cloud,
  Command,
  Database,
  Fingerprint,
  Gauge,
  Globe2,
  Headphones,
  Layers3,
  LockKeyhole,
  Menu,
  Mic,
  Network,
  Pause,
  Play,
  Radar,
  Radio,
  ScanLine,
  Send,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
  UploadCloud,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';

type DemoResult = {
  defcon: number;
  riskScore: number;
  headline: string;
  summary: string;
  directives: Array<{ action: string; detail: string }>;
  mitreTechniques: Array<{ id: string; name: string }>;
};

const fallbackResult: DemoResult = {
  defcon: 1,
  riskScore: 94,
  headline: 'Likely malicious PowerShell chain detected',
  summary: 'Encoded downloader behavior was correlated with an untrusted destination. Isolate the endpoint and preserve volatile evidence before remediation.',
  directives: [
    { action: 'Isolate WIN-FIN-07', detail: 'Preserve EDR access while removing network reachability.' },
    { action: 'Block destination indicators', detail: 'Deny the observed IP and domain at every egress point.' },
    { action: 'Capture volatile evidence', detail: 'Retain the process tree, memory, and active connections.' },
  ],
  mitreTechniques: [
    { id: 'T1059.001', name: 'PowerShell' },
    { id: 'T1105', name: 'Ingress Tool Transfer' },
  ],
};

const navLinks = [
  { label: 'Platform', target: 'platform' },
  { label: 'Impact', target: 'impact' },
  { label: 'Protocol', target: 'protocol' },
  { label: 'Intelligence', target: 'intelligence' },
];

const cases = [
  {
    name: 'Northstar financial network',
    tag: 'Endpoint defense',
    metric: '93%',
    metricLabel: 'faster containment',
    year: '2026',
    image: 'images/case-northstar.jpg',
  },
  {
    name: 'Meridian cloud estate',
    tag: 'Cloud security',
    metric: '8.4m',
    metricLabel: 'events resolved',
    year: '2026',
    image: 'images/case-meridian.jpg',
  },
  {
    name: 'Helix identity fabric',
    tag: 'Identity protection',
    metric: '41s',
    metricLabel: 'mean triage time',
    year: '2025',
    image: 'images/case-helix.jpg',
  },
];

const faqItems = [
  {
    question: 'What is an Aegis digital twin?',
    answer: 'Aegis is a secure AI counterpart for your security operations team. It continuously reads approved telemetry, correlates weak signals, explains its reasoning, and stages response actions for human approval.',
  },
  {
    question: 'Does Aegis take actions without approval?',
    answer: 'No destructive or high-impact action is autonomous by default. Aegis separates investigation from execution and routes containment, credential, and network changes through explicit operator approval.',
  },
  {
    question: 'How does Aegis connect to our security stack?',
    answer: 'Server-side adapters connect to endpoint, identity, email, cloud, and network tools. Data remains within your approved environment and credentials are never exposed to the browser.',
  },
  {
    question: 'What happens if an AI provider is unavailable?',
    answer: 'A deterministic local policy engine maintains core triage, classification, and response guidance. Provider failover is designed into the product, not added as an afterthought.',
  },
  {
    question: 'Can we start with one use case?',
    answer: 'Yes. Most teams begin with one high-friction workflow such as identity anomalies or endpoint triage, then expand the twin across their operating environment.',
  },
];

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function BrandMark() {
  return (
    <span className="brand-symbol" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <p className={`section-label ${light ? 'section-label-light' : ''}`}><Asterisk size={12} />{children}</p>;
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(0);
  const [activeLayer, setActiveLayer] = useState(0);
  const [query, setQuery] = useState('Investigate suspicious PowerShell activity on WIN-FIN-07');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [demoResult, setDemoResult] = useState<DemoResult | null>(null);
  const [toast, setToast] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [heroOffset, setHeroOffset] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0);
      setHeroOffset(Math.min(window.scrollY * 0.12, 90));
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('revealed');
      }),
      { threshold: 0.12 },
    );
    const elements = document.querySelectorAll('.reveal');
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    document.body.style.overflow = demoOpen || menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [demoOpen, menuOpen]);

  const openDemo = () => {
    setMenuOpen(false);
    setDemoOpen(true);
  };

  const runDemo = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!query.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setDemoResult(null);
    try {
      const [response] = await Promise.all([
        fetch('/api/agent/triage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        }),
        new Promise((resolve) => window.setTimeout(resolve, 1300)),
      ]);
      if (!response.ok) throw new Error('Agent service unavailable');
      const payload = await response.json() as DemoResult;
      setDemoResult(payload);
    } catch {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
      setDemoResult(fallbackResult);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const submitEmail = (event: FormEvent) => {
    event.preventDefault();
    const email = emailRef.current?.value.trim();
    if (!email || !email.includes('@')) {
      setToast('Enter a valid work email.');
      emailRef.current?.focus();
      return;
    }
    if (emailRef.current) emailRef.current.value = '';
    setToast('Field notes are headed your way.');
  };

  return (
    <div className="site-shell">
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />

      <div className="announcement">
        <span>Aegis Autonomous Defense / Release 02</span>
        <button onClick={() => scrollToSection('platform')}>Explore the system <ArrowRight size={13} /></button>
      </div>

      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Aegis Twin home">
          <BrandMark />
          <span>AEGIS<span className="wordmark-slash">/</span>TWIN</span>
        </a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navLinks.map((link) => <button key={link.target} onClick={() => scrollToSection(link.target)}>{link.label}</button>)}
          <button onClick={() => scrollToSection('faq')}>FAQ</button>
        </nav>
        <button className="header-cta" onClick={openDemo}>Run live triage <ArrowRight size={15} /></button>
        <button className="menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
      </header>

      {menuOpen && (
        <div className="mobile-menu-panel" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="mobile-menu-head">
            <span className="wordmark"><BrandMark />AEGIS/TWIN</span>
            <button onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={24} /></button>
          </div>
          <nav>
            {[...navLinks, { label: 'FAQ', target: 'faq' }].map((link, index) => (
              <button key={link.target} onClick={() => { setMenuOpen(false); window.setTimeout(() => scrollToSection(link.target), 100); }}>
                <span>0{index + 1}</span>{link.label}<ArrowRight size={22} />
              </button>
            ))}
          </nav>
          <button className="mobile-menu-cta" onClick={openDemo}>Run live triage <ArrowRight size={18} /></button>
        </div>
      )}

      <main>
        <section className="hero" id="top">
          <div className="hero-gridlines" />
          <div className="hero-copy reveal revealed">
            <SectionLabel>Autonomous security operations</SectionLabel>
            <h1>Security that<br /><span>thinks ahead.</span></h1>
            <div className="hero-intro">
              <p>A voice-activated digital twin that sees the whole attack, reasons through the noise, and puts decisive action in your hands.</p>
              <div className="hero-actions">
                <button className="button-dark" onClick={openDemo}>Command your twin <ArrowRight size={16} /></button>
                <button className="button-ghost" onClick={() => scrollToSection('platform')}><Play size={13} fill="currentColor" /> See how it works</button>
              </div>
            </div>
          </div>

          <div className="hero-visual reveal revealed">
            <div className="hero-image-wrap" style={{ transform: `translateY(${heroOffset * 0.25}px)` }}>
              <img src="images/aegis-hero.jpg" alt="A dark secure computing vault illuminated by an amber scan line" />
              <div className="hero-image-scan" />
            </div>
            <div className="hero-status-card">
              <div><span className="status-pulse" />LIVE SYSTEM</div>
              <strong>12</strong>
              <span>telemetry sources<br />in active watch</span>
            </div>
            <div className="hero-event-card">
              <div className="event-card-top"><span><Radio size={13} /> SIGNAL / 0094</span><em>09:42:18</em></div>
              <p>Encoded process chain<br />correlated on <b>WIN-FIN-07</b></p>
              <div className="event-track"><i /></div>
            </div>
            <div className="hero-scroll-cue"><ArrowDown size={15} /><span>SCROLL TO ENTER</span></div>
          </div>
        </section>

        <section className="trust-strip" aria-label="Trusted security platforms">
          <p>Built to operate across your stack</p>
          <div className="logo-marquee">
            <div className="logo-track">
              {['CROWDSTRIKE', 'SENTINEL', 'OKTA', 'PALO ALTO', 'SPLUNK', 'AWS', 'CROWDSTRIKE', 'SENTINEL', 'OKTA', 'PALO ALTO', 'SPLUNK', 'AWS'].map((logo, index) => (
                <span key={`${logo}-${index}`}><i />{logo}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="manifesto" id="platform">
          <div className="manifesto-grid" />
          <div className="manifesto-orb" aria-hidden="true">
            <span className="orb-ring orb-ring-one" />
            <span className="orb-ring orb-ring-two" />
            <span className="orb-ring orb-ring-three" />
            <span className="orb-core"><ShieldCheck size={48} strokeWidth={1.1} /></span>
          </div>
          <div className="manifesto-copy reveal">
            <SectionLabel light>The intelligence layer</SectionLabel>
            <h2>Not another dashboard.<br /><span>A second mind for defense.</span></h2>
            <p>Aegis turns fragmented telemetry into one operating picture—then translates that picture into a clear, evidence-backed decision.</p>
          </div>
          <div className="manifesto-index"><span>01</span><i /><span>06</span></div>
        </section>

        <section className="capabilities section-pad">
          <div className="section-head reveal">
            <div>
              <SectionLabel>Core capabilities</SectionLabel>
              <h2>One twin.<br />Every signal.</h2>
            </div>
            <p>From first anomaly to final containment, Aegis keeps context intact and operators in control.</p>
          </div>
          <div className="capability-grid">
            <article className="capability-card capability-large reveal">
              <div className="capability-number">01 / PERCEPTION</div>
              <div className="radar-visual" aria-hidden="true">
                <span className="radar-circle r1" /><span className="radar-circle r2" /><span className="radar-circle r3" />
                <span className="radar-sweep" />
                <i className="radar-dot d1" /><i className="radar-dot d2" /><i className="radar-dot d3" />
                <Radar size={26} />
              </div>
              <div className="capability-card-copy">
                <h3>Hear the signal<br />inside the noise.</h3>
                <p>Aegis continuously correlates identity, endpoint, network, email, and cloud activity into a single attack narrative.</p>
              </div>
            </article>
            <article className="capability-card reveal">
              <div className="capability-number">02 / REASONING</div>
              <div className="logic-visual" aria-hidden="true">
                <span><Database size={16} /></span><i /><span className="logic-core"><Bot size={19} /></span><i /><span><Braces size={16} /></span>
              </div>
              <div className="capability-card-copy">
                <h3>Explain every decision.</h3>
                <p>DEFCON classification, risk scoring, evidence, and MITRE mapping stay visible to your team.</p>
              </div>
            </article>
            <article className="capability-card capability-orange reveal">
              <div className="capability-number">03 / RESPONSE</div>
              <div className="response-visual" aria-hidden="true">
                <span className="response-ring"><Zap size={24} /></span>
                <span className="response-label l1">ISOLATE</span><span className="response-label l2">BLOCK</span><span className="response-label l3">PRESERVE</span>
              </div>
              <div className="capability-card-copy">
                <h3>Move with precision.</h3>
                <p>Stage containment workflows instantly while preserving the human approval boundary.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="impact" id="impact">
          <div className="impact-copy reveal">
            <SectionLabel>Measured in minutes, not meetings</SectionLabel>
            <h2>Response at<br />machine speed.</h2>
            <p>Every second between signal and containment compounds risk. Aegis compresses that distance without compromising judgment.</p>
            <button className="text-link" onClick={openDemo}>See the command experience <ArrowRight size={16} /></button>
          </div>
          <div className="stats-stack">
            <div className="stat-row reveal"><span className="stat-index">01</span><strong>42<span>sec</span></strong><p>Average time to classify a high-risk event</p></div>
            <div className="stat-row reveal"><span className="stat-index">02</span><strong>93<span>%</span></strong><p>Reduction in manual triage steps</p></div>
            <div className="stat-row reveal"><span className="stat-index">03</span><strong>24<span>/7</span></strong><p>Continuous cross-stack vigilance</p></div>
          </div>
        </section>

        <section className="command-section section-pad" id="protocol">
          <div className="section-head command-head reveal">
            <div>
              <SectionLabel>Command interface</SectionLabel>
              <h2>Ask naturally.<br />Act decisively.</h2>
            </div>
            <p>Operate your security environment in plain language. Voice, type, or upload evidence—the twin does the correlation.</p>
          </div>

          <div className="command-product reveal">
            <div className="product-topbar">
              <div className="product-brand"><BrandMark /><span>AEGIS CONTROL</span></div>
              <div className="product-health"><i /> ALL SYSTEMS OPERATIONAL</div>
              <button onClick={openDemo}>OPEN CONSOLE <ArrowRight size={13} /></button>
            </div>
            <div className="product-body">
              <aside className="product-sidebar">
                <button className="active"><Command size={16} /><span>Command</span></button>
                <button><Activity size={16} /><span>Incidents</span><em>05</em></button>
                <button><Layers3 size={16} /><span>Assets</span></button>
                <button><UploadCloud size={16} /><span>Evidence</span></button>
                <button><Workflow size={16} /><span>Automations</span></button>
              </aside>
              <div className="product-workspace">
                <div className="workspace-meta"><span>AI SECURITY COMMAND</span><span><i /> WATCHING 12 SOURCES</span></div>
                <div className="voice-command">
                  <div className="voice-command-orb"><Mic size={25} /><span /><i /></div>
                  <div><small>AEGIS IS READY</small><h3>What should we investigate?</h3><p>Speak naturally or type an incident, asset, or behavior below.</p></div>
                </div>
                <button className="workspace-prompt" onClick={openDemo}><Command size={16} /><span>Investigate suspicious PowerShell activity on WIN-FIN-07</span><ArrowRight size={17} /></button>
                <div className="workspace-flow">
                  <span><AudioWaveIcon />VOICE</span><ChevronRight size={12} /><span><Sparkles size={13} />CORRELATE</span><ChevronRight size={12} /><span><ShieldCheck size={13} />DECIDE</span>
                </div>
              </div>
              <aside className="product-risk">
                <span>LIVE RISK INDEX</span>
                <div className="risk-dial"><strong>28</strong><small>LOW RISK</small></div>
                <p><i /> Improving by 6 points</p>
                <div className="risk-bars"><i /><i /><i /><i /><i /><i /><i /></div>
                <div className="risk-footer"><span>CONTROL HEALTH</span><strong>98.7%</strong></div>
              </aside>
            </div>
          </div>
        </section>

        <section className="architecture">
          <div className="architecture-aside reveal">
            <SectionLabel light>Defense architecture</SectionLabel>
            <h2>Built for trust<br />at every layer.</h2>
            <p>Provider-safe infrastructure, explainable decisions, and resilient local fallbacks keep your operation moving.</p>
            <div className="layer-tabs" role="tablist" aria-label="Architecture layers">
              {['Ingest', 'Reason', 'Respond'].map((tab, index) => (
                <button key={tab} className={activeLayer === index ? 'active' : ''} onClick={() => setActiveLayer(index)} role="tab" aria-selected={activeLayer === index}>
                  <span>0{index + 1}</span>{tab}<ArrowRight size={14} />
                </button>
              ))}
            </div>
          </div>
          <div className="architecture-stage reveal">
            <div className="stage-grid" />
            <div className={`stage-visual layer-${activeLayer}`}>
              <div className="stage-node stage-main">
                {activeLayer === 0 ? <Radio size={25} /> : activeLayer === 1 ? <Bot size={25} /> : <ShieldCheck size={25} />}
                <span>{activeLayer === 0 ? 'SECURE INGEST' : activeLayer === 1 ? 'AEGIS POLICY CORE' : 'APPROVAL GATE'}</span>
              </div>
              <div className="stage-line line-a" /><div className="stage-line line-b" /><div className="stage-line line-c" />
              <div className="stage-node node-a">{activeLayer === 0 ? <Cloud size={18} /> : activeLayer === 1 ? <Gauge size={18} /> : <LockKeyhole size={18} />}<span>{activeLayer === 0 ? 'CLOUD' : activeLayer === 1 ? 'RISK' : 'HUMAN'}</span></div>
              <div className="stage-node node-b">{activeLayer === 0 ? <Fingerprint size={18} /> : activeLayer === 1 ? <Braces size={18} /> : <Zap size={18} />}<span>{activeLayer === 0 ? 'IDENTITY' : activeLayer === 1 ? 'MITRE' : 'ACTION'}</span></div>
              <div className="stage-node node-c">{activeLayer === 0 ? <Server size={18} /> : activeLayer === 1 ? <ScanLine size={18} /> : <Check size={18} />}<span>{activeLayer === 0 ? 'ENDPOINT' : activeLayer === 1 ? 'EVIDENCE' : 'VERIFY'}</span></div>
              <div className="stage-readout"><span>LAYER STATUS</span><strong>{activeLayer === 0 ? '12 SOURCES CONNECTED' : activeLayer === 1 ? 'POLICY CONSTRAINED' : 'APPROVAL REQUIRED'}</strong><i /></div>
            </div>
            <div className="stage-caption">
              <span>0{activeLayer + 1}</span>
              <div><h3>{['Encrypted by default', 'Reasoning you can audit', 'Autonomy with boundaries'][activeLayer]}</h3><p>{[
                'All provider credentials stay server-side. Approved telemetry is normalized without exposing secrets to the client.',
                'Every assessment includes confidence, evidence, MITRE context, and an ordered response rationale.',
                'Containment is fast, but never careless. Sensitive actions remain staged until an operator approves them.',
              ][activeLayer]}</p></div>
            </div>
          </div>
        </section>

        <section className="case-studies section-pad" id="intelligence">
          <div className="section-head reveal">
            <div><SectionLabel>Field intelligence</SectionLabel><h2>Defense, proven<br />in the real world.</h2></div>
            <button className="text-link" onClick={() => setToast('The full field report is being prepared.')}>View all deployments <ArrowRight size={16} /></button>
          </div>
          <div className="case-grid">
            {cases.map((item, index) => (
              <article className="case-card reveal" key={item.name} tabIndex={0}>
                <div className="case-image">
                  <img src={item.image} alt="" />
                  <span>{item.year}</span>
                  <button onClick={openDemo} aria-label={`Explore ${item.name}`}><ArrowRight size={19} /></button>
                </div>
                <div className="case-meta"><span>{item.tag}</span><span>0{index + 1}</span></div>
                <h3>{item.name}</h3>
                <div className="case-result"><strong>{item.metric}</strong><span>{item.metricLabel}</span></div>
              </article>
            ))}
          </div>
        </section>

        <section className="protocol-steps">
          <div className="protocol-intro reveal">
            <SectionLabel>Deployment protocol</SectionLabel>
            <h2>From first signal<br />to operating twin.</h2>
            <p>Start focused. Prove value. Expand with confidence.</p>
          </div>
          <div className="step-list">
            {[
              ['01', 'Map', 'We identify your highest-friction workflow, data boundaries, and approval model.'],
              ['02', 'Connect', 'Secure adapters unify the telemetry and response tools already in your stack.'],
              ['03', 'Calibrate', 'Aegis learns your environment, policies, critical assets, and risk language.'],
              ['04', 'Operate', 'Your twin enters production with measured autonomy and complete observability.'],
            ].map(([number, title, copy]) => (
              <article className="step-row reveal" key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p><CircleDot size={18} /></article>
            ))}
          </div>
        </section>

        <section className="testimonial">
          <div className="testimonial-quote reveal">
            <span className="quote-mark">“</span>
            <blockquote>Aegis did not give us more alerts. It gave us the one thing our team was missing: <em>a clear next move.</em></blockquote>
            <div className="quote-person"><span>MC</span><div><strong>Maya Chen</strong><small>VP Security Operations / Northstar Labs</small></div></div>
          </div>
          <div className="testimonial-aside reveal">
            <img src="images/case-helix.jpg" alt="Layered metallic patterns representing protected identity data" />
            <div><span>OPERATOR REPORT / 04</span><strong>2.7×</strong><p>more incidents resolved per analyst shift</p></div>
          </div>
        </section>

        <section className="faq section-pad" id="faq">
          <div className="faq-intro reveal"><SectionLabel>Common inquiries</SectionLabel><h2>Questions,<br />answered clearly.</h2><p>Still evaluating? Talk to our security architecture team.</p><button className="text-link" onClick={openDemo}>Start a conversation <ArrowRight size={16} /></button></div>
          <div className="faq-list reveal">
            {faqItems.map((item, index) => (
              <div className={`faq-item ${faqOpen === index ? 'open' : ''}`} key={item.question}>
                <button onClick={() => setFaqOpen(faqOpen === index ? -1 : index)} aria-expanded={faqOpen === index}>
                  <span>0{index + 1}</span><strong>{item.question}</strong><ChevronDown size={20} />
                </button>
                <div className="faq-answer"><p>{item.answer}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="final-cta">
          <div className="cta-image"><img src="images/aegis-hero.jpg" alt="Secure Aegis compute infrastructure" /><div className="cta-scan" /></div>
          <div className="cta-copy reveal">
            <SectionLabel light>Your environment. One command.</SectionLabel>
            <h2>Give your team<br />a second mind.</h2>
            <p>See Aegis reason across your security stack in a focused, 30-minute architecture session.</p>
            <button className="button-light" onClick={openDemo}>Command the twin <ArrowRight size={16} /></button>
          </div>
          <div className="cta-corner">AEGIS / AUTONOMOUS DEFENSE / 2026</div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand"><span className="wordmark"><BrandMark />AEGIS/TWIN</span><p>Decisive security intelligence<br />for modern operations.</p></div>
          <div className="footer-links">
            <div><span>EXPLORE</span>{navLinks.map((link) => <button key={link.target} onClick={() => scrollToSection(link.target)}>{link.label}</button>)}</div>
            <div><span>COMPANY</span><button onClick={() => setToast('Company profile opening soon.')}>About</button><button onClick={openDemo}>Contact</button><button onClick={() => setToast('Careers page opening soon.')}>Careers</button></div>
            <div><span>LEGAL</span><button onClick={() => setToast('Privacy controls are available on request.')}>Privacy</button><button onClick={() => setToast('Security documentation is available on request.')}>Security</button><button onClick={() => setToast('Terms are available on request.')}>Terms</button></div>
          </div>
          <form className="footer-newsletter" onSubmit={submitEmail}><span>FIELD NOTES / NO NOISE</span><p>Monthly intelligence on autonomous defense.</p><label><input ref={emailRef} type="email" placeholder="Work email" aria-label="Work email" /><button aria-label="Subscribe"><ArrowRight size={18} /></button></label></form>
        </div>
        <div className="footer-bottom"><span>© 2026 AEGIS TWIN</span><span>AUSTIN / LONDON / EVERYWHERE</span><span className="footer-live"><i /> SYSTEMS OPERATIONAL</span></div>
      </footer>

      {demoOpen && (
        <div className="demo-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setDemoOpen(false); }}>
          <section className="demo-modal" role="dialog" aria-modal="true" aria-label="Aegis live triage">
            <header>
              <div className="demo-modal-brand"><span><BrandMark /></span><div><strong>AEGIS LIVE TRIAGE</strong><small><i /> SECURE LOCAL SESSION</small></div></div>
              <button onClick={() => setDemoOpen(false)} aria-label="Close demo"><X size={21} /></button>
            </header>
            <div className="demo-content">
              <div className="demo-intro"><SectionLabel>Command your twin</SectionLabel><h2>What should we investigate?</h2><p>Try a security question. Aegis will classify the risk, map the behavior, and prepare response steps.</p></div>
              <form className="demo-command" onSubmit={runDemo}>
                <Command size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask about an incident, identity, or endpoint…" autoFocus />
                <button type="submit" disabled={isAnalyzing || !query.trim()}>{isAnalyzing ? <Pause size={17} /> : <Send size={17} />}<span>{isAnalyzing ? 'Analyzing' : 'Run triage'}</span></button>
              </form>
              <div className="demo-suggestions"><span>TRY</span><button onClick={() => setQuery('Review failed logins for m.chen@northstar.io')}>Identity anomaly</button><button onClick={() => setQuery('Investigate unusual outbound database traffic')}>Data exfiltration</button></div>

              {isAnalyzing && (
                <div className="demo-loading" role="status">
                  <div className="loading-core"><Sparkles size={23} /><span /></div>
                  <div><span>AEGIS IS CORRELATING</span><strong>Evaluating telemetry and policy…</strong></div>
                  <div className="loading-track"><i /></div>
                </div>
              )}

              {demoResult && !isAnalyzing && (
                <div className="demo-result">
                  <div className="result-topline"><span className="defcon">DEFCON {demoResult.defcon}</span><span>RISK SCORE <strong>{demoResult.riskScore}</strong>/100</span><span><CheckCircle2 size={13} /> ANALYSIS COMPLETE</span></div>
                  <h3>{demoResult.headline}</h3><p>{demoResult.summary}</p>
                  <div className="result-grid">
                    <div><span>IMMEDIATE DIRECTIVES</span>{demoResult.directives.slice(0, 3).map((directive, index) => <div className="directive" key={directive.action}><b>0{index + 1}</b><span><strong>{directive.action}</strong><small>{directive.detail}</small></span></div>)}</div>
                    <div className="mitre-box"><span>MITRE ATT&amp;CK</span>{demoResult.mitreTechniques.map((technique) => <div key={technique.id}><b>{technique.id}</b><small>{technique.name}</small></div>)}<button onClick={() => setToast('Spoken incident briefing prepared.') }><Headphones size={15} /> Prepare voice brief</button></div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status"><CheckCircle2 size={17} /><span>{toast}</span><button onClick={() => setToast('')}><X size={14} /></button></div>}
    </div>
  );
}

function AudioWaveIcon() {
  return <span className="audio-wave" aria-hidden="true"><i /><i /><i /><i /></span>;
}

export default App;
