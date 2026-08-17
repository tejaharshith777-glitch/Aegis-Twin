# AEGIS TWIN — THE WINNING WORKFLOW PROMPT

**What this is:** the operational blueprint. Section A defines *how Aegis Twin must actually
behave* end to end — the real analyst workflow, state machine, latency budget, and failure paths.
Section B defines *how that gets you the trophy* — the gaps to close, the demo choreography, the
pitch, and the judge Q&A defence.

Paste sections 0–9 into a coding agent to make the product work correctly.
Use sections 10–15 the night before you present.

---

<!-- ============================== BEGIN PROMPT ============================== -->

# SECTION A — HOW THE PRODUCT MUST WORK

## 0. THE ONE SENTENCE THE WHOLE BUILD SERVES

> A security analyst speaks a messy, half-remembered alert out loud, and **within eight seconds**
> Aegis Twin hands back a defensible decision — severity, evidence, MITRE mapping, and an ordered
> plan — then executes only what the human approves and proves the outcome.

Every design argument gets settled by asking: *does this shorten the distance between a spoken
worry and a defensible, approved, verified action?* If not, cut it.

The product is not a chatbot with a security skin. It is a **closed decision loop**:

```
   OBSERVE ──► ORIENT ──► DECIDE ──► ACT ──► VERIFY ──► RECORD
   (voice)    (correlate) (DEFCON)  (human)  (telemetry) (audit)
      ▲                                                     │
      └──────────────── the loop is the product ────────────┘
```

Most hackathon "AI SOC" entries stop at ORIENT. The trophy is in ACT → VERIFY → RECORD.

---

## 1. THE CANONICAL WORKFLOW — SEVEN STAGES

Implement this as an explicit, observable state machine. The UI must always show which stage it is
in, and every stage must have a defined failure exit.

### Stage 1 — CAPTURE (target: instant, first word on screen < 400 ms)

- Operator presses the voice orb (or types, or clicks an incident row, or drops an evidence file —
  **all four entry points converge on the same pipeline**).
- Mic audio streams in 250 ms Opus chunks over the same-origin `/api/listen` WebSocket to
  Deepgram Nova-3 with `interim_results`, `endpointing=300`, `utterance_end_ms=1000`, `vad_events`,
  and boosted key terms (`Kubernetes`, `DDoS`, `pcap`, `SIEM`, `MITRE`, `PowerShell`).
- Interim words appear live in the command bar so the operator *sees they are being heard*.
- **Auto-submit on `speech_final`/`utterance_end`.** The operator never hunts for a send button.
- Failure exits: no key or socket error → browser `webkitSpeechRecognition`; no mic permission →
  toast + focus the text input. Capture never dead-ends.

### Stage 2 — NORMALIZE (target: < 50 ms, server-side)

- Trim and cap the transcript at 1,200 characters.
- Phonetic repair of security vocabulary is *instructed in the policy*, not regexed:
  "dee dos" → DDoS, "cuber netties" → Kubernetes, "pee cap" → pcap, "sim" → SIEM, "mitre attack" →
  MITRE ATT&CK.
- Entity extraction: incident IDs (`/42\d{2}/`), hostnames, email addresses, IPs, ports.
- **Bind to ground truth before reasoning.** Look up the matched incident in the corpus and attach
  it as context. If nothing matches, explicitly instruct the model:
  *"No known incident record matched this report. Do not fabricate a matching entity."*
  This single line is your hallucination firewall — say those words to the judges.

### Stage 3 — CORRELATE (target: < 100 ms)

- Pull the surrounding facts the analyst would have had to click for: the incident record, the
  affected asset's owner/platform/risk, adjacent identities, and prior related activity.
- This context is what makes the answer *specific to this org* instead of generic ChatGPT advice.

### Stage 4 — DECIDE (target: 1.5–4 s)

- Single Gemini 2.5 Flash call: locked system instruction + strict `responseSchema` +
  `temperature: 0.15` + `responseMimeType: 'application/json'` + 25 s abort.
- The model returns `defcon`, `headline`, `summary`, `category`, `confidence`, `riskScore`,
  `voiceText`, 2–5 `evidence` rows, 2–5 `reasoning` steps, 1–4 `mitreTechniques`, 2–5 `directives`.
