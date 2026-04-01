/**
 * Stability Step 2 — Sandbox execution context.
 * Local state, runGuarded, safeRead/safeWrite, requestCommit (no global write), suspend/terminate.
 * Step 4: executeWithPipeline for controlled commit flow.
 */

import type { ResourceBudgetConfig, CommitRequest, SandboxStatus } from './sandboxTypes.js';
import { ResourceBudgetController } from './resourceBudget.js';
import type { PipelineResult } from '../pipeline/pipelineTypes.js';

export interface CommitPipelineInterface {
  processCommit(moduleName: string, commitRequest: CommitRequest): PipelineResult;
}

export class SandboxExecutionContext {
  readonly sandboxId: string;
  readonly resourceController: ResourceBudgetController;
  private readonly _localState = new Map<string, unknown>();
  private _status: SandboxStatus = 'active';
  private readonly _commitRequests: CommitRequest[] = [];

  constructor(sandboxId: string, resourceBudgetConfig: ResourceBudgetConfig) {
    this.sandboxId = sandboxId;
    this.resourceController = new ResourceBudgetController(resourceBudgetConfig);
  }

  get status(): SandboxStatus {
    return this._status;
  }

  get commitRequests(): readonly CommitRequest[] {
    return this._commitRequests;
  }

  runGuarded<T>(fn: () => T): T {
    if (this._status === 'terminated') {
      throw new Error('Sandbox is terminated');
    }
    const now = Date.now();
    if (!this.resourceController.canExecute(now)) {
      this._status = 'suspended';
      throw new Error('Sandbox suspended (cooldown)');
    }
    const start = Date.now();
    try {
      const result = fn();
      const now = Date.now();
      this.resourceController.registerExecution(now - start, now);
      if (!this.resourceController.canExecute(now)) this._status = 'suspended';
      return result;
    } catch (e) {
      const now = Date.now();
      this.resourceController.registerExecution(now - start, now);
      if (!this.resourceController.canExecute(now)) this._status = 'suspended';
      throw e;
    }
  }

  safeRead(key: string): unknown {
    return this._localState.get(key);
  }

  safeWrite(key: string, value: unknown): void {
    if (this._status === 'terminated') return;
    this.resourceController.registerStateWrite(Date.now());
    this._localState.set(key, value);
  }

  requestCommit(localKey: string, value: unknown): void {
    if (this._status === 'terminated') return;
    this._commitRequests.push({
      sandboxId: this.sandboxId,
      localKey,
      value,
      timestamp: Date.now(),
    });
  }

  suspend(): void {
    this._status = 'suspended';
    this.resourceController.enforceCooldown(Date.now());
  }

  terminate(): void {
    this._status = 'terminated';
  }

  getStatus(): SandboxStatus {
    return this._status;
  }

  /**
   * Step 4: Run fn under runGuarded; if a commit was requested, process it via pipeline. No automatic wiring.
   */
  executeWithPipeline<T>(
    moduleName: string,
    fn: () => T,
    pipeline: CommitPipelineInterface
  ): { result: T; pipelineResult: PipelineResult } {
    const beforeCount = this._commitRequests.length;
    const result = this.runGuarded(fn);
    const afterCount = this._commitRequests.length;
    let pipelineResult: PipelineResult;
    if (afterCount > beforeCount) {
      const commitRequest = this._commitRequests[afterCount - 1];
      pipelineResult = pipeline.processCommit(moduleName, commitRequest);
    } else {
      pipelineResult = Object.freeze({
        applied: false,
        rejected: false,
        impactScore: 0,
      });
    }
    return { result, pipelineResult };
  }
}
