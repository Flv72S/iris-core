export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
}

export interface MerkleProofStep {
  position: 'left' | 'right';
  hash: string;
}

export interface MerkleProof {
  leafHash: string;
  steps: MerkleProofStep[];
  root: string;
}
