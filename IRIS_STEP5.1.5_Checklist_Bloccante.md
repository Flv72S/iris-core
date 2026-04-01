# IRIS — STEP 5.1.5: Checklist Bloccante

> Checklist binaria PASS/FAIL per autorizzazione STEP 5.2.  
> **STEP 5.2 è VIETATO se anche un solo item è FAIL.**

---

## ✅ CHECKLIST BLOCCANTE

### 1. Significato UI Congelato

- [ ] Documento `IRIS_UI_Semantic_Freeze_STEP5.1.5_v1.0.md` presente
- [ ] Vocabolario UI congelato dichiarato
- [ ] Concetti UI vietati esplicitati
- [ ] Relazione con UX Threat Modeling mappata

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale voce manca o è incompleta.

---

### 2. Vocabolario Dichiarato

- [ ] Tabella vocabolario UI congelato presente
- [ ] Ogni termine ha significato consentito dichiarato
- [ ] Ogni termine ha interpretazioni vietate dichiarate
- [ ] Ogni termine è tracciabile a documento vincolante

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale termine manca o è ambiguo.

---

### 3. Test Semantici PASS

- [ ] File `src/ui/tests/ui-semantic-guards.test.tsx` presente
- [ ] Almeno 8 test semantici implementati
- [ ] Test verificano continuità infinita: ⬜ PASS / ⬜ FAIL
- [ ] Test verificano urgenza/attesa: ⬜ PASS / ⬜ FAIL
- [ ] Test verificano ranking implicito: ⬜ PASS / ⬜ FAIL
- [ ] Test verificano importanza sociale: ⬜ PASS / ⬜ FAIL
- [ ] Test verificano refresh/check: ⬜ PASS / ⬜ FAIL
- [ ] Test verificano limiti mascherati: ⬜ PASS / ⬜ FAIL
- [ ] Test verificano interpretazione silenzio: ⬜ PASS / ⬜ FAIL
- [ ] Test verificano ambiguità semantica: ⬜ PASS / ⬜ FAIL
- [ ] Tutti i test semantici eseguono senza errori: ⬜ PASS / ⬜ FAIL

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale test fallisce o manca.

---

### 4. Copy Non Persuasivo

- [ ] File `src/ui/utils/ui-copy.ts` presente
- [ ] Copy dichiarativo minimale implementato
- [ ] Nessun copy suggerisce urgenza o attesa
- [ ] Nessun copy suggerisce continuità infinita
- [ ] Nessun copy suggerisce ranking o importanza sociale
- [ ] Nessun copy incentiva refresh o check
- [ ] Funzione `validateCopy` presente e funzionante

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale copy viola le regole.

---

### 5. Nessuna Violazione Red Lines UX

- [ ] Nessun ranking implicito introdotto
- [ ] Nessun nudging invisibile introdotto
- [ ] Nessun dark pattern difensivo introdotto
- [ ] Nessuna educazione coercitiva introdotta
- [ ] Nessuna gamification "per il bene dell'utente" introdotta

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale Red Line UX è violata.

**Red Lines UX (da STEP 4E.5)**:
1. Ranking implicito
2. Nudging invisibile
3. Dark patterns difensivi
4. Educazione coercitiva
5. Gamification "per il bene dell'utente"

---

### 6. Nessuna Ambiguità Residua Documentata

- [ ] Mapping UI → significato → rischio presente (`src/docs/bindings/ui-semantics-mapping.md`)
- [ ] Ogni componente UI appare almeno una volta nel mapping
- [ ] Ogni componente UI ha concetto espresso dichiarato
- [ ] Ogni componente UI ha rischio mitigato dichiarato
- [ ] Ogni componente UI è tracciabile a documento vincolante
- [ ] Nessuna ambiguità semantica residua non documentata

**Status**: ⬜ PASS / ⬜ FAIL

**Note**: Se FAIL, specificare quale ambiguità residua non è documentata.

---

## 🔒 VERDETTO FINALE

### Condizioni di PASS

Tutte le seguenti condizioni devono essere soddisfatte:

- ✅ Significato UI congelato
- ✅ Vocabolario dichiarato
- ✅ Test semantici PASS
- ✅ Copy non persuasivo
- ✅ Nessuna violazione Red Lines UX
- ✅ Nessuna ambiguità residua documentata

### Verdetto

```text
STEP 5.1.5 — VERDETTO:
[ ] PASS — STEP 5.2 AUTORIZZATO
[ ] FAIL — STEP 5.2 VIETATO
```

### Se FAIL

**STEP 5.2 è VIETATO** fino a:
1. Risoluzione di tutti gli item FAIL
2. Rivalutazione completa
3. Nuova checklist con tutti PASS

---

## ✍️ FIRME (SIMBOLICHE)

**Principal Engineer**: 
- ⬜ **STEP 5.1.5 PASS** — Tutte le condizioni soddisfatte. STEP 5.2 autorizzato.
- ⬜ **STEP 5.1.5 FAIL** — Condizioni non soddisfatte. STEP 5.2 vietato.

**UX Security Analyst**: 
- ⬜ **STEP 5.1.5 PASS** — UI semanticamente congelata. STEP 5.2 autorizzato.
- ⬜ **STEP 5.1.5 FAIL** — Rischi semantici residui. STEP 5.2 vietato.

---

**Documento vincolante per autorizzazione STEP 5.2.**  
**STEP 5.2 (Collegamento Backend / Mock) AUTORIZZATO solo se tutte le condizioni sono PASS.**
