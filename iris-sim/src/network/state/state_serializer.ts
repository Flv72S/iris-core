/**
 * Phase 14A — State Model Definition. Deterministic canonical serialization.
 */

import type { NetworkState } from './network_state.js';

/** Canonical JSON: sorted keys, no undefined, deterministic. Does not mutate input. */
function canonicalStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj === 'boolean') return obj ? 'true' : 'false';
  if (typeof obj === 'number') return Number.isFinite(obj) ? String(obj) : 'null';
  if (typeof obj === 'string') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalStringify).join(',') + ']';
  if (typeof obj === 'object') {
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    const parts = keys.map((k) => {
      const v = (obj as Record<string, unknown>)[k];
      return JSON.stringify(k) + ':' + canonicalStringify(v);
    });
    return '{' + parts.join(',') + '}';
  }
  return 'null';
}

export class StateSerializer {
  /** Serialize state with deterministic key ordering. Same state → same output. */
  static serialize(state: NetworkState): string {
    return canonicalStringify(state);
  }

  /** Deserialize payload to NetworkState. */
  static deserialize(payload: string): NetworkState {
    const parsed = JSON.parse(payload) as NetworkState;
    if (parsed == null || typeof parsed !== 'object') {
      throw new TypeError('Invalid state payload');
    }
    return {
      metadata: parsed.metadata as NetworkState['metadata'],
      nodes: (parsed.nodes && typeof parsed.nodes === 'object') ? parsed.nodes : {},
      trust: (parsed.trust && typeof parsed.trust === 'object') ? parsed.trust : {},
      governance: (parsed.governance && typeof parsed.governance === 'object') ? parsed.governance : {},
      topology: (parsed.topology && typeof parsed.topology === 'object') ? parsed.topology : {},
      policies: (parsed.policies && typeof parsed.policies === 'object') ? parsed.policies : {},
    };
  }
}
