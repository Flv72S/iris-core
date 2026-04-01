---
title: "IRIS — API Contracts Freeze STEP 5.3 v1.0"
author: "Principal System Architect & Protocol Designer"
version: "1.0"
date: "2026-01-26"
status: "FROZEN — Pre-Implementation"
dependencies: "IRIS_Messaging_Core_Architecture_Freeze_STEP4A_v1.0.md, IRIS_UX_Hardening_STEP4G_v1.0.md, IRIS_UI_Semantic_Freeze_STEP5.1.5_v1.0.md, IRIS_STEP5.2_Data_Connection_Map_v1.0.md"
tags: ["FASE2", "Messaging", "API", "Contracts", "Freeze", "STEP5.3", "Vincolante"]
---

# IRIS — API Contracts Freeze STEP 5.3 v1.0

> Congelamento normativo definitivo e irreversibile dei contratti API del Messaging Core IRIS.  
> **Stato: FROZEN** — non modificabile senza nuovo atto di governance.  
> **Ogni ambiguità è una vulnerabilità. Ogni comportamento non esplicitato è VIETATO.**

---

## 🎯 DICHIARAZIONE DI FREEZE

**Questo documento congela i contratti API del Messaging Core IRIS.**

Questa dichiarazione è **normativa e vincolante**. Qualsiasi modifica ai contratti API dopo questo freeze richiede:

1. Audit ostile dedicato
2. Aggiornamento governance
3. Approvazione esplicita di Principal System Architect + Privacy Architect
4. Revisione completa di tutti i test bloccanti

**Nessuna PR può modificare questi contratti direttamente.**  
**Qualsiasi violazione comporta rifiuto automatico della PR, anche se "funziona meglio".**

---

## 📚 CONTESTO VINCOLANTE (OBBLIGATORIO)

Questo freeze rispetta integralmente:

- ✅ **STEP 4A** — Messaging Core Architecture Freeze
- ✅ **STEP 4G** — UX Hardening Mirato
- ✅ **STEP 5.1** — UI Scheletro
- ✅ **STEP 5.1.5** — UI Semantic Freeze
- ✅ **STEP 5.2** — Collegamento Backend/Mock

**La UI è passiva, deterministica, semanticamente congelata.**  
**I contratti API NON possono introdurre nuova semantica.**

---

## 🔒 CONTRATTO 1 — Message Append Contract

### 1.1 Endpoint / Interfaccia Astratta

**Endpoint**: `POST /api/messaging/threads/{threadId}/messages`

**Interfaccia TypeScript**:
```typescript
interface MessageAppendRequest {
  readonly threadId: string; // Obbligatorio, validato esistenza
  readonly senderAlias: string; // Obbligatorio, validato esistenza alias
  readonly payload: string; // Obbligatorio, max 10MB, non vuoto
  readonly clientMessageId?: string; // Opzionale, per idempotenza offline
}

interface MessageAppendResponse {
  readonly messageId: string; // ID generato server-side, immutabile
  readonly threadId: string; // Echo del threadId richiesto
  readonly state: 'SENT'; // Stato iniziale obbligatorio
  readonly createdAt: number; // Timestamp server-side, arrotondato (bucket 5s)
  readonly clientMessageId?: string; // Echo se fornito
}

interface MessageAppendError {
  readonly code: 'THREAD_NOT_FOUND' | 'THREAD_CLOSED' | 'ALIAS_NOT_FOUND' | 'PAYLOAD_INVALID' | 'PAYLOAD_TOO_LARGE' | 'RATE_LIMIT' | 'OFFLINE_QUEUE_FULL';
  readonly message: string; // Messaggio dichiarativo, non emozionale
  readonly threadId?: string; // Se applicabile
}
```

**Metodo HTTP**: `POST`  
**Content-Type**: `application/json`  
**Autenticazione**: Obbligatoria (JWT token)

---

### 1.2 Schema Dati (Tipi Primitivi, Nessuna Logica)

