/**
 * Read Governance Decision — RISULTATO DICHIARATIVO
 * Stato sintetico e interpretabile. Nessuna logica, nessun enforcement.
 */

export type ReadGovernanceStatus = 'healthy' | 'degraded' | 'unreliable';

export interface ReadGovernanceDecision {
  readonly status: ReadGovernanceStatus;
  readonly reasons: readonly string[];
}
