# IRIS — UI Mapping: Documenti Vincolanti → File UI

> Mapping tra documenti vincolanti e file UI per garantire tracciabilità completa.  
> Ogni file UI deve essere tracciabile a un documento vincolante.

---

## Componenti UI Previsti

### ThreadListView.tsx

**File**: `src/ui/components/ThreadListView.tsx`

**Documento di riferimento**: 
- `IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md` — Sezione 2.1 (Thread List View)
- `IRIS_UX_Hardening_STEP4G_v1.0.md` — Mitigazione FM-UX-01, FM-UX-02

**Vincoli UX applicabili**:
- Thread-first (STEP 4E §1)
- Finitudine visibile (STEP 4E §2)
- Privacy by UI (STEP 4E §5)
- Comunicazione intento relazionale (STEP 4G §2.1)

**Test che lo proteggono**:
- `ui-threadlist-no-realtime.test.ts` — Verifica assenza realtime
- `ui-threadlist-pagination.test.ts` — Verifica paginazione obbligatoria
- `ui-threadlist-privacy.test.ts` — Verifica privacy (partecipanti randomizzati, timestamp arrotondati)

**Props vincolate**:
```typescript
interface ThreadListViewProps {
  threads: readonly ThreadSummary[];
  onThreadSelect: (threadId: string) => void;
  onLoadMore?: () => void;
  hasMore: boolean;
}
```

**Status**: ✅ Implementato in STEP 5.1

---

### ThreadDetailView.tsx

**File**: `src/ui/components/ThreadDetailView.tsx`

**Documento di riferimento**: 
- `IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md` — Sezione 2.2 (Thread Detail View)
- `IRIS_UX_Hardening_STEP4G_v1.0.md` — Mitigazione FM-UX-01, FM-UX-02, FM-UX-03

**Vincoli UX applicabili**:
- Thread-first (STEP 4E §1)
- Finitudine visibile (STEP 4E §2)
- Stato esplicito (STEP 4E §3)
- Privacy by UI (STEP 4E §5)
- Comunicazione intento relazionale (STEP 4G §2.1)
- Disinnesco interpretazione (STEP 4G §3.1, §3.2)

**Test che lo proteggono**:
- `ui-threaddetail-thread-required.test.ts` — Verifica thread obbligatorio
- `ui-threaddetail-pagination.test.ts` — Verifica paginazione obbligatoria
- `ui-threaddetail-privacy.test.ts` — Verifica privacy (partecipanti randomizzati, timestamp arrotondati)
- `ui-threaddetail-no-realtime.test.ts` — Verifica assenza realtime

**Props vincolate**:
```typescript
interface ThreadDetailViewProps {
  threadId: string;
  thread: Thread;
  messages: readonly MessageView[];
  participants: readonly string[];
  onLoadPreviousMessages: () => void;
  hasMoreMessages: boolean;
  onSendMessage: (payload: string) => Promise<void>;
  canSend: boolean;
}
```

**Status**: ✅ Implementato in STEP 5.1

---

### MessageComponent.tsx

**File**: `src/ui/components/MessageComponent.tsx`

**Documento di riferimento**: 
- `IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md` — Sezione 2.3 (Message Component)
- `IRIS_UX_Hardening_STEP4G_v1.0.md` — Mitigazione FM-UX-03 (Disinnesco inferenza stato)

**Vincoli UX applicabili**:
- Thread-first (STEP 4E §1)
- Stato esplicito (STEP 4E §3)
- Privacy by UI (STEP 4E §5)
- Disinnesco interpretazione stato (STEP 4G §3.2)

**Test che lo proteggono**:
- `ui-message-thread-required.test.ts` — Verifica thread obbligatorio
- `ui-message-state-explicit.test.ts` — Verifica stato esplicito
- `ui-message-privacy.test.ts` — Verifica privacy (timestamp arrotondati)
- `ui-message-no-inference.test.ts` — Verifica assenza inferenza comportamento

**Props vincolate**:
```typescript
interface MessageComponentProps {
  message: MessageView;
  threadId: string;
  showTimestamp: boolean;
  showState: boolean;
}
```

**Status**: ✅ Implementato in STEP 5.1

---

### MessageComposer.tsx

**File**: `src/ui/components/MessageComposer.tsx`

**Documento di riferimento**: 
- `IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md` — Sezione 2.4 (Composer)
- `IRIS_UX_Hardening_STEP4G_v1.0.md` — Mitigazione FM-UX-01 (Comunicazione agency utente)

**Vincoli UX applicabili**:
- Thread-first (STEP 4E §1)
- Assenza di realtime (STEP 4E §4)
- Gestione errori esplicita (STEP 4E §6)
- Comunicazione agency utente (STEP 4G §1.2)

