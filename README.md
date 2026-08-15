# Aegis Twin

A polished, voice-activated AI digital twin for cybersecurity triage. Aegis turns natural-language questions into explainable incident assessments, correlates evidence, recommends response actions, and keeps a human in the approval loop.

![Aegis Twin](https://img.shields.io/badge/status-operational-41d8a0) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6) ![React](https://img.shields.io/badge/React-18-61dafb)

## What is included

- **Natural-language security agent** with a deterministic, policy-aware triage engine
- **Voice commands** using the browser Speech Recognition API
- **Spoken incident briefings** using browser speech synthesis
- **Cross-domain triage** for endpoint, identity, email, cloud, and network signals
- **Explainable decisions** with correlated evidence, risk scoring, confidence, and reasoning
- **Human-approved response actions** for containment and incident briefing workflows
- **Live SOC dashboard** with posture trends, sensor coverage, metrics, incident queue, and agent activity
- **Responsive interface** for desktop, tablet, and mobile
- **Full-stack API** built with Express and a React/Vite frontend

## Run locally

```bash
npm install
npm run dev
```

The web app runs at `http://localhost:5173`; Vite proxies API requests to the Express service at `http://localhost:3001`.

Try commands such as:

- `Investigate the PowerShell activity on WIN-FIN-07`
- `Review failed logins for m.chen@northstar.io`
- `Summarize incident INC-4279`
- `Give me my morning security posture briefing`

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

The server serves the compiled frontend and API from the port in `PORT` (default `3001`).

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Service and agent health |
| `GET` | `/api/incidents` | Current prioritized incident queue |
| `POST` | `/api/agent/triage` | Analyze a natural-language security command |
| `POST` | `/api/actions` | Dispatch an approved response workflow |

### Example triage request

```json
{
  "query": "Investigate incident INC-4281"
}
```

## Architecture

```text
Browser (React + Voice APIs)
          │
          │ /api
          ▼
Express API ─── Aegis policy-aware triage engine
          │
          └──── Seed security telemetry and response workflows
```

The included engine is intentionally local and deterministic, so the demo works without credentials or external services. Its API boundary can be connected to an LLM, SIEM, EDR, identity provider, or SOAR platform without changing the user experience.

## Security design

- No external model key or user credential is required.
- Agent actions are separate from analysis and require explicit user approval.
- Request bodies are size-limited and validated.
- The server removes the `X-Powered-By` header and uses strict TypeScript.
- Voice processing uses browser capabilities and is not stored by this application.
