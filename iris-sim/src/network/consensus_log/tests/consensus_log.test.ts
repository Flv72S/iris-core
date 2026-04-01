/**
 * Microstep 14H — Persistent Consensus Log. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ConsensusProposal, ConsensusResult, ConsensusVote } from '../../consensus/index.js';
import {
  computeEntryHash,
  ConsensusLogEntryType,
  ConsensusLogIntegrityError,
  ConsensusLogIntegrityErrorCode,
  ConsensusLogObserver,
  LogStorage,
  PersistentConsensusLog,
} from '../index.js';

function createTempFilePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'iris-consensus-log-'));
  return join(dir, name);
}

function proposal(p: string, version = 1): ConsensusProposal {
  return { proposal_id: p, author_node: 'node-0', state_version: version, diff_hash: 'h', created_at: 123 };
}

function vote(p: string, node = 'n1', accepted = true): ConsensusVote {
  return { node_id: node, proposal_id: p, accepted, timestamp: 124 };
}

function result(p: string, accepted = true): ConsensusResult {
  return { proposal_id: p, accepted, quorum_reached: true, total_votes: 3 };
}

describe('PersistentConsensusLog (14H)', () => {
  it('append → stored correctly', () => {
    const filePath = createTempFilePath('consensus.log');
    const storage = new LogStorage(filePath);
    const log = new PersistentConsensusLog(storage);

    const e1 = log.append(ConsensusLogEntryType.PROPOSAL_CREATED, proposal('p1'));
    const all = log.getAll();
    assert.strictEqual(all.length, 1);
    assert.strictEqual(all[0].id, e1.id);

    const raw = readFileSync(filePath, 'utf8').trim();
    assert.ok(raw.length > 0);
  });

  it('entries must be strictly ordered', () => {
    const filePath = createTempFilePath('consensus.log');
    const storage = new LogStorage(filePath);
    const log = new PersistentConsensusLog(storage);

    const e1 = log.append(ConsensusLogEntryType.PROPOSAL_CREATED, proposal('p1'));
    const e2 = log.append(ConsensusLogEntryType.VOTE_COLLECTED, vote('p1', 'a'));
    const e3 = log.append(ConsensusLogEntryType.CONSENSUS_REACHED, result('p1'));

    const all = log.getAll();
    assert.deepStrictEqual(
      all.map((e) => e.id),
      [e1.id, e2.id, e3.id],
    );
  });

  it('hash chain integrity: previous_hash links and recomputed hash matches', () => {
    const filePath = createTempFilePath('consensus.log');
    const storage = new LogStorage(filePath);
    const log = new PersistentConsensusLog(storage);

    log.append(ConsensusLogEntryType.PROPOSAL_CREATED, proposal('p1'));
    log.append(ConsensusLogEntryType.VOTE_COLLECTED, vote('p1', 'a'));
    log.append(ConsensusLogEntryType.CONSENSUS_REACHED, result('p1'));

    const all = log.getAll();
    for (let i = 0; i < all.length; i++) {
      const entry = all[i];
      const prev = i === 0 ? null : all[i - 1];
      assert.strictEqual(entry.previous_hash, prev ? prev.hash : null);
      const { hash, ...withoutHash } = entry;
      assert.strictEqual(computeEntryHash(withoutHash), hash);
    }
  });

  it('tampering detection: modify file manually → bootstrap must fail', () => {
    const filePath = createTempFilePath('consensus.log');
    const storage = new LogStorage(filePath);
    const log = new PersistentConsensusLog(storage);
    log.append(ConsensusLogEntryType.PROPOSAL_CREATED, proposal('p1'));

    const rawLine = readFileSync(filePath, 'utf8').trim();
    const parsed = JSON.parse(rawLine) as Record<string, unknown>;
    parsed.timestamp = Number(parsed.timestamp) + 1;
    writeFileSync(filePath, JSON.stringify(parsed) + '\n', 'utf8');

    assert.throws(
      () => new PersistentConsensusLog(new LogStorage(filePath)),
      (e: unknown) =>
        e instanceof ConsensusLogIntegrityError &&
        (e.code === ConsensusLogIntegrityErrorCode.HASH_MISMATCH || e.code === ConsensusLogIntegrityErrorCode.CHAIN_BROKEN),
    );
  });

  it('persistence: restart system → log reconstructed correctly', () => {
    const filePath = createTempFilePath('consensus.log');
    const storage = new LogStorage(filePath);
    const log1 = new PersistentConsensusLog(storage);
    log1.append(ConsensusLogEntryType.PROPOSAL_CREATED, proposal('p1'));
    log1.append(ConsensusLogEntryType.VOTE_COLLECTED, vote('p1', 'a'));

    const log2 = new PersistentConsensusLog(new LogStorage(filePath));
    const all = log2.getAll();
    assert.strictEqual(all.length, 2);
    assert.strictEqual(all[1].previous_hash, all[0].hash);
  });

  it('integration: proposal → votes → consensus lifecycle recorded', () => {
    const filePath = createTempFilePath('consensus.log');
    const log = new PersistentConsensusLog(new LogStorage(filePath));
    const observer = new ConsensusLogObserver(log);

    observer.onProposalCreated(proposal('p1'));
    observer.onVoteCollected(vote('p1', 'a'));
    observer.onVoteCollected(vote('p1', 'b'));
    observer.onConsensusReached(result('p1'));

    const all = log.getAll();
    assert.strictEqual(all.length, 4);
    assert.deepStrictEqual(
      all.map((e) => e.type),
      [
        ConsensusLogEntryType.PROPOSAL_CREATED,
        ConsensusLogEntryType.VOTE_COLLECTED,
        ConsensusLogEntryType.VOTE_COLLECTED,
        ConsensusLogEntryType.CONSENSUS_REACHED,
      ],
    );
  });
});

