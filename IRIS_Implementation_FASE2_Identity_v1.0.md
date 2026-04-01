---
title: "IRIS — Implementation FASE 2 Identity v1.0"
author: "Principal Engineer + Security Architect + SSI Specialist"
version: "1.0"
date: "2026-01-24"
status: "Binding for Implementation"
dependencies: "IRIS_Governance_Frozen_v1.0.md, IRIS_Backlog_FASE2_Implementation_v1.0.md"
tags: ["FASE2", "Identity", "SSI", "Implementation", "Technical", "Binding"]
---

# IRIS — Implementation FASE 2 Identity v1.0

> Documento tecnico vincolante per implementazione identità IRIS FASE 2.  
> Fondamenta morali e tecniche del sistema.  
> Ogni violazione comporta rifiuto PR e escalation automatica.

---

## 🚨 ORDINE DI IMPLEMENTAZIONE NON NEGOZIABILE

**Se violato → FALLIMENTO**

1. Root Identity (SSI, key management locale)
2. Alias / Pseudonimi
3. Mapping root ↔ alias
4. Multi-device sync
5. Anti-sybil base
6. Referral controllato
7. Discovery opt-in

🚫 **NON iniziare da UI**  
🚫 **NON iniziare da AI**  
🚫 **NON iniziare da wallet**  
🚫 **NON ottimizzare per growth**

👉 Qui si costruiscono **le fondamenta morali** del sistema IRIS.

---

## 1. Principi Non Negoziabili dell'Identità IRIS

### 1.1 Root Identity Non Eliminabile

**Principio**  
La root identity è l'ancora crittografica permanente del sistema. Non può essere eliminata, solo disattivata. La continuità relazionale deve essere preservata anche in caso di disattivazione.

**Vincoli STEP B**  
- SB-011: Root identity non eliminabile
- SB-012: Alias come projection

**Rischio Audit Ostile**  
- Audit #1: Alias aggirano vincolo root identity → Privacy compromessa

**Enforcement**  
Qualsiasi API o funzione che permetta eliminazione completa della root identity è **vietata**. Solo disattivazione temporanea consentita.

---

### 1.2 Alias Non Tracciabili Tra Contesti

**Principio**  
Gli alias devono essere non correlabili tra community diverse. Nessun server-side lookup può rivelare che due alias appartengono alla stessa root identity senza autorizzazione esplicita.

**Vincoli STEP B**  
- SB-012: Alias come projection
- SB-016: Reputazione non trasferibile

**Rischio Audit Ostile**  
- Audit #2: Uso improprio alias → Confusione identità

**Enforcement**  
Nessun endpoint server-side può esporre mapping alias → root identity senza autenticazione locale e consenso esplicito.

---

### 1.3 Separazione Crittografica Root / Alias

**Principio**  
La separazione tra root identity e alias deve essere garantita crittograficamente. Gli alias non possono essere derivati senza la root key, ma la root key non può essere derivata dagli alias.

**Vincoli STEP B**  
- SB-011: Root identity non eliminabile
- SB-012: Alias come projection

**Rischio Audit Ostile**  
- Audit #1: Correlazione indebita root/alias → Privacy compromessa

**Enforcement**  
Tutti i test devono verificare che la compromissione di un alias non comprometta la root identity o altri alias.

---

### 1.4 Nessuna Identity "Centrale"

**Principio**  
Non esiste un server centrale che detiene tutte le identità. L'identità è distribuita, con sincronizzazione peer-to-peer o edge/serverless relay.

**Vincoli STEP B**  
- SB-024: Accesso multi-dispositivo
- SB-005: Proprietà del dato

**Rischio Audit Ostile**  
- Audit #4: Sync fallisce → Perdita dati

**Enforcement**  
Nessun database centralizzato può contenere mapping root → alias in plaintext. Solo dati cifrati con chiavi locali.

---

### 1.5 Offline-First

**Principio**  
Il sistema deve funzionare completamente offline. La sincronizzazione è asincrona e non blocca operazioni locali.

**Vincoli STEP B**  
- SB-024: Accesso multi-dispositivo
- SB-005: Proprietà del dato

**Rischio Audit Ostile**  
- Audit #4: Sync fallisce → Perdita dati

**Enforcement**  
Tutte le operazioni di identità devono essere eseguibili senza connessione. Sync è opzionale e asincrono.

---

### 1.6 Privacy by Default

**Principio**  
Tutti i dati di identità sono on-device di default. Nessun dato viene esposto al server senza consenso esplicito e opt-in.

**Vincoli STEP B**  
- SB-004: Diritto all'oblio
- SB-026: Discovery attiva

**Rischio Audit Ostile**  
- Audit #6: Privacy leak → Violazione fiducia

**Enforcement**  
Default: tutti i dati on-device. Server: solo dati necessari per operazioni esplicite, con opt-in obbligatorio.

---

### 1.7 Anti-Sybil Senza KYC

**Principio**  
Il sistema previene abusi senza richiedere KYC, biometriche, o dati personali obbligatori. Solo rate limiting, behavioral verification, e ZK proofs.

**Vincoli STEP B**  
- SB-013: Anti-sybil compatibile UX

**Rischio Audit Ostile**  
- Audit #3: Tecniche aggirabili → Frodi/abusi

**Enforcement**  
Vietato richiedere: telefono, email, documento identità, biometriche. Consentito: rate limit, pattern behavioral, ZK proof-of-human.

---

## 2. Root Identity (SSI)

### 2.1 Obiettivo

Definire l'identità primaria IRIS come Self-Sovereign Identity (SSI) conforme standard W3C. La root identity è l'ancora crittografica permanente che garantisce continuità relazionale.

**Vincoli STEP B**  
- SB-011: Root identity non eliminabile
- SB-012: Alias come projection

**Rischio Audit Ostile**  
- Audit #1: Alias aggirano vincolo → Privacy compromessa

---

