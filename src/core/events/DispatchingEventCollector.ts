/**
 * Dispatching Event Collector — bridge collector → dispatcher (Blocco 6.1.2)
 *
 * Implementa DomainEventCollector: alla emit() chiama dispatcher.dispatch(event).
 * Il dominio non conosce il dispatcher; riceve solo un collector.
 */

import type { DomainEvent } from './DomainEvent';
import type { DomainEventCollector } from './EventCollector';
import type { InProcessEventDispatcher } from './InProcessEventDispatcher';

export class DispatchingEventCollector implements DomainEventCollector {
  constructor(private readonly dispatcher: InProcessEventDispatcher) {}

  emit(event: DomainEvent): void {
    this.dispatcher.dispatch(event);
  }
}
