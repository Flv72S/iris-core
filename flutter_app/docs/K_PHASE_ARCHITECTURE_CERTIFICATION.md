# K Phase — Architecture Certification

## Diagramma layer

```
                    ┌─────────────────────────────────────────┐
                    │         Composition (KX)                │
                    │  InfrastructureOrchestrator             │
                    │  executeSignedStorageOperation           │
                    └──────────────────┬──────────────────────┘
                                       │ uses
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                               │
         ▼                             ▼                               ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│ DistributedLock │         │ RetryPolicy      │         │ CloudStorage     │
│ (K4.1)          │         │ (K5)            │         │ (K2)            │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                             │
         ▼                           ▼                             ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│ Signature (K7/8)│         │ NodeIdentity    │         │ S3 / InMemory   │
│ SigningKey (K8) │         │ (K6.1)          │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘

Port layer: distributed_lock_port, retry_policy_port, cloud_storage_port,
            signature_port, node_identity_provider (no import da adapter).
Adapter layer: lock, retry, s3, signature, key_management, node_identity.
Composition: solo import da port + composition models; dependency injection.
```

---

## Dependency graph

- **Port** → nessuna dipendenza da adapter o core; solo dart/core e package crypto/io dove necessario.
- **Adapter** → dipendono solo da port (e da altri adapter solo dove previsto, es. signature adapter da node_identity).
- **Composition** → dipende da port e da modelli composition; non istanzia adapter.
- **Nessun ciclo**: port ← adapter ← composition; core e persistence mai importati.

---

## Determinism guarantees

- **Nessun DateTime.now()** in modulo infrastructure (verificato da determinism_global_guard_test).
- **Nessun Random, UUID, Platform.pid** in modulo infrastructure.
- **Nessuna dipendenza da environment** per identità o chiavi (nodeId e chiavi da path/file o iniettati).
- **Signature**: HMAC-SHA256 con chiave derivata deterministicamente; K8 key versioning con rotazione deterministica.
- **Lock**: FIFO, ownership-safe, event-driven; nessun busy polling.
- **Retry**: backoff esponenziale con Duration.zero in test; nessun jitter.
- **Orchestrator**: stateless; operationId e resourceId passati dall’esterno; nessuna generazione interna.

---

## Failure taxonomy

| Failure | Comportamento | Lock |
|--------|---------------|------|
| Lock acquire fail | Eccezione propagata | Non acquisito → release non chiamato |
| PayloadProvider / retry fail | Eccezione propagata | Rilasciato in finally |
| Sign fail | Eccezione propagata | Rilasciato in finally |
| Storage upload fail | Eccezione propagata | Rilasciato in finally |
| NodeIdentity getNodeId fail | Eccezione propagata | Rilasciato in finally |

Nessun deadlock: il lock viene sempre rilasciato nel `finally` dopo acquire riuscito. Nessuna doppia firma né doppia scrittura (verificato da test).

---

## Key rotation guarantees (K8)

- **Rotazione deterministica**: nuova chiave = SHA256(previousKeyHex + salt + version); nessun Random.
- **Firme vecchie verificabili**: getKeyByVersion(version) restituisce chiave per ogni versione persistita; version 0 = legacy K7.
- **File .signing_keys**: formato version:keyHex; ultima riga = chiave attiva.

---

## Signature compatibility K7–K8

- **K7**: una sola chiave (SHA256(nodeId + salt)); nessun keyVersion in metadata.
- **K8**: versioning; metadata.attributes["keyVersion"]; version 0 = K7 legacy.
- **Verify**: se keyVersion assente → trattato come 0 (legacy); getKeyByVersion(0) restituisce chiave K7.
- **Contratto SignedPayload e SignatureVerificationResult** invariato tra K7 e K8.

---

## Limitazioni note

- **Nessuna transazione distribuita**: orchestrator non garantisce 2PC o rollback su più risorse.
- **Lock in-memory**: K4.1 non distribuito tra nodi; adatto a singolo processo.
- **Storage**: CloudStoragePort può essere S3 o in-memory; nessun KMS/HSM in K8.
- **Coverage**: target ≥95% overall, ≥98% per node_identity, signature, composition; da verificare con report coverage.

Fase K certificata dal punto di vista architetturale con i limiti sopra dichiarati.
