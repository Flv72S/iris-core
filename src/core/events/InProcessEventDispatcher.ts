/**
 * In-Process Event Dispatcher — distribuzione sincrona (Blocco 6.1.2)
 *
 * Inoltra eventi già accaduti ai listener in ordine di registrazione.
 * Non decide nulla, non muta stato, non conosce il dominio.
 * Logging solo a livello debug (opzionale).
 */

import type { DomainEvent } from './DomainEvent';
import type { DomainEventListener } from './DomainEventListener';

export type DispatcherDebugLog = (
  eventType: string,
  occurredAt: number,
  listenerCount: number
) => void;

export interface InProcessEventDispatcherOptions {
  /** Chiamato solo a livello debug, se fornito. Nessun log su info/warn/error. */
  debugLog?: DispatcherDebugLog;
}

export class InProcessEventDispatcher {
  private readonly listeners: DomainEventListener[] = [];
  private readonly debugLog?: DispatcherDebugLog;

  constructor(options?: InProcessEventDispatcherOptions) {
    this.debugLog = options?.debugLog;
  }

  register(listener: DomainEventListener): void {
    this.listeners.push(listener);
  }

  dispatch(event: DomainEvent): void {
    if (this.debugLog) {
      this.debugLog(event.eventType, event.occurredAt, this.listeners.length);
    }
    for (const listener of this.listeners) {
      listener.handle(event);
    }
  }
}
