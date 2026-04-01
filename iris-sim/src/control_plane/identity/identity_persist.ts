import fs from 'node:fs';
import path from 'node:path';

import type { CanonicalIdentityType } from './canonical_identity.js';
import { publicKeyDerFingerprint } from './key_canonicalization.js';

/** Shape written by `iris keys generate` / consumed by observability. */
export type NodeIdentityFile = {
  nodeId: string;
  publicKey: string;
  keyTypes: string[];
  /** SHA-256 hex of raw SPKI DER (canonical key bytes); always recomputed on load when missing on disk. */
  publicKeyFingerprint: string;
  /** Written by `iris keys generate` (16F.X1.X2.HARDENING). */
  canonicalIdentity?: CanonicalIdentityType;
};

export function tryLoadNodeIdentity(cwd: string): NodeIdentityFile | undefined {
  const p = path.join(cwd, '.iris', 'node_identity.json');
  if (!fs.existsSync(p)) return undefined;
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Partial<NodeIdentityFile>;
    if (typeof raw.nodeId !== 'string' || typeof raw.publicKey !== 'string' || !Array.isArray(raw.keyTypes)) {
      return undefined;
    }
    let publicKeyFingerprint: string;
    try {
      publicKeyFingerprint = publicKeyDerFingerprint(raw.publicKey);
    } catch {
      return undefined;
    }
    const canonicalIdentity: CanonicalIdentityType | undefined =
      typeof raw.canonicalIdentity === 'string' ? (raw.canonicalIdentity as CanonicalIdentityType) : undefined;
    return {
      nodeId: raw.nodeId,
      publicKey: raw.publicKey,
      keyTypes: raw.keyTypes.filter((k): k is string => typeof k === 'string'),
      publicKeyFingerprint,
      ...(canonicalIdentity !== undefined ? { canonicalIdentity } : {}),
    };
  } catch {
    return undefined;
  }
}

/**
 * Compatibility helper: when `canonicalIdentity` is missing (legacy identity file),
 * treat it as legacy mode.
 */
export function resolveCanonicalIdentity(identity: NodeIdentityFile | undefined): CanonicalIdentityType | undefined {
  if (!identity) return undefined;
  return identity.canonicalIdentity ?? undefined;
}
