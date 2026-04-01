import fs from 'node:fs';
import path from 'node:path';

import { deriveNodeId } from '../../control_plane/identity/node_identity.js';
import { DEFAULT_CANONICAL_IDENTITY } from '../../control_plane/identity/canonical_identity.js';
import type { PeerInfo } from '../../control_plane/peer_types.js';
import type { CliCommandResult } from '../cli_types.js';

type PeersFile = { peers: PeerInfo[] };

function peersPath(cwd: string): string {
  return path.join(cwd, '.iris', 'peers.json');
}

function loadPeers(cwd: string): PeersFile {
  const p = peersPath(cwd);
  if (!fs.existsSync(p)) return { peers: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as PeersFile;
    if (!raw || !Array.isArray(raw.peers)) return { peers: [] };
    return raw;
  } catch {
    return { peers: [] };
  }
}

function savePeers(cwd: string, data: PeersFile): void {
  const dir = path.join(cwd, '.iris');
  fs.mkdirSync(dir, { recursive: true });
  const p = peersPath(cwd);
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, p);
}

export async function runPeers(cwd: string, argv: string[]): Promise<CliCommandResult> {
  const jsonMode = argv.includes('--json');
  const raw = argv.slice(3);
  const sub = raw[0];

  if (sub === 'add') {
    const pubKey = raw[1];
    if (!pubKey || pubKey.length < 32) {
      console.error('Usage: iris peers add <publicKeyPem> [--domain <domainId>] [--json]');
      return { exitCode: 1 };
    }
    const localDomainId = process.env.IRIS_DOMAIN_ID ?? 'local';
    let domainId = localDomainId;
    const di = raw.indexOf('--domain');
    if (di >= 0 && raw[di + 1]) {
      domainId = raw[di + 1]!;
    }
    let nodeId: string;
    try {
      nodeId = deriveNodeId(pubKey);
    } catch {
      console.error('Invalid Ed25519 public key (canonicalization / identity derivation failed)');
      return { exitCode: 1 };
    }
    const data = loadPeers(cwd);
    const next = data.peers.filter((p) => p.nodeId !== nodeId);
    next.push({
      nodeId,
      publicKey: pubKey,
      canonicalIdentity: DEFAULT_CANONICAL_IDENTITY,
      domainId,
      trusted: true,
      revoked: false,
    });
    data.peers = next;
    savePeers(cwd, data);
    const out = { ok: true, nodeId, trusted: true };
    if (jsonMode) console.log(JSON.stringify(out));
    else console.log(`Registered peer ${nodeId.slice(0, 16)}…`);
    return { exitCode: 0 };
  }

  if (sub === 'revoke') {
    const nodeId = raw[1];
    if (!nodeId) {
      console.error('Usage: iris peers revoke <nodeId> [--json]');
      return { exitCode: 1 };
    }
    const data = loadPeers(cwd);
    const ix = data.peers.findIndex((p) => p.nodeId === nodeId);
    if (ix < 0) {
      console.error(`Unknown peer: ${nodeId}`);
      return { exitCode: 1 };
    }
    const prev = data.peers[ix]!;
    data.peers[ix] = { ...prev, revoked: true, trusted: false };
    savePeers(cwd, data);
    const out = { ok: true, nodeId, revoked: true };
    if (jsonMode) console.log(JSON.stringify(out));
    else console.log(`Revoked peer ${nodeId}`);
    return { exitCode: 0 };
  }

  if (sub === 'list' || sub === undefined) {
    const data = loadPeers(cwd);
    if (jsonMode) console.log(JSON.stringify(data));
    else console.log(JSON.stringify(data, null, 2));
    return { exitCode: 0 };
  }

  console.error('Usage: iris peers add <publicKeyPem> [--domain <domainId>] | iris peers revoke <nodeId> | iris peers [list] [--json]');
  return { exitCode: 1 };
}
