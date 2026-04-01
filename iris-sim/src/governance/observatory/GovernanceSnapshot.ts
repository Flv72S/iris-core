/**
 * Step 7E — Governance Observatory. Snapshot model (read-only).
 */

export interface GovernanceSnapshot {
  readonly timestamp: number;
  readonly tierDistribution: Record<string, number>;
  readonly slaDistribution: Record<string, number>;
  readonly decisionLoad: number;
  readonly overrideRate: number;
  readonly consensusRate: number;
  readonly governanceEntropy: number;
  readonly stabilityIndex: number;
  readonly systemStress: number;
}
