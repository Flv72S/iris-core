---
title: "IRIS — STEP 5.5 Repository & Boundary Map v1.0"
author: "Principal System Architect & Protocol Designer"
version: "1.0"
date: "2026-01-26"
status: "FROZEN — Contract-Preserving"
dependencies: "IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md, IRIS_STEP5.4_Completamento_v1.0.md"
tags: ["FASE2", "Messaging", "API", "Repository", "Boundary", "STEP5.5", "Vincolante"]
---

# IRIS — STEP 5.5 Repository & Boundary Map v1.0

> Mapping completo: Boundary → Core → Repository  
> **Stato: FROZEN** — non modificabile senza nuovo atto di governance.

---

## 🎯 SCOPO

Questo documento mappa:

1. **Boundary Layer** → Unico punto di ingresso al Core
2. **Core API** → Logica contract-driven (READ-ONLY)
3. **Repository Layer** → Astrazione pura per persistenza
4. **Flussi espliciti** → Tracciabilità completa
5. **Rischi evitati** → Violazioni invarianti prevenute

**Ogni livello è tracciabile e verificabile.**

---

## 📊 MAPPING: Boundary → Core → Repository

### Flusso 1: Message Append

```
External Input (Plain Object)
  ↓
Boundary.appendMessage()
  ├─ Validazione pre-Core (payload, schema)
  ├─ Chiamata Core.appendMessage()
  │   ├─ Validazione request (thread-first, alias-only)
  │   ├─ Validazione rate limit e coda offline
  │   ├─ Creazione messaggio interno
  │   └─ Persistenza tramite MessageRepository
  └─ Output dichiarativo (Response | Error)
```

**File**:
- Boundary: `src/api/boundary/MessagingBoundary.ts`
- Core: `src/api/core/messageAppend.ts`
- Repository: `src/api/repositories/MessageRepository.ts`

**Invarianti verificate**:
- ✅ SYS-01 (Append-Only) — Nessun overwrite
- ✅ SYS-02 (Thread-First) — threadId obbligatorio
- ✅ SYS-03 (Alias-Only) — senderAlias obbligatorio
- ✅ SYS-04 (Stato Esplicito) — state letterale 'SENT'
- ✅ SYS-05 (Timestamp Arrotondato) — createdAt bucket 5s

---

### Flusso 2: Thread State

```
External Input (Plain Object)
  ↓
Boundary.getThreadState() / transitionThreadState()
  ├─ Validazione pre-Core (reason max 500 caratteri)
  ├─ Chiamata Core.getThreadState() / transitionThreadState()
  │   ├─ Validazione esistenza thread
  │   ├─ Validazione stato valido (enum chiuso)
  │   ├─ Validazione transizione consentita
  │   └─ Persistenza tramite ThreadRepository
  └─ Output dichiarativo (Response | Error)
```

**File**:
- Boundary: `src/api/boundary/MessagingBoundary.ts`
- Core: `src/api/core/threadState.ts`
- Repository: `src/api/repositories/ThreadRepository.ts`

**Invarianti verificate**:
- ✅ SYS-04 (Stato Esplicito) — Enum chiuso, finito
- ✅ SYS-05 (Timestamp Arrotondato) — lastStateChangeAt bucket 5s

---

### Flusso 3: Sync / Delivery

```
External Input (Plain Object)
  ↓
Boundary.getMessageDelivery() / retryMessage() / getSyncStatus()
  ├─ Chiamata Core.getMessageDelivery() / retryMessage() / getSyncStatus()
  │   ├─ Validazione esistenza messaggio/thread
  │   ├─ Validazione stato delivery
  │   ├─ Validazione retry count (max 5)
  │   └─ Persistenza tramite Repository
  └─ Output dichiarativo (Response | Error)
```

**File**:
- Boundary: `src/api/boundary/MessagingBoundary.ts`
- Core: `src/api/core/syncDelivery.ts`
- Repository: `src/api/repositories/SyncRepository.ts`

**Invarianti verificate**:
- ✅ SYS-05 (Timestamp Arrotondato) — Tutti i timestamp arrotondati
- ✅ SYS-07 (Offline-First) — Coda offline max 1000 messaggi
- ✅ SYS-08 (Nessun Realtime) — Nessun realtime implicito

---

## 🔒 ENFORCEMENT DELLE INVARIANTI

### Boundary Layer

**Responsabilità**:
- ✅ Validazione pre-Core (schema, limiti, campi obbligatori)
- ✅ Chiamata funzioni invariants.ts
- ✅ Errori espliciti (mai emozionali, mai impliciti)

**File**: `src/api/boundary/MessagingBoundary.ts`

**Funzioni di validazione**:
- `validatePayload()` — Validazione payload (pre-Core)
- `roundTimestamp()` — Arrotondamento timestamp (pre-Core)

---

### Core Layer

**Responsabilità**:
- ✅ Logica contract-driven
- ✅ Validazione invarianti
- ✅ Nessun side-effect

**File**: `src/api/core/**` (READ-ONLY)

**Invarianti verificate**:
- Tutte le invarianti SYS-01 a SYS-10

---

### Repository Layer

**Responsabilità**:
- ✅ Astrazione pura per persistenza
- ✅ Solo operazioni primitive
- ✅ Nessuna logica di dominio

**File**: `src/api/repositories/**`

**Operazioni primitive**:
- `append()` — Aggiunge messaggio (append-only)
- `get()` — Ottiene entità per ID
- `set()` — Salva/aggiorna entità
- `listByThread()` — Lista messaggi per thread

---

## 🚫 RISCHI EVITATI

### Rischio 1: Accesso Diretto al Core

**Mitigazione**:
- ✅ Core non esposto direttamente
- ✅ Boundary è unico punto di ingresso
- ✅ Test bloccanti verificano enforcement

**Verifica**: `src/api/tests/no-core-direct-access.test.ts`

---

### Rischio 2: Logica di Dominio nei Repository

**Mitigazione**:
- ✅ Repository solo interfacce + operazioni primitive
- ✅ Nessuna logica di dominio
- ✅ Test bloccanti verificano purezza

**Verifica**: `src/api/tests/repository-purity.test.ts`

---

### Rischio 3: Side-Effect Fuori dal Repository

**Mitigazione**:
- ✅ Persistenza solo tramite repository
- ✅ Nessun side-effect nascosto
- ✅ Test bloccanti verificano enforcement

**Verifica**: `src/api/tests/boundary-enforcement.test.ts`

---

### Rischio 4: Violazione Invarianti

**Mitigazione**:
- ✅ Validazione pre-Core nel Boundary
- ✅ Validazione nel Core
- ✅ Errori espliciti (mai silenziosi)

**Verifica**: `src/api/tests/boundary-enforcement.test.ts`

---

## 📋 ENFORCEMENT

### Test Bloccanti

**Directory**: `src/api/tests/`

**Test**:
- ✅ `boundary-enforcement.test.ts` — Verifica enforcement Boundary
- ✅ `repository-purity.test.ts` — Verifica purezza Repository
- ✅ `no-core-direct-access.test.ts` — Verifica accesso Core solo tramite Boundary

---

## ✍️ FIRME (SIMBOLICHE)

**Principal System Architect**: _________________  
**Protocol Designer**: _________________  
**Backend Lead**: _________________  
**Principal Engineer**: _________________

---

**Documento vincolante per implementazione Repository & Boundary Layer.**  
**Ogni violazione comporta rifiuto PR e escalation automatica.**  
**Nessuna implementazione può procedere senza conformità a questo documento.**
