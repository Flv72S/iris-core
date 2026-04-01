import type { ComplianceDecision } from '../../distributed/cluster_compliance_engine';
import { deriveComplianceDecisionId } from '../../distributed/cluster_compliance_executor';
import type { ClusterState } from '../../distributed/cluster_lifecycle_engine';
import { encodeCanonicalMessage } from './message_codec';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface HttpClientOptions {
  readonly retryIntervalMs: number;
  readonly maxRetryAttempts: number;
}

export class RuntimeHttpClient {
  constructor(private readonly options: HttpClientOptions) {}

  async sendDecision(peer: string, decision: ComplianceDecision): Promise<boolean> {
    const id = deriveComplianceDecisionId(decision);
    const payload = Object.freeze({
      decision,
      logicalClock: Object.freeze({
        counter: deterministicCounterFromDecisionId(id),
        nodeId: 'transport',
      }),
    });
    return this.postWithRetry(`${peer}/decision`, payload);
  }

  async sendState(peer: string, state: ClusterState): Promise<boolean> {
    return this.postWithRetry(`${peer}/state_sync`, state);
  }

  private async postWithRetry(url: string, payload: unknown): Promise<boolean> {
    const body = encodeCanonicalMessage(payload);
    for (let attempt = 0; attempt < this.options.maxRetryAttempts; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
        });
        if (res.ok) return true;
      } catch {
        // keep deterministic retry schedule
      }
      const backoff = this.options.retryIntervalMs * (attempt + 1);
      await sleep(backoff);
    }
    return false;
  }
}

function deterministicCounterFromDecisionId(decisionId: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < decisionId.length; i++) {
    h ^= decisionId.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}
