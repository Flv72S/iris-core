# K8 — Key Management & Rotatable Signing Adapter Design

## Obiettivo

Elevare K7 introducendo un **Key Management Layer** con versioning e rotazione delle chiavi, mantenendo:

- **Determinismo** (nessun Random, nessun DateTime, nessuna rete)
- **Compatibilità** con firme generate da K7 (legacy key = version 0)
- **Verifica retrocompatibile**: firme con chiavi vecchie restano verificabili dopo rotazione

Nessuna modifica a SignaturePort (K7) né a K1–K7; K8 resta file-based e HMAC-based, senza KMS esterni.

---

## Architettura key provider

- **SigningKeyProvider** (port interno, in `key_management/`): fornisce la chiave attiva e chiavi per versione.
  - `getActiveKey()` → `SigningKey` (versione corrente, usata per sign).
  - `getKeyByVersion(int version)` → `SigningKey?` (per verify; version 0 = legacy K7).
- **SigningKey**: `version` (int) + `keyBytes` (List<int>, 32 byte per HMAC-SHA256).
- **FileBasedSigningKeyProvider**: implementazione che persiste le chiavi nel file `.signing_keys` nella directory di lavoro (iniettabile per test). Usa **NodeIdentityProvider** solo per generare la chiave iniziale v1 e la chiave legacy (v0).

---

## File-based key storage

- **File**: `.signing_keys`
- **Formato**: una riga per chiave, `version:keyHex` (es. `1:a1b2c3...`, `2:def0...`). Hex lowercase, nessun JSON né metadata.
- **Chiave attiva**: l’ultima riga del file (massima versione).
- **Lettura**: parsing riga per riga; chiavi non valide (lunghezza hex ≠ 64) vengono ignorate.

---

## Generazione chiave iniziale

Se `.signing_keys` non esiste:

- **v1** = `SHA256(nodeId + constantSalt + "v1")`, con nodeId da NodeIdentityProvider.
- Scrittura: `1:<hex>\n` nel file.

Nessun Random né timestamp.

---

## Rotazione chiave (deterministica)

- **Metodo pubblico**: `rotateKey()` su FileBasedSigningKeyProvider.
- **Comportamento**:
  - Se il file non esiste: crea v1 come sopra, poi aggiunge v2.
  - Altrimenti: `newVersion = maxVersion + 1`, `newKey = SHA256(previousKeyHex + constantSalt + newVersion)`.
  - Append al file: `newVersion:newKeyHex\n`; la nuova chiave diventa attiva.
- Nessun Random, nessun timestamp; stessa sequenza di rotazioni → stessa sequenza di chiavi.

---

## Versioning

- Ogni chiave ha una **versione** intera (1, 2, …).
- **sign()**: usa sempre `getActiveKey()` e inserisce in metadata `attributes["keyVersion"]` la versione usata.
- **verify()**: legge `keyVersion` da metadata (assente → 0 per compatibilità K7), chiama `getKeyByVersion(version)`; se null → `invalid("unknown key version")`, altrimenti ricalcola HMAC e confronta byte-per-byte.

---

## Compatibilità K7

- **Legacy key (version 0)**: `SHA256(nodeId + constantSalt)` — stessa derivazione di K7.
- **getKeyByVersion(0)**: restituisce sempre questa chiave (non persistita nel file); permette di verificare firme prodotte da K7 (nessun keyVersion in metadata) o con `keyVersion == "0"`.
- Firma prodotta con K7 (DeterministicSignatureAdapter) non ha `keyVersion` in metadata; VersionedDeterministicSignatureAdapter in verify tratta “keyVersion assente” come 0 e usa la legacy key, quindi le firme K7 restano verificabili con K8.

---

## VersionedDeterministicSignatureAdapter

- **Implementa** SignaturePort (K7).
- **Costruttore**: riceve solo `SigningKeyProvider`.
- **sign()**: `getActiveKey()` → HMAC-SHA256(payload) → SignedPayload con `algorithm = "HMAC-SHA256"` e `attributes["keyVersion"] = version`.
- **verify()**: keyVersion da metadata (default 0) → `getKeyByVersion(version)` → se null → invalid("unknown key version"); altrimenti HMAC e confronto.

---

## Limitazioni (no KMS esterno)

- Nessun uso di AWS KMS, GCP KMS, Azure Key Vault, HSM, PKI, RSA, ECDSA.
- Chiavi solo file-based, derivate deterministicamente da nodeId e dalla chiave precedente (in rotazione).
- K8 prepara il terreno per K9 (KMS/HSM) mantenendo la stessa port e semantica sign/verify.

---

## Evoluzione futura K9 (HSM/KMS integration)

- **K9** potrà introdurre un **SigningKeyProvider** (o adapter che lo usa) che:
  - Ottiene chiavi da HSM o KMS esterno.
  - Mantiene un mapping versione → key id (o handle) lato KMS.
  - Implementa `getActiveKey()` / `getKeyByVersion()` tramite chiamate al servizio.
- **VersionedDeterministicSignatureAdapter** resta invariato (usa solo SigningKeyProvider); si potrà iniettare un provider K9 per ambiente enterprise, mantenendo il comportamento deterministico e file-based in test e ambienti senza KMS.

---

## Test

- **test/flow/infrastructure/signature/versioned_signature_adapter_test.dart**:
  1. First initialization: nessun file → sign() crea `.signing_keys` con v1.
  2. Rotation: rotateKey() → sign() usa nuova versione; verify di firma con versione precedente ancora valida.
  3. Unknown version: metadata con versione inesistente → verify → invalid("unknown key version").
  4. Determinism: stesso payload e stessa versione → stessa firma.
  5. K7 compatibility: verify di firma con keyVersion 0 (legacy) usa legacy key.
  6. Isolation: nessun Random, DateTime.now, rete, Core nel modulo signature/key_management.

K8 è completo con key versioning, rotazione deterministica, verifica retrocompatibile e documentazione.
