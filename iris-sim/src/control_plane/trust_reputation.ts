export type NodeReputation = {
  nodeId: string;
  score: number; // 0-100
  lastUpdated: number;
  violations: number;
};

const MAX_SCORE = 100;
const MIN_SCORE = 0;

export class TrustReputationEngine {
  static readonly SUSPICIOUS_THRESHOLD = 50;
  static readonly ISOLATION_THRESHOLD = 20;
  private readonly now: () => number;
  private readonly nodes = new Map<string, NodeReputation>();

  constructor(now?: () => number) {
    this.now = now ?? Date.now;
  }

  getReputation(nodeId: string): NodeReputation {
    const existing = this.nodes.get(nodeId);
    if (existing) return existing;
    const next: NodeReputation = {
      nodeId,
      score: 100,
      lastUpdated: this.now(),
      violations: 0,
    };
    this.nodes.set(nodeId, next);
    return next;
  }

  increase(nodeId: string, by = 1): void {
    const cur = this.getReputation(nodeId);
    cur.score = Math.min(MAX_SCORE, cur.score + Math.max(0, by));
    cur.lastUpdated = this.now();
  }

  decrease(nodeId: string, by = 5): void {
    const cur = this.getReputation(nodeId);
    cur.score = Math.max(MIN_SCORE, cur.score - Math.max(0, by));
    cur.lastUpdated = this.now();
  }

  markViolation(nodeId: string): void {
    const cur = this.getReputation(nodeId);
    cur.violations += 1;
    cur.lastUpdated = this.now();
  }
}
