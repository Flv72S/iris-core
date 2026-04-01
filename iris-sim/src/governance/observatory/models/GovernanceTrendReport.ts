/**
 * Step 7E — Governance Observatory. Trend report model.
 */

export interface GovernanceTrendReport {
  readonly periodStart: number;
  readonly periodEnd: number;
  readonly entropyTrend: string;
  readonly consensusTrend: string;
  readonly stressTrend: string;
  readonly majorSignals: readonly string[];
}
