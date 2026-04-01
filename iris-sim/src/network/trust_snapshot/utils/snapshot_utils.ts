/**
 * Microstep 10F — Governance Trust Snapshot & Audit Engine. Snapshot utilities.
 */

/**
 * Normalize array: copy and sort by deterministic serialization for stable order.
 */
export function normalizeArray<T>(items: T[]): T[] {
  const arr = [...items];
  arr.sort((a, b) => {
    const sa = serializeDeterministic(a);
    const sb = serializeDeterministic(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });
  return arr;
}

/**
 * Serialize value deterministically (sorted keys for objects) for stable hashing.
 */
export function serializeDeterministic(obj: unknown): string {
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (typeof obj === 'string') return JSON.stringify(obj);
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (Array.isArray(obj)) {
    const parts = obj.map((item) => serializeDeterministic(item));
    return '[' + parts.join(',') + ']';
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    const parts = keys.map((k) => JSON.stringify(k) + ':' + serializeDeterministic((obj as Record<string, unknown>)[k]));
    return '{' + parts.join(',') + '}';
  }
  return String(obj);
}