### 2.2 Specifiche Tecniche

#### 2.2.1 Generazione Chiavi Local-First

**Requisiti**  
- Generazione chiavi eseguita esclusivamente on-device
- Algoritmo: Ed25519 per signing, X25519 per encryption
- Root key mai esposta in plaintext, nemmeno in memoria persistente
- Key derivation: HKDF-SHA256 con salt univoco per device

**Implementazione**  
```typescript
// Pseudo-codice vincolante
interface RootIdentity {
  rootId: string; // DID conforme W3C
  keypair: {
    publicKey: Uint8Array; // Ed25519 public key
    privateKey: EncryptedBlob; // X25519 private key cifrata
  };
  deviceBinding: DeviceBinding[];
  recoveryMetadata: RecoveryMetadata;
  createdAt: Timestamp;
  deactivatedAt?: Timestamp; // Solo disattivazione, mai eliminazione
}
```

**Divieti Assoluti**  
- ❌ Root key mai inviata al server
- ❌ Root key mai in plaintext in storage
- ❌ Root key mai derivabile da dati esterni
- ❌ Nessun backup custodial della root key

---

#### 2.2.2 Root Key Mai Esposta

**Requisiti**  
- Root key cifrata con chiave derivata da passphrase utente (PBKDF2, 100k iterazioni)
- Chiave di cifratura mai persistita
- Root key decifrata solo in memoria volatile, mai in log
- Root key cancellata dalla memoria dopo uso

**Implementazione**  
```typescript
// Pseudo-codice vincolante
class RootKeyManager {
  // Root key decifrata solo in memoria volatile
  private decryptRootKey(encryptedKey: EncryptedBlob, passphrase: string): Uint8Array {
    const derivedKey = pbkdf2(passphrase, salt, 100000);
    const rootKey = decrypt(encryptedKey, derivedKey);
    // Root key mai loggata o esposta
    return rootKey;
  }
  
  // Root key cancellata dopo uso
  private clearMemory(key: Uint8Array): void {
    // Zero-fill memory
    key.fill(0);
  }
}
```

**Divieti Assoluti**  
- ❌ Root key mai in plaintext in storage
- ❌ Root key mai in log o debug output
- ❌ Root key mai esposta via API
- ❌ Root key mai derivabile senza passphrase

---

#### 2.2.3 Supporto Multi-Device

**Requisiti**  
- Root identity sincronizzabile tra device
- Sincronizzazione cifrata end-to-end
- Ogni device ha binding univoco
- Dispositivo compromesso non compromette altri device

**Implementazione**  
```typescript
// Pseudo-codice vincolante
interface DeviceBinding {
  deviceId: string; // UUID univoco per device
  publicKey: Uint8Array; // Chiave pubblica device
  encryptedRootKey: EncryptedBlob; // Root key cifrata con chiave device
  boundAt: Timestamp;
  lastSyncAt: Timestamp;
  revokedAt?: Timestamp;
}
```

**Divieti Assoluti**  
- ❌ Root key mai sincronizzata in plaintext
- ❌ Binding device mai modificabile senza autenticazione
- ❌ Nessun device può impersonare altro device

---

#### 2.2.4 Recovery Non Custodial

**Requisiti**  
- Recovery basato su mnemonic phrase (BIP-39, 24 parole)
- Mnemonic generato on-device, mai esposto
- Recovery possibile solo con mnemonic completo
- Nessun servizio custodial per recovery

**Implementazione**  
```typescript
// Pseudo-codice vincolante
interface RecoveryMetadata {
  mnemonicHash: string; // Hash SHA-256 del mnemonic (solo per verifica)
  recoveryInstructions: string; // Istruzioni off-line per utente
  // Nessun dato che permetta recovery senza mnemonic
}
```

**Divieti Assoluti**  
- ❌ Mnemonic mai inviato al server
- ❌ Nessun servizio custodial per recovery
- ❌ Recovery mai automatico senza mnemonic

---

### 2.3 Modello Dati

```typescript
// Modello dati vincolante
interface RootIdentity {
  // Identificatore univoco (DID W3C)
  rootId: string; // did:iris:<hash>
  
  // Keypair root (chiave privata cifrata)
  keypair: {
    publicKey: Uint8Array; // Ed25519 public key
    privateKeyEncrypted: EncryptedBlob; // X25519 private key cifrata
  };
  
  // Binding device per multi-device
  deviceBinding: DeviceBinding[];
  
  // Metadata recovery (non custodial)
  recoveryMetadata: RecoveryMetadata;
  
  // Timestamps
  createdAt: Timestamp;
  deactivatedAt?: Timestamp; // Solo disattivazione, mai eliminazione
  
  // Audit log (immutabile)
  auditLog: AuditEntry[];
}

interface DeviceBinding {
  deviceId: string;
  devicePublicKey: Uint8Array;
  encryptedRootKey: EncryptedBlob;
  boundAt: Timestamp;
  lastSyncAt: Timestamp;
  revokedAt?: Timestamp;
}

interface RecoveryMetadata {
  mnemonicHash: string; // Hash per verifica, non recovery
  recoveryInstructions: string;
}

interface AuditEntry {
  timestamp: Timestamp;
  operation: string;
  deviceId: string;
  signature: Uint8Array; // Firma immutabile
}
```

---

### 2.4 Vincoli STEP B

| Vincolo | Descrizione | Enforcement |
|---------|-------------|-------------|
| SB-011 | Root identity non eliminabile | API `deleteRootIdentity()` vietata. Solo `deactivateRootIdentity()` consentita. |
| SB-012 | Alias come projection | Alias creati solo da root identity verificata. Nessuna creazione alias indipendente. |

---

### 2.5 Rischi Audit

| Rischio | Mitigazione | Verifica |
|---------|-------------|----------|
| Correlazione identità | Separazione crittografica root/alias | Test: compromissione alias non rivela root |
| Perdita chiave | Recovery non custodial con mnemonic | Test: recovery possibile solo con mnemonic completo |
| Compromissione device | Binding device revocabile | Test: device compromesso non compromette altri |

