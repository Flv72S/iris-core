/**
 * Security Audit Event - evento immutabile e serializzabile
 * Microstep 5.4.3
 *
 * Nessuna informazione sensibile. Nessun riferimento a error stack.
 */

export type AuditDecision = 'ALLOW' | 'DENY';

export type AuditLayer = 'PLUGIN' | 'CAPABILITY' | 'TENANT';

export interface SecurityAuditEvent {
  readonly timestamp: number;
  readonly pluginId: string;
  readonly pluginVersion?: string;
  readonly decision: AuditDecision;
  readonly layer: AuditLayer;
  readonly reason?: string;
  readonly capability?: string;
  readonly tenantId?: string;
  readonly environment: string;
  readonly apiVersion: string;
}

/** Crea un evento audit immutabile (frozen). */
export function createSecurityAuditEvent(
  input: Readonly<{
    timestamp: number;
    pluginId: string;
    pluginVersion?: string;
    decision: AuditDecision;
    layer: AuditLayer;
    reason?: string;
    capability?: string;
    tenantId?: string;
    environment: string;
    apiVersion: string;
  }>
): SecurityAuditEvent {
  return Object.freeze({
    timestamp: input.timestamp,
    pluginId: input.pluginId,
    pluginVersion: input.pluginVersion,
    decision: input.decision,
    layer: input.layer,
    reason: input.reason,
    capability: input.capability,
    tenantId: input.tenantId,
    environment: input.environment,
    apiVersion: input.apiVersion,
  });
}