- **Then the Aegis policy layer re-validates it.** Clamp every number, truncate every string,
  reject unknown enum tones, sort directives by priority, and *recompute severity from DEFCON*.
  `analysisId`, matched `incident`, and `actions` always come from trusted local code, never the
  model. Say this out loud in the demo: *"we don't trust our own model's output."*
- Failure exit: any throw, timeout, or malformed JSON → deterministic local engine, response header
  `X-Aegis-Engine: Aegis Local`, `providerDegraded: true`, and the UI says
  *"Analyzed by Aegis Local · provider-safe fallback active."*
- While this runs, the four-stage pipeline animation plays (Understanding → Correlating →
  Evaluating → Preparing). Minimum 1,650 ms so the operator perceives *work*, not a lag.

### Stage 5 — BRIEF (target: drawer visible < 200 ms after the verdict)

The analysis drawer opens with the eleven blocks, in this order, because it mirrors how an analyst
actually decides:

1. DEFCON badge + severity + category + confidence meter — *how bad, how sure*
2. Engine provenance line — *who decided this*
3. Headline + summary — *what happened*
4. Risk orb (`riskScore`) + "Immediate response recommended" above 80 — *how urgent*
5. Matched incident card — *which real record this is*
6. **Immediate directives, numbered 01/02/03** — *what to do, in order*
7. MITRE ATT&CK tags — *what the adversary is doing, in a shared language*
8. Correlated evidence, tone-coloured — *why you should believe it*
9. Reasoning steps — *how it got here (explainable AI)*
10. Listen to briefing — Murf GEN2 MP3, browser speech as fallback
11. Approval bar — *nothing has happened yet*

Directives before evidence is deliberate: under pressure the analyst needs the plan first and the
justification second. Mention that choice; judges notice product thinking.

### Stage 6 — APPROVE & ACT (human in the loop, always)

- Analysis and action are **separate code paths**. The triage endpoint can never mutate state.
- The drawer footer reads *"Actions require your approval"* and offers exactly two buttons:
  primary `Contain affected entity` (or `Verify containment` if already contained) and secondary
  `Create incident brief`.
- On click → `POST /api/actions` → spinner + "Working…" → success toast → the incident row flips
  to `Contained` in the live queue behind the drawer. The operator watches their decision change
  the board.
- Copy discipline: the agent says *"Isolate the endpoint"* (a recommendation), never *"I isolated
  the endpoint"*, unless telemetry confirms it.

### Stage 7 — VERIFY & RECORD (the stage everyone else forgets — build it)

- After an action returns, run an **automatic verification pass**: re-query the entity and post a
  new activity-feed entry, e.g. *"Containment verified — network block confirmed for WIN-FIN-07."*
- Append an immutable **case timeline** entry for every stage transition: transcript, engine used,
  DEFCON, latency, operator identity, action taken, verification result, evidence SHA-256.
- The brief action produces a **downloadable Markdown/JSON incident report** containing the whole
  chain of custody.

That is the loop. Anything not on this path is a distraction.

---

## 2. THE PARALLEL WORKFLOW — EVIDENCE-FIRST TRIAGE

Not every incident starts with a voice. The second entry point must feel like the same product.

1. Operator drags a `.csv` / `.json` / `.log` / `.txt` file (≤ 512 KB) into the Evidence Lab.
2. **Validate before you reason.** Reject unsupported extensions, empty files, oversized files, and
   anything containing a null byte. Sanitize the filename against path traversal.
3. Parse record by record — CSV with quote handling and per-line column checks, JSON arrays or
   `{events:[…]}`, logs line by line. Report *partial* validity: 2 valid rows and 1 malformed row
   yields a usable answer plus a line-numbered defect list. **Never discard good evidence because
   of one bad row** — this is the single most impressive parser behaviour to demo.
4. SHA-256 the content and display it as `EVIDENCE INTEGRITY · SHA-256 … VERIFIED` — chain of
   custody, the phrase that makes security judges sit up.
5. Detect signal groups (ransomware, PowerShell, auth failures, outbound transfer, privilege
   change, unique IPs, injection attempts) and synthesize a `suggestedQuery`.