---

### 2.6 Done When (Acceptance Criteria)

- [ ] Root identity creata con DID conforme W3C (`did:iris:*`)
- [ ] Root key generata on-device, mai esposta
- [ ] Root identity non eliminabile (solo disattivabile)
- [ ] Multi-device supportato con binding sicuro
- [ ] Recovery non custodial con mnemonic
- [ ] Test: compromissione alias non rivela root identity
- [ ] Test: compromissione device non compromette altri device
- [ ] Test: recovery possibile solo con mnemonic completo
- [ ] Audit log immutabile per ogni operazione root identity
- [ ] Documentazione API per gestione root identity

---

## 3. Alias e Pseudonimi

### 3.1 Obiettivo

Consentire identità contestuali senza tracciabilità cross-community. Gli alias sono projection della root identity, disposable, e non correlabili tra loro senza autorizzazione esplicita.

**Vincoli STEP B**  
- SB-012: Alias come projection
- SB-016: Reputazione non trasferibile

**Rischio Audit Ostile**  
- Audit #2: Uso improprio alias → Confusione identità

---

### 3.2 Regole

#### 3.2.1 Alias per Community

**Requisiti**  
- Ogni alias è legato a una community specifica
- Alias non riutilizzabile tra community diverse
- Alias disposable: può essere revocato e ricreato

**Implementazione**  
```typescript
// Pseudo-codice vincolante
interface Alias {
  aliasId: string; // Identificatore univoco alias
  rootIdReference: string; // Hash cieco della root identity (non reversibile)
  communityId: string; // Community di appartenenza
  scope: AliasScope;
  expiration?: Timestamp; // Opzionale: alias temporaneo
  createdAt: Timestamp;
  revokedAt?: Timestamp;
}
```

**Divieti Assoluti**  
- ❌ Alias non riutilizzabile tra community
- ❌ Nessun lookup server-side alias → root senza autorizzazione
- ❌ Alias non correlabili tra loro senza root key

---

#### 3.2.2 Alias per Relazione

**Requisiti**  
- Alias specifici per relazioni 1-to-1
- Alias relazionale non condivisibile con terzi
- Alias relazionale revocabile da entrambe le parti

**Implementazione**  
```typescript
// Pseudo-codice vincolante
interface RelationalAlias extends Alias {
  relationshipId: string;
  counterpartyAliasId: string;
  mutualRevocation: boolean; // Revoca possibile da entrambe le parti
}
```

**Divieti Assoluti**  
- ❌ Alias relazionale non condivisibile con terze parti
- ❌ Nessun lookup cross-relazione

---

#### 3.2.3 Alias Disposable

**Requisiti**  
- Alias possono essere revocati e ricreati
- Revoca alias non compromette root identity
- Alias revocati non riutilizzabili

**Implementazione**  
```typescript
// Pseudo-codice vincolante
class AliasManager {
  revokeAlias(aliasId: string, rootKey: Uint8Array): void {
    // Verifica autorizzazione con root key
    if (!this.verifyRootKey(aliasId, rootKey)) {
      throw new UnauthorizedError();
    }
    // Revoca alias
    this.markAliasRevoked(aliasId);
    // Alias revocato non riutilizzabile
  }
}
```

**Divieti Assoluti**  
- ❌ Alias revocati mai riutilizzabili
- ❌ Revoca alias mai compromette root identity

---

#### 3.2.4 Alias Non Linkabili Tra Loro

**Requisiti**  
- Nessun server-side lookup può correlare alias senza root key
- Alias correlabili solo localmente con root key
- Nessun fingerprinting cross-alias

**Implementazione**  
```typescript
// Pseudo-codice vincolante
// Server-side: solo hash cieco della root identity
interface AliasServerRecord {
  aliasId: string;
  rootIdHash: string; // Hash SHA-256 cieco (non reversibile)
  communityId: string;
  // Nessun dato che permetta correlazione senza root key
}

// Client-side: mapping locale cifrato
interface AliasLocalMapping {
  aliasId: string;
  rootId: string; // Solo locale, cifrato
  encryptedMapping: EncryptedBlob;
}
```

**Divieti Assoluti**  
- ❌ Nessun endpoint server-side per correlazione alias
- ❌ Nessun fingerprinting cross-alias
- ❌ Alias correlabili solo localmente con root key

---

### 3.3 Modello Dati

```typescript
// Modello dati vincolante
interface Alias {
  aliasId: string; // UUID univoco
  rootIdReference: string; // Hash cieco root identity (server-side)
  rootId: string; // Root identity (solo client-side, cifrato)
  communityId: string;
  scope: AliasScope; // COMMUNITY | RELATIONSHIP | TEMPORARY
  expiration?: Timestamp;
  createdAt: Timestamp;
  revokedAt?: Timestamp;
  auditLog: AuditEntry[];
}

enum AliasScope {
  COMMUNITY = "community",
  RELATIONSHIP = "relationship",
  TEMPORARY = "temporary"
}

// Server-side: solo dati non correlabili
interface AliasServerRecord {
  aliasId: string;
  rootIdHash: string; // Hash cieco
  communityId: string;
  scope: AliasScope;
  createdAt: Timestamp;
  revokedAt?: Timestamp;
}

// Client-side: mapping locale cifrato
interface AliasLocalMapping {
  aliasId: string;
  rootId: string; // Solo locale
  encryptedMapping: EncryptedBlob;
}
```

---

### 3.4 Vincoli STEP B

| Vincolo | Descrizione | Enforcement |
|---------|-------------|-------------|
| SB-012 | Alias come projection | Alias creati solo da root identity verificata. Nessuna creazione alias indipendente. |
| SB-016 | Reputazione non trasferibile | Alias non correlabili tra community. Reputazione isolata per community. |

