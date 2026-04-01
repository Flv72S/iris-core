/**
 * 16F.5.FINAL.CERTIFICATION — stable JSON and deterministic log entry ordering (shared by audit + indexer; no circular imports).
 */
import type { LogEntry } from './types';

/** Deterministic JSON: sort object keys recursively; preserve array order. */
export function stableStringify(value: unknown): string {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (t === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const k of keys) {
      if (obj[k] === undefined) continue;
      parts.push(`${JSON.stringify(k)}:${stableStringify(obj[k])}`);
    }
    return `{${parts.join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Total order for ADR-003 formal replay: timestamp ASC, correlationId ASC, stableIndex ASC (`stableStringify(entry)` lexicographic).
 */
export function compareLogEntriesForAudit(a: LogEntry, b: LogEntry): number {
  const t = a.timestamp.localeCompare(b.timestamp);
  if (t !== 0) return t;
  const c = a.correlationId.localeCompare(b.correlationId);
  if (c !== 0) return c;
  return stableStringify(a).localeCompare(stableStringify(b));
}

/** Sentinel `sourceArchive` when `replayOrdinal` is assigned by formal sort only (certification / tests). */
export const ADR003_FORMAL_ORDINAL_SOURCE = '__ADR003_FORMAL_REPLAY__';

/** Formal `replayOrdinal`: 1-based index in globally sorted E (ADR-003 CERT). */
export type FormalReplayTaggedEntry = {
  entry: LogEntry;
  replayOrdinal: number;
  sourceArchive: string;
  indexSequence: number;
};

/**
 * Pure: sort E by (timestamp, correlationId, stable entry payload), assign replayOrdinal = 1..|E|.
 * Provenance placeholders are certification-only; index replay overwrites ordinals after the same sort.
 */
export function deriveReplayOrdinal(entries: LogEntry[]): FormalReplayTaggedEntry[] {
  const sorted = [...entries].sort(compareLogEntriesForAudit);
  return sorted.map((entry, i) => ({
    entry,
    replayOrdinal: i + 1,
    sourceArchive: ADR003_FORMAL_ORDINAL_SOURCE,
    indexSequence: 0,
  }));
}
