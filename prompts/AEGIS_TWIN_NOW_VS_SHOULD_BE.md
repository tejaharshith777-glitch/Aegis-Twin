# AEGIS TWIN — WHAT IT IS NOW vs WHAT IT SHOULD BE

**Companion to `AEGIS_TWIN_WINNING_WORKFLOW.md` (the workflow) and `AEGIS_TWIN_MASTER_PROMPT.md`
(the full build spec).**

This document is an honest, line-verified audit of the code in this repository as of
**17 August 2026**, set against the product Aegis Twin is supposed to be. It exists for two
reasons:

1. So you build the *right* remaining hours instead of the fun ones.
2. So you never overclaim on stage. Judges forgive a scoped demo. They do not forgive being told
   something is real when it is seeded — and one of them will always ask.

Sections 1–4 are the audit. Section 5 is the honesty script. Sections 6–8 are paste-ready prompts.

---

## 1. THE HONEST ONE-LINER FOR EACH

| | |
| --- | --- |
| **What Aegis Twin IS today** | A genuinely working three-provider voice AI pipeline — Deepgram → Gemini → Murf — wrapped in a polished SOC console, reasoning over a **seeded five-incident corpus** and **real uploaded evidence files**, with real fallbacks so it never dies. It is a *convincing, technically honest vertical slice* of an AI analyst. |
| **What Aegis Twin SHOULD BE** | The same loop, but wired to live telemetry, with persistent case memory, real containment through EDR/IdP/firewall connectors, automatic verification of outcomes, an immutable audit trail, and confidence-gated autonomy that knows when to stop and ask. |
| **The gap, in one word** | **Consequence.** Today it decides beautifully. It does not yet remember, act for real, or prove the outcome. |

---

## 2. THE AUDIT — COMPONENT BY COMPONENT

Legend: **REAL** = actually works against live systems · **REAL-BUT-SEEDED** = real code path, fake
data · **SIMULATED** = deliberate stub · **MISSING** = not built.

### 2.1 Voice ingestion — **REAL** ✅

- `server/index.ts` opens a genuine `wss://api.deepgram.com/v1/listen` upstream with Nova-3,
  `interim_results`, `endpointing=300`, `utterance_end_ms=1000`, `vad_events`, and six boosted
  security key terms. Audio is relayed as 250 ms Opus chunks from `MediaRecorder`.
- Key stays server-side; the browser only sees a same-origin socket. Up to 20 chunks buffer while
  the upstream is connecting. `Finalize` → 450 ms → `CloseStream` is handled properly.
- **This is production-grade.** Claim it fully.

### 2.2 Reasoning — **REAL**, over **SEEDED** context ⚠️

- Real Gemini 2.5 Flash `generateContent` call with a locked system instruction, a strict
  `responseSchema`, `temperature: 0.15`, 25 s timeout, and a genuine post-hoc validation layer
  (`parseGeminiResult`) that clamps numbers, truncates strings, rejects unknown tones, sorts
  directives, and **recomputes severity from DEFCON in TypeScript**. That validation layer is the
  most defensible code in the repo.
- **But** the "security telemetry" it correlates against is `server/engine.ts`: five hardcoded
  incidents and five keyword-matched scenarios. `pickScenario()` is substring counting, not
  detection engineering.
- Say: *"The reasoning and the guardrails are real; the telemetry corpus is seeded for the demo,
  and it swaps out at one function boundary."*

### 2.3 Voice response — **REAL** ✅

- Real Murf `v1/speech/generate`, GEN2, MP3 24 kHz mono, streamed back same-origin with
  `Cache-Control: private, max-age=300`. Handles both `encodedAudio` and `audioFile` responses.
- Browser `speechSynthesis` fallback at rate 0.96 / pitch 0.93. Claim it fully.

### 2.4 Evidence analysis — **REAL** ✅ (the most underrated part of the build)

- `server/fileAnalyzer.ts` genuinely parses uploaded CSV/JSON/LOG/TXT: quote-aware CSV parsing,
  per-line column validation, JSON array / `{events:[…]}` / single-object handling, partial-validity
  recovery, 20-issue cap with real line numbers.
- Real SHA-256 chain of custody, real 512 KB and null-byte guards, real filename sanitization,
  real prompt-injection detection that flags and neutralizes without executing.
