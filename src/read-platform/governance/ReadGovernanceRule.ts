/**
 * Read Governance Rule — CONTRATTO SINGOLA REGOLA
 * Valuta input e produce decisione o null (non applicabile).
 */

import type { ReadGovernanceDecision } from './ReadGovernanceDecision';

export interface ReadGovernanceRule<Input> {
  evaluate(input: Input): ReadGovernanceDecision | null;
}
