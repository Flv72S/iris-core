/**
 * Phase 14A — State Model Definition. Governance state (decisions affecting nodes).
 */

export interface GovernanceState {
  readonly decision_id: string;
  readonly decision_type: string;
  readonly affected_node: string;
  readonly timestamp: number;
}
