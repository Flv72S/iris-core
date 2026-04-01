/**
 * 16F.6.A.FORMALIZATION — Certified global input bundle (normalized + hash + ADR-003 coverage).
 */
import type { InvariantCoverageEntry } from '../sdk/invariants';

import { digestGlobalInputNormalized, normalizeGlobalInput, type GlobalInput, type NormalizedGlobalInput } from './global_input';
import { runDistributedInvariantSuite } from './invariants';

export type CertifiedGlobalInput = {
  normalized: NormalizedGlobalInput;
  hash: string;
  invariantCoverage: InvariantCoverageEntry[];
};

export function certifyGlobalInput(input: GlobalInput): CertifiedGlobalInput {
  const normalized = normalizeGlobalInput(input);
  const suite = runDistributedInvariantSuite(normalized);
  return {
    normalized,
    hash: digestGlobalInputNormalized(normalized),
    invariantCoverage: [...suite.coverage],
  };
}
