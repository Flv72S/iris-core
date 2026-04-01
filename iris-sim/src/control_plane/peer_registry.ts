import type { PeerInfo } from './peer_types.js';

export type { PeerInfo } from './peer_types.js';

export interface PeerRegistry {
  resolve(nodeId: string): PeerInfo | null;
  register(peer: PeerInfo): void;
  revoke(nodeId: string): void;
}
