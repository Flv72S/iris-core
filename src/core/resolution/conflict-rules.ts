/**
 * Conflict Resolution Rules — Microstep 6.5.3
 *
 * Regole esplicite e hard-coded per conflitti tra user intent, wellbeing, focus mode, feature policy.
 * Nessuna inferenza; precedence enforcement; rule_id stabile e versionato.
 */

import { AUTHORITY_SOURCE_ORDER, getAuthorityPrecedence } from './authority-sources';
import type { AuthoritySourceId } from './authority-sources';
import type { AuthorityDecision, AuthorityStatus } from './resolution-context';

/** Versione delle regole di conflitto. Incrementare al cambiamento delle regole. */
export const CONFLICT_RULES_VERSION = '1.0';

/** Rule ID stabili per audit e explainability. */
export const RULE_WELLBEING_OVER_USER_ALLOW = 'conflict.wellbeing-over-user-allow';
export const RULE_USER_HARD_BLOCK_ABSOLUTE = 'conflict.user-hard-block-absolute';
export const RULE_FOCUS_BLOCKS_DISTRACTIONS = 'conflict.focus-blocks-distractions';
export const RULE_FEATURE_POLICY_RESTRICTS = 'conflict.feature-policy-restricts';
export const RULE_ALL_ALLOWED = 'conflict.all-allowed';

/** Insieme di rule_id esposti per validazione e test. */
export const CONFLICT_RULE_IDS: readonly string[] = Object.freeze([
  RULE_WELLBEING_OVER_USER_ALLOW,
  RULE_USER_HARD_BLOCK_ABSOLUTE,
  RULE_FOCUS_BLOCKS_DISTRACTIONS,
  RULE_FEATURE_POLICY_RESTRICTS,
  RULE_ALL_ALLOWED,
]);

const NON_ALLOWED: readonly AuthorityStatus[] = Object.freeze(['BLOCKED', 'FORCED', 'SUSPENDED']);

function isNonAllowed(status: AuthorityStatus): boolean {
  return NON_ALLOWED.includes(status);
}

/**
 * Applica la precedenza hard-coded: restituisce la decisione vincente (prima authority in ordine con status non-ALLOWED).
 * Se tutte le decisioni sono ALLOWED o nessuna decisione è presente per una authority restrittiva, restituisce null (esito ALLOWED).
 *
 * Le decisioni in input possono essere in qualsiasi ordine; l'ordine di precedenza è dato da AUTHORITY_SOURCE_ORDER.
 */
export function getWinningDecision(
  decisions: readonly AuthorityDecision[]
): AuthorityDecision | null {
  for (let i = 0; i < AUTHORITY_SOURCE_ORDER.length; i++) {
    const authorityId = AUTHORITY_SOURCE_ORDER[i];
    const decision = decisions.find((d) => d.authorityId === authorityId);
    if (decision != null && isNonAllowed(decision.status)) {
      return decision;
    }
  }
  return null;
}

/**
 * Restituisce il rule_id canonico per l'esito (per audit e golden tests).
 * Mappa winning authority + contesto implicito a rule_id stabile.
 */
export function getConflictRuleId(
  winningDecision: AuthorityDecision | null
): string {
  if (winningDecision == null) return RULE_ALL_ALLOWED;
  switch (winningDecision.authorityId) {
    case 'USER_HARD_BLOCK':
      return RULE_USER_HARD_BLOCK_ABSOLUTE;
    case 'WELLBEING_PROTECTION':
      return RULE_WELLBEING_OVER_USER_ALLOW;
    case 'PRODUCT_MODE':
      return RULE_FOCUS_BLOCKS_DISTRACTIONS;
    case 'FEATURE_POLICY':
      return RULE_FEATURE_POLICY_RESTRICTS;
    case 'SYSTEM_GUARDRAIL':
    case 'DEFAULT_BEHAVIOR':
    default:
      return `conflict.${winningDecision.authorityId.toLowerCase()}`;
  }
}

/**
 * Ordina le decisioni per precedenza (indice 0 = massima precedenza).
 * Utile per costruire context.authorityDecisions in ordine canonico prima di resolve().
 */
export function orderDecisionsByPrecedence(
  decisions: readonly AuthorityDecision[]
): readonly AuthorityDecision[] {
  const byPrecedence = [...decisions].sort(
    (a, b) => getAuthorityPrecedence(a.authorityId) - getAuthorityPrecedence(b.authorityId)
  );
  return Object.freeze(byPrecedence);
}
