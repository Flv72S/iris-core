import { createHash } from 'node:crypto';
import type { GossipMessage } from './gossip_types.js';

export function computeLineageHash(args: {
  originNodeId: string;
  messageId: string;
  previousHopNodeId?: string;
  createdAt: number;
}): string {
  return createHash('sha256')
    .update(args.originNodeId, 'utf8')
    .update(args.messageId, 'utf8')
    .update(args.previousHopNodeId ?? '', 'utf8')
    .update(String(args.createdAt), 'utf8')
    .digest('hex');
}

export class GossipLineageGuard {
  private readonly seenHopByMessage = new Map<string, string>(); // messageId -> previousHop/fromPeer

  validate(msg: GossipMessage<any>, fromPeer: string): { ok: true } | { ok: false; reason: string } {
    const origin = msg.originNodeId ?? msg.sourceNodeId;
    const createdAt = msg.createdAt ?? msg.timestamp;
    const expected = computeLineageHash({
      originNodeId: origin,
      messageId: msg.messageId,
      ...(msg.previousHopNodeId !== undefined ? { previousHopNodeId: msg.previousHopNodeId } : {}),
      createdAt,
    });
    if (msg.lineageHash && msg.lineageHash !== expected) return { ok: false, reason: 'LINEAGE_MISMATCH' };
    if (msg.previousHopNodeId && msg.previousHopNodeId !== fromPeer) return { ok: false, reason: 'PREVIOUS_HOP_MISMATCH' };
    const prior = this.seenHopByMessage.get(msg.messageId);
    if (prior && prior !== fromPeer) return { ok: false, reason: 'CROSS_PEER_REPLAY' };
    this.seenHopByMessage.set(msg.messageId, fromPeer);
    return { ok: true };
  }
}

