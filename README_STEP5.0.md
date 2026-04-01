# IRIS — STEP 5.0: Preparazione Tecnica

> Repository preparato per la codifica UI definitiva del Messaging Core IRIS.  
> **Stato**: Preparazione completata — Pronto per STEP 5.1

---

## ✅ Checklist Completamento STEP 5.0

- [x] Repo compila
- [x] ESLint blocca side effects UI
- [x] Vitest è configurato ed esegue test
- [x] Esiste almeno 1 test bloccante strutturale (`ui-structural-no-side-effects.test.ts`)
- [x] Esiste il documento di mapping UI → documenti (`src/docs/bindings/ui-mapping.md`)
- [x] Nessun componente UI è ancora implementato

---

## 📁 Struttura Directory

```
src/
├── ui/                    # UI come proiezione passiva
│   ├── components/        # Componenti UI (vuoto, STEP 5.1)
│   ├── hooks/            # Hooks UI (vuoto, STEP 5.1)
│   ├── types/            # Tipi UI (stub, STEP 5.1)
│   ├── utils/            # Utility UI (stub, STEP 5.1)
│   └── tests/            # Test UI bloccanti
│       └── ui-structural-no-side-effects.test.ts
├── core/                  # Core types (read-only per UI)
│   └── types/
│       └── messaging.ts   # Tipi core (stub, STEP 5.1)
└── docs/
    └── bindings/
        └── ui-mapping.md  # Mapping documenti → file UI
```

---

## 🚫 Regole "No Side Effects in UI"

La UI **NON DEVE**:
- ❌ Effettuare fetch
- ❌ Effettuare retry
- ❌ Effettuare polling
- ❌ Gestire timer
- ❌ Mutare stato globale
- ❌ Inferire comportamento

La UI **PUÒ SOLO**:
- ✅ Ricevere dati
- ✅ Renderizzare stati espliciti
- ✅ Mostrare limiti
- ✅ Mostrare errori

---

## 🧪 Test Bloccanti

### Test Strutturale: No Side Effects

**File**: `src/ui/tests/ui-structural-no-side-effects.test.ts`

**Verifica**:
- Nessun `useEffect` con dipendenze vuote
- Nessun `fetch`, `axios`, `XMLHttpRequest`
- Nessun `setTimeout`, `setInterval`
- Nessun `Date.now()` diretto
- Nessun import da `/core` (eccetto `/types`)

**Esecuzione**:
```bash
npm run test:ui
```

---

## 📋 Mapping Documenti → File

Vedi `src/docs/bindings/ui-mapping.md` per:
- Componenti UI previsti
- Documenti di riferimento
- Vincoli UX applicabili
- Test che proteggono ogni file

---

## 🔒 Vincoli Non Negoziabili

1. **UI è proiezione passiva** — Nessuna logica, nessun side effect
2. **Tracciabilità completa** — Ogni file UI tracciabile a documento vincolante
3. **Test bloccanti** — Ogni componente protetto da test strutturali
4. **ESLint enforcement** — Regole bloccanti per side effects

---

## 📚 Riferimenti Vincolanti

- `IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md`
- `IRIS_UX_Hardening_STEP4G_v1.0.md`
- `IRIS_UX_StressTest_Ostile_STEP4F_v1.0.md`
- `IRIS_UX_Threat_Modeling_STEP4E5_v1.0.md`

---

## 🚀 Prossimi Step

**STEP 5.1** (non ancora autorizzato):
- Implementazione componenti UI
- Implementazione hooks UI
- Implementazione utility UI
- Test bloccanti per ogni componente

**STEP 5.0 è COMPLETATO** ✅  
**STEP 5.1 può iniziare** ✅
