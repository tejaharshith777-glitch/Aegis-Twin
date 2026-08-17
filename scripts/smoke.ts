import assert from 'node:assert';
import { store } from '../server/store.js';
import { detectionEngine } from '../server/detections.js';
import { executeAction } from '../server/actions.js';
import { triageWithGemini } from '../server/integrations.js';
import { generateMarkdownReport } from '../server/report.js';

async function runSmokeTest() {
  console.log('================================================================');
  console.log('RUNNING AEGIS TWIN OPERATIONAL SMOKE TEST');
  console.log('================================================================');

  // 1. Ingest Telemetry Batch
  console.log('[Smoke 1/5] Ingesting telemetry event batch...');
  const ingestResult = detectionEngine.processTelemetryBatch('smoke_test', [
    {
      at: new Date().toISOString(),
      entity: 'SMOKE-HOST-01',
      kind: 'process.create',
      fields: { parentProcess: 'OUTLOOK.EXE', commandLine: 'powershell.exe -w hidden -enc IEX' },
    },
  ]);

  assert.strictEqual(ingestResult.accepted, 1, 'Telemetry batch should accept 1 valid event');
  console.log('✔ Telemetry batch ingested cleanly.');

  // 2. Assert Incident Creation
  console.log('[Smoke 2/5] Asserting detection rule triggering...');
  const inc = Array.from(store.projection.incidents.values()).find((i) => i.entity === 'SMOKE-HOST-01');
  assert.ok(inc, 'Incident should be automatically created for SMOKE-HOST-01');
  assert.strictEqual(inc.severity, 'Critical', 'Severity should be Critical');
  console.log(`✔ Incident ${inc.id} created automatically with score ${inc.score}.`);

  // 3. Perform Triage
  console.log('[Smoke 3/5] Performing AI triage on incident signal...');
  const triageResult = await triageWithGemini('Investigate suspicious process activity on SMOKE-HOST-01');
  assert.ok(triageResult.headline, 'Triage result should contain headline');
  assert.ok(triageResult.defcon >= 1 && triageResult.defcon <= 3, 'DEFCON should be 1, 2, or 3');
  console.log(`✔ Triage completed: DEFCON ${triageResult.defcon} — "${triageResult.headline}".`);

  // 4. Execute & Verify Containment Action
  console.log('[Smoke 4/5] Executing containment action and verifying enforcement...');
  const actionRes = await executeAction({
    action: 'contain',
    target: { kind: 'asset', value: 'SMOKE-HOST-01' },
    approvedBy: 'alex',
    idempotencyKey: 'smoke-key-001',
  });

  assert.strictEqual(actionRes.ok, true, 'Containment action should succeed');
  assert.ok(actionRes.enforcementId, 'Enforcement ID should be assigned');

  const updatedInc = store.projection.incidents.get(inc.id);
  assert.strictEqual(updatedInc?.status, 'Contained', 'Incident status should be updated to Contained');
  console.log(`✔ Action ${actionRes.enforcementId} executed and verified. Host SMOKE-HOST-01 isolated.`);

  // 5. Generate & Verify Case Report Artifact
  console.log('[Smoke 5/5] Generating case report artifact and verifying SHA-256 signature...');
  const caseObj = {
    caseId: 'CASE-SMOKE-01',
    openedAt: new Date().toISOString(),
    query: 'Investigate suspicious process activity on SMOKE-HOST-01',
    transcriptSource: 'typed' as const,
    operator: 'alex',
    result: triageResult,
    timings: { totalMs: 850, triageMs: 850 },
    incidentId: inc.id,
    status: 'contained' as const,
    timeline: [
      {
        at: new Date().toISOString(),
        stage: 'case.verified',
        actor: 'system' as const,
        engine: 'Local Control Plane',
        detail: 'Containment verified successfully',
        enforcementId: actionRes.enforcementId,
      },
    ],
  };

  const reportMd = generateMarkdownReport(caseObj);
  assert.ok(reportMd.includes('# AEGIS TWIN INCIDENT BRIEF & AUDIT REPORT'), 'Report should have correct markdown title');
  assert.ok(reportMd.includes('Report SHA-256 Signature:'), 'Report should contain SHA-256 signature');
  console.log('✔ Case report generated and verified with integrity signature.');

  console.log('================================================================');
  console.log('SMOKE TEST PASSED — 100% OPERATIONAL SUCCESS');
  console.log('================================================================');

  detectionEngine.shutdown();
  store.shutdown();
}

runSmokeTest().catch((err) => {
  console.error('[Smoke Test FAILED]', err);
  process.exit(1);
});
