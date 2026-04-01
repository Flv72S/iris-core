import fs from 'node:fs';
import path from 'node:path';
import { generateKeyPairSync, sign } from 'node:crypto';

import { DEFAULT_CANONICAL_IDENTITY } from '../../control_plane/identity/canonical_identity.js';
import { deriveNodeIdFromDer, tryCanonicalizePublicKey } from '../../control_plane/identity/key_canonicalization.js';
import type { TrustDomain } from '../../control_plane/trust_domain.js';
import type { DomainCertificate } from '../../control_plane/federation/domain_certificate.js';
import { buildDomainCertificatePayload } from '../../control_plane/federation/domain_certificate.js';
import type { CliCommandResult } from '../cli_types.js';

type DomainsFile = { domains: TrustDomain[] };

function domainsPath(cwd: string): string {
  return path.join(cwd, '.iris', 'domains.json');
}

function loadDomains(cwd: string): DomainsFile {
  const p = domainsPath(cwd);
  if (!fs.existsSync(p)) return { domains: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Partial<DomainsFile>;
    if (!raw || !Array.isArray(raw.domains)) return { domains: [] };
    return { domains: raw.domains as TrustDomain[] };
  } catch {
    return { domains: [] };
  }
}

function saveDomains(cwd: string, data: DomainsFile): void {
  const dir = path.join(cwd, '.iris');
  fs.mkdirSync(dir, { recursive: true });
  const p = domainsPath(cwd);
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, p);
}

function localDomainId(): string {
  return process.env.IRIS_DOMAIN_ID ?? 'local';
}

function ensureDomain(data: DomainsFile, domainId: string): void {
  const existing = data.domains.find((d) => d.domainId === domainId);
  if (existing) return;
  data.domains.push({
    domainId,
    name: domainId,
    acceptedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
    trustedPeers: [],
    trustedDomains: [],
    allowCrossDomainSync: false,
    trustLevel: 'FULL',
  });
}

export async function runDomain(cwd: string, argv: string[]): Promise<CliCommandResult> {
  const jsonMode = argv.includes('--json');
  const args = argv.slice(3).filter((a) => !a.startsWith('--'));
  const sub = args[0];

  const ldi = localDomainId();
  const data = loadDomains(cwd);

  if (sub === 'create') {
    const domainId = args[1];
    if (!domainId) {
      console.error('Usage: iris domain create <domainId> [--json]');
      return { exitCode: 1 };
    }
    ensureDomain(data, domainId);
    saveDomains(cwd, data);
    const out = { ok: true, domainId, created: true };
    if (jsonMode) console.log(JSON.stringify(out));
    else console.log(`Created domain ${domainId}`);
    return { exitCode: 0 };
  }

  if (sub === 'trust') {
    const domainId = args[1];
    if (!domainId) {
      console.error('Usage: iris domain trust <domainId> [--json]');
      return { exitCode: 1 };
    }

    ensureDomain(data, ldi);
    ensureDomain(data, domainId);

    const local = data.domains.find((d) => d.domainId === ldi)!;
    if (!local.trustedDomains.includes(domainId)) {
      local.trustedDomains.push(domainId);
    }
    local.allowCrossDomainSync = true;

    saveDomains(cwd, data);
    const out = { ok: true, localDomainId: ldi, trustedDomainId: domainId };
    if (jsonMode) console.log(JSON.stringify(out));
    else console.log(`Trusted domain ${domainId} from ${ldi}`);
    return { exitCode: 0 };
  }

  if (sub === 'list' || sub === undefined) {
    if (jsonMode) console.log(JSON.stringify(data));
    else console.log(JSON.stringify(data, null, 2));
    return { exitCode: 0 };
  }

  if (sub === 'certificate' && args[1] === 'generate') {
    const local = data.domains.find((d) => d.domainId === ldi);
    if (!local) {
      console.error('Local domain is missing; run `iris domain create` first');
      return { exitCode: 1 };
    }

    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const domainPublicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
    const canon = tryCanonicalizePublicKey(domainPublicKeyPem);
    if (!canon.ok) {
      console.error('Generated domain public key is not Ed25519/SPKI canonical');
      return { exitCode: 1 };
    }

    const domainId = deriveNodeIdFromDer(canon.der);
    const canonicalIdentity = (local.acceptedCanonicalIdentities[0] ?? DEFAULT_CANONICAL_IDENTITY) as DomainCertificate['canonicalIdentity'];

    const issuedAt = Date.now();
    const expiresAt = issuedAt + 365 * 24 * 60 * 60 * 1000;

    const certDraft: DomainCertificate = {
      domainId,
      domainPublicKey: domainPublicKeyPem,
      canonicalIdentity,
      algorithm: 'ed25519',
      issuedAt,
      expiresAt,
      signature: '',
    };
    const payload = buildDomainCertificatePayload(certDraft);
    const sigBuf = sign(null, Buffer.from(payload, 'utf8'), privateKey);
    const signature = sigBuf.toString('base64');

    const cert: DomainCertificate = { ...certDraft, signature };
    local.domainCertificate = cert;
    // Also keep domainId alignment: TrustDomain.domainId is the certificate domainId.
    local.domainId = domainId;
    local.name = domainId;

    // Re-write local domain mapping if domainId changed.
    data.domains = data.domains.map((d) => (d.domainId === ldi ? local : d));

    saveDomains(cwd, data);
    const out = { ok: true, localDomainId: local.domainId, expiresAt };
    if (jsonMode) console.log(JSON.stringify(out));
    else console.log(`Generated domain certificate for ${local.domainId}`);
    return { exitCode: 0 };
  }

  if (sub === 'revoke') {
    const domainId = args[1];
    if (!domainId) {
      console.error('Usage: iris domain revoke <domainId> [--json]');
      return { exitCode: 1 };
    }
    const local = data.domains.find((d) => d.domainId === ldi);
    if (!local) {
      console.error('Local domain is missing; run `iris domain create` first');
      return { exitCode: 1 };
    }
    local.revokedDomains = local.revokedDomains ?? [];
    if (!local.revokedDomains.includes(domainId)) local.revokedDomains.push(domainId);
    saveDomains(cwd, data);
    const out = { ok: true, localDomainId: ldi, revokedDomainId: domainId };
    if (jsonMode) console.log(JSON.stringify(out));
    else console.log(`Revoked domain ${domainId} from ${ldi}`);
    return { exitCode: 0 };
  }

  if (sub === 'show') {
    const local = data.domains.find((d) => d.domainId === ldi);
    const out = local ?? null;
    if (jsonMode) console.log(JSON.stringify(out));
    else console.log(JSON.stringify(out, null, 2));
    return { exitCode: 0 };
  }

  console.error('Usage: iris domain create <domainId> | iris domain trust <domainId> | iris domain list [--json] | iris domain certificate generate | iris domain revoke <domainId> | iris domain show');
  return { exitCode: 1 };
}

