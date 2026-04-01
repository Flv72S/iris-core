/**
 * Privacy Guard — contesto di policy (6.2.3)
 *
 * Contiene opt-out, contesti isolati, kill-switch.
 * Gli estrattori (getUserIdFromEvent, getContextIdFromEvent) sono opzionali
 * e forniti dal wiring; il guard non conosce il dominio.
 */

import type { DomainEvent } from '../events/DomainEvent';

export interface PrivacyContext {
  /** Utenti che hanno opt-out: nessun loro evento alimenta L0/L1. */
  readonly optedOutUserIds: ReadonlySet<string>;
  /** Contesti (es. thread/chat) dichiarati non osservabili. */
  readonly isolatedContextIds: ReadonlySet<string>;
  /** Se true, tutti gli eventi passano (NoOp effettivo). */
  readonly guardDisabled: boolean;
  /** Estrattore opzionale: da evento a userId. Fornito dal wiring. */
  readonly getUserIdFromEvent?: (event: DomainEvent) => string | null;
  /** Estrattore opzionale: da evento a contextId (es. threadId). Fornito dal wiring. */
  readonly getContextIdFromEvent?: (event: DomainEvent) => string | null;
}
