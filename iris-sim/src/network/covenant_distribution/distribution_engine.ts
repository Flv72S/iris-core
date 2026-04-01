/**
 * Microstep 14R — Distribution & Sync Engine. Engine.
 */

import type { CovenantPersistenceStore } from '../covenant_persistence/index.js';
import type { DistributionEnvelope } from './distribution_types.js';
import type { DistributionTransport } from './distribution_transport.js';
import { DistributionSyncEngine } from './distribution_sync.js';
import { detectConflict } from './distribution_conflict.js';
import type { SignedRecordEnvelope } from '../covenant_trust/index.js';
import type { TrustEngine } from '../covenant_trust/index.js';

function isSignedEnvelope(e: unknown): e is SignedRecordEnvelope {
  if (e == null || typeof e !== 'object') return false;
  const o = e as Record<string, unknown>;
  const rec = o.record as Record<string, unknown> | undefined;
  return (
    typeof o.node_id === 'string' &&
    typeof o.signature === 'string' &&
    typeof o.public_key === 'string' &&
    typeof o.signed_at === 'number' &&
    rec != null &&
    typeof rec.record_id === 'string' &&
    typeof rec.covenant_id === 'string' &&
    typeof rec.version === 'number' &&
    typeof rec.action === 'string' &&
    typeof rec.definition === 'object' &&
    rec.definition !== null &&
    typeof rec.timestamp === 'number'
  );
}

export class DistributionEngine {
  private readonly sync: DistributionSyncEngine;

  constructor(
    private readonly store: CovenantPersistenceStore,
    private readonly transport: DistributionTransport,
    private readonly node_id: string,
    private readonly trust: TrustEngine,
  ) {
    this.sync = new DistributionSyncEngine(store);
  }

  start(): void {
    this.transport.onReceive((envelope) => this.handleIncoming(envelope));
  }

  async broadcast(records: SignedRecordEnvelope[]): Promise<void> {
    const envelope: DistributionEnvelope = {
      node_id: this.node_id,
      records,
      timestamp: Date.now(),
    };
    await this.transport.send(envelope);
  }

  async handleIncoming(envelope: DistributionEnvelope): Promise<void> {
    if (!envelope.node_id || typeof envelope.node_id !== 'string' || envelope.node_id.trim().length === 0) {
      return;
    }
    if (!envelope.records || !Array.isArray(envelope.records)) {
      return;
    }
    const validSigned: SignedRecordEnvelope[] = [];
    for (const e of envelope.records) {
      if (!isSignedEnvelope(e)) continue;
      try {
        this.trust.validate(e);
        validSigned.push(e);
      } catch {
        // Reject invalid/unknown nodes or tampered data.
      }
    }
    const validRecords = validSigned.map((e) => e.record);
    const local = this.store.getAll();
    if (detectConflict(local, validRecords)) {
      // Log conflict; do not overwrite, keep both histories (we still apply new record_ids)
    }
    this.sync.apply(validRecords);
  }
}
