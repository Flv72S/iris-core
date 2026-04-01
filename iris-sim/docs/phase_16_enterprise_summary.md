# IRIS Protocol — Phase 16
## Enterprise Security, Federation, Gossip, and Distributed State

### Stato documento
Questo documento riepiloga l'implementazione complessiva della **Phase 16** nel codice attuale.
Il focus e' operativo/tecnico: cosa e' stato introdotto, come si integra, cosa e' stato verificato.

---

## 1) Obiettivo della Phase 16

La Phase 16 porta IRIS da una sicurezza di trasporto/sessione a una piattaforma enterprise con:

- identita' canonica verificabile e hardening multi-key
- audit append-only con verifiche forti (catena, meta, proof)
- federation trust-domain con policy esplicite e certificati di dominio
- gossip sicuro, deterministico, trust-aware, osservabile
- CRDT plug-in per replica stato byzantine-resilient su gossip hardened

Principi mantenuti in tutta la phase:

- no breaking API
- compatibilita' backward
- enforcement deterministico
- auditabilita' end-to-end

---

## 2) Microstep completati (vista executive)

### 16F.X1 / 16F.X1.HARDENING — Trust/Audit hardening

Implementati nel layer control-plane:

- firme e verifiche deterministiche su payload canonici
- audit log append-only con controlli di integrita' e meta-coerenza
- gestione evidenze e verifica replay/tamper
- test dedicati su audit e hardening

Aree principali coinvolte:

- `src/control_plane/tests/audit.test.ts`
- `src/control_plane/tests/audit_hardening.test.ts`
- `src/control_plane/tests/merkle.test.ts`

---

### 16F.X2 / 16F.X2.HARDENING — Canonical identity e multi-key security

Rafforzamento identita' nodo con canonicalizzazione crittografica:

- identity model canonico (SPKI DER) con fingerprint stabile
- persistenza identity e validazioni di coerenza
- copertura test per canonical identity e gestione chiavi

Aree principali coinvolte:

- `src/control_plane/identity/canonical_identity.ts`
- `src/control_plane/identity/key_canonicalization.ts`
- `src/control_plane/identity/identity_persist.ts`
- `src/control_plane/tests/identity_canonicalization.test.ts`
- `src/control_plane/tests/multi_key_security.test.ts`

---

### 16F.X3 — Trust lifecycle e distributed trust sync

Consolidamento della governance trust tra nodi:

- lifecycle trust/revoke con invarianti deterministiche
- sincronizzazione trust distribuita con validazioni lato ricezione
- enforcement su peer non trusted/revoked

Aree principali coinvolte:

- `src/control_plane/trust_sync_protocol.ts`
- `src/control_plane/tests/trust_lifecycle.test.ts`
- `src/control_plane/tests/distributed_sync.test.ts`

---

### 16F.X4 / 16F.X4.HARDENING — Federated trust domains (enterprise)

Federazione esplicita tra domini con policy verificabili:

- trust domains con allow-list cross-domain (no implicit trust)
- canonical identity negotiation simmetrica
- certificati di dominio (firma/verifica) e revoca dominio
- enforcement trust-level per operazione
- estensioni CLI e metriche federation/federationSecurity

Aree principali coinvolte:

- `src/control_plane/trust_domain.ts`
- `src/control_plane/tests/federation.test.ts`
- `src/control_plane/tests/federation_security.test.ts`
- `docs/federation_trust_domains_16F_X4.md`

---

### 16F.X5 — Secure transport policy continuity

Allineamento continuo con i vincoli enterprise sul trasporto:

- compatibilita' con SCP/PFS/lifecycle gia' presenti
- nessuna regressione nelle suite secure transport
- mantenimento telemetria e policy enforcement lato transport

Aree principali coinvolte:

- `src/network/secure_transport/`
- `src/network/secure_transport/tests/secure_transport*.test.ts`

---

