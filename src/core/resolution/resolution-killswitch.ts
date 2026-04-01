/**
 * Resolution Kill-Switch — Microstep 6.5.5
 *
 * Controllo di emergenza sul livello di risoluzione preferenze.
 * Globale, per feature, per authority source. Determinismo assoluto; audit obbligatorio.
 */

import type { AuthoritySourceId } from './authority-sources';
import type {
  ResolutionContext,
  AuthorityDecision,
  ResolutionAuditEntry,
  AuthorityDecisionSnapshot,
} from './resolution-context';
import { hashAuditEntryPayload } from './resolution-audit';

/** Stato immutabile dei kill-switch. Stesso stato → stesso esito pre-resolution. */
export type ResolutionKillSwitchState = {
  /** true = tutte le risoluzioni bloccate (emergenza globale). */
  readonly globalKill: boolean;
  /** featureId in lista → risoluzione per quella feature bloccata. */
  readonly featureKills: readonly string[];
  /** authority in lista → decisioni di quella authority ignorate (filtrate prima di resolve). */
  readonly authorityKills: readonly AuthoritySourceId[];
};

/** rule_id stabile per audit quando il blocco è dovuto a kill-switch. */
export const RESOLUTION_KILL_SWITCH_RULE_ID = 'resolution-kill-switch';

/** Esito del controllo pre-resolution. */
export type PreResolutionCheckResult =
  | { readonly proceed: true; readonly filteredDecisions: readonly AuthorityDecision[] }
  | { readonly proceed: false; readonly reason: string; readonly auditEntry: ResolutionAuditEntry };

/**
 * Verifica pre-resolution: determina se la risoluzione può procedere e con quali decisioni.
 * Deterministico: stesso context + stesso state → stesso result.
 *
 * 1. globalKill → BLOCKED, reason "Resolution kill-switch: global"
 * 2. featureId in featureKills → BLOCKED, reason "Resolution kill-switch: feature"
 * 3. Filtra authorityDecisions rimuovendo le authority in authorityKills
 * 4. PROCEED con filteredDecisions
 */
export function checkPreResolution(
  context: ResolutionContext,
  state: ResolutionKillSwitchState
): PreResolutionCheckResult {
  if (state.globalKill) {
    return Object.freeze({
      proceed: false,
      reason: 'Resolution kill-switch: global',
      auditEntry: buildKillSwitchAuditEntry(context, 'Resolution kill-switch: global'),
    });
  }

  if (state.featureKills.length > 0 && state.featureKills.includes(context.featureId)) {
    return Object.freeze({
      proceed: false,
      reason: 'Resolution kill-switch: feature',
      auditEntry: buildKillSwitchAuditEntry(context, 'Resolution kill-switch: feature'),
    });
  }

  const authorityKillSet = new Set(state.authorityKills);
  const filteredDecisions = Object.freeze(
    context.authorityDecisions.filter((d) => !authorityKillSet.has(d.authorityId))
  );

  return Object.freeze({
    proceed: true,
    filteredDecisions,
  });
}

/**
 * Costruisce una ResolutionAuditEntry per un blocco da kill-switch.
 * Audit obbligatorio: il caller deve appendere questa entry quando proceed === false.
 */
export function buildKillSwitchAuditEntry(
  context: ResolutionContext,
  reason: string
): ResolutionAuditEntry {
  const payload = Object.freeze({
    resolutionId: context.resolutionId,
    featureId: context.featureId,
    executionRequestId: context.executionRequestId ?? null,
    status: 'BLOCKED' as const,
    winningAuthorityId: null as AuthoritySourceId | null,
    winningRuleId: RESOLUTION_KILL_SWITCH_RULE_ID,
    reason,
    resolvedAt: context.now,
    decisionsSnapshot: Object.freeze([]) as readonly AuthorityDecisionSnapshot[],
  });
  const payloadHash = hashAuditEntryPayload(payload);
  return Object.freeze({
    ...payload,
    payloadHash,
  });
}

/**
 * Stato iniziale: nessun kill attivo. Risoluzione sempre consentita (salvo altre policy).
 */
export function defaultKillSwitchState(): ResolutionKillSwitchState {
  return Object.freeze({
    globalKill: false,
    featureKills: Object.freeze([]),
    authorityKills: Object.freeze([]),
  });
}

/**
 * Verifica se il global kill è attivo.
 */
export function isGlobalKillActive(state: ResolutionKillSwitchState): boolean {
  return state.globalKill === true;
}

/**
 * Verifica se una feature è uccisa.
 */
export function isFeatureKilled(state: ResolutionKillSwitchState, featureId: string): boolean {
  return state.featureKills.includes(featureId);
}

/**
 * Verifica se un'authority è uccisa (le sue decisioni vengono filtrate).
 */
export function isAuthorityKilled(
  state: ResolutionKillSwitchState,
  authorityId: AuthoritySourceId
): boolean {
  return state.authorityKills.includes(authorityId);
}
