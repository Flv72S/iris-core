# IRIS — STEP 5.2: Checklist Bloccante

> Checklist binaria PASS/FAIL per autorizzazione STEP 5.3.  
> **STEP 5.3 è VIETATO se anche un solo item è FAIL.**

---

## ✅ CHECKLIST BLOCCANTE

### 1. Nessuna Modifica a UI Semantics

- [ ] Vocabolario UI congelato invariato
- [ ] Concetti UI vietati rispettati
- [ ] Significato UI invariato rispetto a STEP 5.1.5
- [ ] Documento `IRIS_UI_Semantic_Freeze_STEP5.1.5_v1.0.md` rispettato

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale modifica semantica è stata introdotta.

---

### 2. Test Semantici PASS Invariati

- [ ] File `src/ui/tests/ui-semantic-guards.test.tsx` presente
- [ ] Tutti i test semantici di STEP 5.1.5 PASS invariati
- [ ] File `src/ui/tests/ui-backend-connection-no-semantic-drift.test.tsx` presente
- [ ] Test non-deriva semantica PASS
- [ ] Nessun nuovo pattern semantico vietato introdotto

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale test fallisce o quale pattern è stato introdotto.

---

### 3. Nessun Nuovo Copy

- [ ] File `src/ui/utils/ui-copy.ts` invariato
- [ ] Nessun nuovo testo introdotto nei componenti
- [ ] Tutti i testi provengono da `ui-copy.ts`
- [ ] Funzione `validateCopy` verifica tutti i nuovi testi

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale nuovo testo è stato introdotto.

---

### 4. Nessuna Logica UI

- [ ] Nessun `useEffect` nei componenti UI
- [ ] Nessun fetch diretto in UI
- [ ] Nessun retry automatico
- [ ] Nessuna inferenza (es. "se vuoto allora...")
- [ ] Componenti UI rimangono pure function

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale logica è stata introdotta.

---

### 5. Adapter Puri

- [ ] File `src/ui/adapters/threadAdapter.ts` presente
- [ ] File `src/ui/adapters/messageAdapter.ts` presente
- [ ] Adapter solo conversione meccanica `BackendType → UIType`
- [ ] Nessuna logica negli adapter
- [ ] Nessuna decisione negli adapter
- [ ] Nessuna semantica negli adapter

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale logica/decisione/semantica è stata introdotta negli adapter.

---

### 6. Hook Passivi

- [ ] File `src/ui/hooks/useThreads.ts` presente
- [ ] File `src/ui/hooks/useThreadMessages.ts` presente
- [ ] Hook solo restituiscono dati o errori dichiarati
- [ ] Nessun polling negli hook
- [ ] Nessun retry negli hook
- [ ] Nessuna inferenza negli hook
- [ ] Nessuna trasformazione semantica negli hook

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale comportamento attivo è stato introdotto negli hook.

---

### 7. Mock Non Comportamentali

- [ ] File `src/mocks/threads.mock.ts` presente
- [ ] File `src/mocks/messages.mock.ts` presente
- [ ] Mock dati finiti
- [ ] Mock dati deterministici (nessun random)
- [ ] Mock nessuna simulazione realtime
- [ ] Mock nessun incremento automatico
- [ ] Mock timestamp già arrotondati
- [ ] Mock partecipanti già randomizzati

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale comportamento è stato introdotto nei mock.

---

## 🔒 VERDETTO FINALE

### Condizioni di PASS

Tutte le seguenti condizioni devono essere soddisfatte:

- ✅ Nessuna modifica a UI semantics
- ✅ Test semantici PASS invariati
- ✅ Nessun nuovo copy
- ✅ Nessuna logica UI
- ✅ Adapter puri
- ✅ Hook passivi
- ✅ Mock non comportamentali

### Verdetto

```text
STEP 5.2 — VERDETTO:
[ ] PASS — STEP 5.3 AUTORIZZATO
[ ] FAIL — STEP 5.3 VIETATO
```

### Se FAIL

**STEP 5.3 è VIETATO** fino a:
1. Risoluzione di tutti gli item FAIL
2. Rivalutazione completa
3. Nuova checklist con tutti PASS

---

## ✍️ FIRME (SIMBOLICHE)

**Principal Engineer**: 
- ⬜ **STEP 5.2 PASS** — Tutte le condizioni soddisfatte. Collegamento meccanico verificato. STEP 5.3 autorizzato.
- ⬜ **STEP 5.2 FAIL** — Condizioni non soddisfatte. Deriva semantica rilevata. STEP 5.3 vietato.

**Backend Lead**: 
- ⬜ **STEP 5.2 PASS** — Adapter puri, hook passivi, mock deterministici. STEP 5.3 autorizzato.
- ⬜ **STEP 5.2 FAIL** — Logica o semantica introdotta. STEP 5.3 vietato.

---

**Documento vincolante per autorizzazione STEP 5.3.**  
**STEP 5.3 AUTORIZZATO solo se tutte le condizioni sono PASS.**
