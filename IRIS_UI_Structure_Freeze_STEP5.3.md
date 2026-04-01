---
title: "IRIS — UI Structure Freeze STEP 5.3 v1.0"
author: "Principal Engineer + Frontend Lead"
version: "1.0"
date: "2026-01-24"
status: "VINCOLANTE — Gate Release"
dependencies: "IRIS_UI_Semantic_Freeze_STEP5.1.5_v1.0.md, IRIS_STEP5.2_Data_Connection_Map_v1.0.md"
tags: ["FASE2", "Messaging", "STEP5.3", "UI", "Structure", "Freeze", "Gate"]
---

# IRIS — UI Structure Freeze STEP 5.3 v1.0

> Congelamento strutturale dei file UI prima della release.  
> **Stato**: VINCOLANTE — Gate Release

---

## 🎯 DICHIARAZIONE DI FREEZE STRUTTURALE

**La struttura dei file UI è congelata prima della release.**

Questa dichiarazione è **normativa e vincolante**. Qualsiasi modifica alla struttura dei file UI dopo questo freeze richiede:

1. Revisione di questo documento
2. Aggiornamento dei test strutturali
3. Rivalutazione dei rischi
4. Autorizzazione esplicita

**Release candidate NON può modificare la struttura dei file UI senza autorizzazione.**

---

## 📁 ELENCO FILE UI CONGELATI

### Componenti UI

| File | Responsabilità | Può Cambiare | Non Può Cambiare | Test Bloccanti |
|------|----------------|---------------|-------------------|----------------|
| `src/ui/components/ThreadListView.tsx` | Lista thread finita | Styling, refactoring interno | Props, semantica, comportamento | `ui-semantic-guards.test.tsx`, `ui-hardening.test.tsx` |
| `src/ui/components/ThreadDetailView.tsx` | Dettaglio thread con messaggi | Styling, refactoring interno | Props, semantica, comportamento | `ui-semantic-guards.test.tsx`, `ui-hardening.test.tsx` |
| `src/ui/components/MessageComponent.tsx` | Singolo messaggio | Styling, refactoring interno | Props, semantica, comportamento | `ui-semantic-guards.test.tsx`, `ui-hardening.test.tsx` |
| `src/ui/components/MessageComposer.tsx` | Compositore messaggi | Styling, refactoring interno | Props, semantica, comportamento | `ui-semantic-guards.test.tsx`, `ui-hardening.test.tsx` |
| `src/ui/components/UIErrorBoundary.tsx` | Error boundary neutra | Nessuna modifica | Struttura, copy, comportamento | `ui-hardening.test.tsx` |
| `src/ui/components/index.ts` | Export componenti | Aggiunta nuovi componenti (con autorizzazione) | Rimozione componenti esistenti | - |

---

### Hooks UI

| File | Responsabilità | Può Cambiare | Non Può Cambiare | Test Bloccanti |
|------|----------------|---------------|-------------------|----------------|
| `src/ui/hooks/useThreads.ts` | Hook passivo per thread | Nessuna modifica | Struttura, semantica, comportamento | `ui-backend-connection-no-semantic-drift.test.tsx` |
| `src/ui/hooks/useThreadMessages.ts` | Hook passivo per messaggi | Nessuna modifica | Struttura, semantica, comportamento | `ui-backend-connection-no-semantic-drift.test.tsx` |
| `src/ui/hooks/index.ts` | Export hooks | Aggiunta nuovi hooks (con autorizzazione) | Rimozione hooks esistenti | - |

---

### Adapter UI

| File | Responsabilità | Può Cambiare | Non Può Cambiare | Test Bloccanti |
|------|----------------|---------------|-------------------|----------------|
| `src/ui/adapters/threadAdapter.ts` | Adapter meccanico thread | Nessuna modifica | Struttura, logica, semantica | `ui-backend-connection-no-semantic-drift.test.tsx` |
| `src/ui/adapters/messageAdapter.ts` | Adapter meccanico messaggi | Nessuna modifica | Struttura, logica, semantica | `ui-backend-connection-no-semantic-drift.test.tsx` |
| `src/ui/adapters/index.ts` | Export adapter | Aggiunta nuovi adapter (con autorizzazione) | Rimozione adapter esistenti | - |

---

### Guards UI

| File | Responsabilità | Può Cambiare | Non Può Cambiare | Test Bloccanti |
|------|----------------|---------------|-------------------|----------------|
| `src/ui/guards/assertThreadProps.ts` | Validazione props thread | Nessuna modifica | Struttura, logica di validazione | `ui-hardening.test.tsx` |
| `src/ui/guards/assertMessageProps.ts` | Validazione props messaggi | Nessuna modifica | Struttura, logica di validazione | `ui-hardening.test.tsx` |
| `src/ui/guards/index.ts` | Export guards | Aggiunta nuovi guards (con autorizzazione) | Rimozione guards esistenti | - |

---

### Types UI