### 16F.X6 / 16F.X6.HARDENING — Secure gossip & anti-byzantine propagation

Introduzione del layer gossip enterprise e successivo hardening:

- gossip engine deterministico con firma/verifica e dedup
- routing trust-aware, rate-limit, peer policy
- deterministic gossip control plane (fanout, TTL/hops, inflight, anti-amplification)
- lineage hash e guard anti-replay cross-peer
- policy per tipo messaggio (trust/cross-domain/ttl)
- consistency tracking e metriche osservabili
- audit hooks di sicurezza estesi

Nuove aree chiave:

- `src/network/gossip/gossip_engine.ts`
- `src/network/gossip/gossip_control_plane.ts`
- `src/network/gossip/gossip_lineage.ts`
- `src/network/gossip/gossip_policy.ts`
- `src/network/gossip/gossip_consistency.ts`
- `src/network/gossip/tests/gossip.test.ts`
- `src/network/gossip/tests/gossip_hardening.test.ts`

---

### 16F.X7.CRDT — Secure CRDT & trust-aware state replication

Nuovo modulo plug-in per replica stato distribuita su gossip hardened:

- clock logico deterministico (`counter`, `nodeId`)
- CRDT base + implementazioni:
  - LWW Register
  - OR-Set
  - CRDT Map
- delta sync (solo operazioni mancanti)
- security layer operazioni CRDT:
  - firma/verifica HMAC canonica
  - trust/isolation enforcement
  - anti-replay dedup + TTL window
- bridge gossip topic dedicato `crdt`
- engine CRDT (registry, apply, snapshot, hash stato)
- persistenza locale:
  - `.iris/crdt_state.json`
  - `.iris/crdt_ops.log`
- metriche CRDT integrate in observability snapshot

Aree introdotte:

- `src/state/crdt/`
- `src/state/crdt/tests/crdt.test.ts`
- `src/state/index.ts`
- `src/index.ts` (export state)
- `src/observability/observability_contract.ts` (sezione `crdt`)
- `src/observability/observability_invariants.ts` (validazioni `crdt`)
- `src/sdk/iris_node.ts` (inclusione metriche `crdt`)

---

## 3) Risultato architetturale della Phase 16

Dopo la Phase 16 il sistema dispone di:

- **Security-by-default** su trust, federation, gossip e state replication
- **Determinismo** su ID, confronto timestamp, hash di stato e pipeline di verifica
- **Byzantine resilience** con signature checks, replay defense, trust/isolation enforcement
- **Observability enterprise** con snapshot estesi (gossip + federation + crdt)
- **Componibilita' plug-in** (nessun refactor invasivo richiesto ai layer esistenti)

---

## 4) Verifica e qualita'

Copertura tramite suite dedicate per:

- audit/hardening
- canonical identity
- federation + federation security
- secure transport + PFS/SCP/lifecycle
- gossip base + gossip hardening
- CRDT (10 scenari: convergenza, replay, byzantine reject, stress, persistenza)

Esito operativo finale della phase:

- build TypeScript completabile
- test funzionali e di sicurezza eseguibili
- certificazione (`test:certify`) coerente con il target enterprise (no open handles)

---

## 5) Compatibilita' e vincoli rispettati

- nessuna breaking API introdotta nei moduli preesistenti
- backward compatibility mantenuta (campi opzionali dove necessario)
- integrazioni nuove adottate in stile opzionale/plug-in
- nessuna regressione intenzionale su gossip, transport, trust, audit

---

## 6) Checklist sintetica di chiusura Phase 16

- [x] Trust/Audit hardening enterprise
- [x] Canonical identity + multi-key hardening
- [x] Federation trust domains + domain security hardening
- [x] Gossip secure + deterministic hardening anti-byzantine
- [x] CRDT secure replication layer su gossip hardened
- [x] Observability estesa per domini enterprise
- [x] Verifiche build/test/certification

