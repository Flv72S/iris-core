# IRIS Protocol — Phase 16F
## Full Extraction & Reconstruction Audit (X1 -> X7)

### Metodo
Questo report e' costruito da evidenze su codice e test presenti nel repository `iris-sim` (branch corrente), non da roadmap teorica.
La valutazione di completezza per microstep considera tre fattori:

1. Implementazione modulo
2. Copertura test
3. Wiring runtime reale (SDK/CLI/boot path)

---

## 1) Reverse Mapping Critico (16F.X1 -> 16F.X7)

| Microstep | Implementazione reale (file/simboli) | Evidenza concreta | Completezza reale |
|---|---|---|---|
| **16F.X1** Trust/Audit hardening | `src/control_plane/audit_log.ts`, `audit_sign.ts`, `audit_hash.ts`; test `src/control_plane/tests/audit.test.ts`, `audit_hardening.test.ts`, `merkle.test.ts` | Append-only, chain verify, meta consistency, proof plumbing | **85%** |
| **16F.X2** Canonical identity + multi-key | `src/control_plane/identity/key_canonicalization.ts`, `canonical_identity.ts`, `identity_persist.ts`; test `identity_canonicalization.test.ts`, `multi_key_security.test.ts` | Canonical SPKI/Ed25519, node-id derivation, signer/public-key binding checks | **80%** |
| **16F.X3** Trust lifecycle + distributed sync | `src/control_plane/distributed_sync.ts`, `trust_sync_engine.ts`; test `distributed_sync.test.ts`, parte in `federation*.test.ts` | Root/proof exchange firmato, replay/freshness/divergence checks | **75%** |
| **16F.X4** Federation trust domains (+hardening) | `src/control_plane/trust_domain.ts`, `src/control_plane/federation/domain_certificate*.ts`, enforcement in `distributed_sync.ts`; test `federation.test.ts`, `federation_security.test.ts` | Cross-domain allowlist, anti-spoof, cert verify/revoke, trust-level enforcement | **78%** |
| **16F.X5** Secure transport continuity/hardening | `src/network/secure_transport/*` (`secure_server.ts`, `secure_client.ts`, `secure_connection.ts`, `transport_policy.ts`, `transport_metrics.ts`); test `secure_transport*.test.ts` | PFS, handshake hardening, rekey/lifecycle policy, SCP integration tests | **72%** |
| **16F.X6** Gossip hardened | `src/network/gossip/gossip_engine.ts`, `gossip_control_plane.ts`, `gossip_lineage.ts`, `gossip_policy.ts`, `gossip_consistency.ts`, `gossip_metrics.ts`; test `gossip.test.ts`, `gossip_hardening.test.ts` | Deterministic routing controls, lineage/replay guard, anti-amplification, policy enforcement | **65%** |
| **16F.X7** CRDT secure replication | `src/state/crdt/*` (`crdt_engine.ts`, `crdt_sync.ts`, `crdt_security.ts`, `crdt_persistence.ts`, `crdt_metrics.ts`); test `src/state/crdt/tests/crdt.test.ts` | LWW/OR-Set/Map, signed ops, trust gate, delta sync, persistence files | **60%** |

### Nota chiave (cross-microstep)
Le percentuali scendono su X5-X7 non per assenza di codice/test, ma per wiring runtime non completo: molti moduli sono usati soprattutto in test harness.

---

## 2) Architettura complessiva 16F (stato reale)

### Layer effettivi

- **Security primitives**: `src/security/*` (`hmac.ts`, `stable_json.ts`, `security_logger.ts`)
- **Control plane trust/federation/audit**: `src/control_plane/*`
- **Secure transport stack**: `src/network/secure_transport/*`
- **Gossip hardened stack**: `src/network/gossip/*`
- **CRDT state replication**: `src/state/crdt/*`
- **Observability**: `src/observability/*` + `src/sdk/iris_node.ts`

### Dipendenze reali

- `GossipEngine` dipende da HMAC, peer/routing policy, control-plane gossip, lineage guard, metrics.
- `CRDTSyncBridge` dipende da `GossipEngine` e da trust/isolation gate.
- `DistributedSyncManager` dipende da registri trust/federation + verifier certificati dominio + protocol signing.
- `IrisNode` raccoglie metriche estese (gossip/crdt/transport), ma non orchestra pienamente tutti i nuovi layer come data-plane unico.

---

## 3) Security Layer Analysis

### 3.1 Transport Security (X5 con dipendenze X1-X4)

**Implementato**
- Handshake verificato con policy trust/domain.
- PFS con ephemerals + KDF (`pfs_keys.ts`, `pfs_kdf.ts`), zeroization.
- Rekey/lifecycle policy e metriche (`transport_policy.ts`, `transport_metrics.ts`).
- Test dedicati SCP/PFS/hardening/lifecycle (`secure_transport*.test.ts`).

