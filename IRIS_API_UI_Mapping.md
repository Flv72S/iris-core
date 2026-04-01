---
title: "IRIS — API UI Mapping STEP 5.3"
author: "Principal System Architect & Protocol Designer"
version: "1.0"
date: "2026-01-26"
status: "FROZEN — Pre-Implementation"
dependencies: "IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md, IRIS_STEP5.2_Data_Connection_Map_v1.0.md, IRIS_UI_Semantic_Freeze_STEP5.1.5_v1.0.md"
tags: ["FASE2", "Messaging", "API", "UI", "Mapping", "STEP5.3", "Vincolante"]
---

# IRIS — API UI Mapping STEP 5.3

> Mapping completo e tracciabile: API → Adapter → Hook → UI Component → Documento UX → Rischio Mitigato  
> **Stato: FROZEN** — non modificabile senza nuovo atto di governance.

---

## 🎯 SCOPO

Questo documento mappa:

1. **API Contract** → Endpoint, schema, invarianti
2. **Adapter Layer** → Conversione meccanica backend → UI
3. **Hook Layer** → Restituzione dati o errori dichiarati
4. **UI Component** → Rendering dati ricevuti
5. **Documento UX** → Riferimento vincolante
6. **Rischio Mitigato** → Scenario UX ostile mitigato

**Ogni livello è tracciabile e verificabile.**

---

## 📊 MAPPING 1: Message Append

### API Contract

**Endpoint**: `POST /api/messaging/threads/{threadId}/messages`

**Request Schema**:
```typescript
interface MessageAppendRequest {
  readonly threadId: string;
  readonly senderAlias: string;
  readonly payload: string;
  readonly clientMessageId?: string;
}
```

**Response Schema**:
```typescript
interface MessageAppendResponse {
  readonly messageId: string;
  readonly threadId: string;
  readonly state: 'SENT';
  readonly createdAt: number;
  readonly clientMessageId?: string;
}
```

**Invarianti**:
- ✅ Append-only (Invariante SYS-01)
- ✅ Thread-first (Invariante SYS-02)
- ✅ Alias-only (Invariante SYS-03)
- ✅ Stato esplicito (Invariante SYS-04)
- ✅ Timestamp arrotondato (Invariante SYS-05)

**Documento**: `IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md` §1

---

### Adapter Layer

**File**: `src/ui/adapters/messageAdapter.ts`

**Funzione**: `adaptMessage(data: BackendMessage): MessageView`

**Responsabilità**:
- ✅ Conversione meccanica `BackendMessage → MessageView`
- ✅ Nessuna logica
- ✅ Nessuna decisione
- ✅ Nessuna semantica

**Mapping Campi**:
| BackendMessage | MessageView | Note |
|----------------|-------------|------|
| `id` | `id` | Diretto |
| `threadId` | `threadId` | Diretto (obbligatorio) |
| `senderAlias` | `senderAlias` | Diretto (alias-only) |
| `payload` | `payload` | Diretto |
| `state` | `state` | Diretto (stato esplicito) |
| `createdAt` | `createdAt` | Diretto (timestamp arrotondato) |

**Documento**: `IRIS_STEP5.2_Data_Connection_Map_v1.0.md` §3

---

### Hook Layer

**File**: `src/ui/hooks/useMessageAppend.ts` (da creare)

**Interfaccia**:
```typescript
function useMessageAppend(): {
  appendMessage: (request: MessageAppendRequest) => Promise<MessageAppendResponse | MessageAppendError>;
  isLoading: boolean;
  error: MessageAppendError | null;
}
```

**Responsabilità**:
- ✅ Chiamata API `POST /api/messaging/threads/{threadId}/messages`
- ✅ Restituzione dati o errori dichiarati
- ✅ Nessun polling
- ✅ Nessun retry automatico
- ✅ Nessuna inferenza

**Documento**: `IRIS_STEP5.2_Data_Connection_Map_v1.0.md` §2

---

### UI Component

**File**: `src/ui/components/MessageComposer.tsx`

**Props**:
```typescript
interface MessageComposerProps {
  readonly threadId: string; // Obbligatorio
  readonly threadState: 'OPEN' | 'PAUSED' | 'CLOSED' | 'ARCHIVED'; // Obbligatorio
  readonly disabled?: boolean; // Derivato: threadState !== 'OPEN'
  readonly onSend: (payload: string) => Promise<void>; // Callback esplicito
}
```

**Responsabilità**:
- ✅ Rendering input controllato
- ✅ Rendering stato thread (OPEN/PAUSED/CLOSED/ARCHIVED)
- ✅ Chiamata `useMessageAppend().appendMessage()` quando utente invia
- ✅ Nessuna logica
- ✅ Nessun side effect

**Documento**: `IRIS_UI_Semantic_Freeze_STEP5.1.5_v1.0.md` §4 (Composer)

---

### Documento UX

**Riferimento**: `IRIS_UX_Hardening_STEP4G_v1.0.md`

