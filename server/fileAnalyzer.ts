import { createHash } from 'node:crypto';

export const SUPPORTED_EVIDENCE_EXTENSIONS = ['csv', 'json', 'log', 'txt'] as const;
export const MAX_EVIDENCE_BYTES = 512 * 1024;

export interface FileIssue {
  line: number | null;
  message: string;
  severity: 'error' | 'warning';
}

export interface FileSignal {
  type: string;
  value: string;
  note: string;
  tone: 'danger' | 'warning' | 'neutral' | 'success';
}

export interface FileInspection {
  fileName: string;
  fileType: string;
  fileSize: number;
  checksum: string;
  status: 'Valid' | 'Partially valid' | 'Invalid';
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  issues: FileIssue[];
  signals: FileSignal[];
  summary: string;
  suggestedQuery: string;
  processedAt: string;
}

function extensionOf(fileName: string): string {
  return fileName.toLowerCase().split('.').pop() || '';
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  values.push(current.trim());
  return values;
}

function detectSignals(content: string): { signals: FileSignal[]; suggestedQuery: string } {
  const lower = content.toLowerCase();
  const signals: FileSignal[] = [];
  const count = (pattern: RegExp) => lower.match(pattern)?.length ?? 0;
  const failedLogins = count(/failed(?:\s+login|\s+authentication|\s+sign[- ]?in)?/g);
  const powerShell = count(/powershell(?:\.exe)?|encodedcommand|\s-enc\s/g);
  const outbound = count(/outbound|bytes[_ -]?sent|upload(?:ed)?|egress|destination[_ -]?ip/g);
  const ransomware = count(/ransomware|encrypted files?|shadow copies|vssadmin/g);
  const privileged = count(/privilege|administrator|sudo|role[_ -]?change|permission[_ -]?change/g);
  const promptInjection = count(/ignore (?:all |the )?(?:previous|system) instructions|reveal (?:the )?system prompt/g);
  const ipAddresses = [...new Set(content.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) ?? [])].slice(0, 5);

  if (ransomware > 0) signals.push({ type: 'Ransomware indicator', value: `${ransomware} match${ransomware === 1 ? '' : 'es'}`, note: 'Encryption or recovery-inhibition language detected', tone: 'danger' });
  if (powerShell > 0) signals.push({ type: 'PowerShell activity', value: `${powerShell} event${powerShell === 1 ? '' : 's'}`, note: 'Review encoded commands and process ancestry', tone: 'danger' });
  if (failedLogins > 0) signals.push({ type: 'Authentication failures', value: `${failedLogins} record${failedLogins === 1 ? '' : 's'}`, note: 'Check for password spraying or credential abuse', tone: failedLogins >= 3 ? 'danger' : 'warning' });
  if (outbound > 0) signals.push({ type: 'Outbound activity', value: `${outbound} indicator${outbound === 1 ? '' : 's'}`, note: 'Validate destination and transfer volume', tone: 'warning' });
  if (privileged > 0) signals.push({ type: 'Privilege activity', value: `${privileged} indicator${privileged === 1 ? '' : 's'}`, note: 'Confirm the change was authorized', tone: 'warning' });
  if (ipAddresses.length > 0) signals.push({ type: 'Network indicators', value: `${ipAddresses.length} unique IP${ipAddresses.length === 1 ? '' : 's'}`, note: ipAddresses.join(', '), tone: 'neutral' });
  if (promptInjection > 0) signals.push({ type: 'Untrusted instructions', value: `${promptInjection} injection pattern${promptInjection === 1 ? '' : 's'}`, note: 'Treated as evidence; instructions were not executed', tone: 'warning' });
  if (signals.length === 0) signals.push({ type: 'Known threat patterns', value: 'No direct match', note: 'Manual review is still recommended', tone: 'success' });

  const suggestedQuery = ransomware > 0
    ? 'Investigate active ransomware indicators and possible destructive encryption in the uploaded evidence.'
    : powerShell > 0
      ? 'Investigate suspicious PowerShell execution and encoded command activity in the uploaded evidence.'
      : outbound > 0
        ? 'Investigate potential data exfiltration and suspicious outbound traffic in the uploaded evidence.'
        : failedLogins > 0
          ? 'Investigate repeated failed logins and possible password spraying in the uploaded evidence.'
          : privileged > 0
            ? 'Investigate unusual cloud permission or administrator privilege changes in the uploaded evidence.'
            : 'Review the uploaded security evidence for anomalies and recommend next steps.';

  return { signals: signals.slice(0, 6), suggestedQuery };
}