- **This works on any file a judge hands you.** Lead with it when someone doubts the seeded corpus.

### 2.5 Resilience — **REAL** ✅

- Gemini failure → local deterministic engine + `X-Aegis-Engine: Aegis Local` + `providerDegraded`.
- Deepgram failure → browser recognition. Murf failure → browser speech. API down entirely →
  client-side `localBrowserTriage()`. Verified in code; rehearse it and it is a showstopper.

### 2.6 Actions — **SIMULATED** 🔴

```ts
await new Promise((resolve) => setTimeout(resolve, 320));
response.json({ success: true, … });
```

- `POST /api/actions` is a 320 ms `setTimeout` that always returns success. Nothing is contained,
  no control plane is called, no brief file is produced.
- The client optimistically flips the incident row to `Contained` in React state.
- **Never say "it contains the endpoint."** Say: *"the approval workflow and the audit path are
  built; the control-plane connector is the next integration."*

### 2.7 Dashboard numbers — **SEEDED** 🔴

Hardcoded strings, not computed: risk index **28**, the 7-day sparkline path, **2,847** signals
analyzed, **01:42** mean time to triage, **98.7%** control health, **1,291** protected assets,
**99.5%** sensor coverage, **184 new signals**, "watching 12 sources", "24 approved runbooks",
the four activity-feed items, the date **"Saturday, August 15"**, "Good morning, Alex.",
"Northstar Labs", "Alex Morgan". The six-row asset inventory is a client-side constant.

- The date string is stale and will read as August 15 forever — **fix that today**, it is the
  cheapest credibility save in the repo.
- These are fine as demo scaffolding. They are *not* fine if you present them as measurements.

### 2.8 Memory, audit, persistence — **MISSING** 🔴

- No database, no file store, no `localStorage`. Refresh the page and every case evaporates.
- No case timeline, no immutable audit log, no chain of custody beyond the per-file checksum.
- No multi-turn context: "contain it" after a verdict starts from zero.
- No post-action verification pass. The activity feed never learns about what you just approved.
- No exported artifact — "Create incident brief" fires a toast and produces no document.

### 2.9 Latency proof — **MISSING** 🔴

Nothing is timed. Your single strongest number — *six seconds versus a 1h42m industry mean* — is
currently a claim rather than a measurement rendered on screen.

### 2.10 Platform concerns — **MISSING** (and correctly deprioritized) ⚪

No auth, no RBAC, no multi-tenancy, no rate limiting, no CORS/CSP/Helmet headers, no structured
logging, no API/integration/frontend tests (7 unit tests cover the engine and parser only).
Right call for a hackathon. Wrong answer if a judge asks "is this production ready?" — the correct
answer is *"no, and here is exactly the list."* Having the list is what scores.

---

## 3. THE SCORECARD

| Layer | State | Demo risk | Fix cost |
| --- | --- | --- | --- |
| Deepgram streaming | REAL | none | — |
| Gemini + validation layer | REAL | none | — |
| Murf synthesis | REAL | none | — |
| Evidence parser + SHA-256 + injection isolation | REAL | none | — |
| Fallback ladder | REAL | none | — |
| UI / design system | REAL | none | — |
| Incident + asset corpus | SEEDED | medium — *"is this real data?"* | 2 h for a mock connector |
| Dashboard metrics | SEEDED | **high — stale date, static numbers** | 45 min |
| `/api/actions` | SIMULATED | **high — easy to overclaim** | 1 h honest, 4 h real connector |
| Case timeline / audit | MISSING | medium | 2 h |
| Latency instrumentation | MISSING | low, but it is free points | 45 min |
| Incident brief export | MISSING | low | 1 h |
| Post-action verification | MISSING | medium | 1 h |
| Multi-turn context | MISSING | low | 1.5 h |
| Auth / RBAC / rate limiting | MISSING | none (out of scope) | — |

**Roughly seven focused hours converts every high-risk row into a strength.**

---

## 4. WHAT "SHOULD BE" LOOKS LIKE — THE TARGET ARCHITECTURE