**Campi Request**:

| Campo | Tipo | Obbligatorio | Vincoli | Note |
|-------|------|--------------|---------|------|
| `threadId` | `string` | ✅ SÌ | UUID v4, esistente, thread OPEN | Validato esistenza |
| `senderAlias` | `string` | ✅ SÌ | UUID v4, esistente, alias valido | Mai root identity |
| `payload` | `string` | ✅ SÌ | Non vuoto, max 10MB, UTF-8 valido | Dimensione in bytes |
| `clientMessageId` | `string` | ❌ NO | UUID v4, univoco per client | Idempotenza offline |

**Campi Response**:

| Campo | Tipo | Obbligatorio | Vincoli | Note |
|-------|------|--------------|---------|------|
| `messageId` | `string` | ✅ SÌ | UUID v4, generato server-side | Immutabile, univoco |
| `threadId` | `string` | ✅ SÌ | Echo del threadId richiesto | Validazione esistenza |
| `state` | `'SENT'` | ✅ SÌ | Letterale 'SENT' | Stato iniziale obbligatorio |
| `createdAt` | `number` | ✅ SÌ | Timestamp UTC, arrotondato (bucket 5s) | Millisecondi, server-side |
| `clientMessageId` | `string` | ❌ NO | Echo se fornito | Idempotenza offline |

---

### 1.3 Invarianti NON Violabili

#### Invariante 1.3.1: Append-Only

**Dichiarazione**:  
Un messaggio può essere **solo aggiunto**, mai modificato o sovrascritto.

**Enforcement**:
- ✅ Nessun endpoint `PUT /api/messaging/messages/{messageId}`
- ✅ Nessun endpoint `PATCH /api/messaging/messages/{messageId}`
- ✅ Nessun endpoint `DELETE /api/messaging/messages/{messageId}` (solo CANCELLED state)
- ✅ Campo `payload` immutabile dopo creazione
- ✅ Campo `senderAlias` immutabile dopo creazione

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

#### Invariante 1.3.2: Ordine Dichiarato

**Dichiarazione**:  
L'ordine dei messaggi è determinato esclusivamente da `createdAt` (timestamp server-side arrotondato).

**Enforcement**:
- ✅ Nessun ordinamento implicito o derivato
- ✅ Nessun campo `order` o `sequence`
- ✅ Nessun ordinamento basato su `messageId`
- ✅ Ordinamento sempre: `ORDER BY createdAt ASC`

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

#### Invariante 1.3.3: Nessun Overwrite

**Dichiarazione**:  
Un messaggio con `messageId` esistente non può essere sovrascritto.

**Enforcement**:
- ✅ `messageId` generato server-side, univoco
- ✅ Se `clientMessageId` duplicato (idempotenza), restituisce messaggio esistente
- ✅ Nessun upsert o merge
- ✅ Validazione esistenza prima di creazione

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

#### Invariante 1.3.4: Nessuna Modifica Retroattiva

**Dichiarazione**:  
Un messaggio non può essere modificato dopo la creazione, nemmeno retroattivamente.

**Enforcement**:
- ✅ Nessun campo modificabile dopo creazione
- ✅ Stato transizione solo forward (DRAFT → SENT → DELIVERED → READ → ARCHIVED)
- ✅ Nessun rollback di stato
- ✅ Timestamp `createdAt` immutabile

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### 1.4 Comportamenti ESPLICITAMENTE Vietati

| Comportamento | Motivazione | Vincolo Violato |
|---------------|-------------|-----------------|
| **Modifica payload dopo creazione** | Violazione append-only | Invariante 1.3.1 |
| **Ordinamento basato su logica** | Violazione ordine dichiarato | Invariante 1.3.2 |
| **Overwrite messaggio esistente** | Violazione nessun overwrite | Invariante 1.3.3 |
| **Modifica retroattiva stato** | Violazione nessuna modifica retroattiva | Invariante 1.3.4 |
| **Messaggio senza threadId** | Violazione threading obbligatorio | STEP 4A §1.6 |
| **Messaggio con root identity** | Violazione alias-only | STEP 4A §1.4 |
| **Messaggio senza stato** | Violazione stato esplicito | STEP 4A §1.5 |
| **Payload vuoto** | Violazione validazione | Schema 1.2 |
| **Payload > 10MB** | Violazione limite strutturale | STEP 4A §6.1 |