**Scenari Mitigati**:
- ✅ UX-01 (Bypass finitudine percepita) — Thread obbligatorio
- ✅ UX-05 (Gaming stato READ) — Stato esplicito
- ✅ UX-16 (Gaming stato messaggi/thread) — Append-only

**Rischio Originale**: **ALTO** → **MEDIO** (dopo mitigazione)

---

### Rischio Mitigato

| Rischio | Mitigazione | Verifica |
|---------|-------------|----------|
| **Messaggi senza thread** | Thread obbligatorio (Invariante SYS-02) | ✅ Validazione API |
| **Modifica retroattiva** | Append-only (Invariante SYS-01) | ✅ Nessun endpoint PUT/PATCH |
| **Stato inferito** | Stato esplicito (Invariante SYS-04) | ✅ Enum chiuso, finito |
| **Root identity esposta** | Alias-only (Invariante SYS-03) | ✅ Validazione alias |

---

## 📊 MAPPING 2: Thread State

### API Contract

**Endpoint**: `GET /api/messaging/threads/{threadId}/state`

**Response Schema**:
```typescript
interface ThreadStateResponse {
  readonly threadId: string;
  readonly state: 'OPEN' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';
  readonly lastStateChangeAt: number;
  readonly canAcceptMessages: boolean; // Derivato: state === 'OPEN'
}
```

**Invarianti**:
- ✅ Stato esplicito (Invariante SYS-04)
- ✅ Enum chiuso, finito (solo 4 stati)
- ✅ Nessuna inferenza temporale/sociale (Invariante SYS-04)

**Documento**: `IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md` §2

---

### Adapter Layer

**File**: `src/ui/adapters/threadAdapter.ts`

**Funzione**: `adaptThread(data: BackendThread): Thread`

**Responsabilità**:
- ✅ Conversione meccanica `BackendThread → Thread`
- ✅ Nessuna logica
- ✅ Nessuna decisione
- ✅ Nessuna semantica

**Mapping Campi**:
| BackendThread | Thread | Note |
|---------------|--------|------|
| `id` | `id` | Diretto |
| `state` | `state` | Diretto (enum chiuso) |
| `lastEventAt` | `lastEventAt` | Diretto (timestamp arrotondato) |

**Documento**: `IRIS_STEP5.2_Data_Connection_Map_v1.0.md` §2

---

### Hook Layer

**File**: `src/ui/hooks/useThreadState.ts` (da creare)

**Interfaccia**:
```typescript
function useThreadState(threadId: string): {
  state: ThreadStateResponse | null;
  isLoading: boolean;
  error: ThreadStateError | null;
}
```

**Responsabilità**:
- ✅ Chiamata API `GET /api/messaging/threads/{threadId}/state`
- ✅ Restituzione dati o errori dichiarati
- ✅ Nessun polling
- ✅ Nessun retry automatico
- ✅ Nessuna inferenza

**Documento**: `IRIS_STEP5.2_Data_Connection_Map_v1.0.md` §2

---

### UI Component

**File**: `src/ui/components/ThreadDetailView.tsx`

**Props**:
```typescript
interface ThreadDetailViewProps {
  readonly thread: Thread; // Stato thread incluso
  readonly messages: readonly MessageView[];
  readonly onSendMessage?: (payload: string) => Promise<void>;
}
```

**Responsabilità**:
- ✅ Rendering stato thread (OPEN/PAUSED/CLOSED/ARCHIVED)
- ✅ Rendering `MessageComposer` con `disabled` basato su `thread.state`
- ✅ Nessuna logica
- ✅ Nessun side effect

**Documento**: `IRIS_UI_Semantic_Freeze_STEP5.1.5_v1.0.md` §2.2 (Thread Detail View)

---

### Documento UX

**Riferimento**: `IRIS_UX_Hardening_STEP4G_v1.0.md`

**Scenari Mitigati**:
- ✅ UX-05 (Gaming stato READ) — Stato esplicito, non inferito
- ✅ UX-16 (Gaming stato messaggi/thread) — Stato tecnico, non sociale

**Rischio Originale**: **MEDIO** → **BASSO** (dopo mitigazione)

---

### Rischio Mitigato

| Rischio | Mitigazione | Verifica |
|---------|-------------|----------|
| **Stato inferito** | Stato esplicito (Invariante SYS-04) | ✅ Enum chiuso, finito |
| **Inferenza temporale** | Nessun campo `lastSeenAt` | ✅ Validazione schema |
| **Inferenza sociale** | Nessun campo `isOnline` | ✅ Validazione schema |

---

## 📊 MAPPING 3: Sync / Delivery

### API Contract

**Endpoint**: `GET /api/messaging/threads/{threadId}/messages/{messageId}/delivery`

**Response Schema**:
```typescript
interface MessageDeliveryResponse {
  readonly messageId: string;
  readonly threadId: string;
  readonly state: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  readonly sentAt: number;
  readonly deliveredAt?: number;
  readonly readAt?: number;
  readonly failedAt?: number;
  readonly failureReason?: string;
}
```

