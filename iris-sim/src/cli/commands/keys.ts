import fs from 'node:fs';
import path from 'node:path';
import { generateKeyPairSync } from 'node:crypto';

import { publicKeyDerFingerprint } from '../../control_plane/identity/key_canonicalization.js';
import { deriveNodeId } from '../../control_plane/identity/node_identity.js';
import type { KeyPurpose } from '../../control_plane/keys/key_types.js';
import type { CliCommandResult } from '../cli_types.js';

type StoredPurposeKeys = Record<string, { publicKey: string; privateKey: string }>;

function irisDir(cwd: string): string {
  return path.join(cwd, '.iris');
}

function writeNodeIdentity(
  cwd: string,
  payload: {
    nodeId: string;
    publicKey: string;
    keyTypes: KeyPurpose[];
    keys: StoredPurposeKeys;
    publicKeyFingerprint: string;
    canonicalIdentity: string;
  },
): void {
  const dir = irisDir(cwd);
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, 'node_identity.json');
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, p);
}

export async function runKeys(cwd: string, argv: string[]): Promise<CliCommandResult> {
  const jsonMode = argv.includes('--json');
  const args = argv.slice(3).filter((a) => !a.startsWith('--'));
  const sub = args[0];

  if (sub === 'generate') {
    const purposes: KeyPurpose[] = ['audit_signing', 'node_identity', 'protocol_signing'];
    const keys: StoredPurposeKeys = {};
    for (const purpose of purposes) {
      const { publicKey, privateKey } = generateKeyPairSync('ed25519');
      const pubPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
      const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
      keys[purpose] = { publicKey: pubPem, privateKey: privPem };
    }
    const protocolPub = keys['protocol_signing']!.publicKey;
    const nodeId = deriveNodeId(protocolPub);
    const publicKeyFingerprint = publicKeyDerFingerprint(protocolPub);
    const canonicalIdentity = 'spki_der_v1';
    const payload = {
      nodeId,
      publicKey: protocolPub,
      keyTypes: purposes,
      keys,
      publicKeyFingerprint,
      canonicalIdentity,
    };
    writeNodeIdentity(cwd, payload);
    const out = {
      ok: true,
      nodeId,
      publicKey: protocolPub,
      keyTypes: purposes,
      publicKeyFingerprint,
      canonicalIdentity,
    };
    if (jsonMode) console.log(JSON.stringify(out));
    else console.log(`Generated node identity in .iris/node_identity.json (nodeId=${nodeId.slice(0, 16)}…)`);
    return { exitCode: 0 };
  }

  if (sub === 'show') {
    const p = path.join(irisDir(cwd), 'node_identity.json');
    if (!fs.existsSync(p)) {
      console.error('No .iris/node_identity.json — run iris keys generate');
      return { exitCode: 1 };
    }
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as {
      nodeId?: string;
      publicKey?: string;
      keyTypes?: string[];
      keys?: StoredPurposeKeys;
      publicKeyFingerprint?: string;
      canonicalIdentity?: string;
    };
    if (!raw.publicKey || typeof raw.publicKey !== 'string') {
      console.error('Invalid node_identity.json: missing publicKey');
      return { exitCode: 1 };
    }
    let nodeIdCanonical: string;
    let publicKeyFingerprint: string;
    try {
      nodeIdCanonical = deriveNodeId(raw.publicKey);
      publicKeyFingerprint = publicKeyDerFingerprint(raw.publicKey);
    } catch {
      console.error('Invalid public key in node_identity.json (cannot canonicalize)');
      return { exitCode: 1 };
    }
    const publicOnly: Record<string, unknown> = {
      nodeId: nodeIdCanonical,
      nodeIdStored: raw.nodeId,
      nodeIdMatchesStored: raw.nodeId === nodeIdCanonical,
      publicKeyFingerprint,
      canonicalIdentity: raw.canonicalIdentity ?? 'spki_der_v1',
      publicKey: raw.publicKey,
      keyTypes: raw.keyTypes,
    };
    if (raw.keys) {
      const pubs: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw.keys)) {
        if (v?.publicKey) pubs[k] = v.publicKey;
      }
      publicOnly.keys = pubs;
    }
    if (jsonMode) console.log(JSON.stringify(publicOnly));
    else console.log(JSON.stringify(publicOnly, null, 2));
    return { exitCode: 0 };
  }

  console.error('Usage: iris keys generate [--json] | iris keys show [--json]');
  return { exitCode: 1 };
}
