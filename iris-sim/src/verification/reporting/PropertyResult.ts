/**
 * S-3 — Single property result for verification report.
 */

import type { PropertyStatus } from '../core/VerificationTypes.js';
import type { PropertyType } from '../core/VerificationTypes.js';

export interface PropertyResult {
  readonly id: string;
  readonly description: string;
  readonly type: PropertyType;
  readonly status: PropertyStatus;
  readonly details?: string;
}

export function createPropertyResult(
  id: string,
  description: string,
  type: PropertyType,
  status: PropertyStatus,
  details?: string,
): PropertyResult {
  const result: PropertyResult = details !== undefined
    ? Object.freeze({ id, description, type, status, details })
    : Object.freeze({ id, description, type, status });
  return result;
}
