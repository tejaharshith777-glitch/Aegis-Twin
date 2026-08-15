import assert from 'node:assert/strict';
import test from 'node:test';
import { triage } from './engine.js';

test('triages a PowerShell signal as critical', () => {
  const result = triage('Investigate the PowerShell activity on WIN-FIN-07');
  assert.equal(result.severity, 'Critical');
  assert.equal(result.category, 'Endpoint compromise');
  assert.equal(result.incident?.id, 'INC-4281');
  assert.ok(result.confidence >= 90);
});

test('recognizes an incident ID', () => {
  const result = triage('Summarize incident 4279');
  assert.equal(result.incident?.id, 'INC-4279');
  assert.equal(result.category, 'Data exfiltration');
});

test('returns a useful posture review for an open question', () => {
  const result = triage('How are we looking this morning?');
  assert.equal(result.category, 'Posture review');
  assert.equal(result.evidence.length, 3);
  assert.equal(result.actions.length, 2);
});
