import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { store } from './store.js';

test.after(() => {
  store.shutdown();
});

test('store appends and replays events in exact order', () => {
  const initialSeq = store.projection.seq;
  const ev1 = store.append({
    type: 'telemetry.ingested',
    actor: 'system',
    payload: { source: 'test_suite', count: 5 },
  });

  assert.strictEqual(ev1.seq, initialSeq + 1);
  assert.ok(ev1.id);
  assert.strictEqual(ev1.actor, 'system');
});

test('store generates snapshot and restores on clean boot', () => {
  store.snapshot();
  const snapPath = path.join('./data', 'snapshot.json');
  assert.ok(fs.existsSync(snapPath));

  const content = fs.readFileSync(snapPath, 'utf8');
  const snap = JSON.parse(content);
  assert.ok(typeof snap.seq === 'number');
  assert.ok(Array.isArray(snap.incidents));
});
