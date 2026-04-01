/**
 * Microstep 16D.X1 — Nonce generation + replay protection abstraction.
 */

import { randomBytes } from 'node:crypto';
import { IRIS_AUTH_NONCE_TTL_MS } from './security_types.js';

export function generateNonce(): string {
  return randomBytes(24).toString('base64url');
}

/** Cluster-ready contract (Redis/in-memory/etc). */
export interface NonceStore {
  /**
   * @returns true when nonce has already been observed in the active window.
   */
  isReplay(nodeId: string, nonce: string): boolean;
}

/** In-process default nonce store (per-node keyspace). */
export class InMemoryNonceStore implements NonceStore {
  private readonly seen = new Map<string, number>();

  constructor(
    private readonly windowMs: number = IRIS_AUTH_NONCE_TTL_MS,
    private readonly now: () => number = Date.now,
  ) {}

  isReplay(nodeId: string, nonce: string): boolean {
    const t = this.now();
    this.prune(t);
    const key = `${nodeId}:${nonce}`;
    const exp = this.seen.get(key);
    if (exp !== undefined && exp > t) {
      return true;
    }
    this.seen.set(key, t + this.windowMs);
    return false;
  }

  private prune(now: number): void {
    for (const [k, exp] of this.seen) {
      if (exp <= now) this.seen.delete(k);
    }
  }
}
