# Aegis Twin

A voice-activated AI digital twin for rapid cybersecurity triage and threat mitigation. Aegis streams an operator’s microphone to Deepgram, applies a constrained Gemini reasoning policy and MITRE ATT&CK mapping, then produces an authoritative spoken briefing with Murf AI.

![Aegis Twin](https://img.shields.io/badge/status-operational-41d8a0) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6) ![React](https://img.shields.io/badge/React-18-61dafb)

## Three-tier agent pipeline

1. **Deepgram ingestion** — streams microphone audio over a server-side WebSocket proxy to Nova-3. Interim and final transcripts appear live in the command bar. Cybersecurity key terms are boosted.
2. **Gemini cognition** — returns a schema-constrained assessment containing DEFCON severity, confidence, risk score, MITRE techniques, evidence, reasoning, ordered directives, and voice-ready text.
3. **Murf AI vocalization** — generates a concise GEN2 spoken briefing. The browser speech engine is retained as a resilience fallback.

The local Aegis policy engine automatically takes over if Gemini is unavailable, so frontline triage does not fail closed during a provider outage.

## Features

- Live Deepgram voice capture with automatic endpoint detection
- Gemini-powered DEFCON 1–3 incident classification
- MITRE ATT&CK technique and tactic mapping
- Explainable evidence, reasoning, confidence, and risk scoring
- Ordered mitigation directives with human approval boundaries
- Murf AI incident briefings with secure same-origin audio delivery
- Endpoint, identity, email, cloud, and network triage
- Human-approved containment and incident-brief workflows
- Live SOC posture, sensor coverage, incident queue, and activity dashboard
- Responsive desktop, tablet, and mobile interface
- Provider keys remain server-side and are never sent to the browser

## Configure

```bash
npm install
cp .env.example .env
```

Add your provider credentials to `.env`:

```dotenv
DEEPGRAM_API_KEY=your_key
GEMINI_API_KEY=your_key
MURF_API_KEY=your_key
```

Optional model and voice settings are documented in `.env.example`. The `.env` file is ignored by Git.

## Run locally

```bash
npm run dev
```

The web app runs at `http://localhost:5173`. Vite proxies HTTP and WebSocket API traffic to the Express service at `http://localhost:3001`.

Try commands such as:

- `Investigate the PowerShell activity on WIN-FIN-07`
- `Review failed logins for m.chen@northstar.io`
- `Summarize incident INC-4279`
- `We are seeing a spike in outbound database traffic on port 443`

## Test and build

```bash
npm test
npm run build
```

For a production run:

```bash
npm run build
npm start
```

The production Express service serves both the compiled website and API from `PORT`, which defaults to `3001`.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Agent health and provider configuration |
| `GET` | `/api/integrations` | Redacted provider readiness flags |
| `GET` | `/api/incidents` | Prioritized incident queue |
| `WS` | `/api/listen` | Same-origin Deepgram audio proxy |
| `POST` | `/api/agent/triage` | Gemini analysis with local failover |
| `POST` | `/api/voice/synthesize` | Same-origin Murf audio generation |
| `POST` | `/api/actions` | Dispatch an approved response workflow |

### Example triage request

```json
{
  "query": "Investigate incident INC-4281"
}
```

## Architecture

```text
Microphone
    │
    ▼
Deepgram Nova-3 ── live transcript ──► Gemini reasoning policy
    ▲                                         │
    │ server-side WebSocket                   │ structured triage
    │                                         ▼
React operator console ◄── Express API ── Aegis policy validation
    │                                         │
    └──────────── audio ◄── Murf AI ◄─────────┘
```

## Security and resilience

- Provider keys are read only from server environment variables.
- The browser connects to same-origin HTTP and WebSocket endpoints; secrets never enter frontend bundles.
- Gemini output is constrained to a schema and validated before it reaches the interface.
- Agent actions remain separate from analysis and require explicit operator approval.
- Untrusted incident telemetry cannot override the system triage policy.
- Request size and generated speech length are limited.
- Deepgram audio is streamed and not stored by this application.
- The local deterministic engine preserves core triage when an external provider fails.

> Never commit provider keys. If a key is exposed in a message, log, or screenshot, revoke it and issue a replacement before production use.
