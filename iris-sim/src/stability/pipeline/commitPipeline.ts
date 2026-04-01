/**
 * Stability Step 4 — Controlled commit pipeline.
 * Validator then apply or discard. No real global state write.
 */

import type { StabilityValidator } from '../validator/stabilityValidator.js';
import type { GlobalStateAdapter } from './globalStateAdapter.js';
import type { PipelineResult, CommitApplicationRecord } from './pipelineTypes.js';
import type { CommitRequest } from '../sandbox/sandboxTypes.js';

export class ControlledCommitPipeline {
  readonly validator: StabilityValidator;
  readonly stateAdapter: GlobalStateAdapter;
  readonly applicationHistory: CommitApplicationRecord[] = [];

  constructor(validator: StabilityValidator, stateAdapter: GlobalStateAdapter) {
    this.validator = validator;
    this.stateAdapter = stateAdapter;
  }

  processCommit(moduleName: string, commitRequest: CommitRequest): PipelineResult {
    const previousState = this.stateAdapter.getSnapshot();
    const validation = this.validator.validateCommit(moduleName, commitRequest, previousState);

    if (!validation.approved) {
      const rejectedResult: PipelineResult = validation.reason
        ? { applied: false, rejected: true, reason: validation.reason, impactScore: validation.estimatedImpact }
        : { applied: false, rejected: true, impactScore: validation.estimatedImpact };
      return Object.freeze(rejectedResult);
    }

    this.stateAdapter.applyCommit(moduleName, commitRequest, validation.estimatedImpact);
    const record: CommitApplicationRecord = {
      moduleName,
      applied: true,
      impactScore: validation.estimatedImpact,
      timestamp: commitRequest.timestamp,
    };
    this.applicationHistory.push(record);

    return Object.freeze({
      applied: true,
      rejected: false,
      impactScore: validation.estimatedImpact,
    });
  }
}
