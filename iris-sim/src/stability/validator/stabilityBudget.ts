/**
 * Stability Step 3 — Stability budget controller.
 * Block if impactScore > maxSingleCommitImpact or cumulative + impact > maxGlobalImpactScorePerWindow.
 * Enforce cooldown on violation; refuse commit.
 */

import type { StabilityBudgetConfig } from './stabilityBudgetTypes.js';
import { StabilityLedger } from './stabilityLedger.js';

export interface StabilityBudgetMetrics {
  readonly totalProcessed: number;
  readonly approved: number;
  readonly rejected: number;
  readonly cooldownActivations: number;
}

export class StabilityBudgetController {
  readonly config: StabilityBudgetConfig;
  readonly ledger: StabilityLedger;
  private _suspendedUntil: number = 0;

  constructor(config: StabilityBudgetConfig) {
    this.config = Object.freeze({ ...config });
    this.ledger = new StabilityLedger(config);
  }

  canProcessImpact(impactScore: number, nowMs: number = Date.now()): boolean {
    if (this._suspendedUntil > nowMs) return false;
    this.ledger.resetWindowIfNeeded(nowMs);
    if (impactScore > this.config.maxSingleCommitImpact) return false;
    const cumulative = this.ledger.getCumulativeImpact(nowMs);
    if (cumulative + impactScore > this.config.maxGlobalImpactScorePerWindow) return false;
    return true;
  }

  registerImpact(_impactScore: number, approved: boolean, nowMs: number = Date.now()): void {
    this.ledger.resetWindowIfNeeded(nowMs);
    if (!approved) this.enforceCooldown(nowMs);
  }

  enforceCooldown(nowMs: number = Date.now()): void {
    this._suspendedUntil = nowMs + this.config.cooldownMs;
  }

  getStatus(nowMs: number = Date.now()): 'active' | 'cooldown' {
    return this._suspendedUntil > nowMs ? 'cooldown' : 'active';
  }

  getMetrics(): StabilityBudgetMetrics {
    const entries = this.ledger.getEntries();
    const approved = entries.filter((e) => e.approved).length;
    const rejected = entries.filter((e) => !e.approved).length;
    const cooldownActivations = rejected;
    return Object.freeze({
      totalProcessed: entries.length,
      approved,
      rejected,
      cooldownActivations,
    });
  }

  get suspendedUntil(): number {
    return this._suspendedUntil;
  }
}
