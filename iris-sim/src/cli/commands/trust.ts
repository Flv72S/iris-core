import fs from 'node:fs';
import path from 'node:path';

import type { CliCommandResult } from '../cli_types.js';
import { cliLogger } from '../utils/cli_logger.js';
import { InMemoryTrustDistribution } from '../../control_plane/federation/trust_distribution.js';
import { FederationTrustSyncEngine } from '../../control_plane/federation/trust_sync.js';
import type { TrustSnapshot } from '../../control_plane/federation/trust_snapshot.js';
import { computeTrustSnapshotHash, normalizeTrustSnapshot } from '../../control_plane/federation/trust_snapshot.js';
import { bootstrapTrust } from '../../control_plane/federation/bootstrap.js';
import {
  appendTrustEvent,
  readTrustSnapshot,
  writeTrustSnapshot,
  trustSnapshotPath,
  TRUST_SNAPSHOT_FILENAME,
} from '../../control_plane/federation/trust_persist.js';
import { createSignedTrustLifecycleEvent } from '../../control_plane/federation/trust_lifecycle_events.js';
import type { TrustLifecycleEvent } from '../../control_plane/federation/trust_lifecycle_events.js';

function readJsonFile<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

function ensureIrisDir(cwd: string): string {
  const dir = path.join(cwd, '.iris');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function runTrust(cwd: string, argv: string[]): Promise<CliCommandResult> {
  const jsonMode = argv.includes('--json');
  const args = argv.slice(3).filter((a) => !a.startsWith('--'));
  const sub = args[0];

  ensureIrisDir(cwd);

  if (sub === 'export') {
    const snap = readTrustSnapshot(cwd);
    if (!snap) {
      console.error(`Missing ${TRUST_SNAPSHOT_FILENAME}; run \`iris trust bootstrap\` or \`iris trust import <file>\``);
      return { exitCode: 1 };
    }
    const normalized = normalizeTrustSnapshot(snap);
    const out = { snapshot: normalized, hash: computeTrustSnapshotHash(normalized) };
    if (jsonMode) console.log(JSON.stringify(out));
    else console.log(JSON.stringify(out, null, 2));
    return { exitCode: 0 };
  }

  if (sub === 'import') {
    const file = args[1];
    if (!file) {
      console.error('Usage: iris trust import <file> [--json]');
      return { exitCode: 1 };
    }
    const snap = readJsonFile<TrustSnapshot>(path.isAbsolute(file) ? file : path.join(cwd, file));
    // Validate via bootstrap (reject invalid certs / revoked).
    const dist = bootstrapTrust({ snapshot: snap });
    const merged = dist.exportTrustSnapshot();
    writeTrustSnapshot(cwd, merged);
    const out = { ok: true, hash: computeTrustSnapshotHash(merged), path: trustSnapshotPath(cwd) };
    if (jsonMode) console.log(JSON.stringify(out));
    else console.log(`Imported trust snapshot -> ${out.path}`);
    return { exitCode: 0 };
  }

  if (sub === 'bootstrap') {
    // Minimal bootstrap: if snapshot already exists, keep it; else create empty base snapshot.
    const existing = readTrustSnapshot(cwd);
    if (existing) {
      const out = { ok: true, alreadyBootstrapped: true, path: trustSnapshotPath(cwd), hash: computeTrustSnapshotHash(existing) };
      if (jsonMode) console.log(JSON.stringify(out));
      else console.log(`Trust already bootstrapped at ${out.path}`);
      return { exitCode: 0 };
    }
    const dist = new InMemoryTrustDistribution('local');
    const snap = dist.exportTrustSnapshot();
    writeTrustSnapshot(cwd, snap);
    const out = { ok: true, path: trustSnapshotPath(cwd), hash: computeTrustSnapshotHash(snap) };
    if (jsonMode) console.log(JSON.stringify(out));
    else console.log(`Bootstrapped empty trust snapshot -> ${out.path}`);
    return { exitCode: 0 };
  }

  if (sub === 'status') {
    const snap = readTrustSnapshot(cwd);
    if (!snap) {
      const out = { ok: false, bootstrapped: false };
      if (jsonMode) console.log(JSON.stringify(out));
      else console.log('Trust not bootstrapped');
      return { exitCode: 1 };
    }
    const normalized = normalizeTrustSnapshot(snap);
    const out = {
      ok: true,
      bootstrapped: true,
      domains: normalized.domains.length,
      revoked: normalized.revokedDomains.length,
      lastUpdate: normalized.timestamp,
      hash: computeTrustSnapshotHash(normalized),
    };
    if (jsonMode) console.log(JSON.stringify(out));
    else console.log(JSON.stringify(out, null, 2));
    return { exitCode: 0 };
  }

  if (sub === 'revoke') {
    const domainId = args[1];
    if (!domainId) {
      console.error('Usage: iris trust revoke <domainId> [--json]');
      return { exitCode: 1 };
    }

    const snap = readTrustSnapshot(cwd);
    if (!snap) {
      console.error('Trust not bootstrapped; run `iris trust bootstrap` first');
      return { exitCode: 1 };
    }

    const dist = new InMemoryTrustDistribution('local');
    dist.importTrustSnapshot(snap);
    dist.revokeDomain(domainId, Date.now());

    // Record a signed lifecycle event in append-only log (simulation secret).
    const issuerNodeId = process.env.IRIS_NODE_ID ?? 'local-node';
    const signingSecret = process.env.IRIS_TRUST_EVENT_SECRET ?? 'local-trust-event-secret';
    const ev: TrustLifecycleEvent = createSignedTrustLifecycleEvent({
      type: 'DOMAIN_REVOKED',
      domainId,
      issuerNodeId,
      signingSecret,
      timestamp: Date.now(),
      payload: { reason: 'CLI_REVOKE' },
    });
    appendTrustEvent(cwd, ev);

    const merged = dist.exportTrustSnapshot();
    writeTrustSnapshot(cwd, merged);
    const out = { ok: true, revokedDomainId: domainId, hash: computeTrustSnapshotHash(merged) };
    if (jsonMode) console.log(JSON.stringify(out));
    else console.log(`Revoked domain ${domainId}`);
    return { exitCode: 0 };
  }

  if (sub === 'sync') {
    const file = args[1];
    if (!file) {
      console.error('Usage: iris trust sync <remoteSnapshotFile> [--json]');
      return { exitCode: 1 };
    }
    const local = readTrustSnapshot(cwd);
    if (!local) {
      console.error('Trust not bootstrapped; run `iris trust bootstrap` first');
      return { exitCode: 1 };
    }
    const remote = readJsonFile<TrustSnapshot>(path.isAbsolute(file) ? file : path.join(cwd, file));
    const dist = new InMemoryTrustDistribution('local');
    dist.importTrustSnapshot(local);
    const engine = new FederationTrustSyncEngine(dist);
    engine.syncTrustState(remote);
    const merged = dist.exportTrustSnapshot();
    writeTrustSnapshot(cwd, merged);
    const out = { ok: true, localHash: computeTrustSnapshotHash(local), mergedHash: computeTrustSnapshotHash(merged) };
    if (jsonMode) console.log(JSON.stringify(out));
    else console.log(JSON.stringify(out, null, 2));
    return { exitCode: 0 };
  }

  cliLogger.error(
    'Usage: iris trust export | iris trust import <file> | iris trust bootstrap | iris trust status | iris trust revoke <domainId> | iris trust sync <remoteSnapshotFile> [--json]',
  );
  return { exitCode: 1 };
}

