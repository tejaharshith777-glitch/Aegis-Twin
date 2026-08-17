import crypto from 'crypto';
import { CaseState, store } from './store.js';

export function generateMarkdownReport(caseData: CaseState): string {
  const inc = caseData.incidentId ? store.projection.incidents.get(caseData.incidentId) : undefined;
  const res = caseData.result || {};

  const lines: string[] = [];

  lines.push(`# AEGIS TWIN INCIDENT BRIEF & AUDIT REPORT`);
  lines.push(`**Case ID:** ${caseData.caseId}`);
  lines.push(`**Opened At:** ${caseData.openedAt}`);
  lines.push(`**Closed At:** ${caseData.closedAt || 'In Progress'}`);
  lines.push(`**Operator:** ${caseData.operator}`);
  lines.push(`**Transcript Source:** ${caseData.transcriptSource}`);
  lines.push(``);

  lines.push(`## 1. Executive Summary`);
  lines.push(`**Headline:** ${res.headline || 'Security Triage Assessment'}`);
  lines.push(`**Category:** ${res.category || 'General Security Query'}`);
  lines.push(`**DEFCON Level:** DEFCON ${res.defcon || 3}`);
  lines.push(`**Severity:** ${res.severity || 'Medium'}`);
  lines.push(`**Confidence:** ${res.confidence || 90}%`);
  lines.push(`**Calculated Risk Score:** ${res.riskScore || 40} / 100`);
  lines.push(`**Reasoning Engine:** ${res.source || 'Aegis Policy Engine'} ${res.providerDegraded ? '(Degraded Fallback Active)' : ''}`);
  lines.push(``);
  lines.push(`> ${res.summary || 'Triage complete.'}`);
  lines.push(``);

  if (inc) {
    lines.push(`## 2. Matched Target Entity & Incident`);
    lines.push(`- **Incident ID:** ${inc.id}`);
    lines.push(`- **Title:** ${inc.title}`);
    lines.push(`- **Target Entity:** ${inc.entity}`);
    lines.push(`- **Source:** ${inc.source}`);
    lines.push(`- **Status:** ${inc.status}`);
    lines.push(`- **Origin:** ${inc.origin}`);
    lines.push(``);
  }

  lines.push(`## 3. Ordered Mitigation Directives`);
  if (Array.isArray(res.directives) && res.directives.length > 0) {
    res.directives.forEach((dir: any) => {
      lines.push(`${dir.priority}. **${dir.action}**: ${dir.detail}`);
    });
  } else {
    lines.push(`- No immediate directives issued.`);
  }
  lines.push(``);

  lines.push(`## 4. Observed Behavior (MITRE ATT&CK)`);
  if (Array.isArray(res.mitreTechniques) && res.mitreTechniques.length > 0) {
    res.mitreTechniques.forEach((m: any) => {
      lines.push(`- **${m.id} ${m.name}** (Tactic: ${m.tactic})`);
    });
  } else {
    lines.push(`- Standard baseline activity.`);
  }
  lines.push(``);

  lines.push(`## 5. Correlated Evidence Signals`);
  if (Array.isArray(res.evidence) && res.evidence.length > 0) {
    res.evidence.forEach((ev: any) => {
      lines.push(`- **${ev.label}:** \`${ev.value}\` — *${ev.note}*`);
    });
  } else {
    lines.push(`- Baseline telemetry entries.`);
  }
  lines.push(``);

  lines.push(`## 6. Audit Trail & Action Timeline`);
  if (Array.isArray(caseData.timeline) && caseData.timeline.length > 0) {
    lines.push(`| Timestamp | Stage | Actor | Engine / Detail | Enforcement ID |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- |`);
    caseData.timeline.forEach((t) => {
      lines.push(`| ${t.at} | \`${t.stage}\` | ${t.actor} | ${t.detail} ${t.latencyMs ? `(${t.latencyMs}ms)` : ''} | \`${t.enforcementId || 'N/A'}\` |`);
    });
  } else {
    lines.push(`- No timeline entries recorded.`);
  }
  lines.push(``);

  const rawBody = lines.join('\n');
  const bodySha = crypto.createHash('sha256').update(rawBody).digest('hex');

  lines.push(`---`);
  lines.push(`**Aegis Twin Policy Engine v1.0.0**`);
  lines.push(`**Report SHA-256 Signature:** \`${bodySha}\``);

  return lines.join('\n');
}