**Invarianti**:
- ✅ Consegna come evento dichiarato (non inferito)
- ✅ Offline-first (Invariante SYS-07)
- ✅ Nessun realtime implicito (Invariante SYS-08)
- ✅ Timestamp arrotondato (Invariante SYS-05)

**Documento**: `IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md` §3

---

### Adapter Layer

**File**: `src/ui/adapters/messageAdapter.ts`

**Funzione**: `adaptMessageDelivery(data: BackendMessageDelivery): MessageDeliveryView`

**Responsabilità**:
- ✅ Conversione meccanica `BackendMessageDelivery → MessageDeliveryView`
- ✅ Nessuna logica
- ✅ Nessuna decisione
- ✅ Nessuna semantica

**Mapping Campi**:
| BackendMessageDelivery | MessageDeliveryView | Note |
|------------------------|---------------------|------|
| `messageId` | `messageId` | Diretto |
| `threadId` | `threadId` | Diretto |
| `state` | `state` | Diretto (stato esplicito) |
| `sentAt` | `sentAt` | Diretto (timestamp arrotondato) |
| `deliveredAt` | `deliveredAt` | Diretto (opzionale) |
| `readAt` | `readAt` | Diretto (opzionale) |

**Documento**: `IRIS_STEP5.2_Data_Connection_Map_v1.0.md` §3

---

### Hook Layer

**File**: `src/ui/hooks/useMessageDelivery.ts` (da creare)

**Interfaccia**:
```typescript
function useMessageDelivery(threadId: string, messageId: string): {
  delivery: MessageDeliveryResponse | null;
  isLoading: boolean;
  error: MessageDeliveryError | null;
}
```

**Responsabilità**:
- ✅ Chiamata API `GET /api/messaging/threads/{threadId}/messages/{messageId}/delivery`
- ✅ Restituzione dati o errori dichiarati
- ✅ Nessun polling
- ✅ Nessun retry automatico
- ✅ Nessuna inferenza

**Documento**: `IRIS_STEP5.2_Data_Connection_Map_v1.0.md` §2

---

### UI Component

**File**: `src/ui/components/MessageComponent.tsx`

**Props**:
```typescript
interface MessageComponentProps {
  readonly message: MessageView; // Stato delivery incluso
  readonly delivery?: MessageDeliveryView; // Opzionale, se disponibile
}
```

**Responsabilità**:
- ✅ Rendering stato messaggio (DRAFT/SENT/DELIVERED/READ/ARCHIVED)
- ✅ Rendering timestamp arrotondato
- ✅ Nessuna logica
- ✅ Nessun side effect

**Documento**: `IRIS_UI_Semantic_Freeze_STEP5.1.5_v1.0.md` §3 (Message Component)

---

### Documento UX

**Riferimento**: `IRIS_UX_Hardening_STEP4G_v1.0.md`

**Scenari Mitigati**:
- ✅ UX-04 (Forzatura realtime percepito) — Offline-first, nessun realtime
- ✅ UX-06 (Correlazione timestamp) — Timestamp arrotondato
- ✅ UX-05 (Gaming stato READ) — Stato esplicito, non inferito

**Rischio Originale**: **ALTO** → **MEDIO** (dopo mitigazione)

---

### Rischio Mitigato

| Rischio | Mitigazione | Verifica |
|---------|-------------|----------|
| **Realtime percepito** | Offline-first (Invariante SYS-07) | ✅ Nessun WebSocket |
| **Timing correlation** | Timestamp arrotondato (Invariante SYS-05) | ✅ Validazione bucket 5s |
| **Stato inferito** | Consegna come evento dichiarato | ✅ Stato esplicito |

---

## 🔒 VERIFICA MAPPING COMPLETO

### Checklist Tracciabilità

Per ogni mapping, verificare:

- [ ] API Contract definito e documentato
- [ ] Adapter Layer meccanico (nessuna logica)
- [ ] Hook Layer passivo (nessun polling/retry)
- [ ] UI Component deterministico (nessun side effect)
- [ ] Documento UX referenziato
- [ ] Rischio mitigato identificato

---

## 📋 ENFORCEMENT

### Test di Tracciabilità

**File**: `src/api/tests/api-ui-mapping.test.ts` (da creare)

**Test**:
- ✅ Verifica mapping API → Adapter → Hook → UI
- ✅ Verifica nessuna semantica introdotta
- ✅ Verifica invarianti rispettate

---

## ✍️ FIRME (SIMBOLICHE)

**Principal System Architect**: _________________  
**Protocol Designer**: _________________  
**UX Architect**: _________________  
**Frontend Lead**: _________________  
**Principal Engineer**: _________________

---

**Documento vincolante per implementazione API Messaging Core IRIS.**  
**Ogni violazione comporta rifiuto PR e escalation automatica.**  
**Nessuna implementazione può procedere senza conformità a questo documento.**
