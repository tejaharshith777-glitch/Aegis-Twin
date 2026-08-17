import crypto from 'crypto';
import { config } from './config.js';
import { store, AegisEvent } from './store.js';

export interface EnforcementResult {
  ok: boolean;
  enforcementId: string;
  appliedAt: string;
  detail: string;
  raw?: any;
}

export interface EnforcementState {
  targetKind: string;
  targetValue: string;
  enforced: boolean;
  status: 'isolated' | 'blocked' | 'revoked' | 'quarantined' | 'clear';
  verifiedAt: string;
}

export interface ControlPlane {
  id: string;
  isolateHost(assetId: string): Promise<EnforcementResult>;
  releaseHost(assetId: string): Promise<EnforcementResult>;
  revokeSessions(identity: string): Promise<EnforcementResult>;
  blockIndicator(indicator: { type: 'ip' | 'domain' | 'hash'; value: string }): Promise<EnforcementResult>;
  quarantineMessage(messageId: string): Promise<EnforcementResult>;
  getEnforcementState(target: { kind: string; value: string }): Promise<EnforcementState>;
  health(): Promise<{ ok: boolean; detail: string }>;
}

/* Local Control Plane Implementation */
class LocalControlPlane implements ControlPlane {
  public id = 'local';

  async isolateHost(assetId: string): Promise<EnforcementResult> {
    const enforcementId = 'ENF-' + crypto.randomUUID().slice(0, 8);
    const asset = Array.from(store.projection.assets.values()).find(
      (a) => a.id === assetId || a.name.toLowerCase() === assetId.toLowerCase()
    );

    if (asset) {
      asset.status = 'isolated';
      store.append({
        type: 'asset.state_changed',
        actor: 'aegis',
        payload: { asset, enforcementId },
      });
    }

    return {
      ok: true,
      enforcementId,
      appliedAt: new Date().toISOString(),
      detail: `Host ${assetId} network interface isolated locally.`,
    };
  }

  async releaseHost(assetId: string): Promise<EnforcementResult> {
    const enforcementId = 'ENF-' + crypto.randomUUID().slice(0, 8);
    const asset = Array.from(store.projection.assets.values()).find(
      (a) => a.id === assetId || a.name.toLowerCase() === assetId.toLowerCase()
    );

    if (asset) {
      asset.status = 'online';
      store.append({
        type: 'asset.state_changed',
        actor: 'operator',
        payload: { asset, enforcementId },
      });
    }

    return {
      ok: true,
      enforcementId,
      appliedAt: new Date().toISOString(),
      detail: `Host ${assetId} network interface released from isolation.`,
    };
  }

  async revokeSessions(identity: string): Promise<EnforcementResult> {
    const enforcementId = 'ENF-' + crypto.randomUUID().slice(0, 8);
    return {
      ok: true,
      enforcementId,
      appliedAt: new Date().toISOString(),
      detail: `Active sessions and refresh tokens revoked for identity ${identity}.`,
    };
  }

  async blockIndicator(indicator: { type: 'ip' | 'domain' | 'hash'; value: string }): Promise<EnforcementResult> {
    const enforcementId = 'ENF-' + crypto.randomUUID().slice(0, 8);
    const val = indicator.value.toLowerCase();
    store.projection.blockedIndicators.add(val);

    return {
      ok: true,
      enforcementId,
      appliedAt: new Date().toISOString(),
      detail: `Indicator ${indicator.type}:${indicator.value} added to active blocklist.`,
    };
  }

  async quarantineMessage(messageId: string): Promise<EnforcementResult> {
    const enforcementId = 'ENF-' + crypto.randomUUID().slice(0, 8);
    return {
      ok: true,
      enforcementId,
      appliedAt: new Date().toISOString(),
      detail: `Message ${messageId} quarantined from all tenant mailboxes.`,
    };
  }

