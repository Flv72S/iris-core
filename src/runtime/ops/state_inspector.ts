import crypto from 'node:crypto';

import { canonicalizeKeysDeep, stableStringify } from '../../logging/audit';

export function computeStateHash(state: unknown): string {
  const canonical = stableStringify(canonicalizeKeysDeep(JSON.parse(JSON.stringify(state))));
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function shortStateHash(state: unknown): string {
  return computeStateHash(state).slice(0, 12);
}