---

### 1.5 Failure Mode Ammessi (e Solo Quelli)

| Failure Mode | Codice Errore | Condizione | Comportamento |
|--------------|---------------|------------|---------------|
| **Thread non trovato** | `THREAD_NOT_FOUND` | `threadId` non esiste | HTTP 404, errore esplicito |
| **Thread chiuso** | `THREAD_CLOSED` | Thread stato CLOSED/ARCHIVED | HTTP 403, errore esplicito |
| **Alias non trovato** | `ALIAS_NOT_FOUND` | `senderAlias` non esiste | HTTP 404, errore esplicito |
| **Payload invalido** | `PAYLOAD_INVALID` | Payload vuoto o UTF-8 invalido | HTTP 400, errore esplicito |
| **Payload troppo grande** | `PAYLOAD_TOO_LARGE` | Payload > 10MB | HTTP 413, errore esplicito |
| **Rate limit** | `RATE_LIMIT` | Troppi messaggi in breve tempo | HTTP 429, errore esplicito |
| **Coda offline piena** | `OFFLINE_QUEUE_FULL` | Coda offline > 1000 messaggi | HTTP 507, errore esplicito |

**Nessun altro failure mode è ammesso.**

---

### 1.6 Errori Obbligatoriamente Visibili

**Principio**:  
Ogni errore deve essere **esplicito, dichiarativo, non emozionale**.

**Enforcement**:
- ✅ Codice errore standardizzato (enum)
- ✅ Messaggio dichiarativo (non prescrittivo)
- ✅ Nessun suggerimento di azione
- ✅ Nessun copy emozionale
- ✅ HTTP status code corretto

---

## 🔒 CONTRATTO 2 — Thread State Contract

### 2.1 Stato Thread come Oggetto Esplicito

**Endpoint**: `GET /api/messaging/threads/{threadId}/state`

**Interfaccia TypeScript**:
```typescript
interface ThreadStateResponse {
  readonly threadId: string; // Obbligatorio
  readonly state: 'OPEN' | 'PAUSED' | 'CLOSED' | 'ARCHIVED'; // Enum chiuso, finito
  readonly lastStateChangeAt: number; // Timestamp ultima transizione, arrotondato (bucket 5s)
  readonly canAcceptMessages: boolean; // Derivato esplicito: state === 'OPEN'
}
```

**Metodo HTTP**: `GET`  
**Content-Type**: `application/json`  
**Autenticazione**: Obbligatoria (JWT token)

---

### 2.2 Stati Ammessi (Chiusi, Finiti)

**Enum ThreadState**:

| Stato | Valore Letterale | Descrizione | Transizioni Consentite |
|-------|------------------|-------------|------------------------|
| **OPEN** | `'OPEN'` | Thread attivo, accetta nuovi messaggi | → PAUSED, → CLOSED |
| **PAUSED** | `'PAUSED'` | Thread temporaneamente sospeso | → OPEN, → CLOSED |
| **CLOSED** | `'CLOSED'` | Thread chiuso, nessun nuovo messaggio | → ARCHIVED |
| **ARCHIVED** | `'ARCHIVED'` | Thread archiviato | Nessuna (stato finale) |

**Vincoli**:
- ✅ Enum chiuso, finito (nessun altro stato possibile)
- ✅ Transizioni solo forward (non retroattive)
- ✅ Transizioni solo tra stati adiacenti (definiti nella tabella)
- ✅ Transizioni immutabili (una volta raggiunto uno stato, non si può tornare indietro)

---

### 2.3 Transizioni Consentite

