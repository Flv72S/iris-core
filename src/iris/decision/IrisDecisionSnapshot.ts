/**
 * IrisDecisionSnapshot — IRIS 11.0 (skeleton)
 * Snapshot immutabile dello stato decisionale. Solo dichiarativo; derivedAt obbligatorio.
 */

import type { IrisDecisionEntry } from './IrisDecisionModel';

export interface IrisDecisionSnapshot {
  readonly entries: readonly IrisDecisionEntry[];
  readonly derivedAt: string;
}
