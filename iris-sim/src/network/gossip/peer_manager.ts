import fs from 'node:fs';
import path from 'node:path';
import type { NodeIsolationManager } from '../../control_plane/node_isolation.js';
import type { PeerInfo } from './routing_policy.js';

export class PeerManager {
  private readonly peers = new Map<string, PeerInfo>();
  private readonly persistPath: string | null;
  private readonly isolation: NodeIsolationManager | null;
  private readonly trustScoreProvider: ((nodeId: string) => number) | null;

  constructor(args?: {
    cwd?: string;
    persist?: boolean;
    isolationManager?: NodeIsolationManager;
    trustScoreProvider?: (nodeId: string) => number;
  }) {
    this.persistPath = args?.persist && args?.cwd ? path.join(args.cwd, '.iris', 'peers.json') : null;
    this.isolation = args?.isolationManager ?? null;
    this.trustScoreProvider = args?.trustScoreProvider ?? null;
    if (this.persistPath) this.load();
  }

  addPeer(peer: PeerInfo): void {
    const trustScore = this.trustScoreProvider ? this.trustScoreProvider(peer.nodeId) : peer.trustScore;
    const iso = this.isolation ? this.isolation.isIsolated(peer.nodeId) : peer.isIsolated;
    this.peers.set(peer.nodeId, { ...peer, trustScore, ...(typeof iso === 'boolean' ? { isIsolated: iso } : {}) });
    this.save();
  }

  removePeer(nodeId: string): void {
    this.peers.delete(nodeId);
    this.save();
  }

  touch(nodeId: string, now: number): void {
    const p = this.peers.get(nodeId);
    if (!p) return;
    const trustScore = this.trustScoreProvider ? this.trustScoreProvider(nodeId) : p.trustScore;
    const iso = this.isolation ? this.isolation.isIsolated(nodeId) : p.isIsolated;
    this.peers.set(nodeId, { ...p, lastSeen: now, trustScore, ...(typeof iso === 'boolean' ? { isIsolated: iso } : {}) });
  }

  getPeers(): PeerInfo[] {
    return [...this.peers.values()];
  }

  getTrustedPeers(minTrustScore = 0): PeerInfo[] {
    return this.getPeers().filter((p) => (p.isIsolated ? false : p.trustScore >= minTrustScore));
  }

  getPeersByDomain(domainId: string): PeerInfo[] {
    return this.getPeers().filter((p) => p.domainId === domainId);
  }

  count(): number {
    return this.peers.size;
  }

  private load(): void {
    if (!this.persistPath) return;
    try {
      if (!fs.existsSync(this.persistPath)) return;
      const raw = JSON.parse(fs.readFileSync(this.persistPath, 'utf8')) as { peers: PeerInfo[] };
      for (const p of raw.peers ?? []) {
        this.peers.set(p.nodeId, p);
      }
    } catch {
      // ignore (best-effort)
    }
  }

  private save(): void {
    if (!this.persistPath) return;
    try {
      const dir = path.dirname(this.persistPath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.persistPath, JSON.stringify({ peers: this.getPeers() }, null, 2), 'utf8');
    } catch {
      // ignore (best-effort)
    }
  }
}