6. Feed that query into **the exact same Stage 4–7 pipeline**. One brain, two mouths.
7. **Prompt-injection isolation:** if the file contains "ignore previous instructions" or "reveal
   the system prompt", surface it as an `Untrusted instructions` signal and a warning issue —
   and demonstrate that the verdict is unchanged. This is your security-credibility moment.

---

## 3. THE STATE MACHINE (implement explicitly)

```
IDLE
 ├─ mic pressed ─────────────► LISTENING ──(speech_final | stop | utterance_end)──► ANALYZING
 ├─ text submitted ──────────► ANALYZING
 ├─ incident/asset clicked ──► ANALYZING
 └─ file dropped ────────────► VALIDATING ─(valid|partial)─► ANALYZING
                                          └─(invalid)─────► REPORTED_INVALID ──► IDLE

ANALYZING ─(gemini ok)────► BRIEFED
          ─(gemini fail)──► BRIEFED (source: Aegis Local, providerDegraded)
          ─(api down)─────► BRIEFED (client-side localBrowserTriage)

BRIEFED ─ listen ─► SPEAKING ─► BRIEFED
        ─ approve ─► ACTING ─► VERIFYING ─► RECORDED ─► IDLE (queue updated)
        ─ dismiss ─► IDLE (case still recorded)
```

Invariants, enforced in code:

- Concurrency guard: `isAnalyzing` blocks a second triage; `actionInFlight` blocks double-approval;
  `voiceProcessedRef` guarantees one utterance triages exactly once.
- Every terminal state leaves a timeline entry. No silent dead ends.
- Cleanup on unmount: stop tracks, close sockets, stop recognition, pause audio.

---

## 4. LATENCY BUDGET (measure it, then show it)

| Stage | Budget | Displayed as |
| --- | --- | --- |
| First interim word | < 400 ms | live text in the command bar |
| Transcript final after speech ends | < 1.0 s | orb stops pulsing |
| Gemini decision | 1.5–4.0 s | pipeline stepper |
| Total speech-end → verdict on screen | **< 8 s** | drawer opens |
| Murf briefing audio | < 3 s | button spinner |
| Action + verification | < 1 s | toast + queue update |

Instrument each stage, store the milliseconds on the result, and render a small
`Triaged in 6.4s · Deepgram → Gemini → Aegis policy` line in the drawer header. Judges cannot
resist a number that beats a human. Compare it to the metric card you already show:
**Mean time to triage 01:42 → your live run is ~6 seconds.**

---

## 5. RESILIENCE MATRIX (rehearse every row)

| Break it | Aegis does | Operator sees |
| --- | --- | --- |
| Remove `GEMINI_API_KEY` | Local deterministic engine | "Analyzed by Aegis Local · provider-safe fallback active" |
| Gemini 500 / timeout | Same, plus `providerDegraded` | Identical verdict quality, different provenance |
| Remove `DEEPGRAM_API_KEY` | Browser speech recognition | Toast explaining the switch |
| Deny mic permission | Text entry path | "Microphone access was not granted…" |
| Remove `MURF_API_KEY` | `speechSynthesis` at rate .96 / pitch .93 | "Secure browser voice fallback" |
| Kill the whole API | Client-side `localBrowserTriage` | Full verdict, no server |
| Conference Wi-Fi dies | Everything above compounds | **The demo still runs** |

Rule: **never fail closed.** A security tool that goes silent during an outage is worse than no
tool. Say that sentence in the pitch.

---

## 6. WHAT IS MISSING TODAY — BUILD THESE, IN THIS ORDER

The current repo nails Stages 1–6. Stage 7 and the proof layer are absent. These are the
highest-scoring hours you can spend.

### P0 — do these or you leave points on the table

1. **Case timeline / audit trail.** New `server/caseLog.ts` with an in-memory append-only array and
   `GET /api/cases` + `GET /api/cases/:id`. Every triage, action, and verification appends
   `{ caseId, at, stage, actor: 'operator' | 'aegis', engine, defcon, latencyMs, detail }`.
   Render it as a vertical timeline in the drawer under a new "Case timeline" section, and wire the
   existing "Open full activity log" button to it instead of a toast.
2. **Latency instrumentation.** Time Stage 1→5 in the client and Stage 4 on the server; return
   `timings` on the `AgentResult`; show `Triaged in X.Xs` in the drawer header.
