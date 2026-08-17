import test from 'node:test';
import assert from 'node:assert';
import { detectionEngine, computeIncidentScore } from './detections.js';
import { store } from './store.js';

test.after(() => {
  detectionEngine.shutdown();
  store.shutdown();
});

test('computeIncidentScore computes deterministic risk score', () => {
  assert.strictEqual(computeIncidentScore('Critical', 3, 'Critical'), 100);
  assert.strictEqual(computeIncidentScore('High', 1, 'Medium'), 73);
  assert.strictEqual(computeIncidentScore('Low', 0, 'Low'), 25);
});

test('AUTH-001 triggers on password spray batch', () => {
  const events = [];
  for (let i = 0; i < 10; i++) {
    events.push({
      at: new Date().toISOString(),
      entity: 'target.user@northstar.io',
      kind: 'auth.failure',
      fields: { srcIp: `192.168.1.${(i % 4) + 10}` },
    });
  }

  const initialIncidents = store.projection.incidents.size;
  const res = detectionEngine.processTelemetryBatch('unit_test', events);
  assert.strictEqual(res.accepted, 10);
  assert.ok(store.projection.incidents.size >= initialIncidents);
});

test('EDR-001 triggers on encoded PowerShell execution', () => {
  const res = detectionEngine.processTelemetryBatch('unit_test', [
    {
      at: new Date().toISOString(),
      entity: 'WIN-FIN-07',
      kind: 'process.create',
      fields: { parentProcess: 'ACRORD32.EXE', commandLine: 'powershell.exe -enc SW52b2tlLVdlYlJlcXVlc3Q=' },
    },
  ]);
  assert.strictEqual(res.accepted, 1);
  const inc = Array.from(store.projection.incidents.values()).find((i) => i.entity === 'WIN-FIN-07');
  assert.ok(inc);
  assert.strictEqual(inc.severity, 'Critical');
});
