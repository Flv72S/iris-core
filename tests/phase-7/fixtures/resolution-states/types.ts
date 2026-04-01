/**
 * Fixture types for Phase 6.5 resolution states.
 * Deterministic, static input only.
 */

import type { AuthoritySourceId } from '../../../../src/core/resolution/authority-sources';
import type { ResolutionStatus } from '../../../../src/core/resolution/resolution-context';

/** Resolved state label for fixtures (maps to ResolutionStatus). */
export type ResolutionState = ResolutionStatus;

/** Single resolution fixture: static snapshot for tests. */
export type ResolutionFixture = {
  readonly id: string;
  readonly resolvedState: ResolutionState;
  readonly authoritySource: AuthoritySourceId;
  /** ISO timestamp string for determinism (no Date.now()). */
  readonly timestamp: string;
};