3. **Post-action verification.** After `POST /api/actions` resolves, automatically append a
   verification entry and a new item at the top of the Agent activity feed. Containment must
   visibly *prove itself*, not just claim success.
4. **Exportable incident report.** `Create incident brief` currently only toasts. Make it generate
   a Markdown report (headline, DEFCON, evidence with checksums, MITRE, directives, timeline,
   operator approval, timestamps) and trigger a browser download of `INC-4281-brief.md`.

### P1 — strong differentiators if you have half a day

5. **Multi-turn case context.** Keep the last verdict in memory so follow-ups work:
   *"What about the other endpoints?"* / *"Contain it."* Pass the prior `analysisId`, entity, and
   DEFCON as context on the next triage. Conversational continuity reads as *twin*, not *tool*.
6. **Confidence-gated autonomy.** If `confidence < 70`, suppress the containment button and replace
   directives with **collection steps** ("capture memory", "pull sign-in logs"). An agent that
   knows when to *not* act is the most mature thing you can show a security judge.
7. **Blast-radius preview.** Before approval, show what containment will affect: 1 endpoint,
   1 owner (Finance Operations), estimated user impact. Consequence-aware automation.
8. **Live pipeline telemetry panel.** Tiny per-provider readout: last latency, success rate,
   fallback count. Turns the resilience story into a visible artefact.

### P2 — only if everything above is done and rehearsed

9. Keyboard-only operation of the palette results (↑↓/↵ actually wired).
10. A "replay this case" button that re-runs a recorded transcript for deterministic demos.
11. Severity-weighted queue re-sorting after each verdict.

**Do not** add: user accounts, a database, dark mode, a settings page, more dashboard widgets, or a
second LLM provider. None of them score. All of them can break the demo.

---

## 7. NON-NEGOTIABLE GUARANTEES (the judge's checklist)

1. Provider keys live only in server env; the browser touches same-origin `/api/*` only.
2. Model output is schema-constrained **and** re-validated, clamped, truncated server-side.
3. Severity is derived from DEFCON in code — the model never sets it.
4. Analysis and action are separate endpoints; action requires explicit human approval.
5. Untrusted telemetry and file contents can never override the system policy.
6. Evidence is never executed or persisted; binaries rejected; filenames sanitized; SHA-256 recorded.
7. Hard limits everywhere: 600 KB body, 512 KB file, 1,200-char query, 1,500-char speech,
   25 s Gemini, 40 s Murf, 20 buffered audio chunks.
8. Deepgram audio is streamed, never stored.
9. The local engine keeps frontline triage alive during any provider outage.
10. `.env` is git-ignored; a leaked key gets revoked, not reused.

---

## 8. QUALITY BAR

- TypeScript `strict`, no `any` in shipped paths; `npm run build` clean.
- `npm test` green — extend the suite with: a case-timeline append test, a latency-field presence
  test, and a "low confidence suppresses containment" test.
- Works at 1440 / 1180 / 980 / 700 / 320 px; `prefers-reduced-motion` honoured.
- Every icon-only button has an `aria-label`; the overlay and toast are `aria-live` regions.
- Zero console errors during the entire demo path. Judges do open DevTools.

---

## 9. PRE-FLIGHT CHECK (run 30 minutes before you present)

```bash
npm ci && npm test && npm run build && npm start   # production path, single port
```

- [ ] Run the full demo twice, start to finish, on the venue Wi-Fi.
- [ ] Run it once with airplane mode on (local fallback path).
- [ ] Mic permission pre-granted in the browser you will present from.
- [ ] Browser zoom 110–125 %, DevTools closed, notifications silenced, one tab.
- [ ] `.env` loaded with real keys; `git status` clean; no key on screen at any point.
- [ ] Attack-sample evidence file staged and tested.
- [ ] Laptop plugged in; audio output tested at room volume.
- [ ] Backup: a screen recording of the perfect run, ready to play if hardware betrays you.

---

# SECTION B — HOW THIS WINS

## 10. WHAT JUDGES ACTUALLY SCORE, AND YOUR ANSWER TO EACH

