import { signPayload, verifySignature } from '../../security/hmac.js';
import type { NodeIsolationManager } from '../../control_plane/node_isolation.js';
import { canonicalizeCRDTOperation, type CRDTOperation } from './crdt_types.js';

export function signCRDTOperation<T>(op: Omit<CRDTOperation<T>, 'signature'>, secret: string): string {
  return signPayload(secret, canonicalizeCRDTOperation(op));
}

export function verifyCRDTOperation<T>(op: CRDTOperation<T>, secret: string): boolean {
  if (!op.signature) return false;
  const { signature: _sig, ...unsigned } = op;
  return verifySignature(secret, canonicalizeCRDTOperation(unsigned), op.signature);
}

export function enforceCRDTTrust(args: {
  nodeId: string;
  minTrustScore: number;
  trustScoreProvider?: (nodeId: string) => number;
  isolationManager?: NodeIsolationManager;
}): { ok: true } | { ok: false; reason: string } {
  if (args.isolationManager?.isIsolated(args.nodeId)) return { ok: false, reason: 'NODE_ISOLATED' };
  const trust = args.trustScoreProvider ? args.trustScoreProvider(args.nodeId) : 100;
  const normalized = trust <= 1 ? trust * 100 : trust;
  if (normalized < args.minTrustScore) return { ok: false, reason: 'LOW_TRUST' };
  return { ok: true };
}

