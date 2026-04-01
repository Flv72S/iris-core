import { hashInternal } from './merkle_hash.js';
import { securityLog } from '../security/security_logger.js';
import type { MerkleProof, MerkleProofStep } from './merkle_types.js';

export function generateMerkleProof(hashes: string[], index: number): MerkleProof {
  if (hashes.length === 0) {
    throw new Error('MERKLE_EMPTY');
  }
  if (!Number.isInteger(index) || index < 0 || index >= hashes.length) {
    throw new Error('MERKLE_BAD_INDEX');
  }

  let level = [...hashes];
  let idx = index;
  const steps: MerkleProofStep[] = [];
  const leafHash = hashes[index]!;

  while (level.length > 1) {
    const padded = level.length % 2 === 1 ? [...level, level[level.length - 1]!] : level;
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    const siblingHash = padded[siblingIdx]!;
    const position: 'left' | 'right' = idx % 2 === 0 ? 'right' : 'left';
    steps.push({ position, hash: siblingHash });

    const next: string[] = [];
    for (let i = 0; i < padded.length; i += 2) {
      next.push(hashInternal(padded[i]!, padded[i + 1]!));
    }
    idx = Math.floor(idx / 2);
    level = next;
  }

  return { leafHash, steps, root: level[0]! };
}

export function verifyMerkleProof(proof: MerkleProof): boolean {
  let current = proof.leafHash;
  for (const step of proof.steps) {
    if (step.position === 'left') {
      current = hashInternal(step.hash, current);
    } else {
      current = hashInternal(current, step.hash);
    }
  }
  const ok = current === proof.root;
  if (!ok) {
    securityLog('MERKLE_PROOF_INVALID', { rootExpected: proof.root, rootComputed: current });
  }
  return ok;
}