---

### 3.5 Rischi Audit

| Rischio | Mitigazione | Verifica |
|---------|-------------|----------|
| Fingerprinting | Hash cieco root identity, nessun lookup server-side | Test: alias non correlabili senza root key |
| Leak cross-community | Alias isolati per community | Test: alias community A non accessibile da community B |
| Uso improprio | Limitazioni temporanee, behavioral check | Test: alias temporanei scadono automaticamente |

---

### 3.6 Done When (Acceptance Criteria)

- [ ] Alias creati come projection di root identity verificata
- [ ] Alias isolati per community; nessuna correlazione cross-community
- [ ] Alias disposable: revocabili e ricreabili
- [ ] Alias non correlabili server-side senza root key
- [ ] Mapping locale cifrato alias → root identity
- [ ] Test: alias non correlabili senza root key
- [ ] Test: compromissione alias non rivela root identity
- [ ] Test: alias community A non accessibile da community B
- [ ] Behavioral check per prevenire uso improprio alias
- [ ] Documentazione API per gestione alias

---

## 4. Mapping Root ↔ Alias (Blind Mapping)

### 4.1 Obiettivo

Consentire coerenza interna (client-side) senza esposizione esterna (server-side). Il mapping root ↔ alias deve essere accessibile solo localmente, zero-knowledge friendly.

**Vincoli STEP B**  
- SB-011: Root identity non eliminabile
- SB-012: Alias come projection

**Rischio Audit Ostile**  
- Audit #1: Correlazione indebita → Privacy compromessa

---

### 4.2 Tecnica

#### 4.2.1 Mapping Cifrato

**Requisiti**  
- Mapping root ↔ alias cifrato localmente
- Chiave di cifratura derivata da root key
- Mapping mai esposto al server
- Mapping accessibile solo con root key

**Implementazione**  
```typescript
// Pseudo-codice vincolante
class BlindMapping {
  // Mapping cifrato locale
  private encryptedMapping: Map<string, EncryptedBlob>;
  
  // Chiave derivata da root key
  private deriveMappingKey(rootKey: Uint8Array): Uint8Array {
    return hkdf(rootKey, "iris-mapping-key", 32);
  }
  
  // Aggiungi mapping (solo client-side)
  addMapping(aliasId: string, rootId: string, rootKey: Uint8Array): void {
    const mappingKey = this.deriveMappingKey(rootKey);
    const encrypted = encrypt({ aliasId, rootId }, mappingKey);
    this.encryptedMapping.set(aliasId, encrypted);
  }
  
  // Recupera mapping (solo client-side)
  getMapping(aliasId: string, rootKey: Uint8Array): string | null {
    const encrypted = this.encryptedMapping.get(aliasId);
    if (!encrypted) return null;
    const mappingKey = this.deriveMappingKey(rootKey);
    const decrypted = decrypt(encrypted, mappingKey);
    return decrypted.rootId;
  }
}
```

**Divieti Assoluti**  
- ❌ Mapping mai inviato al server
- ❌ Mapping mai in plaintext in storage
- ❌ Nessun endpoint server-side per mapping

---

#### 4.2.2 Accessibile Solo Localmente

**Requisiti**  
- Mapping disponibile solo on-device
- Sincronizzazione mapping cifrata end-to-end tra device
- Server non ha accesso al mapping

**Implementazione**  
```typescript
// Pseudo-codice vincolante
// Sincronizzazione mapping tra device (cifrata)
interface MappingSync {
  deviceId: string;
  encryptedMapping: EncryptedBlob; // Cifrato con chiave device
  syncTimestamp: Timestamp;
}

// Server: solo relay, nessun accesso al contenuto
class MappingSyncServer {
  // Server non decifra mai il mapping
  relaySync(syncData: MappingSync): void {
    // Solo relay, nessuna decifratura
    this.forwardToDevice(syncData.deviceId, syncData.encryptedMapping);
  }
}
```

**Divieti Assoluti**  
- ❌ Server mai decifra mapping
- ❌ Mapping mai accessibile via API server-side
- ❌ Nessun lookup server-side root → alias

---

#### 4.2.3 Zero-Knowledge Friendly

**Requisiti**  
- Operazioni possono essere verificate senza rivelare mapping
- ZK proofs per verifiche senza esposizione dati
- Server non può correlare alias senza root key

**Implementazione**  
```typescript
// Pseudo-codice vincolante
// ZK proof: alias appartiene a root senza rivelare mapping
interface AliasRootProof {
  aliasId: string;
  rootIdHash: string; // Hash cieco
  zkProof: ZKProof; // Proof che alias deriva da root
}

// Verifica senza rivelare mapping
function verifyAliasRoot(proof: AliasRootProof): boolean {
  return verifyZKProof(proof.zkProof, proof.aliasId, proof.rootIdHash);
}
```

**Divieti Assoluti**  
- ❌ Nessuna verifica che riveli mapping completo
- ❌ ZK proofs obbligatori per verifiche cross-device

---

### 4.3 Divieti

| Divieto | Descrizione | Enforcement |
|---------|-------------|-------------|
| Nessun lookup server-side | Server non può correlare alias → root | Test: server non ha accesso al mapping |
| Nessuna API di correlazione | Nessun endpoint per correlazione alias | Code review: nessun endpoint `/api/alias/correlate` |

---

### 4.4 Done When (Acceptance Criteria)

- [ ] Mapping root ↔ alias cifrato localmente
- [ ] Mapping mai esposto al server
- [ ] Sincronizzazione mapping cifrata end-to-end tra device
- [ ] ZK proofs per verifiche senza esposizione mapping
- [ ] Test: server non può correlare alias senza root key
- [ ] Test: mapping non accessibile via API server-side
- [ ] Documentazione mapping e limiti privacy

---

## 5. Multi-Device Sync

### 5.1 Obiettivo

