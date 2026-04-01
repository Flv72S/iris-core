/**
 * Phase 13XX-G — Trust Ledger. High-level service (events → entries).
 */

import type { AnomalyEvent } from '../anomaly_detection/index.js';
import type { GovernanceDecision } from '../governance_engine/index.js';
import type { LedgerEntry } from './ledger_entry.js';
import type { LedgerStore } from './ledger_storage.js';
import { LedgerWriter } from './ledger_writer.js';
import { LedgerReader } from './ledger_reader.js';

export class TrustLedgerService {
  private readonly store: LedgerStore;
  private readonly writer: LedgerWriter;
  private readonly reader: LedgerReader;

  constructor(store: LedgerStore) {
    this.store = store;
    this.writer = new LedgerWriter(store);
    this.reader = new LedgerReader(store);
  }

  recordTrustUpdate(
    node_id: string,
    previous_score: number,
    new_score: number,
    timestamp: number
  ): void {
    const entry_id = this.nextEntryId();
    const entry: LedgerEntry = {
      entry_id,
      node_id,
      type: 'TRUST_UPDATE',
      timestamp,
      data: { previous_score, new_score },
    };
    this.writer.append(entry);
  }

  recordAnomaly(anomaly: AnomalyEvent): void {
    const entry_id = this.nextEntryId();
    const entry: LedgerEntry = {
      entry_id,
      node_id: anomaly.node_id,
      type: 'ANOMALY_DETECTED',
      timestamp: anomaly.detected_at,
      data: {
        anomaly_type: anomaly.anomaly_type,
        severity: anomaly.severity,
        description: anomaly.description,
        detected_at: anomaly.detected_at,
      },
    };
    this.writer.append(entry);
  }

  recordGovernanceDecision(decision: GovernanceDecision): void {
    const entry_id = this.nextEntryId();
    const entry: LedgerEntry = {
      entry_id,
      node_id: decision.node_id,
      type: 'GOVERNANCE_DECISION',
      timestamp: decision.decided_at,
      data: {
        action: decision.action,
        reason: decision.reason,
        severity: decision.severity,
        decided_at: decision.decided_at,
      },
    };
    this.writer.append(entry);
  }

  recordPassportUpdate(
    node_id: string,
    changes: Record<string, unknown>,
    timestamp: number
  ): void {
    const entry_id = this.nextEntryId();
    const entry: LedgerEntry = {
      entry_id,
      node_id,
      type: 'PASSPORT_UPDATE',
      timestamp,
      data: { changes, timestamp },
    };
    this.writer.append(entry);
  }

  getEntriesForNode(node_id: string): LedgerEntry[] {
    return this.reader.getEntriesForNode(node_id);
  }

  getEntriesByType(type: LedgerEntry['type']): LedgerEntry[] {
    return this.reader.getEntriesByType(type);
  }

  getEntry(entry_id: string): LedgerEntry | null {
    return this.reader.getEntry(entry_id);
  }

  verifyIntegrity(): boolean {
    return this.reader.verifyIntegrity();
  }

  private nextEntryId(): string {
    const count = this.store.getAll().length;
    return `entry-${count}`;
  }
}
