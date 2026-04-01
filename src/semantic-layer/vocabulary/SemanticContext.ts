/**
 * SemanticContext — 8.1.2 §3.2
 * Contesto interpretativo associato a azione, evento, stato.
 *
 * Contratto: descrittivo, non prescrittivo; NON introduce obblighi; NON giustifica limiti tecnici.
 */

export type SemanticContextId = string;

/** Origine del contesto. */
export type SemanticContextOrigin = 'Derived' | 'UserDeclared';

/**
 * SemanticContext — forma vincolante 8.1.2.
 */
export interface SemanticContext {
  readonly id: SemanticContextId;
  readonly origin: SemanticContextOrigin;
  readonly expiresAt?: number;
}

export const SEMANTIC_CONTEXT_CONTRACT =
  'SemanticContext is descriptive only; MUST NOT introduce obligations or justify Phase 7 limits.';
