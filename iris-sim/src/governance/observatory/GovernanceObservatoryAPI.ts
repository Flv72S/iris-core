/**
 * Step 7E — Governance Observatory. Programmatic API (read-only; no HTTP server).
 */

import type { GovernanceSnapshot } from './GovernanceSnapshot.js';
import type { GovernanceTrendReport } from './models/GovernanceTrendReport.js';
import type { GovernanceRisk } from './GovernanceRiskDetector.js';
import { GovernanceObservatoryService } from './GovernanceObservatoryService.js';

/**
 * Programmatic API for the Governance Observatory.
 * Exposes snapshot/timeline/trends/risks for wiring to HTTP or other transport.
 */
export class GovernanceObservatoryAPI {
  private readonly _service: GovernanceObservatoryService =
    new GovernanceObservatoryService();

  getService(): GovernanceObservatoryService {
    return this._service;
  }

  /** GET /governance/observatory/snapshot/latest equivalent */
  getSnapshotLatest(): GovernanceSnapshot | null {
    return this._service.getTimeline().latest();
  }

  /** GET /governance/observatory/timeline equivalent (optional range) */
  getTimeline(start?: number, end?: number): GovernanceSnapshot[] {
    const timeline = this._service.getTimeline();
    if (start !== undefined && end !== undefined) {
      return timeline.getRange(start, end);
    }
    return [...timeline.getAll()];
  }

  /** GET /governance/observatory/trends equivalent */
  getTrends(): GovernanceTrendReport {
    return this._service.analyzeTrends();
  }

  /** GET /governance/observatory/risks equivalent */
  getRisks(): GovernanceRisk[] {
    return this._service.detectSystemRisks();
  }
}