```
        ┌──────────────── LIVE TELEMETRY (should be) ────────────────┐
        │  EDR · IdP · Email gateway · Cloud audit · NetFlow · SIEM   │
        └───────────────────────────┬────────────────────────────────┘
                                    │  connector interface  ← one seam
                                    ▼
Voice ─► Deepgram ─► Normalize ─► CORRELATE ─► Gemini ─► Aegis policy ─► Verdict
 REAL      REAL         REAL       SEEDED       REAL        REAL          REAL
                                    │
                                    ▼
                            Human approval  ─► Control plane connector ─► VERIFY
                                REAL              SIMULATED                MISSING
                                    │                                        │
                                    └──────────► CASE STORE / AUDIT ◄────────┘
                                                     MISSING
                                                        │
                                                        ▼
                                            Exported incident brief
                                                     MISSING
```

The architecture is already correct. **Only three boxes are hollow**: the connector seam, the case
store, and the verification return path. That is a genuinely strong position to be in — say so.

The target behaviours, in priority order:

1. **Persistent case memory.** Every triage opens a case; every stage appends an immutable entry;
   the case survives a refresh and is retrievable by ID.
2. **Verified action.** Approval dispatches through a connector interface, then a verification pass
   re-queries the entity and posts the confirmed outcome. Containment proves itself.
3. **Measured performance.** Every stage timed, total shown in the drawer, aggregated into the
   dashboard metric card so the number on the wall is *your own run*.
4. **Confidence-gated autonomy.** Below 70% confidence, containment is suppressed and directives
   become evidence-collection steps. The agent knows when to stop.
5. **Real telemetry behind one interface.** `getIncidents()` / `getAsset()` / `getRelatedActivity()`
   as an interface with a `SeededProvider` today and a `SplunkProvider` / `SentinelProvider`
   tomorrow. Nothing downstream changes.
6. **Blast-radius preview** before approval: what this action touches, who it affects.
7. **Learning loop:** record which directives the human overrode; feed the override rate back as
   context. That single feature is the difference between a tool and a twin.

---

## 5. THE HONESTY SCRIPT — SAY THIS, NOT THAT

| ❌ Do not say | ✅ Say instead |
| --- | --- |
| "It monitors your environment in real time." | "It reasons over a seeded incident corpus for the demo, and over any real log file you hand it right now." |
| "It contained the endpoint." | "It dispatched the approved containment workflow. The control-plane connector is the next integration — the approval and audit path around it is built." |
| "We analyzed 2,847 signals." | "Those dashboard figures are demo scaffolding. The live number is this: your command was triaged in 6.4 seconds." |
| "It's production ready." | "No. Here's the exact list: auth, rate limiting, real connectors, persistence. That list is short because the hard part — the reasoning loop and its guardrails — is done." |
| "The AI decides the severity." | "The model proposes DEFCON; our TypeScript recomputes severity from it. We don't trust our own model's output." |
| "It never hallucinates." | "It can't attach a host we don't have. If nothing matches, we explicitly instruct it not to fabricate an entity, and the incident binding comes from trusted local code." |

**The move that wins the room:** volunteer one limitation *before* they find it. Then immediately
hand them the evidence file and let them watch the part that is unambiguously real. Judges score
calibrated confidence far higher than polish.

---

## 6. PASTE-READY PROMPT — CLOSE THE GAP (the 7-hour plan)

