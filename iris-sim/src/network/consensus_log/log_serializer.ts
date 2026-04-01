/**
 * Deterministic JSON serializer:
 * - stable key ordering
 * - omit undefined fields in objects
 * - represent undefined in arrays as null (JSON-compatible)
 */

import type { ConsensusLogEntry } from './log_entry.js';
import { ConsensusLogIntegrityError, ConsensusLogIntegrityErrorCode } from './log_types.js';

function serializeValue(v: unknown): string {
  if (v === undefined) return 'null';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map((x) => serializeValue(x)).join(',') + ']';

  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort((a, b) => a.localeCompare(b));
  const parts = keys.map((k) => JSON.stringify(k) + ':' + serializeValue(obj[k]));
  return '{' + parts.join(',') + '}';
}

export function serializeEntry(entry: ConsensusLogEntry): string {
  return serializeValue(entry);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function deserializeEntry(raw: string): ConsensusLogEntry {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new ConsensusLogIntegrityError(
      ConsensusLogIntegrityErrorCode.DESERIALIZE_FAILED,
      `Failed to parse log entry JSON: ${(e as Error).message}`,
    );
  }

  if (!isRecord(parsed)) {
    throw new ConsensusLogIntegrityError(ConsensusLogIntegrityErrorCode.INVALID_ENTRY, 'Log entry is not an object.');
  }

  const id = parsed.id;
  const type = parsed.type;
  const timestamp = parsed.timestamp;
  const payload = (parsed as Record<string, unknown>).payload;
  const previous_hash = (parsed as Record<string, unknown>).previous_hash;
  const hash = parsed.hash;

  if (typeof id !== 'string' || id.length === 0) {
    throw new ConsensusLogIntegrityError(ConsensusLogIntegrityErrorCode.INVALID_ENTRY, 'Log entry id is invalid.');
  }
  if (typeof type !== 'number' || !Number.isInteger(type)) {
    throw new ConsensusLogIntegrityError(ConsensusLogIntegrityErrorCode.INVALID_ENTRY, 'Log entry type is invalid.');
  }
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    throw new ConsensusLogIntegrityError(ConsensusLogIntegrityErrorCode.INVALID_ENTRY, 'Log entry timestamp is invalid.');
  }
  if (!(previous_hash === null || typeof previous_hash === 'string')) {
    throw new ConsensusLogIntegrityError(
      ConsensusLogIntegrityErrorCode.INVALID_ENTRY,
      'Log entry previous_hash is invalid.',
    );
  }
  if (typeof hash !== 'string' || hash.length === 0) {
    throw new ConsensusLogIntegrityError(ConsensusLogIntegrityErrorCode.INVALID_ENTRY, 'Log entry hash is invalid.');
  }

  return {
    id,
    type: type as ConsensusLogEntry['type'],
    timestamp,
    payload,
    previous_hash: previous_hash as string | null,
    hash,
  };
}

