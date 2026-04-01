import { stableStringify } from '../../logging/audit';
import type { ClusterState } from '../cluster_lifecycle_engine';
import type { ComplianceDecision } from '../cluster_compliance_engine';
import { executeComplianceDecision } from '../cluster_compliance_executor';
import { mergeClusterStates } from '../conflict/compliance_merge';

import type { Message } from './message_types';

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export class SimulatedNode {
  readonly id: string;
  private localClusterState: ClusterState;
  private inbox: Message[];
  private processedMessages: Set<string>;

  constructor(id: string, initialClusterState: ClusterState) {
    this.id = id;
    this.localClusterState = deepClone(initialClusterState);
    this.inbox = [];
    this.processedMessages = new Set();
  }

  receiveMessage(msg: Message): void {
    // deep clone at ingress to avoid shared references
    this.inbox.push(deepClone(msg));
    // deterministic processing order independent from delivery order
    this.inbox.sort((a, b) => a.id.localeCompare(b.id));
  }

  processNextMessage(): boolean {
    if (this.inbox.length === 0) return false;
    const msg = this.inbox.shift()!;
    if (this.processedMessages.has(msg.id)) return true;
    this.processedMessages.add(msg.id);

    if (msg.type === 'DECISION') {
      const decision = deepClone(msg.payload) as ComplianceDecision;
      this.applyDecision(decision);
      return true;
    }

    if (msg.type === 'STATE_SYNC') {
      const incoming = deepClone(msg.payload) as ClusterState;
      const merged = mergeClusterStates(this.localClusterState, incoming);
      // canonical tie-break for fully equivalent merges
      const ls = stableStringify(this.localClusterState);
      const ms = stableStringify(merged);
      this.localClusterState = ms >= ls ? (merged as ClusterState) : this.localClusterState;
      return true;
    }

    return false;
  }

  applyDecision(decision: ComplianceDecision): void {
    const result = executeComplianceDecision(this.localClusterState, decision, {
      mode: 'STRICT',
      executionTimestamp: decision.timestamp,
    });
    this.localClusterState = deepClone(result.mutatedCluster as ClusterState);
  }

  hasPendingMessages(): boolean {
    return this.inbox.length > 0;
  }

  snapshot(): ClusterState {
    return deepClone(this.localClusterState);
  }
}
