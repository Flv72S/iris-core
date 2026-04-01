import { randomUUID } from 'node:crypto';

export interface EvidenceRecord {
  evidenceId: string;
  nodeId: string;
  violationType: string;
  relatedEventIds: string[];
  firstSeen: number;
  lastSeen: number;
  occurrences: number;
}

export class EvidenceStore {
  private readonly now: () => number;
  private readonly byNode = new Map<string, EvidenceRecord[]>();

  constructor(now?: () => number) {
    this.now = now ?? Date.now;
  }

  recordViolation(nodeId: string, type: string, eventId: string): void {
    const current = this.byNode.get(nodeId) ?? [];
    const ts = this.now();
    const hit = current.find((x) => x.violationType === type);
    if (!hit) {
      current.push({
        evidenceId: randomUUID(),
        nodeId,
        violationType: type,
        relatedEventIds: [eventId],
        firstSeen: ts,
        lastSeen: ts,
        occurrences: 1,
      });
    } else {
      if (!hit.relatedEventIds.includes(eventId)) hit.relatedEventIds.push(eventId);
      hit.lastSeen = ts;
      hit.occurrences += 1;
    }
    this.byNode.set(nodeId, current);
  }

  getEvidence(nodeId: string): EvidenceRecord[] {
    return [...(this.byNode.get(nodeId) ?? [])];
  }
}
