import test from 'node:test';
import assert from 'node:assert';
import { executeAction, getControlPlane } from './actions.js';
import { store } from './store.js';

test.after(() => {
  store.shutdown();
});

test('executeAction isolates host, verifies, and updates status', async () => {
  store.append({
    type: 'asset.registered',
    actor: 'system',
    payload: {
      asset: {
        id: 'AST-1042',
        name: 'WIN-FIN-07',
        type: 'Endpoint',
        platform: 'Windows 11',
        owner: 'Finance Operations',
        criticality: 'Critical',
        status: 'online',
        lastSeen: new Date().toISOString(),
        riskScore: 96,
        discovered: false,
      },
    },
  });

  const result = await executeAction({
    action: 'contain',
    target: { kind: 'asset', value: 'WIN-FIN-07' },
    approvedBy: 'alex',
    idempotencyKey: 'key-test-001',
  });

  assert.strictEqual(result.ok, true);
  assert.ok(result.enforcementId);

  const cp = getControlPlane();
  const state = await cp.getEnforcementState({ kind: 'asset', value: 'WIN-FIN-07' });
  assert.strictEqual(state.enforced, true);
  assert.strictEqual(state.status, 'isolated');
});

test('idempotencyKey returns identical cached result', async () => {
  const res1 = await executeAction({
    action: 'contain',
    target: { kind: 'asset', value: 'WIN-FIN-07' },
    approvedBy: 'alex',
    idempotencyKey: 'key-test-001',
  });

  const res2 = await executeAction({
    action: 'contain',
    target: { kind: 'asset', value: 'WIN-FIN-07' },
    approvedBy: 'alex',
    idempotencyKey: 'key-test-001',
  });

  assert.deepStrictEqual(res1, res2);
});

test('rollback releaseHost restores online status', async () => {
  const releaseRes = await executeAction({
    action: 'release',
    target: { kind: 'asset', value: 'WIN-FIN-07' },
    approvedBy: 'alex',
    idempotencyKey: 'key-test-002',
  });

  assert.strictEqual(releaseRes.ok, true);
  const cp = getControlPlane();
  const state = await cp.getEnforcementState({ kind: 'asset', value: 'WIN-FIN-07' });
  assert.strictEqual(state.enforced, false);
});
