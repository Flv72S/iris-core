/**
 * 16F.6.B.HARDENING — Shared payload overlap (logical conflict domain), cycle-free for causality/merge.
 * 16F.6.B.CLOSURE — Deterministic object merge (winner takes conflicting keys).
 */
import { canonicalizeKeysDeep, stableStringify } from '../logging/audit';

/** Object payloads: overlapping own enumerable keys (deterministic conflict domain). */
export function payloadsOverlap(a: unknown, b: unknown): boolean {
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) || Array.isArray(b)) {
    return false;
  }
  const keysB = new Set(Object.keys(b as object));
  for (const k of Object.keys(a as object)) {
    if (keysB.has(k)) return true;
  }
  return false;
}

/**
 * Deep-merge two JSON-serializable object payloads: union of keys sorted lexicographically;
 * when both define a key, the **winner**'s value is kept when values differ (canonical compare).
 */
export function mergeObjectPayloadsConcurrent(winner: unknown, loser: unknown): unknown {
  const w =
    winner !== null && typeof winner === 'object' && !Array.isArray(winner)
      ? (canonicalizeKeysDeep(winner) as Record<string, unknown>)
      : null;
  const l =
    loser !== null && typeof loser === 'object' && !Array.isArray(loser)
      ? (canonicalizeKeysDeep(loser) as Record<string, unknown>)
      : null;
  if (w === null && l === null) return {};
  if (w === null) return canonicalizeKeysDeep(l ?? {});
  if (l === null) return canonicalizeKeysDeep(w);
  const keys = [...new Set([...Object.keys(w), ...Object.keys(l)])].sort((a, b) => a.localeCompare(b));
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const hasW = Object.prototype.hasOwnProperty.call(w, k);
    const hasL = Object.prototype.hasOwnProperty.call(l, k);
    if (hasW && hasL) {
      const sw = stableStringify(w[k]);
      const sl = stableStringify(l[k]);
      out[k] = sw === sl ? w[k] : w[k];
    } else if (hasW) out[k] = w[k];
    else out[k] = l[k]!;
  }
  return canonicalizeKeysDeep(out);
}

/**
 * Group merge: union of object keys (lexicographic); per key, if all values agree (stableStringify), keep one;
 * else value from the **max** holder under {@link compareDistributedEvents}.
 */
export function mergeObjectPayloadsGroup(
  events: readonly DistributedEvent[],
  compareDistributedEvents: (a: DistributedEvent, b: DistributedEvent) => number,
): unknown {
  if (events.length === 0) return {};
  const keys = new Set<string>();
  for (const e of events) {
    const p = e.payload;
    if (p !== null && typeof p === 'object' && !Array.isArray(p)) {
      for (const k of Object.keys(p as object)) keys.add(k);
    }
  }
  const sortedKeys = [...keys].sort((a, b) => a.localeCompare(b));
  const out: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    const holders = events.filter((e) => {
      const p = e.payload;
      return (
        p !== null &&
        typeof p === 'object' &&
        !Array.isArray(p) &&
        Object.prototype.hasOwnProperty.call(p as object, k)
      );
    });
    if (holders.length === 0) continue;
    const vals = holders.map((h) => stableStringify((h.payload as Record<string, unknown>)[k]));
    if (new Set(vals).size === 1) {
      out[k] = (holders[0]!.payload as Record<string, unknown>)[k];
      continue;
    }
    const sortedHolders = [...holders].sort(compareDistributedEvents);
    const keyWinner = sortedHolders[sortedHolders.length - 1]!;
    out[k] = (keyWinner.payload as Record<string, unknown>)[k];
  }
  return canonicalizeKeysDeep(out);
}