**Endpoint**: `POST /api/messaging/threads/{threadId}/state`

**Interfaccia TypeScript**:
```typescript
interface ThreadStateTransitionRequest {
  readonly threadId: string; // Obbligatorio
  readonly targetState: 'PAUSED' | 'CLOSED' | 'ARCHIVED'; // Solo transizioni forward
  readonly reason?: string; // Opzionale, max 500 caratteri
}

interface ThreadStateTransitionResponse {
  readonly threadId: string; // Echo del threadId richiesto
  readonly previousState: 'OPEN' | 'PAUSED' | 'CLOSED'; // Stato precedente
  readonly newState: 'PAUSED' | 'CLOSED' | 'ARCHIVED'; // Nuovo stato
  readonly transitionedAt: number; // Timestamp transizione, arrotondato (bucket 5s)
}
```

**Regole di Transizione**:

| Stato Corrente | Transizione Consentita | Condizione |
|----------------|------------------------|------------|
| **OPEN** | → PAUSED | Sempre consentita |
| **OPEN** | → CLOSED | Sempre consentita |
| **PAUSED** | → OPEN | Sempre consentita |
| **PAUSED** | → CLOSED | Sempre consentita |
| **CLOSED** | → ARCHIVED | Sempre consentita |
| **ARCHIVED** | Nessuna | Stato finale, nessuna transizione |

---

### 2.4 Stati Vietati (Es. Online, Typing, Attenzione)

**Stati ESPLICITAMENTE Vietati**:

| Stato Vietato | Motivazione | Vincolo Violato |
|---------------|-------------|-----------------|
| **ONLINE** | Violazione privacy, inferenza temporale | STEP 4A §5.2.4 |
| **OFFLINE** | Violazione privacy, inferenza temporale | STEP 4A §5.2.4 |
| **TYPING** | Violazione privacy, timing correlation | STEP 4A §5.2.6 |
| **READING** | Violazione privacy, inferenza sociale | STEP 4A §5.2.5 |
| **ACTIVE** | Violazione privacy, inferenza temporale | STEP 4A §5.2.4 |
| **INACTIVE** | Violazione privacy, inferenza temporale | STEP 4A §5.2.4 |
| **UNREAD** | Violazione inferenza sociale | STEP 4A §5.2.5 |
| **PRIORITY** | Violazione ranking implicito | STEP 4A §5.2.3 |

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### 2.5 Nessuna Inferenza Temporale o Sociale

**Principio**:  
Lo stato thread è **tecnico, esplicito, non inferibile**.

**Enforcement**:
- ✅ Nessun campo `lastSeenAt` o `lastActivityAt`
- ✅ Nessun campo `isOnline` o `isActive`
- ✅ Nessun campo `unreadCount` o `priority`
- ✅ Campo `lastStateChangeAt` solo per audit, non per inferenza
- ✅ Campo `canAcceptMessages` derivato esplicito, non inferito

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

## 🔒 CONTRATTO 3 — Sync / Delivery Contract

### 3.1 Consegna come Evento Dichiarato

**Endpoint**: `GET /api/messaging/threads/{threadId}/messages/{messageId}/delivery`

**Interfaccia TypeScript**:
```typescript
interface MessageDeliveryResponse {
  readonly messageId: string; // Obbligatorio
  readonly threadId: string; // Obbligatorio
  readonly state: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'; // Stati delivery
  readonly sentAt: number; // Timestamp invio, arrotondato (bucket 5s)
  readonly deliveredAt?: number; // Timestamp consegna, se applicabile, arrotondato (bucket 5s)
  readonly readAt?: number; // Timestamp lettura, se applicabile, arrotondato (bucket 5s)
  readonly failedAt?: number; // Timestamp fallimento, se applicabile, arrotondato (bucket 5s)
  readonly failureReason?: string; // Motivo fallimento, se applicabile, max 500 caratteri
}
```

**Principio**:  
La consegna è un **evento dichiarato**, non inferito.

---

