/**
 * Privacy Guard — User Opt-Out Policy (6.2.3)
 *
 * Se l'utente è opt-out: nessun evento osservativo passa.
 * Opt-out immediato e reversibile (tecnico).
 */

import type { DomainEvent } from '../events/DomainEvent';
import type { PrivacyContext } from './PrivacyContext';
import type { PrivacyPolicy } from './PrivacyPolicy';

export class UserOptOutPolicy implements PrivacyPolicy {
  evaluate(event: DomainEvent, context: PrivacyContext): 'allow' | 'deny' {
    if (context.guardDisabled) return 'allow';
    const userId = context.getUserIdFromEvent?.(event) ?? null;
    if (userId != null && context.optedOutUserIds.has(userId)) return 'deny';
    return 'allow';
  }
}
