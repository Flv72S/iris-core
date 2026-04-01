import type { ComplianceDecision } from '../../distributed/cluster_compliance_engine';
import type { ClusterState } from '../../distributed/cluster_lifecycle_engine';
import type { RuntimeHttpClient } from '../network/http_client';
import { PeerManager } from './peer_manager';

export interface GossipSource {
  currentState: () => ClusterState;
  recentDecisions: () => readonly ComplianceDecision[];
}

export class GossipEngine {
  private timer: NodeJS.Timeout | undefined;
  private readonly peers: PeerManager;

  constructor(
    peers: readonly string[],
    private readonly intervalMs: number,
    private readonly client: RuntimeHttpClient,
    private readonly source: GossipSource,
  ) {
    this.peers = new PeerManager(peers);
  }

  start(): void {
    if (this.timer !== undefined) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
  }

  async tick(): Promise<void> {
    const peer = this.peers.nextPeer();
    if (peer === undefined) return;
    for (const d of this.source.recentDecisions()) {
      await this.client.sendDecision(peer, d);
    }
    await this.client.sendState(peer, this.source.currentState());
  }
}
