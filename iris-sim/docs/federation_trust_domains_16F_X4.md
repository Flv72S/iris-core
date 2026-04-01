# IRIS Federation — Trust Domains (16F.X4)

This document describes the **enterprise-grade federation layer** introduced in **Microstep 16F.X4**:

- **Trust Domains** (organization-level trust boundaries)
- **Federation policy enforcement** (no implicit cross-domain trust)
- **Canonical identity versioning** (`canonicalIdentity`)
- **Backward compatibility** with legacy protocol envelopes

---

## Canonical identity (versioned)

- **Canonical identity type**: `spki_der_v1`
- **What it means**: node identity derives from the **canonical SPKI DER** form of an **Ed25519** public key (format variations in PEM must not change identity).

In code, the default canonical identity is:

- `DEFAULT_CANONICAL_IDENTITY` in `src/control_plane/identity/canonical_identity.ts`

Protocol messages may include:

- `canonicalIdentity?: CanonicalIdentityType`

If missing, the federation layer treats the message as **legacy** and logs `LEGACY_FEDERATION_MODE` (compatibility mode).

---

## Trust domains

A **Trust Domain** is a policy boundary (typically an organization or tenant).

See `src/control_plane/trust_domain.ts`:

- `domainId`: stable domain identifier (e.g. `"org-acme"`)
- `acceptedCanonicalIdentities`: list of accepted canonical identity types
- `trustedDomains`: allow-listed domain IDs for cross-domain sync
- `allowCrossDomainSync`: global toggle for cross-domain sync

### Zero implicit trust

If a peer is in a different domain, sync is **forbidden** unless:

- local domain has `allowCrossDomainSync: true`, **and**
- local domain lists the peer domain in `trustedDomains`.

---

## Federation enforcement (distributed sync)

`DistributedSyncManager` enforces federation policy on **every incoming protocol message**:

- peer must exist in `PeerRegistry`
- peer must be `trusted` and **not revoked**
- `canonicalIdentity` must be supported by the local domain
- cross-domain must be explicitly allowed by local domain policy
- domain spoofing is rejected when `msg.domainId` conflicts with registry `peer.domainId`

### Compatibility rules

- **If `domainId` is missing** in an incoming message: it is treated as **local domain** (compatibility path).
- **If `canonicalIdentity` is missing**: it is treated as **legacy federation mode** and evaluated via configured defaults/allow-list.
- **No silent fallback** across security checks: rejections emit security events.

---

## Operational workflow (recommended)

### 1) Choose a local domain ID

Set a domain ID for the local node runtime.

Environment variable:

- `IRIS_DOMAIN_ID`

If not set, CLI defaults to:

- `local`

Example (PowerShell):

```powershell
$env:IRIS_DOMAIN_ID = "org-acme"
```

### 2) Create local domain config

```bash
iris domain create org-acme
```

### 3) Trust another domain (explicit federation contract)

```bash
iris domain trust org-beta
```

This:

- ensures `org-acme` exists
- ensures `org-beta` exists
- enables `allowCrossDomainSync` for the local domain
- adds `org-beta` to `trustedDomains`

### 4) Register a peer with a domain

```bash
iris peers add "<PEM_PUBLIC_KEY>" --domain org-beta
```

If `--domain` is omitted, it defaults to:

- `$env:IRIS_DOMAIN_ID` or `local`

---

## Files written by CLI

CLI persists federation-related config under `.iris/`:

- `.iris/domains.json`: list of `TrustDomain` entries
- `.iris/peers.json`: list of peers with `domainId` / `canonicalIdentity` (when present)

---

## Observability

When distributed sync persists metrics (`sync_metrics.json`), federation metrics include:

- `domainId`
- `peersByDomain` (counts observed during sync)
- `rejectedByPolicy` (count of federation/policy rejections)

---

## Common security events

During federation enforcement, security logs may include:

