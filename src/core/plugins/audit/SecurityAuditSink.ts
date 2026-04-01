/**
 * Security Audit Sink - contratto per destinatari eventi audit
 * Microstep 5.4.3
 *
 * Sincrono. Non deve mai lanciare. Il core non dipende da implementazioni concrete.
 */

import type { SecurityAuditEvent } from './SecurityAuditEvent';

export interface SecurityAuditSink {
  record(event: SecurityAuditEvent): void;
}