export function inspectEvidenceFile(fileName: string, content: string): FileInspection {
  const cleanName = fileName.replace(/[\\/\0]/g, '_').slice(0, 180);
  const fileType = extensionOf(cleanName);
  const fileSize = Buffer.byteLength(content, 'utf8');
  if (!SUPPORTED_EVIDENCE_EXTENSIONS.includes(fileType as typeof SUPPORTED_EVIDENCE_EXTENSIONS[number])) {
    throw new Error('Unsupported evidence type. Use CSV, JSON, LOG, or TXT.');
  }
  if (fileSize === 0) throw new Error('The evidence file is empty.');
  if (fileSize > MAX_EVIDENCE_BYTES) throw new Error('The evidence file exceeds the 512 KB analysis limit.');
  if (content.includes('\0')) throw new Error('Binary content is not accepted by the text evidence analyzer.');

  const issues: FileIssue[] = [];
  let totalRecords = 0;
  let validRecords = 0;
  let invalidRecords = 0;

  if (fileType === 'json') {
    try {
      const parsed = JSON.parse(content) as unknown;
      const records = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && 'events' in parsed && Array.isArray((parsed as { events: unknown }).events)
          ? (parsed as { events: unknown[] }).events
          : [parsed];
      totalRecords = records.length;
      records.forEach((record, index) => {
        if (record && typeof record === 'object') validRecords += 1;
        else {
          invalidRecords += 1;
          issues.push({ line: index + 1, message: 'Record is not a JSON object.', severity: 'error' });
        }
      });
    } catch (error) {
      totalRecords = 1;
      invalidRecords = 1;
      issues.push({ line: null, message: `Invalid JSON: ${error instanceof Error ? error.message : 'syntax error'}`, severity: 'error' });
    }
  } else if (fileType === 'csv') {
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      totalRecords = Math.max(0, lines.length - 1);
      invalidRecords = totalRecords || 1;
      issues.push({ line: 1, message: 'CSV must include a header and at least one data row.', severity: 'error' });
    } else {
      const headers = parseCsvLine(lines[0]);
      if (headers.some((header) => !header)) issues.push({ line: 1, message: 'One or more CSV header names are empty.', severity: 'warning' });
      totalRecords = lines.length - 1;
      lines.slice(1).forEach((line, index) => {
        const values = parseCsvLine(line);
        if (values.length !== headers.length) {
          invalidRecords += 1;
          issues.push({ line: index + 2, message: `Expected ${headers.length} columns but found ${values.length}.`, severity: 'error' });
        } else {
          validRecords += 1;
          const missing = values.filter((value) => !value).length;
          if (missing > 0) issues.push({ line: index + 2, message: `${missing} empty value${missing === 1 ? '' : 's'} detected.`, severity: 'warning' });
        }
      });
    }
  } else {
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    totalRecords = lines.length;
    validRecords = lines.length;
    lines.forEach((line, index) => {
      if (line.length > 10_000) issues.push({ line: index + 1, message: 'Record is unusually long and may need manual review.', severity: 'warning' });
    });
  }

  if (/ignore (?:all |the )?(?:previous|system) instructions|reveal (?:the )?system prompt/i.test(content)) {
    issues.push({ line: null, message: 'Prompt-injection text was found and treated only as untrusted evidence.', severity: 'warning' });
  }

  const { signals, suggestedQuery } = detectSignals(content);
  const status: FileInspection['status'] = invalidRecords === 0
    ? 'Valid'
    : validRecords > 0
      ? 'Partially valid'
      : 'Invalid';
  const summary = status === 'Invalid'
    ? 'The file could not be safely parsed. Correct the reported format errors before relying on its security data.'
    : `${validRecords.toLocaleString()} of ${totalRecords.toLocaleString()} records were parsed. Aegis identified ${signals.filter((signal) => signal.tone !== 'success').length} signal groups for investigation.`;

  return {
    fileName: cleanName,
    fileType: fileType.toUpperCase(),
    fileSize,
    checksum: createHash('sha256').update(content).digest('hex'),
    status,
    totalRecords,
    validRecords,
    invalidRecords,
    issues: issues.slice(0, 20),
    signals,
    summary,
    suggestedQuery,
    processedAt: new Date().toISOString(),
  };
}