**Limite reale**
- Istanziazione runtime non evidenziata fuori test per `SecureTransportServerImpl` / `SecureTransportClientImpl`.

### 3.2 Session Control Plane (X3/X5)

**Implementato**
- Governance sessione, rekey triggers, dual-key window in secure transport/session path.
- Anti-replay e validation pipeline testata.

**Limite reale**
- Coesistenza con stack legacy: rischio doppio percorso sicurezza.

### 3.3 Identity & Federation (X2/X4)

**Implementato**
- Canonical identity robusta (SPKI canonicalization + stable derivation).
- Trust domain policy con anti-spoof domain.
- Domain certificate verification + revocation + trust-level gating.

**Limite reale**
- Parte del flusso federation avanzato resta centrata su `DistributedSyncManager`, usato soprattutto nelle suite test.

---

## 4) Gossip System (X6) — Pipeline completa

### Componenti reali
- `GossipControlPlane`
- `GossipLineageGuard`
- `GossipPolicy`
- `GossipConsistencyTracker`
- integrazione in `GossipEngine`

### Pipeline `receive -> validate -> enforce -> propagate`

1. Verify firma HMAC su payload canonico
2. Check timestamp skew window
3. Lineage/replay checks (`LINEAGE_MISMATCH`, `CROSS_PEER_REPLAY`, ecc.)
4. Dedup (messageId)
5. Trust/isolation gate peer
6. Policy per tipo messaggio (trust, cross-domain, maxTTL)
7. TTL/hops checks
8. Rate-limit sender
9. Apply hook payload
10. Forward con adaptive fanout + inflight caps + anti-amplification

### Proprieta' reali
- Determinismo: alto nel modulo
- Trust-based routing: presente
- Anti-byzantine behavior: presente (lineage, replay, amplification controls)
- Stato integrazione runtime: medio-basso (principalmente testato in harness dedicato)

---

## 5) CRDT System (X7) — Stato reale

### Implementazioni
- Tipi base: `CRDTOperation`, timestamp logico, opId deterministico
- CRDT: `LWWRegisterCRDT`, `ORSetCRDT`, `CRDTMap`
- Engine: registry/apply/snapshot/hash (`CRDTEngine`)
- Delta: `computeMissingOps`
- Security: sign/verify + trust/isolation gate
- Persistence: `.iris/crdt_state.json`, `.iris/crdt_ops.log`

### Sync pipeline reale
`verify signature -> trust/isolation enforcement -> dedup/replay TTL -> apply -> publish gossip(topic=crdt)`

### Limite reale
Layer forte a livello modulo/test, ma bootstrap runtime multi-node non ancora first-class nel nodo SDK.

---

## 6) Integrazione tra layer (wiring reale)

| Integrazione | Stato reale | Valutazione |
|---|---|---|
| Transport <-> Session | Presente nel pacchetto secure_transport | Buono a livello modulo |
| Session <-> Gossip | Debole/indiretta | Parziale |
| Gossip <-> CRDT | Presente in `CRDTSyncBridge` | Buono nel modulo, limitato runtime |
| CRDT <-> Persistence | Presente (`CRDTPersistence`) | Buono |
| Tutto <-> Observability | Contratto ampio + invarianti + snapshot | Buono lato schema, parziale lato alimentazione runtime |

### Coupling
- **Debole positivo** tra moduli (plugin-style).
- **Gap principale**: orchestration end-to-end nel runtime principale.

---

## 7) Observability reale

### Disponibile nel codice
- Contratto: `observability_contract.ts` include `transport`, `gossip`, `gossipControl`, `gossipConsistency`, `crdt`, `federation`, `federationSecurity`.
- Invarianti: `observability_invariants.ts` con validazioni numeriche robuste.
- SDK snapshot: `IrisNode.buildObservabilitySnapshot()` raccoglie molte metriche da getter.

