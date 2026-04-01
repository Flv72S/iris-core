/**
 * IrisDecisionArtifactSet — IRIS 11.1
 * Insieme immutabile di artifact decisionali. Object.freeze.
 */

import type { IrisDecisionArtifact } from './IrisDecisionArtifact';

export interface IrisDecisionArtifactSet {
  readonly artifacts: readonly IrisDecisionArtifact[];
  readonly derivedAt: string;
}
