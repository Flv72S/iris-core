export interface GossipConsistencyState {
  messageSeenBy: Map<string, Set<string>>;
  convergenceRate: number;
}

export class GossipConsistencyTracker {
  private readonly state: GossipConsistencyState = { messageSeenBy: new Map(), convergenceRate: 0 };
  private partialMessages = 0;

  markSeen(messageId: string, nodeId: string, networkSizeHint: number): void {
    const s = this.state.messageSeenBy.get(messageId) ?? new Set<string>();
    s.add(nodeId);
    this.state.messageSeenBy.set(messageId, s);
    if (networkSizeHint > 0) {
      this.state.convergenceRate = Math.max(0, Math.min(1, s.size / networkSizeHint));
      if (s.size < networkSizeHint) this.partialMessages += 1;
    }
  }

  getSnapshot(): { convergenceRate: number; partialMessages: number } {
    return { convergenceRate: this.state.convergenceRate, partialMessages: this.partialMessages };
  }
}

