# K7 — Signature & Notarization Layer Design

## Scopo del Signature Layer

Introdurre un **Signature & Notarization Layer** per IRIS Flow che consenta di:

- **Firmare** in modo deterministico record persistiti (snapshot, execution result, forensic package)
- **Verificare** autenticità e integrità delle firme
- **Preparare** il sistema a notarizzazione esterna (PKI / KMS / blockchain / TSA) **senza dipendenze concrete**
- Non modificare IRIS Core, Phase J, K1–K6

K7 introduce solo **contratti (port), modelli di valore e un’implementazione locale deterministica di riferimento**.

---

## Perché HMAC deterministico come baseline

- **Deterministico**: stesso payload + stesso nodo (stessa chiave) → stessa firma; riproducibile e testabile offline.
- **Nessuna entropia**: no timestamp, no random, no UUID; adatto a replay e verifiche ripetibili.
- **Integrità**: HMAC-SHA256 garantisce che qualsiasi modifica al payload sia rilevata in verifica.
- **Baseline verificabile**: fondazione crittografica semplice e controllabile; estendibile in K8 con PKI/KMS/TSA senza cambiare il contratto (SignaturePort).

---

## Ruolo del NodeIdentityProvider

- La **chiave** per HMAC è derivata in modo deterministico: `keyBytes = SHA256(nodeId + constantSalt)`.
- **nodeId** è ottenuto **esclusivamente** tramite **NodeIdentityProvider** (K6.1): nessun accesso diretto a filesystem, clock o environment da parte del signature adapter.
- Stesso nodo (stesso nodeId) → stessa chiave → stessa firma per lo stesso payload.
- Nodi diversi (nodeId diversi) → chiavi diverse → firme diverse; garantisce binding della firma all’identità del nodo.

---

## Limiti (non PKI, non notarizzato esternamente)

- **Non è PKI**: nessun certificato X.509, nessuna CA; solo HMAC con chiave derivata da nodeId.
- **Non è notarizzato esternamente**: nessuna TSA (timestamp authority), nessun KMS esterno, nessuna blockchain in K7.
- **Solo verifica di integrità e binding al nodo**: la verifica conferma che il payload non è stato alterato e che la firma è stata prodotta con la stessa identità (stessa chiave).
- **Nessuna chiamata di rete**: tutto calcolato in processo, offline.

Questi limiti sono intenzionali: K7 definisce il contratto e un’implementazione di riferimento; K8 potrà introdurre adapter che implementano lo stesso SignaturePort con PKI/KMS/TSA/blockchain.

---

## Evoluzione prevista (K8: PKI / KMS / TSA / Blockchain)

- **K8** potrà introdurre adapter che implementano **SignaturePort** con:
  - **PKI**: firma con chiave privata (es. RSA/ECDSA), verifica con certificato/chiave pubblica.
  - **KMS**: chiave gestita da servizio esterno (AWS KMS, Azure Key Vault, ecc.).
  - **TSA**: timestamp di notarizzazione esterna per non ripudio temporale.
  - **Blockchain**: ancoraggio di hash/firme a una ledger esterna.
- Il **contratto** (sign/verify, SignedPayload, SignatureVerificationResult) resta invariato; solo l’implementazione cambia (stesso port, adapter diversi).
- K7 resta la **baseline deterministica** utilizzabile in test, replay e ambienti senza dipendenze esterne.

---

## Vincoli architetturali (rispettati)

- Nessuna dipendenza da Core, persistence concreta, Cloud SDK, timestamp reali, UUID/Random/entropy.
- Nessuna chiamata di rete; nessuna crypto non deterministica.
- Tutto testabile offline; output identico a parità di input.
- Preparazione esplicita per estensioni future (K8).

---

## Componenti K7

| Componente | Posizione | Ruolo |
|------------|-----------|--------|
| SignaturePort | lib/flow/infrastructure/port/signature/signature_port.dart | Contratto sign/verify |
| SignatureMetadata | lib/flow/infrastructure/port/signature/signature_metadata.dart | signerId, algorithm, attributes |
| SignedPayload | lib/flow/infrastructure/port/signature/signed_payload.dart | signatureBytes + metadata |
| SignatureVerificationResult | lib/flow/infrastructure/port/signature/signature_verification_result.dart | valid / failureReason |
| DeterministicSignatureAdapter | lib/flow/infrastructure/adapter/signature/deterministic_signature_adapter.dart | HMAC-SHA256, chiave da NodeIdentityProvider |

---

## Algoritmo (reference implementation)

- **Chiave**: `SHA256(nodeId + constantSalt)` → 32 byte (nodeId da NodeIdentityProvider).
- **Firma**: `HMAC-SHA256(keyBytes, payload)` → 32 byte.
- **Verifica**: ricalcolo della firma su payload e confronto byte-per-byte con signature; esito valid/invalid + eventuale failureReason.

---

## Test

- **test/flow/infrastructure/signature/deterministic_signature_adapter_test.dart**:
  1. Deterministic signature: stesso payload + stesso nodeId → stessa signature.
  2. Verification success: payload firmato → verify → valid = true.
  3. Tampered payload: payload modificato → verify → valid = false.
  4. Different node identity: stesso payload, nodeId diverso → firma diversa.
  5. No entropy guard: nessun DateTime.now, Random, UUID nel modulo signature.
  6. Isolation: nessun import da core, persistence, replay, cloud.

K7 è completo con port, modelli, adapter deterministico, test verdi e documentazione; ponte diretto verso K8.
