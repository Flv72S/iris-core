/**
 * Privacy Guard — interfaccia policy (6.2.3)
 *
 * Policy pure, testabili isolatamente, sostituibili.
 * Nessun side-effect; solo allow/deny.
 */

import type { DomainEvent } from '../events/DomainEvent';
import type { PrivacyContext } from './PrivacyContext';
import type { PrivacyDecision } from './PrivacyDecision';

export interface PrivacyPolicy {
  evaluate(event: DomainEvent, context: PrivacyContext): PrivacyDecision;
}
