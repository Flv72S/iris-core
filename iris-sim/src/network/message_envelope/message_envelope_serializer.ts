/**
 * Microstep 15B — Message Envelope Standard. Deterministic serialization.
 */

function normalize(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => normalize(v));
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
  for (const k of keys) {
    const v = obj[k]!;
    if (v === undefined) continue; // omit undefined keys deterministically
    out[k] = normalize(v);
  }
  return out;
}

/** Deep key sort + deterministic JSON */
export function serializeDeterministic(input: unknown): string {
  return JSON.stringify(normalize(input));
}

