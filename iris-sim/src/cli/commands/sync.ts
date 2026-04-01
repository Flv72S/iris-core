import { AuditLog } from '../../control_plane/audit_log.js';
import { createAuditSnapshot } from '../../control_plane/audit_snapshot.js';
import { tryLoadSyncMetrics } from '../../control_plane/distributed_sync.js';
import { signProtocolMessageLegacySync } from '../../control_plane/trust_sync_protocol_sign.js';
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

function syncSecret(): string {
  return process.env.IRIS_SYNC_SECRET ?? process.env.IRIS_AUDIT_SECRET ?? '';
}

export async function runSync(cwd: string, argv: string[]): Promise<CliCommandResult> {
  const jsonMode = argv.includes('--json');
  const args = positionalArgs(argv);
  const sub = args[0];

  if (sub === 'announce') {
    const secret = syncSecret();
    if (!secret) {
      console.error('iris sync announce requires IRIS_SYNC_SECRET or IRIS_AUDIT_SECRET');
      return { exitCode: 1 };
    }
    const nodeId = process.env.IRIS_NODE_ID ?? 'cli';
    const log = new AuditLog({ cwd });
    const snap = createAuditSnapshot(log);
    const timestamp = Date.now();
    const body = {
      nodeId,
      merkleRoot: snap.merkleRoot,
      totalRecords: snap.totalRecords,
      timestamp,
    };
    const announcement = { ...body, signature: signProtocolMessageLegacySync(body, secret) };
    if (jsonMode) console.log(JSON.stringify(announcement));
    else console.log(JSON.stringify(announcement, null, 2));
    return { exitCode: 0 };
  }

  if (sub === 'state') {
    const m = tryLoadSyncMetrics(cwd) ?? { peers: 0, divergences: 0 };
    if (jsonMode) console.log(JSON.stringify(m));
    else console.log(JSON.stringify(m, null, 2));
    return { exitCode: 0 };
  }

  if (sub === 'request-proof') {
    const secret = syncSecret();
    if (!secret) {
      console.error('iris sync request-proof requires IRIS_SYNC_SECRET or IRIS_AUDIT_SECRET');
      return { exitCode: 1 };
    }
    const targetId = args[1];
    const idx = Number(args[2]);
    if (!targetId || !Number.isInteger(idx) || idx < 0) {
      console.error('Usage: iris sync request-proof <nodeId> <index> [--json]');
      return { exitCode: 1 };
    }
    const log = new AuditLog({ cwd });
    const expectedRoot = createAuditSnapshot(log).merkleRoot;
    const timestamp = Date.now();
    const requesterNodeId = process.env.IRIS_NODE_ID ?? 'cli';
    const body = {
      requesterNodeId,
      targetNodeId: targetId,
      recordIndex: idx,
      expectedRoot,
      timestamp,
    };
    const proofRequest = { ...body, signature: signProtocolMessageLegacySync(body, secret) };
    if (jsonMode) console.log(JSON.stringify(proofRequest));
    else console.log(JSON.stringify(proofRequest, null, 2));
    return { exitCode: 0 };
  }

  console.error('Usage: iris sync announce | state | request-proof <nodeId> <index> [--json]');
  return { exitCode: 1 };
}