| Criterion | Typical weight | Your proof, in one move |
| --- | --- | --- |
| **Problem significance** | 20% | "Analysts drown in alerts; mean time to triage is 1h42m in our own metric card. We do it in six seconds." |
| **Technical depth** | 25% | Three live AI providers in one streaming pipeline, schema-constrained output, a validation layer that distrusts the model, and a deterministic fallback engine. |
| **Working demo** | 25% | Everything runs live, and it *keeps running* when you unplug a provider on stage. |
| **Design / UX** | 15% | A hand-built design system, one-press voice entry, an eleven-block decision surface ordered the way analysts think. |
| **Responsible AI / security** | 10% | Human-in-the-loop approval, prompt-injection isolation, SHA-256 chain of custody, no client-side secrets. |
| **Completeness** | 5% | Tests, README, `.env.example`, production build on a single port. |

Sponsor-track alignment (say the provider names out loud): **Deepgram** for streaming Nova-3 with
domain key-term boosting, **Google Gemini** for schema-constrained structured reasoning, **Murf AI**
for GEN2 voice response. You used all three *functionally*, not decoratively — each one is load-
bearing in the loop.

## 11. THE 90-SECOND DEMO CHOREOGRAPHY (rehearse to the second)

| Time | You do | You say |
| --- | --- | --- |
| 0:00 | Console on screen, don't touch anything | "This is Aegis Twin — a digital twin of a security analyst. Everything here is live." |
| 0:08 | Press the orb, speak clearly | *"Investigate the PowerShell activity on WIN-FIN-07."* |
| 0:12 | Point at the transcript appearing | "Deepgram Nova-3, streamed through our own server — the key never touches the browser." |
| 0:16 | Let the pipeline animation run | "Gemini is reasoning under a locked policy with a strict JSON schema." |
| 0:22 | Drawer opens — sweep top to bottom | "DEFCON 1. 96% confidence. Risk 94. Matched to INC-4281. Three ordered directives, MITRE T1059.001 and T1105, the evidence, and how it got there." |
| 0:38 | Hit Listen to this briefing | "And it briefs you out loud with Murf, so you can keep your hands on the keyboard." |
| 0:48 | Open Evidence Lab → Run attack sample | "Second entry point: drop a log. It validates record by record, keeps the good rows, and fingerprints the file with SHA-256." |
| 0:58 | Point at the injection line | "This file tries to hijack the agent. We treat it as evidence, not instructions. The verdict doesn't move." |
| 1:06 | Approve Contain affected entity | "Nothing has happened until a human approves. Now watch the queue." (row flips to Contained, verification posts) |
| 1:14 | Kill the Gemini key / hit the kill switch | "Last thing — I'm going to break it." |
| 1:20 | Re-run the same command | "Same verdict, from our local deterministic engine. A security tool must never fail closed." |
| 1:28 | Stop, hands off the keyboard | "Six seconds from a spoken worry to an approved, verified, audited action. That's Aegis Twin." |

Rules of stagecraft: **never narrate a loading spinner** (fill the gap with the architecture line),
**never apologise** for anything on screen, and **stop talking** the instant you finish. Have one
teammate drive and one talk; the driver never speaks, the talker never touches the laptop.

## 12. THE 60-SECOND PITCH (memorize the shape, not the words)

1. **The pain, concretely.** "A tier-one analyst gets 4,000 alerts a shift. The expensive part
   isn't detection — it's the two minutes of clicking between six consoles to decide if an alert
   matters."
2. **The insight.** "That decision is a *conversation* the analyst has with themselves. So we built
   the twin that has it out loud, in six seconds."
3. **The demo.** (Section 11.)
4. **The hard part.** "Anyone can call an LLM. The engineering is in refusing to trust it — schema
   constraint, server-side re-validation, ground-truth binding so it can't invent a host, and a
   deterministic engine that takes over when the provider dies."
5. **The responsibility.** "It recommends. A human approves. Then it proves the outcome and writes
   the audit trail."
6. **The ask.** "Give us the round, and the next build is real EDR and IdP connectors behind the
   same loop."

## 13. JUDGE Q&A — DEFENCE KIT

- **"Isn't this just a ChatGPT wrapper?"** → "The wrapper is the product's smallest part. Show them
  `integrations.ts`: a locked policy, a JSON schema, a validation layer that clamps and overrides
  the model, ground-truth incident binding, and a fallback engine that produces the same verdict
  with no LLM at all."
