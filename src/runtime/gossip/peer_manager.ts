export class PeerManager {
  private index = 0;
  private readonly peers: readonly string[];

  constructor(peers: readonly string[]) {
    this.peers = Object.freeze([...peers].sort());
  }

  nextPeer(): string | undefined {
    if (this.peers.length === 0) return undefined;
    const peer = this.peers[this.index % this.peers.length];
    this.index = (this.index + 1) % this.peers.length;
    return peer;
  }

  allPeers(): readonly string[] {
    return this.peers;
  }
}