| File | Responsabilità | Può Cambiare | Non Può Cambiare | Test Bloccanti |
|------|----------------|---------------|-------------------|----------------|
| `src/ui/types/messaging-ui.ts` | Tipi UI messaging | Aggiunta nuovi tipi (con autorizzazione) | Modifica tipi esistenti, rimozione tipi | `ui-components-props.test.tsx` |
| `src/ui/types/index.ts` | Export types | Aggiunta nuovi export | Rimozione export esistenti | - |

---

### Utils UI

| File | Responsabilità | Può Cambiare | Non Può Cambiare | Test Bloccanti |
|------|----------------|---------------|-------------------|----------------|
| `src/ui/utils/ui-copy.ts` | Copy dichiarativo | Nessuna modifica | Struttura, copy, pattern | `ui-semantic-guards.test.tsx` |
| `src/ui/utils/index.ts` | Export utils | Aggiunta nuove utils (con autorizzazione) | Rimozione utils esistenti | - |

---

### Tests UI

| File | Responsabilità | Può Cambiare | Non Può Cambiare | Test Bloccanti |
|------|----------------|---------------|-------------------|----------------|
| `src/ui/tests/ui-structural-no-side-effects.test.ts` | Test side effects | Aggiunta nuovi test | Rimozione test esistenti | - |
| `src/ui/tests/ui-semantic-guards.test.tsx` | Test semantici | Aggiunta nuovi test | Rimozione test esistenti | - |
| `src/ui/tests/ui-backend-connection-no-semantic-drift.test.tsx` | Test non-deriva | Aggiunta nuovi test | Rimozione test esistenti | - |
| `src/ui/tests/ui-hardening.test.tsx` | Test hardening | Aggiunta nuovi test | Rimozione test esistenti | - |
| `src/ui/tests/ui-components-props.test.tsx` | Test props | Aggiunta nuovi test | Rimozione test esistenti | - |
| `src/ui/tests/ui-components-deterministic.test.tsx` | Test deterministico | Aggiunta nuovi test | Rimozione test esistenti | - |

---

## 🔒 REGOLE PER CONTRIBUTI FUTURI

### Cosa Può Cambiare (con autorizzazione)

1. **Styling e refactoring interno**
   - Modifiche CSS/styling
   - Refactoring interno (senza cambiare props o comportamento)
   - Ottimizzazioni performance (senza cambiare semantica)

2. **Aggiunta nuovi componenti/hooks/utils**
   - Solo con autorizzazione esplicita
   - Solo se tracciabile a documento vincolante
   - Solo se protetto da test bloccanti

3. **Aggiunta nuovi test**
   - Sempre consentita
   - Deve rispettare vincoli esistenti

---

### Cosa NON Può Cambiare (BLOCCANTE)

1. **Props dei componenti esistenti**
   - Nessuna modifica alle interfacce props
   - Nessuna rimozione di props obbligatorie
   - Nessuna modifica al significato semantico delle props

2. **Semantica UI**
   - Nessuna modifica al vocabolario congelato
   - Nessuna modifica ai concetti vietati
   - Nessuna modifica al copy dichiarativo

3. **Comportamento UI**
   - Nessuna modifica al comportamento visibile
   - Nessuna modifica all'ordine semantico
   - Nessuna modifica al significato di "vuoto"

4. **Struttura file**
   - Nessuna rimozione di file esistenti
   - Nessuna modifica alla struttura directory
   - Nessuna modifica ai test bloccanti esistenti

---

## 📋 RIFERIMENTI AI TEST BLOCCANTI

### Test Strutturali

- `ui-structural-no-side-effects.test.ts` — Blocca side effects tecnici
- `ui-components-props.test.tsx` — Blocca props invalide
- `ui-components-deterministic.test.tsx` — Blocca rendering non deterministico

### Test Semantici

- `ui-semantic-guards.test.tsx` — Blocca derive semantiche
- `ui-backend-connection-no-semantic-drift.test.tsx` — Blocca deriva dopo collegamento backend

### Test Hardening

- `ui-hardening.test.tsx` — Blocca regressioni, verifica fail-fast, error boundary

---

## 🔒 ENFORCEMENT

### Code Review

Ogni PR che modifica file UI congelati deve:
1. Verificare che non modifichi props esistenti
2. Verificare che non modifichi semantica
3. Verificare che non modifichi comportamento visibile
4. Verificare che tutti i test bloccanti PASS

### CI/CD

- Test bloccanti devono PASS per ogni commit
- ESLint deve PASS per ogni commit
- TypeScript deve compilare senza errori

---

## ✍️ FIRME (SIMBOLICHE)

**Principal Engineer**: ✅ **UI STRUCTURE FREEZE CONFERMATO** — Struttura file UI congelata. Regole per contributi futuri definite. Release candidate autorizzato.

**Frontend Lead**: ✅ **UI STRUCTURE FREEZE CONFERMATO** — File UI congelati, test bloccanti presenti, enforcement attivo. Release candidate autorizzato.

---

**Documento vincolante per autorizzazione Release Candidate.**  
**Release Candidate AUTORIZZATO solo se struttura invariata, test PASS, semantica invariata.**