### 3.2 Offline-First come Caso Base

**Comportamento Offline**:
- ✅ Messaggio salvato localmente (stato DRAFT)
- ✅ Messaggio in coda offline (max 1000 messaggi)
- ✅ Sincronizzazione asincrona quando connessione disponibile
- ✅ Nessun blocco operazioni locali
- ✅ Nessun errore se offline (solo se coda piena)

**Principio**:  
Il sistema funziona **completamente offline**. La sincronizzazione è opzionale e asincrona.

---

### 3.3 Retry SOLO Esplicito

**Endpoint**: `POST /api/messaging/threads/{threadId}/messages/{messageId}/retry`

**Regole Retry**:
- ✅ Retry solo esplicito (endpoint dedicato)
- ✅ Retry solo per messaggi in stato FAILED
- ✅ Max 5 tentativi retry
- ✅ Retry policy esponenziale backoff (1s, 2s, 4s, 8s, 16s, max 60s)
- ✅ Nessun retry automatico invisibile

**Violazione**: Se retry automatico invisibile → **RIFIUTO PR AUTOMATICO**

---

### 3.4 Latenza come Dato, Non come Percezione

**Endpoint**: `GET /api/messaging/sync/status`

**Principio**:  
La latenza è un **dato esplicito**, non una percezione implicita.

**Enforcement**:
- ✅ Campo `estimatedSyncLatency` esplicito (non inferito)
- ✅ Campo `lastSyncAt` esplicito (non derivato)
- ✅ Campo `pendingMessagesCount` esplicito (non derivato)
- ✅ Nessun campo `isSyncing` ambiguo
- ✅ Nessun campo `syncProgress` che suggerisce urgenza

**Violazione**: Se latenza inferita o percepita → **RIFIUTO PR AUTOMATICO**

---

### 3.5 Nessun Realtime Implicito

**Principio**:  
Il sistema è **asincrono, non realtime**.

**Enforcement**:
- ✅ Nessun endpoint WebSocket o Server-Sent Events
- ✅ Nessun polling automatico invisibile
- ✅ Nessun campo `isRealtime` o `isLive`
- ✅ Nessun suggerimento di urgenza o attesa
- ✅ Sincronizzazione solo esplicita (endpoint dedicato)

**Violazione**: Se realtime implicito → **RIFIUTO PR AUTOMATICO**

---

### 3.6 Nessuna Ottimizzazione Invisibile

**Principio**:  
Ogni ottimizzazione deve essere **esplicita, dichiarata, tracciabile**.

**Enforcement**:
- ✅ Nessun batching invisibile
- ✅ Nessun caching invisibile
- ✅ Nessun prefetch invisibile
- ✅ Nessun debouncing invisibile
- ✅ Ogni ottimizzazione documentata e tracciabile

**Violazione**: Se ottimizzazione invisibile → **RIFIUTO PR AUTOMATICO**

---

## 📋 INVARIANTI GLOBALI (OBBLIGATORI)

Vedi documento separato: `IRIS_API_Invariants_and_Failure_Modes.md`

---

## 🧪 TEST BLOCCANTI

Vedi directory: `/src/api/tests/`

---

## 🗺️ MAPPING OBBLIGATORIO

Vedi documento separato: `IRIS_API_UI_Mapping.md`

---

## ✍️ FIRME (SIMBOLICHE)

**Principal System Architect**: _________________  
**Protocol Designer**: _________________  
**Privacy Architect**: _________________  
**Backend Lead**: _________________  
**Principal Engineer**: _________________

---

## 🚨 VERDETTO FINALE

**Se anche un solo contratto è ambiguo, lo STEP FALLISCE.**

Vedi documento: `IRIS_STEP5.3_API_Completamento_v1.0.md`

---

**Documento vincolante per implementazione API Messaging Core IRIS.**  
**Ogni violazione comporta rifiuto PR e escalation automatica.**  
**Nessuna implementazione può procedere senza conformità a questo documento.**
