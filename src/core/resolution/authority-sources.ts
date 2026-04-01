/**
 * Authority Sources — Microstep 6.5.1
 *
 * Gerarchia ordinata e immutabile delle autorità di risoluzione delle preferenze.
 * Ordine hard-coded: nessuna mediazione tra authority, nessun override a runtime.
 * Determinismo totale; serializzazione completa; compatibile con replay Fase 13.
 */

/** Identificatore di una authority. Ordine nell'array = ordine di precedenza (indice 0 = massima). */
export type AuthoritySourceId = (typeof AUTHORITY_SOURCE_ORDER)[number];

/**
 * Ordine fisso delle Authority Sources.
 * La prima authority (in questo ordine) che emette una decisione non-ALLOWED vince; le successive non modificano il risultato.
 * Non modificabile a runtime: garantisce audit deterministico e replay.
 */
export const AUTHORITY_SOURCE_ORDER = [
  'USER_HARD_BLOCK',
  'WELLBEING_PROTECTION',
  'SYSTEM_GUARDRAIL',
  'PRODUCT_MODE',
  'FEATURE_POLICY',
  'DEFAULT_BEHAVIOR',
] as const;

/** Numero di authority (per validazione e iterazione). */
export const AUTHORITY_SOURCE_COUNT = AUTHORITY_SOURCE_ORDER.length;

/**
 * Indice di precedenza: minore = maggiore precedenza.
 * USER_HARD_BLOCK ha precedenza 0 (massima); DEFAULT_BEHAVIOR ha precedenza 5 (minima).
 */
export function getAuthorityPrecedence(authorityId: AuthoritySourceId): number {
  const idx = AUTHORITY_SOURCE_ORDER.indexOf(authorityId);
  return idx === -1 ? AUTHORITY_SOURCE_COUNT : idx;
}

/**
 * Verifica che un valore sia un AuthoritySourceId valido.
 */
export function isAuthoritySourceId(value: string): value is AuthoritySourceId {
  return (AUTHORITY_SOURCE_ORDER as readonly string[]).includes(value);
}

/**
 * Restituisce l'ordine come array di stringhe (serializzazione canonica).
 */
export function getAuthoritySourceOrder(): readonly string[] {
  return AUTHORITY_SOURCE_ORDER;
}

/*
 * Garanzie di precedenza:
 * - USER_HARD_BLOCK: blocco esplicito dell'utente; nessuna authority può sovrascrivere.
 * - WELLBEING_PROTECTION: protezione wellbeing; vince su guardrail, mode, policy, default.
 * - SYSTEM_GUARDRAIL: limiti di sicurezza execution; vince su mode, policy, default.
 * - PRODUCT_MODE: restrizioni di modalità prodotto; vince su policy, default.
 * - FEATURE_POLICY: policy di attivazione feature (Fase 5); vince su default.
 * - DEFAULT_BEHAVIOR: nessuna restrizione; equivale a ALLOWED se tutte le precedenti sono ALLOWED.
 *
 * Impossibilità di override runtime: questo modulo esporta solo costanti e funzioni pure.
 * Nessun registro configurabile, nessuna iniezione di ordine. Test di precedenza devono
 * usare esclusivamente AUTHORITY_SOURCE_ORDER e getAuthorityPrecedence.
 */