> Extend the existing Aegis Twin repository so the decision loop closes. Do not add new pages,
> auth, a database, dark mode, or a second LLM provider. Preserve every existing guarantee: keys
> stay server-side, analysis and action stay on separate endpoints, actions require explicit human
> approval, the local deterministic engine remains the fallback, and `npm test` plus
> `npm run build` must stay green.
>
> **1. Live-date and metric honesty (45 min).** Replace the hardcoded `Saturday, August 15` eyebrow
> and `Good morning, Alex.` greeting with values computed from the current date and hour. Mark
> every seeded dashboard figure with a subtle `DEMO DATA` affordance (a tooltip or a small mono tag)
> so nothing on screen implies a measurement it isn't.
>
> **2. Latency instrumentation (45 min).** Time capture→verdict client-side and the Gemini call
> server-side. Return `timings: { transcriptionMs, reasoningMs, totalMs }` on `AgentResult`. Render
> `Triaged in X.Xs · Deepgram → Gemini → Aegis policy` in the analysis-drawer header, and feed the
> rolling average into the "Mean time to triage" metric card so it reflects real runs.
>
> **3. Case store and audit trail (2 h).** Add `server/caseLog.ts` with an append-only in-memory
> store and `GET /api/cases` plus `GET /api/cases/:id`. Append
> `{ caseId, at, stage, actor: 'operator' | 'aegis', engine, defcon, latencyMs, detail }` on every
> triage, action, and verification. Render a "Case timeline" section in the analysis drawer between
> the reasoning list and the spoken-briefing button, and wire the existing "Open full activity log"
> button to open it instead of firing a toast.
>
> **4. Post-action verification (1 h).** After `POST /api/actions` resolves, automatically run a
> verification pass that re-checks the entity, appends a verification entry to the case timeline,
> and prepends a matching item to the Agent activity feed — e.g. "Containment verified — network
> block confirmed for WIN-FIN-07."
>
> **5. Exported incident brief (1 h).** Make the `Create incident brief` action generate and
> download a Markdown report named `{incidentId}-brief.md` containing headline, DEFCON, severity,
> confidence, risk score, matched incident, MITRE techniques, ordered directives, correlated
> evidence with any file SHA-256, the full case timeline, and the approving operator with
> timestamps.
>
> **6. Confidence-gated autonomy (45 min).** When `confidence < 70`, hide the containment action,
> show an amber "Insufficient confidence for containment" notice, and replace the directives with
> evidence-collection steps (capture memory, pull sign-in logs, preserve flow records).
>
> **7. Connector seam (45 min).** Extract `getIncidents()`, `getIncidentById()`, `getAsset()` and
> `getRelatedActivity()` into a `TelemetryProvider` interface in `server/telemetry.ts`, implement
> `SeededProvider` using the current corpus, and select the provider from an env variable. Document
> in the README exactly where a Splunk, Sentinel, or CrowdStrike provider would slot in.
>
> Add tests for: case-timeline appends, presence of latency fields on a triage result, containment
> suppression below 70% confidence, and provider-interface selection.

---

## 7. PASTE-READY PROMPT — IF YOU ONLY HAVE TWO HOURS

> In the existing Aegis Twin repository, make these four changes and nothing else.
> (a) Compute the dashboard date and greeting from the real clock instead of the hardcoded
> "Saturday, August 15" / "Good morning, Alex." (b) Time the triage pipeline and display
> `Triaged in X.Xs` in the analysis-drawer header. (c) Add an in-memory case timeline that records
> every triage, approval, and verification, render it in the drawer, and post a verification entry
> to the activity feed after any approved action. (d) Make "Create incident brief" download a real
> Markdown report with the verdict, evidence checksums, MITRE mapping, directives, and the timeline.
> Keep keys server-side, keep the approval gate, keep the local fallback, keep the tests green.

---

## 8. PASTE-READY PROMPT — THE HONEST POSITIONING STATEMENT

> Write the README "Scope and honesty" section for Aegis Twin. State plainly what is live
> (Deepgram Nova-3 streaming transcription through a server-side proxy, Gemini 2.5 Flash
> schema-constrained reasoning with a server-side validation layer, Murf GEN2 voice synthesis,
> real CSV/JSON/LOG/TXT evidence parsing with SHA-256 chain of custody and prompt-injection
> isolation, and a deterministic local fallback engine), what is seeded for demonstration (the
> five-incident corpus, the six-row asset inventory, and the dashboard metric figures), and what is
> simulated (the containment dispatch endpoint, which validates and audits the approval but does not
> yet call a control plane). Then list the roadmap in priority order: telemetry connectors behind a
> provider interface, persistent case storage, verified action outcomes, confidence-gated autonomy,
> and an override-learning loop. Keep the tone matter-of-fact and confident — this section exists to
> earn trust, not to apologize.

---

## 9. THE TAKEAWAY

You are not missing intelligence. You are missing **consequence and memory**.

The reasoning loop, the guardrails, the fallbacks, and the evidence pipeline are real and
defensible — that is the hard 80%. What remains is the part that turns a very good demo into a
product story: remember the case, prove the outcome, measure the speed, and be exact about which
parts are seeded.

Close those four gaps, run the three winning moments from `AEGIS_TWIN_WINNING_WORKFLOW.md` §15, and
answer every "is it real?" question with a specific, calibrated yes or no. That is what takes it.