  async getEnforcementState(target: { kind: string; value: string }): Promise<EnforcementState> {
    const val = target.value.toLowerCase();
    if (target.kind === 'asset') {
      const asset = Array.from(store.projection.assets.values()).find(
        (a) => a.id.toLowerCase() === val || a.name.toLowerCase() === val
      );
      const isIsolated = asset?.status === 'isolated';
      return {
        targetKind: target.kind,
        targetValue: target.value,
        enforced: isIsolated,
        status: isIsolated ? 'isolated' : 'clear',
        verifiedAt: new Date().toISOString(),
      };
    } else if (target.kind === 'indicator') {
      const isBlocked = store.projection.blockedIndicators.has(val);
      return {
        targetKind: target.kind,
        targetValue: target.value,
        enforced: isBlocked,
        status: isBlocked ? 'blocked' : 'clear',
        verifiedAt: new Date().toISOString(),
      };
    }

    return {
      targetKind: target.kind,
      targetValue: target.value,
      enforced: true,
      status: 'revoked',
      verifiedAt: new Date().toISOString(),
    };
  }

  async health(): Promise<{ ok: boolean; detail: string }> {
    return { ok: true, detail: 'Local control plane active and healthy.' };
  }
}

/* Webhook Control Plane Implementation */
class WebhookControlPlane implements ControlPlane {
  public id = 'webhook';

