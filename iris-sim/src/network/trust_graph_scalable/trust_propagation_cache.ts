/**
 * Phase 13N — Optimized Trust Propagation. Cache with bounded size and FIFO eviction.
 */

import type { TrustPropagationResult } from './trust_propagation_types.js';
import type { PropagationCacheKey } from './trust_propagation_types.js';
import { propagationCacheKeyString } from './trust_propagation_types.js';

export const MAX_PROPAGATION_CACHE = 10_000;

export class TrustPropagationCache {
  private cache = new Map<string, TrustPropagationResult>();
  private keyOrder: string[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number = MAX_PROPAGATION_CACHE) {
    this.maxSize = Math.max(1, maxSize);
  }

  get(key: PropagationCacheKey): TrustPropagationResult | undefined {
    const k = propagationCacheKeyString(key);
    return this.cache.get(k);
  }

  set(key: PropagationCacheKey, result: TrustPropagationResult): void {
    const k = propagationCacheKeyString(key);
    if (!this.cache.has(k)) {
      while (this.keyOrder.length >= this.maxSize && this.keyOrder.length > 0) {
        const oldest = this.keyOrder.shift()!;
        this.cache.delete(oldest);
      }
      this.keyOrder.push(k);
    }
    this.cache.set(k, result);
  }

  clear(): void {
    this.cache.clear();
    this.keyOrder = [];
  }

  size(): number {
    return this.cache.size;
  }
}
