/**
 * Privacy Guard — NoOp (6.2.3)
 *
 * Stesso contratto del Privacy Guard reale.
 * Nessuna esclusione; tutti gli eventi passano al downstream.
 * Per test di invarianza, wiring MVP, fallback sicuro.
 */

import type { DomainEvent } from '../events/DomainEvent';
import type { DomainEventListener } from '../events/DomainEventListener';

export class NoOpPrivacyGuard implements DomainEventListener {
  constructor(private readonly downstream: DomainEventListener) {}

  handle(event: DomainEvent): void {
    this.downstream.handle(event);
  }
}
