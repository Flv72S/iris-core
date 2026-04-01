/**
 * Security Audit Dispatcher - distribuzione eventi ai sink
 * Microstep 5.4.3
 *
 * Se un sink lancia → ignorare e continuare. Ordine deterministico.
 */

import type { SecurityAuditEvent } from './SecurityAuditEvent';
import type { SecurityAuditSink } from './SecurityAuditSink';

export class SecurityAuditDispatcher {
  private readonly sinks: SecurityAuditSink[] = [];

  registerSink(sink: SecurityAuditSink): void {
    this.sinks.push(sink);
  }

  /**
   * Invia l'evento a tutti i sink. Se un sink lancia, ignorare e continuare.
   */
  dispatch(event: SecurityAuditEvent): void {
    for (const sink of this.sinks) {
      try {
        sink.record(event);
      } catch {
        // Ignorare: fail-safe, nessun side-effect visibile
      }
    }
  }
}
