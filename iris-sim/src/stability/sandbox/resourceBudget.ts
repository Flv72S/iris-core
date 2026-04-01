/**
 * Stability Step 2 — Resource budget engine.
 * CPU logic, decision count, state writes; cooldown and suspension.
 */

import type { ResourceBudgetConfig, SandboxMetrics } from './sandboxTypes.js';

const DEFAULT_WINDOW_MS = 60_000;

export class ResourceBudgetController {
  readonly config: ResourceBudgetConfig;
  private _executionCount: number = 0;
  private _decisionCount: number = 0;
  private _stateWriteCount: number = 0;
  private _suspendedUntil: number = 0;
  private _suspensions: number = 0;
  private _budgetViolations: number = 0;
  private _totalExecutionTimeMs: number = 0;
  private _windowStart: number = 0;

  constructor(config: ResourceBudgetConfig) {
    this.config = Object.freeze({ ...config });
    this._windowStart = Date.now();
  }

  get executionCount(): number {
    return this._executionCount;
  }

  get decisionCount(): number {
    return this._decisionCount;
  }

  get stateWriteCount(): number {
    return this._stateWriteCount;
  }

  get suspendedUntil(): number {
    return this._suspendedUntil;
  }

  canExecute(nowMs: number = Date.now()): boolean {
    this.resetWindowIfNeeded(nowMs);
    if (this._suspendedUntil > nowMs) return false;
    return true;
  }

  registerExecution(durationMs: number, nowMs: number = Date.now()): void {
    this.resetWindowIfNeeded(nowMs);
    this._executionCount++;
    this._totalExecutionTimeMs += durationMs;
    const windowMs = this.config.windowSizeMs ?? DEFAULT_WINDOW_MS;
    const elapsed = nowMs - this._windowStart;
    if (this._totalExecutionTimeMs > this.config.maxExecutionTimeMs || elapsed > windowMs) {
      this._enforceSuspension(nowMs);
    }
  }

  registerDecision(nowMs: number = Date.now()): void {
    this.resetWindowIfNeeded(nowMs);
    this._decisionCount++;
    if (this._decisionCount > this.config.maxDecisionsPerWindow) {
      this._budgetViolations++;
      this._enforceSuspension(nowMs);
    }
  }

  registerStateWrite(nowMs: number = Date.now()): void {
    this.resetWindowIfNeeded(nowMs);
    this._stateWriteCount++;
    if (this._stateWriteCount > this.config.maxStateWrites) {
      this._budgetViolations++;
      this._enforceSuspension(nowMs);
    }
  }

  enforceCooldown(nowMs: number = Date.now()): void {
    this._suspendedUntil = nowMs + this.config.cooldownMs;
  }

  resetWindowIfNeeded(nowMs: number = Date.now()): void {
    const windowMs = this.config.windowSizeMs ?? DEFAULT_WINDOW_MS;
    if (nowMs - this._windowStart >= windowMs) {
      this._windowStart = nowMs;
      this._decisionCount = 0;
      this._stateWriteCount = 0;
      this._totalExecutionTimeMs = 0;
    }
  }

  private _enforceSuspension(nowMs: number): void {
    this._suspensions++;
    this._suspendedUntil = nowMs + this.config.cooldownMs;
  }

  getMetrics(): SandboxMetrics {
    return Object.freeze({
      executions: this._executionCount,
      suspensions: this._suspensions,
      terminations: 0,
      budgetViolations: this._budgetViolations,
      averageExecutionTime:
        this._executionCount > 0 ? this._totalExecutionTimeMs / this._executionCount : 0,
    });
  }
}
