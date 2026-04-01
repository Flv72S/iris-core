/**
 * Phase 14D — Conflict Resolution Engine. Conflict detection (deterministic).
 */

import type { NetworkState } from '../network_state.js';
import type { StateConflict, ConflictEntityType } from './conflict_types.js';

function canonicalValue(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonicalValue).join(',') + ']';
  const keys = Object.keys(v as Record<string, unknown>).sort((a, b) => a.localeCompare(b));
  const parts = keys.map((k) => JSON.stringify(k) + ':' + canonicalValue((v as Record<string, unknown>)[k]));
  return '{' + parts.join(',') + '}';
}

function collectConflicts<T>(
  entity_type: ConflictEntityType,
  local: Readonly<Record<string, T>>,
  remote: Readonly<Record<string, T>>,
  localVersion: number,
  remoteVersion: number,
  localTimestamp: number,
  remoteTimestamp: number
): StateConflict[] {
  const conflicts: StateConflict[] = [];
  const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const sortedKeys = [...allKeys].sort((a, b) => a.localeCompare(b));
  for (const key of sortedKeys) {
    const lv = local[key];
    const rv = remote[key];
    const lUndef = lv === undefined;
    const rUndef = rv === undefined;
    if (lUndef && rUndef) continue;
    if (lUndef || rUndef) {
      conflicts.push({
        entity_type,
        entity_id: key,
        local_version: localVersion,
        remote_version: remoteVersion,
        local_value: lv,
        remote_value: rv,
        local_timestamp: localTimestamp,
        remote_timestamp: remoteTimestamp,
      });
      continue;
    }
    if (canonicalValue(lv) !== canonicalValue(rv)) {
      conflicts.push({
        entity_type,
        entity_id: key,
        local_version: localVersion,
        remote_version: remoteVersion,
        local_value: lv,
        remote_value: rv,
        local_timestamp: localTimestamp,
        remote_timestamp: remoteTimestamp,
      });
    }
  }
  return conflicts;
}

export class ConflictDetector {
  /**
   * Detect conflicts between local and remote state. Deterministic (sorted keys).
   */
  static detect(local: NetworkState, remote: NetworkState): StateConflict[] {
    const localVersion = local.metadata.version;
    const remoteVersion = remote.metadata.version;
    const localTimestamp = local.metadata.timestamp;
    const remoteTimestamp = remote.metadata.timestamp;

    const nodes = collectConflicts(
      'NODE',
      local.nodes ?? {},
      remote.nodes ?? {},
      localVersion,
      remoteVersion,
      localTimestamp,
      remoteTimestamp
    );
    const trust = collectConflicts(
      'TRUST',
      local.trust ?? {},
      remote.trust ?? {},
      localVersion,
      remoteVersion,
      localTimestamp,
      remoteTimestamp
    );
    const governance = collectConflicts(
      'GOVERNANCE',
      local.governance ?? {},
      remote.governance ?? {},
      localVersion,
      remoteVersion,
      localTimestamp,
      remoteTimestamp
    );
    const topology = collectConflicts(
      'TOPOLOGY',
      local.topology ?? {},
      remote.topology ?? {},
      localVersion,
      remoteVersion,
      localTimestamp,
      remoteTimestamp
    );
    const policies = collectConflicts(
      'POLICY',
      local.policies ?? {},
      remote.policies ?? {},
      localVersion,
      remoteVersion,
      localTimestamp,
      remoteTimestamp
    );

    return [...nodes, ...trust, ...governance, ...topology, ...policies];
  }
}