Usare IRIS su più device senza centralizzare identità. Sincronizzazione sicura, offline-first, con conflict resolution deterministica.

**Vincoli STEP B**  
- SB-024: Accesso multi-dispositivo
- SB-011: Root identity non eliminabile

**Rischio Audit Ostile**  
- Audit #4: Sync fallisce → Perdita dati

---

### 5.2 Strategia

#### 5.2.1 Encrypted State Sync

**Requisiti**  
- Stato identità sincronizzato cifrato end-to-end
- Chiave di sincronizzazione derivata da root key
- Sync asincrono, non blocca operazioni locali
- Conflict resolution deterministica (last-write-wins con timestamp)

**Implementazione**  
```typescript
// Pseudo-codice vincolante
interface IdentityState {
  rootId: string;
  aliases: Alias[];
  deviceBindings: DeviceBinding[];
  lastModified: Timestamp;
  signature: Uint8Array; // Firma root key per integrità
}

class MultiDeviceSync {
  // Sincronizza stato cifrato
  async syncState(deviceId: string, rootKey: Uint8Array): Promise<void> {
    const state = this.getLocalState(rootKey);
    const encryptedState = this.encryptState(state, rootKey);
    await this.relaySync(deviceId, encryptedState);
  }
  
  // Risoluzione conflitti deterministica
  resolveConflict(state1: IdentityState, state2: IdentityState): IdentityState {
    // Last-write-wins con timestamp
    return state1.lastModified > state2.lastModified ? state1 : state2;
  }
}
```

**Divieti Assoluti**  
- ❌ Stato mai sincronizzato in plaintext
- ❌ Sync mai blocca operazioni locali
- ❌ Nessun merge automatico senza verifica integrità

---

#### 5.2.2 Edge/Serverless Relay

**Requisiti**  
- Relay edge/serverless per sincronizzazione
- Relay non decifra mai lo stato
- Fallback automatico se latenza >100ms
- Priorità on-device, edge solo come fallback

**Implementazione**  
```typescript
// Pseudo-codice vincolante
class EdgeRelay {
  // Relay cifrato, server non decifra
  async relaySync(deviceId: string, encryptedState: EncryptedBlob): Promise<void> {
    // Solo relay, nessuna decifratura
    await this.forwardToDevice(deviceId, encryptedState);
  }
  
  // Fallback automatico se latenza >100ms
  async syncWithFallback(deviceId: string, state: EncryptedBlob): Promise<void> {
    const latency = await this.measureLatency();
    if (latency > 100) {
      // Fallback: sync locale, retry asincrono
      await this.localSync(state);
      this.retryAsync(deviceId, state);
    } else {
      await this.relaySync(deviceId, state);
    }
  }
}
```

**Divieti Assoluti**  
- ❌ Relay mai decifra stato
- ❌ Nessun storage permanente stato su relay
- ❌ Fallback automatico se latenza >100ms

---

#### 5.2.3 Conflict Resolution Deterministica

**Requisiti**  
- Conflitti risolti deterministicamente (last-write-wins)
- Integrità verificata con firma root key
- Nessuna perdita dati in caso di conflitto

**Implementazione**  
```typescript
// Pseudo-codice vincolante
class ConflictResolver {
  resolveConflict(
    localState: IdentityState,
    remoteState: IdentityState,
    rootKey: Uint8Array
  ): IdentityState {
    // Verifica integrità
    if (!this.verifySignature(localState, rootKey)) {
      return remoteState;
    }
    if (!this.verifySignature(remoteState, rootKey)) {
      return localState;
    }
    
    // Last-write-wins
    return localState.lastModified > remoteState.lastModified
      ? localState
      : remoteState;
  }
}
```

**Divieti Assoluti**  
- ❌ Nessun merge automatico senza verifica integrità
- ❌ Conflitti mai risolti senza firma root key

---

### 5.3 Metriche

| Metrica | Soglia | Misurazione |
|---------|-------|-------------|
| Latenza sync | <100ms | Monitoring dashboard |
| Successo sync | 99% | Monitoring dashboard |
| Perdita dati | 0% | Test automatici |

---

### 5.4 Done When (Acceptance Criteria)

- [ ] Sync cifrato end-to-end tra device
- [ ] Sync offline-first; operazioni locali non bloccate
- [ ] Fallback edge automatico se latenza >100ms
- [ ] Conflict resolution deterministica (last-write-wins)
- [ ] Integrità verificata con firma root key
- [ ] Test stress: sync in condizioni di rete degradata
- [ ] Monitoring latenza sync; alert se >100ms
- [ ] Documentazione architettura sync

---

## 6. Anti-Sybil Base (UX-Compatible)

### 6.1 Obiettivo

Ridurre abusi senza sacrificare privacy. Rate limiting, behavioral heuristics, proof-of-human light, friction progressiva.

**Vincoli STEP B**  
- SB-013: Anti-sybil compatibile UX

**Rischio Audit Ostile**  
- Audit #3: Tecniche aggirabili → Frodi/abusi

---

### 6.2 Strumenti Consentiti

#### 6.2.1 Rate Limiting

**Requisiti**  
- Rate limit configurabile per creazione account/alias
- Rate limit basato su IP e behavioral pattern
- Rate limit progressivo: più restrittivo dopo tentativi multipli

**Implementazione**  
```typescript
// Pseudo-codice vincolante
class RateLimiter {
  // Rate limit per creazione account
  async checkAccountCreation(ip: string, behavioralHash: string): Promise<boolean> {
    const limit = await this.getLimit(ip, behavioralHash);
    const count = await this.getCount(ip, behavioralHash);
    return count < limit;
  }
  
  // Rate limit progressivo
  private getLimit(ip: string, behavioralHash: string): number {
    const attempts = await this.getAttempts(ip, behavioralHash);
    if (attempts > 10) return 1; // Molto restrittivo
    if (attempts > 5) return 3; // Moderato
    return 10; // Standard
  }
}
```

