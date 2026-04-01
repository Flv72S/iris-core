/**
 * Microstep 15D — Distributed Replay Protection. Distribution sync.
 */

import { ReplayError, ReplayErrorCode } from './replay_errors.js';
import { ReplayNonceStore } from './replay_nonce_store.js';
import type {
  ReplayDistributionEnvelope,
  ReplayDistributionTransport,
  ReplayIdentifier,
} from './replay_types.js';

function isReplayIdentifier(value: unknown): value is ReplayIdentifier {
  if (value == null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.message_id === 'string' &&
    typeof v.nonce === 'string' &&
    typeof v.session_id === 'string' &&
    typeof v.sender_node_id === 'string' &&
    typeof v.recipient_node_id === 'string' &&
    typeof v.timestamp === 'number'
  );
}

function isReplayDistributionEnvelope(value: unknown): value is ReplayDistributionEnvelope {
  if (value == null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.node_id !== 'string' || typeof v.timestamp !== 'number' || !Array.isArray(v.identifiers)) {
    return false;
  }
  return v.identifiers.every(isReplayIdentifier);
}

export class ReplayDistributionEngine {
  private readonly now: () => number;

  constructor(
    private readonly store: ReplayNonceStore,
    private readonly transport: ReplayDistributionTransport,
    private readonly node_id: string,
    now?: () => number,
  ) {
    this.now = now ?? (() => Date.now());
  }

  start(): void {
    this.transport.onReceive(async (envelope) => {
      this.handleIncoming(envelope);
    });
  }

  broadcast(identifier: ReplayIdentifier): void {
    const envelope: ReplayDistributionEnvelope = {
      node_id: this.node_id,
      identifiers: [identifier],
      timestamp: this.now(),
    };
    void this.transport.send(envelope);
  }

  handleIncoming(envelope: ReplayDistributionEnvelope): void {
    if (!isReplayDistributionEnvelope(envelope)) {
      throw new ReplayError(ReplayErrorCode.DISTRIBUTION_INVALID, 'Invalid replay distribution envelope');
    }
    if (envelope.node_id.trim().length === 0) {
      throw new ReplayError(ReplayErrorCode.DISTRIBUTION_INVALID, 'Missing node_id');
    }

    for (const identifier of envelope.identifiers) {
      if (identifier.sender_node_id !== envelope.node_id) {
        throw new ReplayError(ReplayErrorCode.DISTRIBUTION_INVALID, 'Sender mismatch in distributed replay payload');
      }
      this.store.add(identifier);
    }
  }
}