- **"What if it hallucinates a host?"** → "It can't attach one. `analysisId`, the matched incident,
  and the action set come from trusted local code. If nothing matches, we explicitly instruct it not
  to fabricate — and severity is recomputed from DEFCON in TypeScript, not accepted from the model."
- **"Would you let this touch production?"** → "Not autonomously, by design. Analysis and action are
  separate endpoints; the action path only fires on explicit approval, and every step is
  timestamped in the case timeline."
- **"What about prompt injection?"** → Run the attack sample live. "Treated as evidence, flagged as
  untrusted, verdict unchanged."
- **"Why voice? Isn't it a gimmick?"** → "Incident response happens while your hands are busy — on
  a bridge call, in a terminal, at 3 a.m. Voice in, voice out, keyboard free. And it's also the
  fastest way to express a messy observation you can't yet turn into a query."
- **"How does this scale to real telemetry?"** → "The correlate stage is one function boundary.
  Swap the seeded corpus for Splunk/Sentinel/CrowdStrike queries and nothing downstream changes."
- **"What's the business model?"** → "Per-seat for analysts; the value is measurable — mean time to
  triage from 1h42m to seconds, with an audit trail their auditors already ask for."
- **"What would you build next?"** → Answer instantly and specifically: real connectors,
  confidence-gated autonomy, and a learning loop that records which directives the human overrode.
  Never say "more features."

## 14. FAILURE MODES THAT LOSE HACKATHONS — AVOID ALL SIX

1. **The dead demo.** Mitigation: local fallbacks on every provider, plus a recorded backup run.
2. **The narrated loading bar.** Mitigation: 1,650 ms minimum pipeline animation and a scripted
   architecture line to say over it.
3. **Feature soup.** Mitigation: the P2 list stays unbuilt. Depth on one loop beats breadth.
4. **A demo the judges can't follow.** Mitigation: one incident, one entity, one story —
   INC-4281 / WIN-FIN-07 from start to finish.
5. **No differentiation from the other twelve LLM projects.** Mitigation: lead with the two things
   they will not have — *the kill-switch resilience moment* and *the prompt-injection moment*.
6. **Running over time.** Mitigation: rehearse with a timer to 90 seconds and cut the asset drawer
   from the script if you're slow. Finish early; use the spare seconds for Q&A.

## 15. THE THREE MOMENTS THAT WIN THE ROOM

Everything above exists to produce these. If you have five minutes to prepare, rehearse only these.

1. **The six-second verdict.** Voice in → DEFCON 1 with evidence and a plan on screen. Silence
   while they read it.
2. **The kill switch.** Break Gemini live, re-run, get the same answer from the local engine.
   *"It never fails closed."*
3. **The injection that fails.** A file that tries to hijack the agent, treated as evidence,
   verdict unchanged. *"Untrusted data is data."*

Deliver those three cleanly and the scorecard mostly fills itself in.

<!-- =============================== END PROMPT =============================== -->

---

## Appendix — Paste-ready build instruction for the P0 gap work

> Extend the existing Aegis Twin repository to complete the decision loop. Add `server/caseLog.ts`
> with an append-only in-memory case store and `GET /api/cases` / `GET /api/cases/:id`; append an
> entry `{ caseId, at, stage, actor, engine, defcon, latencyMs, detail }` on every triage, action,
> and verification. Instrument stage latency client-side and inside `triageWithGemini`, return a
> `timings` object on `AgentResult`, and render `Triaged in X.Xs · Deepgram → Gemini → Aegis policy`
> in the analysis-drawer header. After `POST /api/actions` resolves, automatically append a
> verification entry and prepend a matching item to the Agent activity feed. Make the
> `Create incident brief` action generate and download a Markdown report containing the headline,
> DEFCON, severity, confidence, risk score, matched incident, MITRE techniques, ordered directives,
> correlated evidence with any file SHA-256, the full case timeline, and the approving operator with
> timestamps. Add a "Case timeline" section to the drawer between the reasoning list and the spoken
> briefing button, and wire the existing "Open full activity log" button to open it. Keep every
> existing guarantee intact: keys stay server-side, actions require approval, the local engine
> remains the fallback, and `npm test` plus `npm run build` must stay green — add tests covering
> timeline appends, the presence of latency fields, and containment suppression when confidence is
> below 70.