**Divieti Assoluti**  
- ❌ Rate limit mai basato su dati personali (telefono, email)
- ❌ Rate limit mai permanente senza review

---

#### 6.2.2 Behavioral Heuristics

**Requisiti**  
- Verifica pattern comportamentali (timing, interazioni)
- Heuristics non basate su dati personali
- Heuristics aggiornate dinamicamente

**Implementazione**  
```typescript
// Pseudo-codice vincolante
class BehavioralVerifier {
  // Verifica pattern comportamentali
  async verifyBehavior(interactions: Interaction[]): Promise<boolean> {
    const patterns = this.extractPatterns(interactions);
    const score = this.scorePatterns(patterns);
    return score > THRESHOLD;
  }
  
  // Pattern: timing, frequenza, coerenza
  private extractPatterns(interactions: Interaction[]): Pattern[] {
    return [
      this.analyzeTiming(interactions),
      this.analyzeFrequency(interactions),
      this.analyzeCoherence(interactions)
    ];
  }
}
```

**Divieti Assoluti**  
- ❌ Heuristics mai basate su dati personali
- ❌ Heuristics mai permanenti senza review

---

#### 6.2.3 Proof-of-Human Light

**Requisiti**  
- ZK proof-of-human senza rivelare dati personali
- Proof verificabile senza server centrale
- Friction progressiva: proof richiesto solo dopo tentativi multipli

**Implementazione**  
```typescript
// Pseudo-codice vincolante
interface ProofOfHuman {
  zkProof: ZKProof; // Proof che utente è umano
  timestamp: Timestamp;
  nonce: string; // Nonce per prevenire replay
}

class ProofOfHumanVerifier {
  // Verifica proof senza rivelare dati
  async verifyProof(proof: ProofOfHuman): Promise<boolean> {
    return verifyZKProof(proof.zkProof, proof.timestamp, proof.nonce);
  }
}
```

**Divieti Assoluti**  
- ❌ Proof mai basato su dati personali
- ❌ Proof mai permanente senza review

---

#### 6.2.4 Friction Progressiva

**Requisiti**  
- Friction minima per utenti legittimi
- Friction progressiva per tentativi multipli
- Soglia massima frizione definita (max 2 step aggiuntivi)

**Implementazione**  
```typescript
// Pseudo-codice vincolante
class FrictionManager {
  // Friction progressiva
  async getFrictionLevel(ip: string, behavioralHash: string): Promise<FrictionLevel> {
    const attempts = await this.getAttempts(ip, behavioralHash);
    if (attempts > 10) return FrictionLevel.HIGH; // Proof-of-human richiesto
    if (attempts > 5) return FrictionLevel.MEDIUM; // Behavioral check
    return FrictionLevel.LOW; // Solo rate limit
  }
}

enum FrictionLevel {
  LOW = "low", // Solo rate limit
  MEDIUM = "medium", // Rate limit + behavioral check
  HIGH = "high" // Rate limit + behavioral check + proof-of-human
}
```

**Divieti Assoluti**  
- ❌ Friction mai supera 2 step aggiuntivi
- ❌ Friction mai permanente senza review

---

### 6.3 Strumenti Vietati

| Strumento | Motivo | Enforcement |
|-----------|--------|-------------|
| KYC | Viola privacy by default | Test: nessun endpoint KYC |
| Biometriche | Viola privacy by default | Test: nessun endpoint biometriche |
| Telefono/Email obbligatori | Viola privacy by default | Test: account creato senza telefono/email |

---

### 6.4 Done When (Acceptance Criteria)

- [ ] Rate limit configurabile per creazione account/alias
- [ ] Behavioral verification basata su pattern interazione
- [ ] ZK proof-of-human implementato; verifica senza rivelare dati personali
- [ ] Soglia massima frizione definita e documentata (max 2 step aggiuntivi)
- [ ] Test: efficacia anti-sybil senza degradare UX
- [ ] Test: nessun endpoint KYC/biometriche/telefono obbligatorio
- [ ] Logging per tentativi di aggiramento
- [ ] Documentazione anti-sybil e limiti privacy

---

## 7. Referral Controllato

### 7.1 Obiettivo

Crescita responsabile, non spam economy. Referral limitati, trust-weighted, reputazione non trasferibile.

**Vincoli STEP B**  
- SB-025: Inviti liberi + referral controllato
- SB-002: No spam economy

**Rischio Audit Ostile**  
- Audit #5: Referral fraudolenti → Crescita artificiale

---

### 7.2 Regole

#### 7.2.1 Referral Limitati

**Requisiti**  
- Inviti liberi senza restrizioni artificiali
- Referral tracking con ZK proofs per verifica interazioni reali
- Bonus solo su interazioni verificate (non su volume)

**Implementazione**  
```typescript
// Pseudo-codice vincolante
interface Referral {
  referrerAliasId: string;
  referredAliasId: string;
  interactionProof: ZKProof; // Proof che interazione è reale
  verifiedAt: Timestamp;
}

class ReferralManager {
  // Verifica referral con ZK proof
  async verifyReferral(referral: Referral): Promise<boolean> {
    // Verifica proof senza rivelare dati personali
    return verifyZKProof(referral.interactionProof);
  }
  
  // Bonus solo su interazioni verificate
  async calculateBonus(referral: Referral): Promise<number> {
    if (!await this.verifyReferral(referral)) {
      return 0; // Nessun bonus senza verifica
    }
    // Bonus basato su qualità interazione, non volume
    return this.calculateQualityBonus(referral);
  }
}
```

**Divieti Assoluti**  
- ❌ Bonus mai basato su volume
- ❌ Referral mai automatici senza verifica
- ❌ Nessun beneficio legato a inviti

---

#### 7.2.2 Trust-Weighted

**Requisiti**  
- Referral pesati in base a trust del referrer
- Trust calcolato localmente per community
- Trust non trasferibile tra community

