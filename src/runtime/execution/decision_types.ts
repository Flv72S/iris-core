import type { ComplianceDecision } from '../../distributed/cluster_compliance_engine';
import type { LogicalClock } from '../ordering/logical_clock';

export interface RuntimeDecision {
  readonly decision: ComplianceDecision;
  readonly logicalClock: LogicalClock;
  /** Optional deterministic local sequence for tie-break safety. */
  readonly sequence?: number;
}
