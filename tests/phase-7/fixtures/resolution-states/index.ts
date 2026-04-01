/**
 * Resolution state fixtures — RESOLVED_ALLOWED, BLOCKED, FORCED, SUSPENDED.
 * Static, deterministic. No runtime clock.
 */

import type { ResolutionFixture } from './types';

export const RESOLVED_ALLOWED: ResolutionFixture = Object.freeze({
  id: 'res-fixture-allowed',
  resolvedState: 'ALLOWED',
  authoritySource: 'DEFAULT_BEHAVIOR',
  timestamp: '2025-01-15T10:00:00.000Z',
});

export const RESOLVED_BLOCKED: ResolutionFixture = Object.freeze({
  id: 'res-fixture-blocked',
  resolvedState: 'BLOCKED',
  authoritySource: 'USER_HARD_BLOCK',
  timestamp: '2025-01-15T10:00:01.000Z',
});

export const RESOLVED_FORCED: ResolutionFixture = Object.freeze({
  id: 'res-fixture-forced',
  resolvedState: 'FORCED',
  authoritySource: 'WELLBEING_PROTECTION',
  timestamp: '2025-01-15T10:00:02.000Z',
});

export const RESOLVED_SUSPENDED: ResolutionFixture = Object.freeze({
  id: 'res-fixture-suspended',
  resolvedState: 'SUSPENDED',
  authoritySource: 'SYSTEM_GUARDRAIL',
  timestamp: '2025-01-15T10:00:03.000Z',
});

export const ALL_RESOLUTION_FIXTURES: readonly ResolutionFixture[] = Object.freeze([
  RESOLVED_ALLOWED,
  RESOLVED_BLOCKED,
  RESOLVED_FORCED,
  RESOLVED_SUSPENDED,
]);