**Implementazione**  
```typescript
// Pseudo-codice vincolante
class TrustWeightedReferral {
  // Trust locale per community
  async getTrustWeight(referrerAliasId: string, communityId: string): Promise<number> {
    const trust = await this.getLocalTrust(referrerAliasId, communityId);
    return trust; // Trust locale, non globale
  }
  
  // Referral pesato in base a trust
  async calculateWeightedBonus(referral: Referral): Promise<number> {
    const trustWeight = await this.getTrustWeight(
      referral.referrerAliasId,
      referral.communityId
    );
    const baseBonus = await this.calculateBonus(referral);
    return baseBonus * trustWeight;
  }
}
```

**Divieti Assoluti**  
- ❌ Trust mai trasferibile tra community
- ❌ Trust mai globale o aggregato

---

#### 7.2.3 Reputazione Non Trasferibile

**Requisiti**  
- Reputazione locale per community
- Reputazione non aggregabile cross-community
- Referral non trasferisce reputazione

**Implementazione**  
```typescript
// Pseudo-codice vincolante
class ReputationManager {
  // Reputazione locale per community
  async getReputation(aliasId: string, communityId: string): Promise<number> {
    return await this.getLocalReputation(aliasId, communityId);
  }
  
  // Reputazione non trasferibile
  async transferReputation(
    fromAliasId: string,
    toAliasId: string,
    communityId: string
  ): Promise<void> {
    throw new Error("Reputazione non trasferibile"); // Vietato
  }
}
```

**Divieti Assoluti**  
- ❌ Reputazione mai trasferibile tra community
- ❌ Referral mai trasferisce reputazione

---

### 7.3 Done When (Acceptance Criteria)

- [ ] Inviti liberi senza restrizioni artificiali
- [ ] Referral tracking con ZK proofs per verifica interazioni reali
- [ ] Bonus solo su interazioni verificate (non su volume)
- [ ] Anti-fraud detection per referral multipli o pattern sospetti
- [ ] Trust-weighted referral; trust locale per community
- [ ] Reputazione non trasferibile tra community
- [ ] Test: efficacia anti-fraud senza degradare UX
- [ ] Logging per audit referral e bonus
- [ ] Documentazione referral e limiti privacy

---

## 8. Discovery Opt-In

### 8.1 Obiettivo

Evitare sorveglianza e social graph impliciti. Discovery disattivato di default, attivazione esplicita, scope limitato.

**Vincoli STEP B**  
- SB-026: Discovery attiva
- SB-004: Diritto all'oblio

**Rischio Audit Ostile**  
- Audit #6: Privacy leak → Violazione fiducia

---

### 8.2 Regole

#### 8.2.1 Discovery Disattivato di Default

**Requisiti**  
- Discovery disattivato di default per tutti gli utenti
- Nessun dato condiviso senza opt-in esplicito
- Opt-in revocabile immediatamente

**Implementazione**  
```typescript
// Pseudo-codice vincolante
interface DiscoverySettings {
  enabled: boolean; // Default: false
  scope: DiscoveryScope; // Limitato
  optInTimestamp?: Timestamp;
  optOutTimestamp?: Timestamp;
}

class DiscoveryManager {
  // Discovery disattivato di default
  async getDiscoverySettings(aliasId: string): Promise<DiscoverySettings> {
    const settings = await this.getSettings(aliasId);
    return settings || { enabled: false, scope: DiscoveryScope.NONE };
  }
  
  // Opt-in esplicito
  async enableDiscovery(aliasId: string, scope: DiscoveryScope): Promise<void> {
    await this.updateSettings(aliasId, {
      enabled: true,
      scope,
      optInTimestamp: Date.now()
    });
  }
  
  // Opt-out immediato
  async disableDiscovery(aliasId: string): Promise<void> {
    await this.updateSettings(aliasId, {
      enabled: false,
      optOutTimestamp: Date.now()
    });
    // Cancellazione immediata dati discovery
    await this.deleteDiscoveryData(aliasId);
  }
}
```

**Divieti Assoluti**  
- ❌ Discovery mai attivo di default
- ❌ Nessun dato condiviso senza opt-in esplicito
- ❌ Opt-out mai ritardato o parziale

---

#### 8.2.2 Attivazione Esplicita

**Requisiti**  
- Opt-in esplicito richiesto per attivare discovery
- Consenso specifico per ogni scope
- Revoca immediata e completa

**Implementazione**  
```typescript
// Pseudo-codice vincolante
enum DiscoveryScope {
  NONE = "none",
  COMMUNITY = "community", // Solo community
  RELATIONSHIP = "relationship" // Solo relazioni
}

class DiscoveryOptIn {
  // Opt-in esplicito con consenso specifico
  async requestOptIn(aliasId: string, scope: DiscoveryScope): Promise<boolean> {
    // Richiesta consenso esplicito
    const consent = await this.requestConsent(aliasId, scope);
    if (!consent) {
      return false; // Opt-in rifiutato
    }
    // Attivazione discovery
    await this.enableDiscovery(aliasId, scope);
    return true;
  }
}
```

**Divieti Assoluti**  
- ❌ Opt-in mai implicito o automatico
- ❌ Consenso mai generico o ambiguo
- ❌ Revoca mai ritardata o parziale

---

#### 8.2.3 Scope Limitato

**Requisiti**  
- Discovery limitato a scope esplicito
- Nessun dato condiviso oltre scope
- Controlli audit per ogni accesso

**Implementazione**  
```typescript
// Pseudo-codice vincolante
class DiscoveryScopeManager {
  // Scope limitato
  async getDiscoveryData(aliasId: string, scope: DiscoveryScope): Promise<DiscoveryData> {
    const settings = await this.getDiscoverySettings(aliasId);
    if (!settings.enabled || settings.scope !== scope) {
      throw new Error("Discovery non abilitato per questo scope");
    }
    // Controlli audit
    await this.auditAccess(aliasId, scope);
    return await this.getData(aliasId, scope);
  }
}
```

