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
  description?: string;
  indicators?: string[];
}

export interface MitreTechnique {
  id: string;
  name: string;
  tactic: string;
  description?: string;
}

export interface Directive {
  priority: number;
  action: string;
  detail: string;
  completed?: boolean;
}

export interface EvidenceItem {
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
  defcon: 1 | 2 | 3;
  confidence: number;
  riskScore: number;
  source: 'Gemini' | 'Aegis Local';
  voiceText: string;
  incident?: Incident;
  evidence: EvidenceItem[];
  reasoning: string[];
  mitreTechniques: MitreTechnique[];
  directives: Directive[];
  actions: Array<{ id: string; label: string; kind: 'primary' | 'secondary' }>;
  completedAt: string;
}

export interface IntegrationStatus {
  deepgram: boolean;
  gemini: boolean;
  murf: boolean;
  mode: 'live' | 'local';
}

export interface AssetRecord {
  id: string;
  name: string;
  type: 'Endpoint' | 'Server' | 'Database' | 'Cloud';
  platform: string;
  owner: string;
  ip: string;
  status: 'Online' | 'Offline';
  risk: 'Critical' | 'High' | 'Medium' | 'Low';
  lastSeen: string;
  edrStatus: 'Active' | 'Warning' | 'Offline';
  openPorts?: number[];
  cveCount?: number;
}

export interface EvidenceFileReport {
  fileName: string;
  fileType: string;
  fileSize: number;
  checksum: string;
  status: 'Valid' | 'Partially valid' | 'Invalid';
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  issues: Array<{ line: number | null; message: string; severity: 'error' | 'warning' }>;
  signals: Array<{ type: string; value: string; note: string; tone: 'danger' | 'warning' | 'neutral' | 'success' }>;
  summary: string;
  suggestedQuery: string;
  assessment: AgentResult | null;
  processedAt: string;
  rawPreview?: string;
}

export type LogLevel = 'INFO' | 'WARN' | 'CRITICAL' | 'SUCCESS' | 'AGENT' | 'NETWORK' | 'EDR' | 'AUTH';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  payload?: Record<string, unknown>;
}

export interface Runbook {
  id: string;
  name: string;
  category: 'Endpoint' | 'Identity' | 'Network' | 'Cloud' | 'Ransomware' | 'Forensics';
  description: string;
  estimatedTime: string;
  automated: boolean;
  steps: string[];
  lastExecuted?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  level: 'critical' | 'warning' | 'info' | 'success';
  query?: string;
}

export interface WorkspaceConfig {
  id: string;
  name: string;
  subtitle: string;
  logo: string;
  assetCount: number;
  incidentCount: number;
  healthScore: number;
}
