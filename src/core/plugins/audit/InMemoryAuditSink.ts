/**
 * In-Memory Audit Sink - conserva eventi in array (solo test e sviluppo)
 * Microstep 5.4.3
 */

import type { SecurityAuditEvent } from './SecurityAuditEvent';
import type { SecurityAuditSink } from './SecurityAuditSink';

export class InMemoryAuditSink implements SecurityAuditSink {
  private readonly events: SecurityAuditEvent[] = [];

  record(event: SecurityAuditEvent): void {
    this.events.push(event);
  }

  getEvents(): readonly SecurityAuditEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events.length = 0;
  }
}
