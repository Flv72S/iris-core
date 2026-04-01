/**
 * Step 8A — Audit logging. GovernanceAPIQuery log (in-memory, no persistent IO).
 */

export interface GovernanceAPIQueryLog {
  readonly endpoint: string;
  readonly caller_id: string;
  readonly timestamp: number;
  readonly response_hash: string;
}

const auditLog: GovernanceAPIQueryLog[] = [];

export function auditLogGovernanceQuery(
  endpoint: string,
  callerId: string,
  responseHash: string
): void {
  auditLog.push(
    Object.freeze({
      endpoint,
      caller_id: callerId,
      timestamp: Date.now(),
      response_hash: responseHash,
    })
  );
}

export function getAuditLog(): readonly GovernanceAPIQueryLog[] {
  return auditLog;
}

export function clearAuditLog(): void {
  auditLog.length = 0;
}
