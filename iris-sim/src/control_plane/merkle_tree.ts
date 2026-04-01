import { hashInternal, emptyMerkleLeafHash } from './merkle_hash.js';
import type { MerkleNode } from './merkle_types.js';

/**
 * Build a binary Merkle tree bottom-up. Odd levels duplicate the last leaf (standard padding).
 * Leaf order matches `hashes` order.
 */
export function buildMerkleTree(hashes: string[]): MerkleNode {
  if (hashes.length === 0) {
    return { hash: emptyMerkleLeafHash() };
  }
  let current: MerkleNode[] = hashes.map((h) => ({ hash: h }));
  while (current.length > 1) {
    if (current.length % 2 === 1) {
      current = [...current, current[current.length - 1]!];
    }
    const next: MerkleNode[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const L = current[i]!;
      const R = current[i + 1]!;
      next.push({
        hash: hashInternal(L.hash, R.hash),
        left: L,
        right: R,
      });
    }
    current = next;
  }
  return current[0]!;
}

export function getMerkleRoot(node: MerkleNode): string {
  return node.hash;
}
