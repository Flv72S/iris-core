/**
 * Microstep 15D — Distributed Replay Protection. Deterministic nonce store.
 */

import type { ReplayIdentifier, ReplayNonceStoreConfig } from './replay_types.js';

function nonceKey(identifier: ReplayIdentifier): string {
  return `${identifier.session_id}:${identifier.sender_node_id}:${identifier.recipient_node_id}:${identifier.nonce}`;
}

export class ReplayNonceStore {
  private readonly byMessageId = new Map<string, ReplayIdentifier>();
  private readonly byNonce = new Map<string, ReplayIdentifier>();
  private readonly orderedKeys: string[] = [];
  private readonly now: () => number;

  constructor(private readonly config: ReplayNonceStoreConfig = {}) {
    this.now = config.now ?? (() => Date.now());
  }

  private isExpired(entry: ReplayIdentifier): boolean {
    const ttl = this.config.ttl_ms;
    if (ttl == null) return false;
    return this.now() - entry.timestamp > ttl;
  }

  private isAtCapacity(): boolean {
    const max = this.config.max_entries;
    if (max == null) return false;
    return this.orderedKeys.length >= max;
  }

  has(identifier: ReplayIdentifier): boolean {
    const byMessage = this.byMessageId.get(identifier.message_id);
    if (byMessage != null && !this.isExpired(byMessage)) return true;

    const byNonce = this.byNonce.get(nonceKey(identifier));
    if (byNonce != null && !this.isExpired(byNonce)) return true;

    return false;
  }

  add(identifier: ReplayIdentifier): void {
    if (this.has(identifier)) return;
    if (this.isAtCapacity()) return;

    const nKey = nonceKey(identifier);
    this.byMessageId.set(identifier.message_id, identifier);
    this.byNonce.set(nKey, identifier);
    this.orderedKeys.push(nKey);
  }

  getAll(): ReplayIdentifier[] {
    const out: ReplayIdentifier[] = [];
    for (const key of this.orderedKeys) {
      const value = this.byNonce.get(key);
      if (value != null) out.push(value);
    }
    return out;
  }
}
