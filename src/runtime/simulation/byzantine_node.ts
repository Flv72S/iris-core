import type { ComplianceDecision } from '../../distributed/cluster_compliance_engine';

export type ByzantineBehavior =
  | 'CORRUPT_DECISION'
  | 'DUPLICATE_DECISION'
  | 'DROP_DECISION'
  | 'REORDER_DECISIONS'
  | 'FAKE_DECISION_ID'
  | 'INVALID_ACTION'
  | 'FORK_JOURNAL'
  | 'RANDOM_NOISE';

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export class ByzantineNode {
  private seq = 0;

  constructor(
    readonly id: string,
    readonly behavior: ByzantineBehavior,
    private readonly seed = 0x9e3779b9,
  ) {}

  inject(decision: ComplianceDecision): ComplianceDecision | null {
    this.seq += 1;
    const d = deepClone(decision);
    switch (this.behavior) {
      case 'DROP_DECISION':
        return null;
      case 'INVALID_ACTION':
        return { ...d, action: 'NOT_AN_ACTION' as ComplianceDecision['action'] };
      case 'CORRUPT_DECISION':
        return { ...d, timestamp: d.timestamp + 1 };
      case 'FAKE_DECISION_ID':
        return {
          ...d,
          fakeDecisionId: `CMP:fake_${this.id}_${this.seq}`,
        } as unknown as ComplianceDecision;
      case 'RANDOM_NOISE':
        return {
          ...d,
          reasons: Object.freeze([...d.reasons, `noise-${this.prng()}`]),
        };
      case 'DUPLICATE_DECISION':
        return d;
      case 'REORDER_DECISIONS':
        return { ...d, timestamp: 1_000_000 - d.timestamp };
      case 'FORK_JOURNAL':
        return { ...d, invariantIds: Object.freeze(['fork-attacker']) };
      default:
        return d;
    }
  }

  private prng(): number {
    let x = (this.seed ^ this.seq) | 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) % 10_000;
  }
}
