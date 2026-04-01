/**
 * Microstep 14T — Advanced Trust & Federation. Trust registry (keys).
 *
 * Supports:
 * - multiple keys per node
 * - one active key at a time (latest registered)
 * - revocation
 * - legacy public key registration for migration
 */

import type { NodeKey } from './trust_keys.js';

export class TrustRegistry {
  /** legacy node_id -> public_key (base64 spki DER) */
  private readonly legacyKeys = new Map<string, string>();
  /** node_id -> key_id -> NodeKey */
  private readonly keys = new Map<string, Map<string, NodeKey>>();
  /** node_id -> active key_id */
  private readonly activeKeyId = new Map<string, string>();

  /** Migration/legacy API (14S). */
  registerNode(node_id: string, publicKey: string): void {
    this.legacyKeys.set(node_id, publicKey);
    // Also register as a key if nothing else exists.
    const key: NodeKey = Object.freeze({
      node_id,
      public_key: publicKey,
      key_id: 'legacy',
      created_at: Date.now(),
    });
    this.registerKey(node_id, key);
  }

  /** Register a key. Newly registered key becomes active. */
  registerKey(node_id: string, key: NodeKey): void {
    const perNode = this.keys.get(node_id) ?? new Map<string, NodeKey>();
    perNode.set(key.key_id, key);
    this.keys.set(node_id, perNode);
    this.activeKeyId.set(node_id, key.key_id);
  }

  getKey(node_id: string, key_id: string): NodeKey | undefined {
    return this.keys.get(node_id)?.get(key_id);
  }

  getActiveKey(node_id: string): NodeKey | undefined {
    const id = this.activeKeyId.get(node_id);
    if (!id) return undefined;
    return this.getKey(node_id, id);
  }

  /** Revoke a key. Does not delete history. */
  revokeKey(node_id: string, key_id: string): void {
    const key = this.getKey(node_id, key_id);
    if (!key) return;
    const revoked: NodeKey = Object.freeze({
      ...key,
      revoked: true,
      revoked_at: key.revoked_at ?? Date.now(),
    });
    this.keys.get(node_id)!.set(key_id, revoked);
  }

  getPublicKey(node_id: string): string | undefined {
    return this.getActiveKey(node_id)?.public_key ?? this.legacyKeys.get(node_id);
  }

  isTrusted(node_id: string): boolean {
    return this.keys.has(node_id) || this.legacyKeys.has(node_id);
  }
}

