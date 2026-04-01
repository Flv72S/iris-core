---
title: "IRIS — STEP 5.2 Data Connection Map v1.0"
author: "Principal Engineer + Backend Lead"
version: "1.0"
date: "2026-01-24"
status: "VINCOLANTE — Gate STEP 5.3"
dependencies: "IRIS_UI_Semantic_Freeze_STEP5.1.5_v1.0.md, IRIS_STEP5.1.5_Checklist_Bloccante.md"
tags: ["FASE2", "Messaging", "STEP5.2", "UI", "Backend", "Connection", "Gate"]
---

# IRIS — STEP 5.2 Data Connection Map v1.0

> Mappatura del collegamento meccanico tra backend/mock e UI.  
> **Stato**: VINCOLANTE — Gate STEP 5.3

---

## 🎯 PRINCIPIO GUIDA

> "La UI non decide, non interpreta, non reagisce.  
> Riceve dati già formati e li mostra."

---

## 📊 MAPPING: Endpoint/Mock → Adapter → Hook → Componente

### 1. Thread List View

| Livello | File | Responsabilità | Semantica Introdotta |
|---------|------|----------------|---------------------|
| **Mock/Backend** | `src/mocks/threads.mock.ts` | Dati deterministici finiti | ❌ Nessuna |
| **Adapter** | `src/ui/adapters/threadAdapter.ts` | Conversione `BackendThreadSummary → ThreadSummary` | ❌ Nessuna |
| **Hook** | `src/ui/hooks/useThreads.ts` | Restituzione dati o errori dichiarati | ❌ Nessuna |
| **Componente** | `src/ui/components/ThreadListView.tsx` | Rendering dati ricevuti | ❌ Nessuna |

**Flusso**:
```
MOCK_THREAD_SUMMARIES
  → adaptThreadSummaryList()
  → useThreads()
  → ThreadListView (props: threads)
```

**Conferma**: Nessun livello introduce semantica.

---

### 2. Thread Detail View

| Livello | File | Responsabilità | Semantica Introdotta |
|---------|------|----------------|---------------------|
| **Mock/Backend** | `src/mocks/threads.mock.ts` | Dati thread deterministici | ❌ Nessuna |
| **Mock/Backend** | `src/mocks/messages.mock.ts` | Dati messaggi deterministici | ❌ Nessuna |
| **Adapter** | `src/ui/adapters/threadAdapter.ts` | Conversione `BackendThread → Thread` | ❌ Nessuna |
| **Adapter** | `src/ui/adapters/messageAdapter.ts` | Conversione `BackendMessage → MessageView` | ❌ Nessuna |
| **Hook** | `src/ui/hooks/useThreadMessages.ts` | Restituzione dati o errori dichiarati | ❌ Nessuna |
| **Componente** | `src/ui/components/ThreadDetailView.tsx` | Rendering dati ricevuti | ❌ Nessuna |

**Flusso**:
```
MOCK_THREAD + MOCK_MESSAGES_THREAD_1
  → adaptThread() + adaptMessageList()
  → useThreadMessages(threadId)
  → ThreadDetailView (props: thread, messages)
```

**Conferma**: Nessun livello introduce semantica.

---

### 3. Message Component

| Livello | File | Responsabilità | Semantica Introdotta |
|---------|------|----------------|---------------------|
| **Mock/Backend** | `src/mocks/messages.mock.ts` | Dati messaggi deterministici | ❌ Nessuna |
| **Adapter** | `src/ui/adapters/messageAdapter.ts` | Conversione `BackendMessage → MessageView` | ❌ Nessuna |
| **Componente** | `src/ui/components/MessageComponent.tsx` | Rendering dati ricevuti | ❌ Nessuna |

**Flusso**:
```
MOCK_MESSAGES_THREAD_1
  → adaptMessageList()
  → MessageComponent (props: message)
```

**Conferma**: Nessun livello introduce semantica.

---

### 4. Message Composer

| Livello | File | Responsabilità | Semantica Introdotta |
|---------|------|----------------|---------------------|
| **Componente** | `src/ui/components/MessageComposer.tsx` | Rendering stato e input controllato | ❌ Nessuna |

**Flusso**:
```
MessageComposer (props: threadState, disabled, onSend)
  → Nessun collegamento dati (solo stato controllato)
```

**Conferma**: Nessun livello introduce semantica.

---

## 🔒 CONFERMA: NESSUN LIVELLO INTRODUCE SEMANTICA

### Adapter Layer

**File**: `src/ui/adapters/`

**Responsabilità**:
- ✅ Conversione meccanica `BackendType → UIType`
- ✅ Nessuna logica
- ✅ Nessuna decisione
- ✅ Nessuna semantica

**Verifica**:
- ✅ `threadAdapter.ts`: Solo mapping campo → campo
- ✅ `messageAdapter.ts`: Solo mapping campo → campo

---

### Hook Layer

**File**: `src/ui/hooks/`

**Responsabilità**:
- ✅ Restituzione dati o errori dichiarati
- ✅ Nessun polling
- ✅ Nessun retry
- ✅ Nessuna inferenza
- ✅ Nessuna trasformazione semantica

**Verifica**:
- ✅ `useThreads.ts`: Solo restituzione dati mock/backend
- ✅ `useThreadMessages.ts`: Solo restituzione dati mock/backend

---

### Mock Data

**File**: `src/mocks/`

**Responsabilità**:
- ✅ Dati finiti
- ✅ Nessun random
- ✅ Nessuna simulazione realtime
- ✅ Nessun incremento automatico
- ✅ Timestamp già arrotondati
- ✅ Partecipanti già randomizzati

**Verifica**:
- ✅ `threads.mock.ts`: Dati deterministici, finiti
- ✅ `messages.mock.ts`: Dati deterministici, finiti

---

### Componenti UI

**File**: `src/ui/components/`

**Responsabilità**:
- ✅ Rendering dati ricevuti via props
- ✅ Nessuna logica
- ✅ Nessun side effect
- ✅ Nessuna semantica

**Verifica**:
- ✅ Componenti invariati rispetto a STEP 5.1.5
- ✅ Nessun nuovo testo introdotto
- ✅ Nessun nuovo comportamento introdotto

---

## 📋 RIFERIMENTI AI DOCUMENTI CONGELATI

### Documenti Vincolanti

- ✅ `IRIS_UI_Semantic_Freeze_STEP5.1.5_v1.0.md` — Vocabolario congelato rispettato
- ✅ `IRIS_STEP5.1.5_Checklist_Bloccante.md` — Tutte le condizioni rispettate
- ✅ `ui-semantic-guards.test.tsx` — Test semantici PASS invariati
- ✅ `ui-copy.ts` — Copy dichiarativo invariato
- ✅ `ui-semantics-mapping.md` — Mapping significato → rischio invariato

### Vincoli Rispettati

- ✅ Nessuna modifica a UI semantics
- ✅ Nessun nuovo copy
- ✅ Nessuna logica UI
- ✅ Adapter puri
- ✅ Hook passivi
- ✅ Mock non comportamentali

---

## ✍️ FIRME (SIMBOLICHE)

**Principal Engineer**: ✅ **MAPPING CONFERMATO** — Nessun livello introduce semantica. Collegamento meccanico verificato. STEP 5.3 autorizzato.

**Backend Lead**: ✅ **MAPPING CONFERMATO** — Adapter puri, hook passivi, mock deterministici. STEP 5.3 autorizzato.

---

**Documento vincolante per autorizzazione STEP 5.3.**  
**STEP 5.3 AUTORIZZATO solo se meccanico, senza modifiche semantiche.**
