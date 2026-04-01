import { randomUUID } from 'node:crypto';
import type { ConsensusLogEntry } from './log_entry.js';
import { computeEntryHash } from './log_hash_chain.js';
import type { LogStorage } from './log_storage.js';
import { ConsensusLogIntegrityError, ConsensusLogIntegrityErrorCode, type ConsensusLogEntryType } from './log_types.js';

export class PersistentConsensusLog {
  private lastHash: string | null = null;

  constructor(private readonly storage: LogStorage) {
    this.bootstrap();
  }

  private bootstrap(): void {
    const entries = this.storage.readAll();
    let prev: ConsensusLogEntry | null = null;
    for (const entry of entries) {
      const { hash, ...withoutHash } = entry;
      const expected = computeEntryHash(withoutHash);
      if (expected !== hash) {
        throw new ConsensusLogIntegrityError(
          ConsensusLogIntegrityErrorCode.HASH_MISMATCH,
          `Consensus log entry hash mismatch (id=${entry.id}).`,
        );
      }
      const expectedPrev = prev ? prev.hash : null;
      if (entry.previous_hash !== expectedPrev) {
        throw new ConsensusLogIntegrityError(
          ConsensusLogIntegrityErrorCode.CHAIN_BROKEN,
          `Consensus log chain broken at entry (id=${entry.id}).`,
        );
      }
      prev = entry;
    }
    this.lastHash = prev ? prev.hash : null;
  }

  append(type: ConsensusLogEntryType, payload: unknown): ConsensusLogEntry {
    const entryWithoutHash: Omit<ConsensusLogEntry, 'hash'> = {
      id: randomUUID(),
      type,
      timestamp: Date.now(),
      payload,
      previous_hash: this.lastHash,
    };

    const hash = computeEntryHash(entryWithoutHash);
    const entry: ConsensusLogEntry = { ...entryWithoutHash, hash };
    this.storage.append(entry);
    this.lastHash = hash;
    return entry;
  }

  getAll(): ConsensusLogEntry[] {
    const entries = this.storage.readAll();
    // Ensure invariants for callers even if file was tampered after instantiation.
    let prev: ConsensusLogEntry | null = null;
    for (const entry of entries) {
      const { hash, ...withoutHash } = entry;
      const expected = computeEntryHash(withoutHash);
      if (expected !== hash) {
        throw new ConsensusLogIntegrityError(
          ConsensusLogIntegrityErrorCode.HASH_MISMATCH,
          `Consensus log entry hash mismatch (id=${entry.id}).`,
        );
      }
      const expectedPrev = prev ? prev.hash : null;
      if (entry.previous_hash !== expectedPrev) {
        throw new ConsensusLogIntegrityError(
          ConsensusLogIntegrityErrorCode.CHAIN_BROKEN,
          `Consensus log chain broken at entry (id=${entry.id}).`,
        );
      }
      prev = entry;
    }
    return entries;
  }
}

