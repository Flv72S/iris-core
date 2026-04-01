import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AuditLog } from '../audit_log.js';
import { appendAuditRecord, readAuditMeta, writeAuditMeta, loadAuditLog } from '../audit_persist.js';
import { chainAuditRecord } from '../audit_hash.js';
import { signAuditRecord, verifyAuditRecordSignature } from '../audit_sign.js';
import type { TrustAuditRecord } from '../audit_types.js';
import { signPayload } from '../../security/hmac.js';
import { stableStringify } from '../../security/stable_json.js';

const SEC = 'test-audit-hmac-secret-012345678901234567890';
const SIGNER = 'LOCAL-SIGNER';

function basePartial(eventId: string, extra: Partial<TrustAuditRecord> = {}): TrustAuditRecord {
  return {
    recordId: '',
    eventId,
    nodeId: 'X',
    timestamp: 1000,
    eventType: 'NODE_ACTIVATED' as const,
    payloadHash: 'ph',
    issuer: 'A',
    verified: true,
    signerNodeId: SIGNER,
    recordHash: '',
    ...extra,
  };
}

describe('Audit hardening (16F.X1.HARDENING)', () => {
  it('signature validity: valid passes; tampered body fails', () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-audit-h1-'));
    const log = new AuditLog({ cwd: d, signingSecret: SEC, signerNodeId: SIGNER });
    log.append(basePartial('e1'));
    const r0 = log.getAll()[0]!;
    assert.strictEqual(verifyAuditRecordSignature(r0, SEC), true);
    assert.strictEqual(log.verifyRecord(r0, { deep: true, resolveSignerSecret: () => SEC }), true);
    const tampered = { ...r0, payloadHash: 'nope' };
    assert.strictEqual(
      log.verifyRecord(tampered, { deep: true, resolveSignerSecret: () => SEC }),
      false,
    );
  });

  it('chain truncation: shortened log fails meta/chain on reload', () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-audit-h2-'));
    {
      const log = new AuditLog({ cwd: d, signingSecret: SEC, signerNodeId: SIGNER });
      log.append(basePartial('a'));
      log.append(basePartial('b'));
    }
    const p = path.join(d, '.iris', 'trust_audit.log');
    const lines = fs.readFileSync(p, 'utf8').trimEnd().split('\n');
    fs.writeFileSync(p, `${lines[0]}\n`, 'utf8');
    assert.throws(() => new AuditLog({ cwd: d, signingSecret: SEC, signerNodeId: SIGNER }), /AUDIT_META_MISMATCH/);
  });

  it('meta mismatch: tampered meta fails startup', () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-audit-h3-'));
    {
      const log = new AuditLog({ cwd: d, signingSecret: SEC, signerNodeId: SIGNER });
      log.append(basePartial('only'));
    }
    writeAuditMeta(d, { lastRecordHash: 'deadbeef', totalRecords: 1 });
    assert.throws(() => new AuditLog({ cwd: d, signingSecret: SEC, signerNodeId: SIGNER }), /AUDIT_META_MISMATCH/);
  });

  it('deep verification: invalid endorsement fails deep only (shallow passes)', () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-audit-h4-'));
    const boot = new AuditLog({ cwd: d, signingSecret: SEC, signerNodeId: SIGNER });
    boot.append(basePartial('anchor'));
    const prev = boot.getAll()[0]!;
    const wrongEnc = signPayload(SEC, stableStringify({ not: 'endorsement_payload' }));
    const chained = chainAuditRecord(
      prev,
      basePartial('endorsed', {
        timestamp: 1002,
        payloadHash: 'ph3',
        endorsements: [{ nodeId: 'A', signature: wrongEnc }],
      }),
    );
    const signed = { ...chained, signature: signAuditRecord(chained, SEC) };
    appendAuditRecord(d, signed);
    writeAuditMeta(d, { lastRecordHash: signed.recordHash, totalRecords: 2 });

    const log = new AuditLog({ cwd: d, signingSecret: SEC, signerNodeId: SIGNER });
    assert.strictEqual(log.verifyChain(), true);
    const deepOpts = {
      deep: true as const,
      resolveSignerSecret: () => SEC,
      resolveIssuerSecret: () => SEC,
      resolveEndorserSecret: () => SEC,
    };
    assert.strictEqual(log.verifyChain(deepOpts), false);
  });

  it('crash consistency: orphan append without meta update fails next open', () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-audit-h5-'));
    const log = new AuditLog({ cwd: d, signingSecret: SEC, signerNodeId: SIGNER });
    log.append(basePartial('ok'));
    const honest = log.getAll()[0]!;
    const orphan = chainAuditRecord(honest, basePartial('orphan'));
    const orphanSigned = { ...orphan, signature: signAuditRecord(orphan, SEC) };
    appendAuditRecord(d, orphanSigned);
    assert.throws(() => new AuditLog({ cwd: d, signingSecret: SEC, signerNodeId: SIGNER }), /AUDIT_META_MISMATCH/);
  });

  it('reload after clean append: disk matches memory', () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-audit-h6-'));
    {
      const log = new AuditLog({ cwd: d, signingSecret: SEC, signerNodeId: SIGNER });
      log.append(basePartial('r1'));
      log.append(basePartial('r2'));
    }
    const log2 = new AuditLog({ cwd: d, signingSecret: SEC, signerNodeId: SIGNER });
    assert.strictEqual(log2.getAll().length, 2);
    assert.strictEqual(log2.verifyChain(), true);
    const m = readAuditMeta(d);
    assert.strictEqual(m?.totalRecords, 2);
    assert.strictEqual(m?.lastRecordHash, log2.getAll()[1]!.recordHash);
    assert.deepStrictEqual(loadAuditLog(d), log2.getAll());
  });
});
