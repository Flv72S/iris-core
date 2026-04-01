/**
 * Microstep 14S — Trust & Verification Layer. Types.
 */

import type { CovenantPersistenceRecord } from '../covenant_persistence/index.js';

export interface SignedRecordEnvelope {
  readonly record: CovenantPersistenceRecord;
  readonly signature: string; // base64
  readonly public_key?: string; // base64 DER (spki) (optional for forward-compatibility)
  readonly key_id?: string;
  readonly node_id: string;
  readonly signed_at: number;
  readonly record_hash?: string;
}