- `CROSS_DOMAIN_FORBIDDEN`
- `UNSUPPORTED_CANONICAL_IDENTITY`
- `DOMAIN_SPOOF_DETECTED`
- `SYNC_REVOKED_PEER`
- `SYNC_UNTRUSTED_PEER`
- `SYNC_INVALID_PUBLIC_KEY`
- `LEGACY_FEDERATION_MODE`

---
## 16F.X4.HARDENING — Federation Security Layer (Enterprise)

Microstep **16F.X4.HARDENING** upgrades federation from configuration-based trust to **cryptographically verifiable, policy-driven trust**.

## Domain certificates (signed domain identity)

Each domain can (optionally) attach a **domain certificate**:

- file `src/control_plane/federation/domain_certificate.ts`
- verifier `src/control_plane/federation/domain_certificate_verify.ts`

Certificate rules implemented:

- `domainId` is deterministic: derived from canonical domain public key material.
- signatures are verified with Ed25519 over a canonical payload.
- optional `expiresAt` is checked.
- if certificate parameters are invalid, the receiver rejects the message.

Error codes emitted by the verifier:

- `DOMAIN_CERT_INVALID_SIGNATURE`
- `DOMAIN_CERT_ID_MISMATCH`
- `DOMAIN_CERT_EXPIRED`
- `DOMAIN_CERT_INVALID_KEY`

## Capability negotiation (symmetric canonical identity)

Negotiation picks a **common canonical identity**:

- `local.acceptedCanonicalIdentities` is intersected with `remote.supportedCanonicalIdentities`
- first match wins (deterministic)

If negotiation fails, receivers reject with:

- `NO_COMMON_CANONICAL_IDENTITY`
- `CANONICAL_IDENTITY_MISMATCH` (when the message explicitly claims a non-negotiated value)

## Trust levels (policy tiers beyond boolean)

`TrustDomain.trustLevel` is enforced per operation:

- `FULL`: allow all federation operations
- `PARTIAL`: allow root sync only
- `READ_ONLY`: allow root receive and proof responses
- `PROOF_ONLY`: allow proof requests and proof responses

Denied operations emit `TRUST_LEVEL_ENFORCEMENT_DENIED` and increment `federationSecurity.trustLevelEnforcements`.

## Domain revocation (hard deny across network)

Revocation is enforced locally by receivers:

- `TrustDomain.revokedDomains?: string[]`
- `DomainRegistry.isDomainRevoked(domainId)`

When a revoked domain is encountered, receivers reject and emit:

- `DOMAIN_REVOKED`

The receiver also increments `federationSecurity.revokedDomainAttempts` so it is visible in observability.

## Protocol extensions (message-level hardening)

The distributed sync protocol messages now may include:

- `supportedCanonicalIdentities?: CanonicalIdentityType[]`
- `domainCertificate?: DomainCertificate`

Outgoing messages include the local certificate only when `localDomain.domainCertificate` is configured.

## Strict verification pipeline with auditable outcomes

`DistributedSyncManager` applies the following deterministic steps on every incoming envelope:

1. Verify `domainCertificate` (if present) and bind `domainId` (`DOMAIN_IDENTITY_MISMATCH` on conflict).
2. Hard-check revocation.
3. Negotiate canonical identity; reject if no common choice.
4. Enforce `trustLevel` for the operation type.
5. Enforce cross-domain allow-list policy (`allowCrossDomainSync` + `trustedDomains`).

## Observability (federationSecurity)

When `.iris/sync_metrics.json` exists, the snapshot includes:

- `federation.domainId`
- `federation.peersByDomain`
- `federation.rejectedByPolicy`
- `federationSecurity.revokedDomainAttempts`
- `federationSecurity.negotiationFailures`
- `federationSecurity.trustLevelEnforcements`

## CLI extensions

- `iris domain certificate generate`
- `iris domain revoke <domainId>`
- `iris domain show`

Notes:

- `certificate generate` creates and stores a signed certificate for the local domain under `.iris/domains.json`.
- `revoke` adds the target domainId to the local hard deny list.

