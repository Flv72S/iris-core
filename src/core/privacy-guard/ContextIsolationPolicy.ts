/**
 * Privacy Guard — Context Isolation Policy (6.2.3)
 *
 * Contesti dichiarati non osservabili (es. chat futile, effimere):
 * eventi non alimentano L0/L1. Il dominio continua a funzionare.
 */

import type { DomainEvent } from '../events/DomainEvent';
import type { PrivacyContext } from './PrivacyContext';
import type { PrivacyPolicy } from './PrivacyPolicy';

export class ContextIsolationPolicy implements PrivacyPolicy {
  evaluate(event: DomainEvent, context: PrivacyContext): 'allow' | 'deny' {
    if (context.guardDisabled) return 'allow';
    const contextId = context.getContextIdFromEvent?.(event) ?? null;
    if (contextId != null && context.isolatedContextIds.has(contextId)) return 'deny';
    return 'allow';
  }
}
