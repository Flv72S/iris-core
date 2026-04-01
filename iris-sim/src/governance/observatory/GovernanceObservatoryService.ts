/**
 * Step 7E — Governance Observatory. Service orchestrator (read-only).
 */

import type { GovernanceSnapshot } from './GovernanceSnapshot.js';
import type { GovernanceTrendReport } from './models/GovernanceTrendReport.js';
import type { GovernanceRisk } from './GovernanceRiskDetector.js';
import { GovernanceTimeline } from './GovernanceTimeline.js';
import { GovernanceMetricEngine } from './GovernanceMetricEngine.js';
import { GovernanceTrendAnalyzer } from './GovernanceTrendAnalyzer.js';
import { GovernanceRiskDetector } from './GovernanceRiskDetector.js';

export class GovernanceObservatoryService {
  private readonly _timeline: GovernanceTimeline = new GovernanceTimeline();
  private readonly _metricEngine: GovernanceMetricEngine =
    new GovernanceMetricEngine();
  private readonly _trendAnalyzer: GovernanceTrendAnalyzer =
    new GovernanceTrendAnalyzer();
  private readonly _riskDetector: GovernanceRiskDetector =
    new GovernanceRiskDetector();

  getTimeline(): GovernanceTimeline {
    return this._timeline;
  }

  /**
   * Capture a snapshot (caller provides data; this service does not mutate governance).
   * Returns the same snapshot after adding it to the timeline.
   */
  captureSnapshot(snapshot: GovernanceSnapshot): GovernanceSnapshot {
    this._timeline.add(snapshot);
    return snapshot;
  }

  analyzeTrends(): GovernanceTrendReport {
    const snapshots = this._timeline.getAll();
    const periodStart =
      snapshots.length > 0 ? snapshots[0]!.timestamp : Date.now();
    const periodEnd =
      snapshots.length > 0
        ? snapshots[snapshots.length - 1]!.timestamp
        : Date.now();

    const entropySeries = snapshots.map((s) => s.governanceEntropy);
    const consensusSeries = snapshots.map((s) => s.consensusRate);
    const stressSeries = snapshots.map((s) => s.systemStress);

    const entropyTrend = this._trendAnalyzer.detectTrend(entropySeries);
    const consensusTrend = this._trendAnalyzer.detectTrend(consensusSeries);
    const stressTrend = this._trendAnalyzer.detectTrend(stressSeries);

    const majorSignals: string[] = [];
    if (this._trendAnalyzer.detectAcceleration(stressSeries)) {
      majorSignals.push('stress_acceleration');
    }
    if (this._trendAnalyzer.detectInstability(consensusSeries)) {
      majorSignals.push('consensus_instability');
    }
    if (this._trendAnalyzer.detectStabilization(entropySeries)) {
      majorSignals.push('entropy_stabilization');
    }
    const consensusStability = this._metricEngine.computeConsensusStability(snapshots);
    if (consensusStability < 0.5) {
      majorSignals.push('low_consensus_stability');
    }

    return {
      periodStart,
      periodEnd,
      entropyTrend,
      consensusTrend,
      stressTrend,
      majorSignals,
    };
  }

  detectSystemRisks(): GovernanceRisk[] {
    return this._riskDetector.detectRisks(this._timeline.getAll());
  }
}
