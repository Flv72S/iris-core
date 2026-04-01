# IRIS — STEP 5.3: Checklist Bloccante

> Checklist binaria PASS/FAIL per autorizzazione Release Candidate.  
> **Release Candidate è VIETATO se anche un solo item è FAIL.**

---

## ✅ CHECKLIST BLOCCANTE

### 1. Nessuna Modifica Semantica

- [ ] Vocabolario UI congelato invariato
- [ ] Concetti UI vietati rispettati
- [ ] Significato UI invariato rispetto a STEP 5.1.5
- [ ] Documento `IRIS_UI_Semantic_Freeze_STEP5.1.5_v1.0.md` rispettato

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale modifica semantica è stata introdotta.

---

### 2. Tutti i Guard Attivi

- [ ] File `src/ui/guards/assertThreadProps.ts` presente
- [ ] File `src/ui/guards/assertMessageProps.ts` presente
- [ ] Guard validano props strict
- [ ] Guard falliscono deterministicamente su props invalidi
- [ ] Guard non fanno fallback automatico
- [ ] Guard non aggiustano dati

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale guard manca o non funziona correttamente.

---

### 3. Errori Espliciti

- [ ] File `src/ui/components/UIErrorBoundary.tsx` presente
- [ ] Error boundary mostra messaggio neutro e dichiarativo
- [ ] Error boundary non mostra copy emozionale
- [ ] Error boundary non suggerisce azioni
- [ ] Errori sono visibili ma non "emotivi"

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale errore non è esplicito o contiene copy emozionale.

---

### 4. Nessun Fallback UX

- [ ] Nessun fallback automatico su dati invalidi
- [ ] Nessun tentativo di "aggiustare" i dati
- [ ] Nessun comportamento implicito
- [ ] Stati espliciti > inferenze
- [ ] UI crasha correttamente quando deve

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale fallback UX è stato introdotto.

---

### 5. Snapshot Invariati

- [ ] Snapshot ThreadListView invariato rispetto a STEP 5.1.5
- [ ] Snapshot ThreadDetailView invariato rispetto a STEP 5.1.5
- [ ] Snapshot MessageComponent invariato rispetto a STEP 5.1.5
- [ ] Snapshot MessageComposer invariato rispetto a STEP 5.1.5
- [ ] Struttura DOM invariata

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale snapshot è cambiato.

---

### 6. Test Semantici PASS Invariati

- [ ] File `src/ui/tests/ui-semantic-guards.test.tsx` presente
- [ ] Tutti i test semantici di STEP 5.1.5 PASS invariati
- [ ] File `src/ui/tests/ui-backend-connection-no-semantic-drift.test.tsx` presente
- [ ] Test non-deriva semantica PASS
- [ ] Nessun nuovo pattern semantico vietato introdotto

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale test fallisce o quale pattern è stato introdotto.

---

### 7. UI Crasha Correttamente Quando Deve

- [ ] File `src/ui/tests/ui-hardening.test.tsx` presente
- [ ] Test crash su props invalidi: ⬜ PASS / ⬜ FAIL
- [ ] Test crash su dati incompleti: ⬜ PASS / ⬜ FAIL
- [ ] Test nessun silent fail: ⬜ PASS / ⬜ FAIL
- [ ] Test error boundary attivato: ⬜ PASS / ⬜ FAIL
- [ ] Tutti i test di hardening PASS

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale test fallisce o quale comportamento non crasha quando deve.

---

## 🔒 VERDETTO FINALE

### Condizioni di PASS

Tutte le seguenti condizioni devono essere soddisfatte:

- ✅ Nessuna modifica semantica
- ✅ Tutti i guard attivi
- ✅ Errori espliciti
- ✅ Nessun fallback UX
- ✅ Snapshot invariati
- ✅ Test semantici PASS invariati
- ✅ UI crasha correttamente quando deve

### Verdetto

```text
STEP 5.3 — VERDETTO:
[ ] PASS — RELEASE CANDIDATE AUTORIZZATO
[ ] FAIL — RELEASE CANDIDATE VIETATO
```

### Se FAIL

**Release Candidate è VIETATO** fino a:
1. Risoluzione di tutti gli item FAIL
2. Rivalutazione completa
3. Nuova checklist con tutti PASS

---

## ✍️ FIRME (SIMBOLICHE)

**Principal Engineer**: 
- ⬜ **STEP 5.3 PASS** — Tutte le condizioni soddisfatte. UI robusta e difensiva. Release Candidate autorizzato.
- ⬜ **STEP 5.3 FAIL** — Condizioni non soddisfatte. Rischi residui. Release Candidate vietato.

**Frontend Lead**: 
- ⬜ **STEP 5.3 PASS** — Hardening completo. Errori espliciti. Nessun fallback UX. Release Candidate autorizzato.
- ⬜ **STEP 5.3 FAIL** — Hardening incompleto. Rischi residui. Release Candidate vietato.

---

**Documento vincolante per autorizzazione Release Candidate.**  
**Release Candidate AUTORIZZATO solo se tutte le condizioni sono PASS.**
