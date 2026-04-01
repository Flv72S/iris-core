/**
 * Resolution Engine — Microstep 6.5.2
 *
 * Funzione pura: stesso context → stesso result. Nessun clock runtime, nessun LLM.
 * Pipeline top-down per authority; early termination; emissione ResolutionResult per Fase 7.
 */

import type { AuthoritySourceId } from './authority-sources';
import type {
  ResolutionContext,
  ResolutionResult,
  ResolutionStatus,
  AuthorityDecision,
  AuthorityDecisionSnapshot,
  ResolutionAuditEntry,
} from './resolution-context';
import {
  buildAuditPayload,
  hashAuditPayload,
} from './resolution-context';

/**
 * Risolve il contesto in un unico ResolutionResult.
 *
 * Pipeline top-down: scorre context.authorityDecisions nell'ordine dell'array (caller garantisce ordine = AUTHORITY_SOURCE_ORDER).
 * Early termination: alla prima decisione con status !== ALLOWED restituisce il result e non valuta le successive.
 * Decision mapping: AuthorityDecision.status → ResolutionResult.status (1:1 per BLOCKED, FORCED, SUSPENDED).
 *
 * Invarianti:
 * - Nessun side effect; nessuna lettura di Date.now() o altro clock.
 * - Stesso context (referentialmente o per valore) → stesso result e stesso auditEntry.payloadHash.
 * - Compatibile Fase 7: Execution Runtime usa result.status (ALLOWED | FORCED → può procedere; BLOCKED | SUSPENDED → no).
 */
export function resolve(context: ResolutionContext): ResolutionResult {
  const decisions = context.authorityDecisions;
  const resolvedAt = context.now;

  for (let i = 0; i < decisions.length; i++) {
    const d = decisions[i];
    if (d.status === 'BLOCKED') {
      return buildResult(context, 'BLOCKED', d, resolvedAt);
    }
    if (d.status === 'FORCED') {
      return buildResult(context, 'FORCED', d, resolvedAt);
    }
    if (d.status === 'SUSPENDED') {
      return buildResult(context, 'SUSPENDED', d, resolvedAt);
    }
    // d.status === 'ALLOWED': continue to next authority
  }

  return buildResult(context, 'ALLOWED', null, resolvedAt);
}

/**
 * Costruisce ResolutionResult e ResolutionAuditEntry.
 * winningDecision null ⇒ status ALLOWED; winningAuthorityId e winningRuleId null.
 */
function buildResult(
  context: ResolutionContext,
  status: ResolutionStatus,
  winningDecision: AuthorityDecision | null,
  resolvedAt: number
): ResolutionResult {
  const winningAuthorityId: AuthoritySourceId | null = winningDecision?.authorityId ?? null;
  const winningRuleId: string | null = winningDecision?.ruleId ?? null;
  const reason: string | null = winningDecision?.reason ?? null;

  const decisionsSnapshot: readonly AuthorityDecisionSnapshot[] = context.authorityDecisions.map(
    (d) =>
      Object.freeze({
        authorityId: d.authorityId,
        status: d.status,
        ruleId: d.ruleId,
        reason: d.reason,
      }) as AuthorityDecisionSnapshot
  );

  const auditPayload = buildAuditPayload(
    context.resolutionId,
    context.featureId,
    context.executionRequestId ?? null,
    status,
    winningAuthorityId,
    winningRuleId,
    reason,
    resolvedAt,
    decisionsSnapshot
  );

  const payloadHash = hashAuditPayload(auditPayload);

  const auditEntry: ResolutionAuditEntry = Object.freeze({
    ...auditPayload,
    payloadHash,
  });

  return Object.freeze({
    resolutionId: context.resolutionId,
    status,
    winningAuthorityId,
    winningRuleId,
    reason,
    resolvedAt,
    auditEntry,
  });
}
