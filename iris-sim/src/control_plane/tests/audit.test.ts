import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AuditLog } from '../audit_log.js';
import { computeAuditRecordHash } from '../audit_hash.js';
import { EvidenceStore } from '../evidence_store.js';
import { TrustSyncEngine, makeLocalTrustEvent } from '../trust_sync_engine.js';
import { ControlPlaneRegistry } from '../control_plane_registry.js';

function mkRecord(eventId: string) {
  return {
    recordId: '',
    eventId,
    nodeId: 'X',
    timestamp: 1,
    eventType: 'NODE_ACTIVATED' as const,
    payloadHash: 'abc',
    issuer: 'A',
    verified: true,
    recordHash: '',
  };
}

describe('Trust audit & evidence (16F.X1)', () => {
  it('append-only behavior', () => {
    const log = new AuditLog();
    const a = mkRecord('e1');
    const b = mkRecord('e2');
    log.append(a);
    log.append(b);
    assert.strictEqual(log.getAll().length, 2);
  });

  it('hash determinism', () => {
    const r = {
      recordId: 'x',
      eventId: 'e',
      nodeId: 'n',
      timestamp: 1,
      eventType: 'NODE_REVOKED' as const,
      payloadHash: 'p',
      issuer: 'i',
      verified: false,
      previousRecordHash: 'z',
    };
    assert.strictEqual(computeAuditRecordHash(r), computeAuditRecordHash(r));
  });

  it('chain integrity and tampering detection', () => {
    const log = new AuditLog();
    log.append(mkRecord('e1'));
    log.append(mkRecord('e2'));
    assert.strictEqual(log.verifyChain(), true);
    const tampered = log.getAll()[1]!;
    tampered.payloadHash = 'tampered';
    assert.strictEqual(log.verifyRecord(tampered), false);
  });

  it('replay verification', () => {
    const log = new AuditLog();
    log.append(mkRecord('same'));
    log.append(mkRecord('same-2'));
    assert.strictEqual(log.verifyChain(), true);
  });

  it('evidence accumulation', () => {
    const store = new EvidenceStore(() => 10);
    store.recordViolation('N', 'CONFLICTING_EVENT', 'e1');
    store.recordViolation('N', 'CONFLICTING_EVENT', 'e2');
    const ev = store.getEvidence('N');
    assert.strictEqual(ev.length, 1);
    assert.strictEqual(ev[0]!.occurrences, 2);
  });

  it('dual audit (pre/post validation) via TrustSyncEngine', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-audit-'));
    const reg = new ControlPlaneRegistry();
    reg.registerNodeWithSecret('B', 'B-node-secret-abcdefghijklmnopqrstuvwxyz', 1);
    reg.activateNode('B', 2);
    reg.registerNodeWithSecret('X', 'x-secret-abcdefghijklmnopqrstuvwxyz012345', 1);
    reg.activateNode('X', 2);
    const engine = new TrustSyncEngine({
      localNodeId: 'A',
      localSecret: 'A-shared-secret-01234567890123456789',
      registry: reg,
      resolveIssuerSecret: (id) =>
        id === 'A' ? 'A-shared-secret-01234567890123456789' : 'B-shared-secret-01234567890123456789',
      send: () => {},
      auditCwd: tmp,
    });
    engine.start();
    const ev = makeLocalTrustEvent({
      issuerNodeId: 'A',
      signingSecret: 'A-shared-secret-01234567890123456789',
      type: 'NODE_REVOKED',
      nodeId: 'X',
      payload: {},
      timestamp: 100,
    });
    engine.receive(ev);
    const all = engine.getAuditLog().getAll();
    assert.ok(all.length >= 2);
    assert.strictEqual(all.some((r) => r.verified === false), true);
    assert.strictEqual(all.some((r) => r.verified === true), true);
  });
});
