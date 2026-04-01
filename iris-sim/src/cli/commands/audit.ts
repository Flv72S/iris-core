import fs from 'node:fs';

import { AuditLog, type AuditVerifyOptions } from '../../control_plane/audit_log.js';
import { createAuditSnapshot } from '../../control_plane/audit_snapshot.js';
import { EvidenceStore } from '../../control_plane/evidence_store.js';
import { verifyMerkleProof } from '../../control_plane/merkle_proof.js';
import type { MerkleProof } from '../../control_plane/merkle_types.js';
import type { CliCommandResult } from '../cli_types.js';

function positionalArgs(argv: string[]): string[] {
  const out: string[] = [];
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--file' && argv[i + 1]) {
      i++;
      continue;
    }
    if (a.startsWith('-')) continue;
    out.push(a);
  }
  return out;
}

function fileArg(argv: string[]): string | undefined {
  const fi = argv.indexOf('--file');
  if (fi >= 0 && argv[fi + 1] && !argv[fi + 1]!.startsWith('-')) return argv[fi + 1];
  return undefined;
}

function deepVerifyOptionsFromEnv(): AuditVerifyOptions | undefined {
  const secret = process.env.IRIS_AUDIT_SECRET;
  if (!secret) return undefined;
  const resolve = () => secret;
  return {
    deep: true,
    resolveSignerSecret: resolve,
    resolveIssuerSecret: resolve,
    resolveEndorserSecret: resolve,
  };
}

export async function runAudit(cwd: string, argv: string[]): Promise<CliCommandResult> {
  const jsonMode = argv.includes('--json');
  const deepFlag = argv.includes('--deep');
  const args = positionalArgs(argv);
  const sub = args[0];
  const nodeId = args[1];

  if (sub === 'log' || sub === undefined) {
    const log = new AuditLog({ cwd });
    const records = log.getAll();
    if (jsonMode) console.log(JSON.stringify(records));
    else console.log(JSON.stringify(records, null, 2));
    return { exitCode: 0 };
  }

  if (sub === 'snapshot') {
    const log = new AuditLog({ cwd });
    const snap = createAuditSnapshot(log);
    if (jsonMode) console.log(JSON.stringify(snap));
    else console.log(JSON.stringify(snap, null, 2));
    return { exitCode: 0 };
  }

  if (sub === 'proof') {
    const idx = Number(args[1]);
    if (!Number.isInteger(idx) || idx < 0) {
      console.error('Usage: iris audit proof <index> [--json]');
      return { exitCode: 1 };
    }
    const log = new AuditLog({ cwd });
    try {
      const proof = log.getProofForRecord(idx);
      if (jsonMode) console.log(JSON.stringify(proof));
      else console.log(JSON.stringify(proof, null, 2));
      return { exitCode: 0 };
    } catch (e) {
      console.error((e as Error).message);
      return { exitCode: 1 };
    }
  }

  if (sub === 'verify-proof') {
    const fp = fileArg(argv);
    if (!fp) {
      console.error('Usage: iris audit verify-proof --file <proof.json> [--json]');
      return { exitCode: 1 };
    }
    let proof: MerkleProof;
    try {
      proof = JSON.parse(fs.readFileSync(fp, 'utf8')) as MerkleProof;
    } catch (e) {
      console.error('Invalid proof file:', (e as Error).message);
      return { exitCode: 1 };
    }
    const ok = verifyMerkleProof(proof);
    if (jsonMode) console.log(JSON.stringify({ valid: ok }));
    else console.log(ok ? '✅ Merkle proof valid' : '❌ Merkle proof invalid');
    return { exitCode: ok ? 0 : 1 };
  }

  if (sub === 'verify') {
    if (deepFlag && !process.env.IRIS_AUDIT_SECRET) {
      console.error('iris audit verify --deep requires IRIS_AUDIT_SECRET for signature endorsement checks');
      return { exitCode: 1 };
    }
    const log = new AuditLog({ cwd });
    const deepOpts = deepFlag ? deepVerifyOptionsFromEnv() : undefined;
    const ok = log.verifyChain(deepOpts ?? { deep: false });
    if (jsonMode) {
      console.log(JSON.stringify({ chainValid: ok, totalRecords: log.getAll().length, deep: !!deepFlag }));
    } else {
      console.log(ok ? '✅ Audit chain valid' : '❌ Audit chain invalid');
    }
    return { exitCode: ok ? 0 : 1 };
  }

  if (sub === 'node') {
    if (!nodeId) return { exitCode: 1 };
    const log = new AuditLog({ cwd });
    const filtered = log.getByNode(nodeId);
    if (jsonMode) console.log(JSON.stringify(filtered));
    else console.log(JSON.stringify(filtered, null, 2));
    return { exitCode: 0 };
  }

  if (sub === 'evidence') {
    if (!nodeId) return { exitCode: 1 };
    const log = new AuditLog({ cwd });
    const records = log.getAll();
    const store = new EvidenceStore(() => Date.now());
    for (const r of records.filter((x) => x.issuer === nodeId && !x.verified)) {
      store.recordViolation(nodeId, 'AUDIT_UNVERIFIED_EVENT', r.eventId);
    }
    const ev = store.getEvidence(nodeId);
    if (jsonMode) console.log(JSON.stringify(ev));
    else console.log(JSON.stringify(ev, null, 2));
    return { exitCode: 0 };
  }

  console.error('Usage: iris audit log|snapshot|verify|proof <index>|verify-proof --file <path>|node <id>|evidence <id> [--json]');
  console.error('       iris audit verify [--deep] [--json]  (deep mode: set IRIS_AUDIT_SECRET)');
  return { exitCode: 1 };
}
