export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type IncidentStatus = 'Investigating' | 'Contained' | 'Monitoring' | 'Resolved';

export interface Incident {
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

export interface Evidence {
  label: string;
  value: string;
  note: string;
  tone: 'danger' | 'warning' | 'neutral' | 'success';
}

export interface AgentResult {
  analysisId: string;
  query: string;
  headline: string;
  summary: string;
  category: string;
  severity: Severity;
  confidence: number;
  riskScore: number;
  incident?: Incident;
  evidence: Evidence[];
  reasoning: string[];
  actions: Array<{ id: string; label: string; kind: 'primary' | 'secondary' }>;
  completedAt: string;
}

export const incidents: Incident[] = [
  {
    id: 'INC-4281',
    title: 'Suspicious PowerShell execution',
    severity: 'Critical',
    status: 'Investigating',
    source: 'EDR',
    entity: 'WIN-FIN-07',
    detectedAt: '09:42:18',
    ago: '2m ago',
    assignee: 'Aegis Twin',
    score: 96,
  },
  {
    id: 'INC-4280',
    title: 'Identity anomaly detected',
    severity: 'High',
    status: 'Investigating',
    source: 'Identity',
    entity: 'm.chen@northstar.io',
    detectedAt: '09:35:02',
    ago: '9m ago',
    assignee: 'Maya Chen',
    score: 87,
  },
  {
    id: 'INC-4279',
    title: 'Potential data exfiltration',
    severity: 'High',
    status: 'Contained',
    source: 'Network',
    entity: 'ENG-LT-142',
    detectedAt: '09:17:46',
    ago: '27m ago',
    assignee: 'Aegis Twin',
    score: 82,
  },
  {
    id: 'INC-4278',
    title: 'Malicious attachment blocked',
    severity: 'Medium',
    status: 'Monitoring',
    source: 'Email',
    entity: 'r.patel@northstar.io',
    detectedAt: '08:58:11',
    ago: '46m ago',
    assignee: 'Sam Okafor',
    score: 61,
  },
  {
    id: 'INC-4277',
    title: 'Unusual cloud permission change',
    severity: 'Low',
    status: 'Resolved',
    source: 'Cloud',
    entity: 'prod-data-reader',
    detectedAt: '08:21:33',
    ago: '1h ago',
    assignee: 'Aegis Twin',
    score: 32,
  },
];

interface Scenario {
  keywords: string[];
  headline: string;
  summary: string;
  category: string;
  severity: Severity;
  confidence: number;
  riskScore: number;
  evidence: Evidence[];
  reasoning: string[];
}

const scenarios: Scenario[] = [
  {
    keywords: ['powershell', 'script', 'malware', 'endpoint', '4281'],
    headline: 'Likely malicious PowerShell chain isolated',
    summary:
      'A hidden PowerShell process launched from a document reader and attempted to contact a newly registered domain. The execution pattern matches encoded downloader behavior; no lateral movement is visible yet.',
    category: 'Endpoint compromise',
    severity: 'Critical',
    confidence: 96,
    riskScore: 94,
    evidence: [
      { label: 'Process', value: 'powershell.exe -enc …', note: 'Obfuscated command line', tone: 'danger' },
      { label: 'Parent process', value: 'ACRORD32.EXE', note: 'Unusual process ancestry', tone: 'warning' },
      { label: 'Network', value: '185.220.101.34:443', note: 'Threat intel match · 89%', tone: 'danger' },
    ],
    reasoning: [
      'Correlated endpoint process ancestry with DNS and network telemetry.',
      'Matched encoded command behavior to MITRE ATT&CK T1059.001.',
      'Checked adjacent hosts and identities; no propagation was detected.',
    ],
  },
  {
    keywords: ['login', 'identity', 'failed', 'brute', 'account', 'impossible travel', '4280'],
    headline: 'Identity attack pattern requires verification',
    summary:
      'The account experienced repeated failures from distributed addresses followed by a successful sign-in from a new device. Conditional access challenged the session, limiting immediate exposure.',
    category: 'Identity compromise',
    severity: 'High',
    confidence: 92,
    riskScore: 86,
    evidence: [
      { label: 'Authentication', value: '47 failures / 8 min', note: 'Distributed password spray', tone: 'danger' },
      { label: 'Successful login', value: 'Warsaw, PL', note: 'New device and location', tone: 'warning' },
      { label: 'Access policy', value: 'MFA challenge issued', note: 'Session currently restricted', tone: 'success' },
    ],
    reasoning: [
      'Grouped sign-in failures across source addresses by target identity.',
      'Compared device fingerprint and location against the 30-day baseline.',
      'Validated that the anomalous session did not access sensitive applications.',
    ],
  },
  {
    keywords: ['exfiltration', 'upload', 'data', 'traffic', 'network', '4279'],
    headline: 'Outbound transfer contained at the network edge',
    summary:
      'A workstation uploaded an atypical volume of source archives to an unsanctioned file host. The destination and device have been blocked while Aegis preserves the relevant network evidence.',
    category: 'Data exfiltration',
    severity: 'High',
    confidence: 89,
    riskScore: 82,
    evidence: [
      { label: 'Transfer', value: '2.8 GB outbound', note: '14× host baseline', tone: 'danger' },
      { label: 'Destination', value: 'fileshare-cloud.net', note: 'Newly observed domain', tone: 'warning' },
      { label: 'Control', value: 'Egress rule active', note: 'Further transfers blocked', tone: 'success' },
    ],
    reasoning: [
      'Compared current egress volume against the entity’s 30-day peer baseline.',
      'Inspected domain age, reputation, and first-seen telemetry.',
      'Confirmed the edge block and preserved flow records for investigation.',
    ],
  },
  {
    keywords: ['phish', 'email', 'attachment', 'invoice', '4278'],
    headline: 'Phishing attempt blocked before execution',
    summary:
      'The attachment was quarantined by the email gateway before delivery. Two similar messages were found across the tenant and removed; no recipient interaction or endpoint execution is visible.',
    category: 'Phishing',
    severity: 'Medium',
    confidence: 94,
    riskScore: 57,
    evidence: [
      { label: 'Attachment', value: 'Invoice_August.iso', note: 'Known lure pattern', tone: 'warning' },
      { label: 'Campaign', value: '3 recipients', note: 'All copies removed', tone: 'neutral' },
      { label: 'Interaction', value: 'No clicks detected', note: 'Delivery prevented', tone: 'success' },
    ],
    reasoning: [
      'Matched sender infrastructure and attachment hash to campaign telemetry.',
      'Searched mailboxes for related sender, subject, and attachment indicators.',
      'Checked endpoint logs for file creation or child-process activity.',
    ],
  },
];

const defaultScenario: Scenario = {
  keywords: [],
  headline: 'Security posture is stable',
  summary:
    'I reviewed the active queue and correlated the latest endpoint, identity, cloud, and network signals. One critical incident is being investigated; existing controls are containing the immediate risk.',
  category: 'Posture review',
  severity: 'Medium',
  confidence: 91,
  riskScore: 38,
  evidence: [
    { label: 'Active incidents', value: '5 open', note: '1 critical priority', tone: 'warning' },
    { label: 'Protected assets', value: '1,284 / 1,291', note: '99.5% reporting', tone: 'success' },
    { label: 'Control health', value: '98.7%', note: 'Within target range', tone: 'success' },
  ],
  reasoning: [
    'Prioritized active detections by potential business impact.',
    'Verified critical controls and sensor coverage across protected assets.',
    'Compared current alert volume with the organization’s seven-day baseline.',
  ],
};

function findIncident(query: string): Incident | undefined {
  const directId = query.match(/(?:inc(?:ident)?[\s-]*)?(42\d{2})/i)?.[1];
  if (directId) return incidents.find((incident) => incident.id.endsWith(directId));
  const normalized = query.toLowerCase();
  return incidents.find(
    (incident) =>
      normalized.includes(incident.entity.toLowerCase()) ||
      incident.title.toLowerCase().split(' ').filter((word) => word.length > 6).some((word) => normalized.includes(word)),
  );
}

function pickScenario(query: string): Scenario {
  const normalized = query.toLowerCase();
  const ranked = scenarios
    .map((scenario) => ({
      scenario,
      score: scenario.keywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.score > 0 ? ranked[0].scenario : defaultScenario;
}

export function triage(query: string): AgentResult {
  const safeQuery = query.trim().slice(0, 1200);
  const scenario = pickScenario(safeQuery);
  const incident = findIncident(safeQuery);
  const sequence = Math.floor(Date.now() / 1000).toString(36).toUpperCase();

  return {
    analysisId: `AX-${sequence}`,
    query: safeQuery,
    headline: scenario.headline,
    summary: scenario.summary,
    category: scenario.category,
    severity: incident?.severity ?? scenario.severity,
    confidence: scenario.confidence,
    riskScore: incident?.score ?? scenario.riskScore,
    incident,
    evidence: scenario.evidence,
    reasoning: scenario.reasoning,
    actions: [
      {
        id: incident?.status === 'Contained' ? 'verify' : 'contain',
        label: incident?.status === 'Contained' ? 'Verify containment' : 'Contain affected entity',
        kind: 'primary',
      },
      { id: 'brief', label: 'Create incident brief', kind: 'secondary' },
    ],
    completedAt: new Date().toISOString(),
  };
}
