/**
 * Privacy Guard — intercettore (6.2.3)
 *
 * Riceve eventi dal dispatcher; applica policy; ammette o scarta.
 * Eventi ammessi → downstream (Behavioral Memory). Eventi scartati → silenziosamente ignorati.
 * Il guard non modifica eventi; non conosce il dominio.
 */

import type { DomainEvent } from '../events/DomainEvent';
import type { DomainEventListener } from '../events/DomainEventListener';
import type { PrivacyContext } from './PrivacyContext';
import type { PrivacyPolicy } from './PrivacyPolicy';

export class PrivacyGuard implements DomainEventListener {
  constructor(
    private readonly downstream: DomainEventListener,
    private readonly policies: readonly PrivacyPolicy[],
    private readonly context: PrivacyContext
  ) {}

  handle(event: DomainEvent): void {
    try {
      if (this.context.guardDisabled) {
        this.downstream.handle(event);
        return;
      }
      for (const policy of this.policies) {
        if (policy.evaluate(event, this.context) === 'deny') return;
      }
      this.downstream.handle(event);
    } catch {
      // degradazione: non bloccare il flusso; in caso di errore non inoltrare
    }
  }
}