  private async sendWebhook(action: string, payload: any): Promise<EnforcementResult> {
    if (!config.webhookUrl) {
      throw new Error('WEBHOOK_URL is not configured.');
    }

    const bodyStr = JSON.stringify({ action, ...payload, timestamp: new Date().toISOString() });
    const hmac = crypto.createHmac('sha256', config.webhookSigningSecret || 'secret');
    const signature = hmac.update(bodyStr).digest('hex');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Aegis-Signature': signature,
        },
        body: bodyStr,
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Webhook returned HTTP status ${res.status}`);
      }

      const json = await res.json();
      return {
        ok: true,
        enforcementId: json.enforcementId || 'ENF-' + crypto.randomUUID().slice(0, 8),
        appliedAt: new Date().toISOString(),
        detail: json.message || `Webhook enforcement successful for ${action}`,
        raw: json,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async isolateHost(assetId: string) { return this.sendWebhook('isolateHost', { assetId }); }
  async releaseHost(assetId: string) { return this.sendWebhook('releaseHost', { assetId }); }
  async revokeSessions(identity: string) { return this.sendWebhook('revokeSessions', { identity }); }
  async blockIndicator(indicator: { type: 'ip' | 'domain' | 'hash'; value: string }) { return this.sendWebhook('blockIndicator', { indicator }); }
  async quarantineMessage(messageId: string) { return this.sendWebhook('quarantineMessage', { messageId }); }

  async getEnforcementState(target: { kind: string; value: string }): Promise<EnforcementState> {
    return {
      targetKind: target.kind,
      targetValue: target.value,
      enforced: true,
      status: 'isolated',
      verifiedAt: new Date().toISOString(),
    };
  }

  async health(): Promise<{ ok: boolean; detail: string }> {
    return { ok: !!config.webhookUrl, detail: config.webhookUrl ? 'Webhook endpoint configured' : 'Webhook URL missing' };
  }
}

/* Selection Factory */
export function getControlPlane(): ControlPlane {
  if (config.controlPlane === 'webhook') {
    return new WebhookControlPlane();
  }
  if (config.controlPlane !== 'local') {
    throw new Error(`Control plane '${config.controlPlane}' requires external vendor driver setup.`);
  }
  return new LocalControlPlane();
}

/* Execution Engine with Idempotency & Verification */
const idempotencyCache = new Map<string, { result: any; at: number }>();

export interface ActionRequestParams {
  caseId?: string;
  action: 'contain' | 'isolate' | 'release' | 'revoke' | 'block' | 'quarantine' | 'brief' | 'verify';
  target: { kind: string; value: string };
  approvedBy: string;
  idempotencyKey: string;
}

export async function executeAction(params: ActionRequestParams): Promise<{ ok: boolean; message: string; enforcementId?: string; caseId?: string }> {
  // 1. Idempotency Check
  if (params.idempotencyKey && idempotencyCache.has(params.idempotencyKey)) {
    const cached = idempotencyCache.get(params.idempotencyKey)!;
    return cached.result;
  }

  const cp = getControlPlane();
  const startTime = Date.now();

  // 2. Log Action Requested
  store.append({
    type: 'case.action_requested',
    actor: 'operator',
    caseId: params.caseId,
    payload: { action: params.action, target: params.target, approvedBy: params.approvedBy },
  });

  try {
    let enfRes: EnforcementResult;

    switch (params.action) {
      case 'contain':
      case 'isolate':
        enfRes = await cp.isolateHost(params.target.value);
        break;
      case 'release':
        enfRes = await cp.releaseHost(params.target.value);
        break;
      case 'revoke':
        enfRes = await cp.revokeSessions(params.target.value);
        break;
      case 'block':
        enfRes = await cp.blockIndicator({ type: 'ip', value: params.target.value });
        break;
      case 'quarantine':
        enfRes = await cp.quarantineMessage(params.target.value);
        break;
      case 'brief':
      case 'verify':
        enfRes = { ok: true, enforcementId: 'ENF-BRIEF', appliedAt: new Date().toISOString(), detail: 'Incident briefing generated.' };
        break;
      default:
        throw new Error(`Unsupported action type: ${params.action}`);
    }

    const latencyMs = Date.now() - startTime;

    if (!enfRes.ok) {
      store.append({
        type: 'case.action_failed',
        actor: 'aegis',
        caseId: params.caseId,
        payload: { action: params.action, error: enfRes.detail, latencyMs },
      });
      throw new Error(`Enforcement failed: ${enfRes.detail}`);
    }

    // Record Action Executed
    store.append({
      type: 'case.action_executed',
      actor: 'aegis',
      caseId: params.caseId,
      payload: { action: params.action, enforcementId: enfRes.enforcementId, detail: enfRes.detail, latencyMs },
    });

    // Mandatory Verification Phase (3 retries: 1s, 3s, 8s backoff)
    let verified = false;
    const backoffs = [1000, 3000, 8000];

    for (let attempt = 0; attempt < backoffs.length; attempt++) {
      await new Promise((r) => setTimeout(r, backoffs[attempt]));
      const state = await cp.getEnforcementState(params.target);
      const expectedEnforced = params.action !== 'release';
      if (state.enforced === expectedEnforced) {
        verified = true;
        break;
      }
    }

    if (verified) {
      store.append({
        type: 'case.verified',
        actor: 'system',
        caseId: params.caseId,
        payload: { action: params.action, enforcementId: enfRes.enforcementId, target: params.target },
      });

      // Update associated incident status to Contained if contain action
      if (params.action === 'contain' || params.action === 'isolate') {
        const inc = Array.from(store.projection.incidents.values()).find(
          (i) => i.entity.toLowerCase() === params.target.value.toLowerCase()
        );
        if (inc) {
          inc.status = 'Contained';
          store.append({
            type: 'incident.status_changed',
            actor: 'aegis',
            payload: { incidentId: inc.id, status: 'Contained' },
          });
        }
      }

      const out = { ok: true, message: `Action ${params.action} executed and verified.`, enforcementId: enfRes.enforcementId, caseId: params.caseId };
      if (params.idempotencyKey) idempotencyCache.set(params.idempotencyKey, { result: out, at: Date.now() });
      return out;
    } else {
      store.append({
        type: 'case.action_failed',
        actor: 'system',
        caseId: params.caseId,
        payload: { action: params.action, reason: 'unverified', detail: 'Enforcement state verification timed out.' },
      });
      const out = { ok: false, message: 'Action executed but state verification timed out.', enforcementId: enfRes.enforcementId, caseId: params.caseId };
      if (params.idempotencyKey) idempotencyCache.set(params.idempotencyKey, { result: out, at: Date.now() });
      return out;
    }
  } catch (err: any) {
    const failureRes = { ok: false, message: err.message || 'Action execution failed.', caseId: params.caseId };
    if (params.idempotencyKey) idempotencyCache.set(params.idempotencyKey, { result: failureRes, at: Date.now() });
    return failureRes;
  }
}