**Test che lo proteggono**:
- `ui-composer-thread-required.test.ts` — Verifica thread obbligatorio
- `ui-composer-thread-state.test.ts` — Verifica stato thread OPEN
- `ui-composer-no-autosuggest.test.ts` — Verifica assenza auto-suggest
- `ui-composer-error-explicit.test.ts` — Verifica errori espliciti

**Props vincolate**:
```typescript
interface MessageComposerProps {
  threadId: string;
  threadState: ThreadState;
  isParticipant: boolean;
  onSend: (payload: string) => Promise<void>;
  isSending: boolean;
  disabled: boolean;
  error?: string;
}
```

**Status**: ✅ Implementato in STEP 5.1

---

## Hooks UI Previsti

### useThreadList.ts

**File**: `src/ui/hooks/useThreadList.ts`

**Documento di riferimento**: 
- `IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md` — Sezione 5 (Workflow Operativo)
- `IRIS_UX_Hardening_STEP4G_v1.0.md` — Mitigazione FM-UX-02 (Comunicazione rate limit)

**Vincoli UX applicabili**:
- Nessun side effect in UI (STEP 5.0 §2.1)
- Comunicazione rate limit (STEP 4G §2.3)

**Test che lo protegge**:
- `ui-hooks-no-side-effects.test.ts` — Verifica assenza side effects

---

### useThreadDetail.ts

**File**: `src/ui/hooks/useThreadDetail.ts`

**Documento di riferimento**: 
- `IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md` — Sezione 5 (Workflow Operativo)
- `IRIS_UX_Hardening_STEP4G_v1.0.md` — Mitigazione FM-UX-02, FM-UX-03

**Vincoli UX applicabili**:
- Nessun side effect in UI (STEP 5.0 §2.1)
- Comunicazione privacy (STEP 4G §2.1, §2.2)
- Disinnesco interpretazione (STEP 4G §3.1, §3.2, §3.3)

**Test che lo protegge**:
- `ui-hooks-no-side-effects.test.ts` — Verifica assenza side effects

---

## Utility UI Previste

### timestampBucketizer.ts

**File**: `src/ui/utils/timestampBucketizer.ts`

**Documento di riferimento**: 
- `IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md` — Sezione 5 (Workflow Operativo)
- `IRIS_Messaging_Hardening_STEP4D5_v1.0.md` — Sezione 4 (Arrotondamento Timestamp)

**Vincoli UX applicabili**:
- Privacy by UI (STEP 4E §5)
- Arrotondamento timestamp (STEP 4D.5 §4)

**Test che lo protegge**:
- `ui-utils-timestamp-bucket.test.ts` — Verifica arrotondamento bucket 5 secondi

---

### participantRandomizer.ts

**File**: `src/ui/utils/participantRandomizer.ts`

**Documento di riferimento**: 
- `IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md` — Sezione 5 (Workflow Operativo)
- `IRIS_Messaging_Hardening_STEP4D5_v1.0.md` — Sezione 1 (Randomizzazione Partecipanti)

**Vincoli UX applicabili**:
- Privacy by UI (STEP 4E §5)
- Randomizzazione partecipanti (STEP 4D.5 §1)

**Test che lo protegge**:
- `ui-utils-participant-random.test.ts` — Verifica randomizzazione ordine

---

## Test Bloccanti Previsti

### ui-structural-no-side-effects.test.ts

**File**: `src/ui/tests/ui-structural-no-side-effects.test.ts`

**Documento di riferimento**: 
- `IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md` — Sezione 7 (Test UI Bloccanti)
- STEP 5.0 §3.2 (Test bloccante minimo obbligatorio)

**Scopo**: Verifica che nessun componente UI introduca side effects

**Status**: ✅ Creato in STEP 5.0

---

### ui-threadlist-no-realtime.test.ts

**File**: `src/ui/tests/ui-threadlist-no-realtime.test.ts`

**Documento di riferimento**: 
- `IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md` — Sezione 7 (Test UI Bloccanti)
- `IRIS_UX_StressTest_Ostile_STEP4F_v1.0.md` — Scenario UX-04

**Scopo**: Verifica assenza realtime in ThreadListView

**Status**: ✅ Creato in STEP 5.0 in STEP 5.1

---

### ui-threaddetail-pagination.test.ts

**File**: `src/ui/tests/ui-threaddetail-pagination.test.ts`

**Documento di riferimento**: 
- `IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md` — Sezione 7 (Test UI Bloccanti)
- `IRIS_UX_StressTest_Ostile_STEP4F_v1.0.md` — Scenario UX-01

**Scopo**: Verifica paginazione obbligatoria in ThreadDetailView

**Status**: ✅ Creato in STEP 5.0 in STEP 5.1

---

## Note di Tracciabilità

Ogni file UI deve:
1. Citare esplicitamente il documento vincolante nel commento header
2. Rispettare tutti i vincoli UX applicabili
3. Essere protetto da almeno un test bloccante
4. Non introdurre side effects o logica

Se un file UI non è tracciabile a un documento vincolante, **la PR viene rifiutata**.
