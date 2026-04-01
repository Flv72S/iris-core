/**
 * Step 8L — Governance Autonomous Watcher. Alert type.
 */

import { createHash } from 'node:crypto';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface GovernanceAlert {
  readonly alert_id: string;
  readonly type: string;
  readonly severity: AlertSeverity;
  readonly source: 'GovernanceWatcher';
  readonly description: string;
  readonly reference_event_id?: string;
  readonly reference_hash?: string;
  readonly timestamp: number;
  readonly alert_hash: string;
}

const SOURCE = 'GovernanceWatcher';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Build alert with deterministic alert_id and alert_hash.
 */
export function createGovernanceAlert(
  type: string,
  severity: AlertSeverity,
  description: string,
  reference_hash?: string,
  reference_event_id?: string
): GovernanceAlert {
  const timestamp = Date.now();
  const alert_id = sha256Hex(type + (reference_hash ?? '') + String(timestamp));
  const payload = { type, severity, source: SOURCE, description, reference_event_id, reference_hash, timestamp };
  const alert_hash = sha256Hex(JSON.stringify(payload));
  return Object.freeze({
    alert_id,
    type,
    severity,
    source: SOURCE,
    description,
    ...(reference_event_id !== undefined && { reference_event_id }),
    ...(reference_hash !== undefined && { reference_hash }),
    timestamp,
    alert_hash,
  });
}
