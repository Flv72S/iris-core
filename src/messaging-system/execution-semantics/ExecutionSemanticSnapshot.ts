/**
 * ExecutionSemanticSnapshot - C.4.B
 * Snapshot immutabile. Deep frozen.
 */

import type { ExecutionSemanticRequirement } from './ExecutionSemanticRequirement';
import type { ExecutionSemanticBlocker } from './ExecutionSemanticBlocker';
import type { ExecutionSemanticHint } from './ExecutionSemanticHint';

export interface ExecutionSemanticSnapshot {
  readonly requirements: readonly ExecutionSemanticRequirement[];
  readonly blockers: readonly ExecutionSemanticBlocker[];
  readonly hints: readonly ExecutionSemanticHint[];
  readonly derivedAt: string;
}