### Copertura reale
- Alta a livello schema + helper.
- Media a livello runtime (dipende dall'effettiva istanziazione dei layer).
- Debug distribuito: potenzialmente buono, attualmente non pienamente sfruttato senza wiring completo.

---

## 8) Proprieta' formali (livello reale)

| Proprieta' | Stato attuale | Commento |
|---|---|---|
| Confidentiality | **Parziale-Alta** | Secure transport/PFS implementato, ma non unico data-plane runtime |
| Integrity | **Alta (moduli)** | Signature/canonical payload diffusi in control-plane/gossip/crdt |
| Forward Secrecy | **Media-Alta** | Presente nel secure transport stack |
| Replay resistance | **Alta (moduli)** | Audit/gossip/crdt/session hanno difese specifiche |
| Eventual consistency | **Media** | Gossip+CRDT pronti, adozione runtime non completa |
| Deterministic convergence | **Media** | Forte nei test/harness; deployment runtime da consolidare |
| Byzantine resilience | **Media** | Molti controlli presenti, ma manca dimostrazione sistemica multi-node in produzione |

---

## 9) Maturity per microstep (qualita', gap, criticita')

| Microstep | Maturity | Qualita' implementazione | Gap residui principali | Criticita' |
|---|---|---|---|---|
| X1 | Alta | Solida e testata | Piu' evidenze runtime continuative | Bassa |
| X2 | Medio-Alta | Canonical identity robusta | Uniformare adozione su tutti i path | Media |
| X3 | Media | Sync protocol ben testato | Wiring runtime operativo | Media |
| X4 | Medio-Alta | Federation security ben strutturata | Integrazione continua in data-plane | Media |
| X5 | Media | Secure transport avanzato | Adozione runtime principale | Alta |
| X6 | Media | Gossip hardened robusto | Uso come system-of-record runtime | Alta |
| X7 | Medio-Bassa/Media | CRDT pulito e testato | Bootstrap reale multi-node + operativita' | Alta |

---

## 10) Gap Analysis completa

### 10.1 Gap tecnici
- Mancanza di un bootstrap unico che accenda insieme secure transport + gossip + CRDT + distributed sync in produzione.
- Doppio stack possibile (legacy + nuovo secure transport), con rischio incoerenza policy.

### 10.2 Gap di integrazione
- `DistributedSyncManager`, `GossipEngine`, `CRDTEngine` fortemente test-driven, poco visibili nel flusso principale SDK.
- Metriche federation/sync dipendono da file di persistenza non sempre alimentati.

### 10.3 Gap enterprise
- Secret management non centralizzato enterprise-grade (es. KMS/HSM integration non evidente).
- Policy engine centralizzato e versionato (ABAC/RBAC policy-as-code) non completo.
- Tracce compliance (SOC2/ISO) da consolidare in pipeline release/runtime evidence.

---

## 11) Rischi reali

### Attacchi/failure modes
- **Bypass operativo**: feature hardenizzate non usate se il runtime resta su path legacy.
- **Policy drift**: divergenza tra transport legacy e secure_transport.
- **Partial observability**: snapshot formalmente ricco ma con sezioni non alimentate in esercizio.

### Scalabilita'
- Gossip/CRDT testati su harness controllato; prova di carico multi-node long-running ancora da industrializzare.

### Inconsistenze possibili
- Comportamenti diversi tra ambiente test e runtime reale per assenza di wiring uniforme.

---

## 12) Valutazione finale

### Classificazione IRIS (stato attuale)
- **Prototipo avanzato di sistema distribuito sicuro** con moduli enterprise molto maturi.
- **Non ancora pienamente enterprise-ready end-to-end** sul piano operativo, a causa di integrazione runtime incompleta dei layer 16F avanzati.

### Confronto implicito
- Verso sistemi P2P moderni: buon livello su hardening locale (signature/replay/policy) ma manca consolidamento orchestration runtime.
- Verso sistemi enterprise distribuiti: architettura valida, manca ultimo miglio di productization operativa.

---

## 13) Next Steps ordinati (priorita' tecnica reale)

1. **Unificare runtime data-plane**: rendere `secure_transport` percorso predefinito in `IrisNode` (deprecando fallback legacy).
2. **Wiring produzione per gossip hardened**: bootstrap standard (`GossipEngine`) con hook trust/audit/sync nel nodo.
3. **Wiring produzione CRDT**: bootstrap `CRDTEngine + CRDTSyncBridge` per stato condiviso reale multi-node.
4. **Attivare distributed sync in runtime**: istanziare `DistributedSyncManager` con persistence/metrics sempre on.
5. **Observability operativa completa**: garantire popolamento continuo dei blocchi `transport/gossip/crdt/federation*`.
6. **Test di sistema long-running**: scenario multi-node integrato (transport + gossip + crdt + federation) con fault injection.
7. **Hardening enterprise finale**: centralizzazione secrets (KMS), policy-as-code, evidence pipeline compliance.
8. **Packaging product**: profili di deploy, bootstrap config, runbook incident response e SLO.

---

## Conclusione tecnica sintetica

La Phase 16F e' **ampiamente implementata a livello di moduli e test** (sicurezza, federation, gossip, CRDT), ma la maturita' complessiva e' frenata dal fatto che il wiring runtime end-to-end non e' ancora pienamente convergente su un unico percorso operativo.  
Il prossimo incremento ad alto impatto non e' aggiungere nuove feature, ma **chiudere l'integrazione sistemica** e rendere i layer 16F la baseline runtime ufficiale.