**Divieti Assoluti**  
- ❌ Discovery mai oltre scope esplicito
- ❌ Nessun dato condiviso senza audit

---

### 8.3 Done When (Acceptance Criteria)

- [ ] Discovery disattivato di default per tutti gli utenti
- [ ] Opt-in obbligatorio per attivare discovery
- [ ] Consenso specifico per ogni scope
- [ ] Revoca immediata e completa
- [ ] Scope limitato; nessun dato condiviso oltre scope
- [ ] Controlli audit per ogni accesso discovery
- [ ] Test: discovery non attivo di default
- [ ] Test: opt-in obbligatorio e revocabile
- [ ] Dashboard trasparenza per utente (cosa è condiviso)
- [ ] Documentazione discovery e limiti privacy

---

## 9. Checklist di Implementazione (PR Gate)

### 9.1 Requisiti Obbligatori per Ogni PR Identity

Ogni PR su Identity **DEVE**:

- [ ] Citare almeno **1 vincolo STEP B** nel commit message
- [ ] Citare almeno **1 rischio Audit Ostile** mitigato
- [ ] Superare test di correlazione (alias non correlabili senza root key)
- [ ] Non introdurre endpoint di lookup server-side
- [ ] Non introdurre UI o AI (solo backend/identity)
- [ ] Test unitari per separazione root/alias
- [ ] Test integrazione per privacy-preserving
- [ ] Documentazione API aggiornata
- [ ] Audit log per operazioni critiche

---

### 9.2 Test Obbligatori

| Test | Descrizione | Enforcement |
|------|-------------|-------------|
| Test correlazione | Alias non correlabili senza root key | CI/CD: test fallisce se correlazione possibile |
| Test compromissione | Compromissione alias non rivela root | CI/CD: test fallisce se root compromessa |
| Test privacy | Nessun dato personale esposto | CI/CD: test fallisce se dati esposti |
| Test offline-first | Operazioni funzionano offline | CI/CD: test fallisce se operazioni richiedono connessione |

---

### 9.3 Code Review Checklist

Ogni PR Identity **DEVE** essere reviewata per:

- [ ] Conformità STEP B (tutti i vincoli rispettati)
- [ ] Mitigazione rischi Audit Ostile
- [ ] Nessun endpoint lookup server-side
- [ ] Privacy-preserving (dati on-device default)
- [ ] Test completi e passanti
- [ ] Documentazione aggiornata

---

## 10. Criteri di Fallimento (STOP IMMEDIATO)

### 10.1 Fallimento Assoluto

Il sistema **FALLISCE** se:

1. **Root identity è cancellabile**
   - Violazione: SB-011
   - Azione: Bloccare PR immediatamente, escalation automatica

2. **Alias sono correlabili server-side**
   - Violazione: SB-012
   - Azione: Bloccare PR immediatamente, escalation automatica

3. **Discovery è attivo di default**
   - Violazione: SB-026
   - Azione: Bloccare PR immediatamente, escalation automatica

4. **Referral diventano growth hack**
   - Violazione: SB-002, SB-025
   - Azione: Bloccare PR immediatamente, escalation automatica

5. **Esiste lookup centrale identity**
   - Violazione: SB-011, SB-012
   - Azione: Bloccare PR immediatamente, escalation automatica

---

### 10.2 Escalation Automatica

Ogni fallimento attiva **automaticamente**:

1. **Blocco merge PR** (CI/CD)
2. **Notifica team** (Principal Engineer + Product Owner + Escalation Officer)
3. **Review obbligatoria** entro 24h
4. **Documentazione violazione** nel sistema di audit

---

## 11. Riferimenti Normativi

### 11.1 Documenti Vincolanti

- `IRIS_Governance_Frozen_v1.0.md` — Governance congelata
- `IRIS_Backlog_FASE2_Implementation_v1.0.md` — Backlog FASE 2
- `IRIS_Piano_Operativo_Fase2_v1.0_NextStep.md` — Piano operativo FASE 2

### 11.2 Vincoli STEP B Applicabili

| Vincolo | Sezione | Enforcement |
|---------|---------|-------------|
| SB-011 | Root identity non eliminabile | Sezione 2 |
| SB-012 | Alias come projection | Sezione 3 |
| SB-013 | Anti-sybil compatibile UX | Sezione 6 |
| SB-024 | Accesso multi-dispositivo | Sezione 5 |
| SB-025 | Inviti liberi + referral controllato | Sezione 7 |
| SB-026 | Discovery attiva | Sezione 8 |
| SB-027 | Root identity ↔ wallet unico | (Fuori scope identità base) |

### 11.3 Rischi Audit Ostile Applicabili

| Rischio | Sezione | Mitigazione |
|---------|---------|-------------|
| Audit #1 | Alias aggirano vincolo | Sezione 2, 3, 4 |
| Audit #2 | Uso improprio alias | Sezione 3 |
| Audit #3 | Tecniche aggirabili | Sezione 6 |
| Audit #4 | Sync fallisce | Sezione 5 |
| Audit #5 | Referral fraudolenti | Sezione 7 |
| Audit #6 | Privacy leak | Sezione 8 |

---

## 12. Stato del Documento

- **Stato**: **Binding for Implementation**
- **Versione**: v1.0
- **Fase**: FASE 2 (Identity)
- **Data**: 2026-01-24
- **Validità**: Fino a revisione formale o completamento FASE 2

### Tracciabilità

Ogni modifica futura a questo documento deve essere:
- Versionata (v1.1, v1.2, etc.)
- Documentata con motivazione esplicita
- Approvata formalmente da Principal Engineer
- Tracciata in changelog separato

---

**Documento vincolante per implementazione identità IRIS FASE 2.**  
**Ogni violazione comporta rifiuto PR e escalation automatica.**  
**Nessuna implementazione può procedere senza conformità a questo documento.**
