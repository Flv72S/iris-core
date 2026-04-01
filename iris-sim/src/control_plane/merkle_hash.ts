import { createHash } from 'node:crypto';

import { stableStringify } from '../security/stable_json.js';

function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/** SHA-256 hex of UTF-8 string; for structured inputs, pass `stableStringify(value)` first. */
export function hashLeaf(input: string): string {
  return sha256Hex(input);
}

/** Internal Merkle node: SHA-256 hex of `left + '|' + right` (both hex strings). */
export function hashInternal(left: string, right: string): string {
  return sha256Hex(`${left}|${right}`);
}

/** Deterministic empty-tree leaf (no leaves). */
export function emptyMerkleLeafHash(): string {
  return hashLeaf(stableStringify({ merkle: 'empty' }));
}
