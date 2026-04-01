/**
 * Microstep 14I — Deterministic Replay Engine. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ConsensusProposal, ConsensusResult, ConsensusVote } from '../../consensus/index.js';
import {
  ConsensusLogEntryType,
  ConsensusLogObserver,
  LogStorage,
  PersistentConsensusLog,
} from '../../consensus_log/index.js';
import { ReplayEngine } from '../replay_engine.js';
import { ReplayErrorType } from '../replay_errors.js';
import { ReplayValidator } from '../replay_validator.js';

function createTempFilePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'iris-replay-'));
  return join(dir, name);
}

function proposal(p: string, diff_hash: string, version = 1): ConsensusProposal {
  return { proposal_id: p, author_node: 'node-0', state_version: version, diff_hash, created_at: 123 };
}

function vote(p: string, node = 'n1', accepted = true): ConsensusVote {
  return { node_id: node, proposal_id: p, accepted, timestamp: 124 };
}

function result(p: string, accepted = true): ConsensusResult {
  return { proposal_id: p, accepted, quorum_reached: true, total_votes: 3 };
}

describe('Deterministic Replay Engine (14I)', () => {
  it('same log → same state (deterministic)', () => {
    const filePath = createTempFilePath('consensus.log');
    const log = new PersistentConsensusLog(new LogStorage(filePath));
    const observer = new ConsensusLogObserver(log);

    const expected = ReplayValidator.computeFinalHash({
      accepted_proposals: Object.freeze(['p1']),
      last_accepted_proposal_id: 'p1',
      last_expected_state_hash: null,
    });

    observer.onProposalCreated(proposal('p1', expected));
    observer.onVoteCollected(vote('p1', 'a'));
    observer.onConsensusReached(result('p1', true));

    const entries = log.getAll();
    const a = ReplayEngine.replay(entries);
    const b = ReplayEngine.replay(entries);
    assert.deepStrictEqual(a, b);
  });

  it('valid log → valid=true', () => {
    const filePath = createTempFilePath('consensus.log');
    const storage = new LogStorage(filePath);
    const log = new PersistentConsensusLog(storage);
    const observer = new ConsensusLogObserver(log);

    const expected = ReplayValidator.computeFinalHash({
      accepted_proposals: Object.freeze(['p1']),
      last_accepted_proposal_id: 'p1',
      last_expected_state_hash: null,
    });

    observer.onProposalCreated(proposal('p1', expected));
    observer.onConsensusReached(result('p1', true));

    const r = ReplayEngine.replay(log.getAll());
    assert.strictEqual(r.valid, true);
    assert.strictEqual(r.errors.length, 0);
  });

  it('tampered log → INVALID_HASH_CHAIN', () => {
    const filePath = createTempFilePath('consensus.log');
    const log = new PersistentConsensusLog(new LogStorage(filePath));
    const observer = new ConsensusLogObserver(log);

    observer.onProposalCreated(proposal('p1', 'x'.repeat(64)));
    observer.onConsensusReached(result('p1', true));

    // Tamper by breaking previous_hash linkage (edit line 2)
    const lines = readFileSync(filePath, 'utf8').trim().split(/\r?\n/);
    const second = JSON.parse(lines[1]!) as Record<string, unknown>;
    second.previous_hash = '0'.repeat(64);
    lines[1] = JSON.stringify(second);
    writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');

    // For replay tests we ingest raw entries; deserialize is part of consensus_log bootstrapping,
    // but here we want ReplayEngine to flag invalid chain.
    let entries: any[];
    try {
      entries = new PersistentConsensusLog(new LogStorage(filePath)).getAll();
      // If bootstrapping passes (shouldn't), force failure
      assert.fail('PersistentConsensusLog bootstrap should have failed');
    } catch {
      // Read raw JSON lines into objects to feed ReplayEngine (simulating external audit ingestion)
      entries = readFileSync(filePath, 'utf8')
        .trim()
        .split(/\r?\n/)
        .map((l) => JSON.parse(l));
    }

    const r = ReplayEngine.replay(entries as any);
    assert.strictEqual(r.valid, false);
    assert.ok(r.errors.some((e) => e.type === ReplayErrorType.INVALID_HASH_CHAIN));
  });

  it('tampered result expectation → STATE_MISMATCH', () => {
    const filePath = createTempFilePath('consensus.log');
    const log = new PersistentConsensusLog(new LogStorage(filePath));
    const observer = new ConsensusLogObserver(log);

    observer.onProposalCreated(proposal('p1', 'a'.repeat(64)));
    observer.onConsensusReached(result('p1', true));

    const r = ReplayEngine.replay(log.getAll());
    assert.strictEqual(r.valid, false);
    assert.ok(r.errors.some((e) => e.type === ReplayErrorType.STATE_MISMATCH));
  });

  it('partial log (missing proposal) → MISSING_EVENT', () => {
    const filePath = createTempFilePath('consensus.log');
    const log = new PersistentConsensusLog(new LogStorage(filePath));
    // Append only consensus reached without proposal
    log.append(ConsensusLogEntryType.CONSENSUS_REACHED, result('p1', true));

    const r = ReplayEngine.replay(log.getAll());
    assert.strictEqual(r.valid, false);
    assert.ok(r.errors.some((e) => e.type === ReplayErrorType.MISSING_EVENT));
  });
});

