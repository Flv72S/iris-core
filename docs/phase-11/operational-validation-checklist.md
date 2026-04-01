# Phase 11 — Operational Validation Checklist  
## Protocol Certification Readiness

| Attribute | Value |
|-----------|--------|
| Checklist Type | OPERATIONAL CERTIFICATION |
| Ambiguity | NONE |
| Audit Readiness | TRUE |
| Blocks Flutter Until PASS | TRUE |

---

## 1. Scope della Validazione

| Item | Definition |
|------|------------|
| **Validation Target** | Phase 11 Governance |
| **Cosa viene validato** | Pre-condizioni di sistema; Execution Protocol; Certification Gates; Definition of Done; Audit Traceability UI; Release Governance; assenza codice Flutter implementativo pre-PASS. |
| **Cosa NON viene validato** | Implementazione Flutter; runtime production; infrastruttura di deploy. |
| **Relazione con Phase 1–10.X** | La checklist presuppone Phase 1–10.X completate e certificate (core decisionale, explainability, audit, safety). |
| **Condizione per 11.1.1** | Flutter Implementation Allowed: **ONLY after checklist PASS** |

**Output atteso:** Validation Target = Phase 11 Governance; Flutter Implementation Allowed = ONLY after checklist PASS.

---

## 2. Pre-Conditions di Sistema

Checklist binaria: ogni riga = un check. Esito = PASS solo se tutti i check sono PASS.

### 2.1 Core IRIS

| Check ID | Descrizione | Metodo di verifica | Esito (PASS/FAIL) |
|----------|-------------|--------------------|-------------------|
| PC-01 | Determinismo certificato | Eseguire `npm run test:explainability`; tutti i test passano; nessuna variabilità tra run. | |
| PC-02 | Explainability completa | GOLDEN_TRACES presenti; `checkExplainabilityInvariants` passa per ogni golden; regression suite `failed === 0`. | |
| PC-03 | Audit replay identico | Replay da snapshot produce trace hash-identico; test di replay in phase-10 passano. | |
| PC-04 | Safety enforcement attivo | Safety checklist e outcome log documentati e verificati; nessun bypass senza certificazione. | |

### 2.2 Repository e documentazione

| Check ID | Descrizione | Metodo di verifica | Esito (PASS/FAIL) |
|----------|-------------|--------------------|-------------------|
| PC-05 | `/docs/phase-11/` completo | Directory `docs/phase-11/` esiste; contiene protocollo Execution e Certification; nessun riferimento a file mancanti. | |
| PC-06 | Nessun documento mancante | Elenco documenti Phase 11 definito; ogni documento presente nel repository. | |
| PC-07 | Terminologia coerente | Stessi termini per microstep, gate, certificazione in tutti i doc Phase 11; nessuna contraddizione. | |

---

## 3. Validazione Execution Protocol

| Check ID | Descrizione | Metodo di verifica | Esito (PASS/FAIL) |
|----------|-------------|--------------------|-------------------|
| EP-01 | Flusso microstep definito | Documento Phase 11 specifica sequenza: Spec → Impl → Test → Cert → Freeze per ogni microstep. | |
| EP-02 | Regole di blocco esplicite | Elenco condizioni che bloccano il passaggio al microstep successivo; documentato e non ambiguo. | |
| EP-03 | Impossibilità di saltare certificazione | Nessun percorso documentato che permetta di andare a Freeze senza Cert; gate obbligatori. | |
| EP-04 | Coerenza con governance globale IRIS | Protocollo allineato a determinismo, explainability, audit e safety delle Phase 1–10.X. | |

---

## 4. Validazione Certification Gates

Per ogni gate: presenza metrica oggettiva, criterio di fallimento definito, verificabilità reale.

| Check ID | Gate | Metrica oggettiva | Criterio di fallimento | Verificabilità | Esito (PASS/FAIL) |
|----------|------|-------------------|------------------------|----------------|-------------------|
| CG-01 | Determinismo UI | Stesso input → stesso output DOM/state; test deterministici. | Qualsiasi variazione tra run con stesso input. | Test automatizzati; snapshot o hash. | |
| CG-02 | Explainability Integrity | Sezioni WHAT, WHY, WHY_NOT, MODE, SAFETY, OUTCOME; hash explanation stabile. | Sezione mancante; hash diverso; template non da set chiuso. | `checkExplainabilityInvariants`; regression suite. | |
| CG-03 | Audit Replay | Replay da snapshot produce trace identico (stesso traceHash). | traceHash diverso dopo replay. | Test replay; confronto hash. | |
| CG-04 | Safety Perception | Comportamento safety documentato e verificato; nessun override non tracciato. | Override non tracciato; violazione safety documentata. | Audit log; test safety. | |

---

## 5. Validazione Definition of Done

| Check ID | Descrizione | Metodo di verifica | Esito (PASS/FAIL) |
|----------|-------------|--------------------|-------------------|
| DoD-01 | DoD esiste per ogni microstep 11.X | Elenco microstep 11.X; per ciascuno esiste una DoD documentata. | |
| DoD-02 | DoD include determinismo, explainability, audit, build | Ogni DoD contiene almeno: determinismo, explainability, audit, build (ove applicabile). | |
| DoD-03 | DoD senza ambiguità interpretative | Criteri esprimibili in forma binaria (sì/no) o con soglia numerica definita. | |
| DoD-04 | DoD applicabile automaticamente dove possibile | Dove possibile, criterio verificabile da script/test; documentato come tale. | |

---

## 6. Validazione Audit Traceability UI

| Check ID | Descrizione | Metodo di verifica | Esito (PASS/FAIL) |
|----------|-------------|--------------------|-------------------|
| AT-01 | Decision trace mostrata tracciabile | UI explainability mostra traceId e riferimenti step; allineata a DecisionTrace (10.1). | |
| AT-02 | Explainability visualizzata tracciabile | Contenuto explanation da engine (10.2); nessuna riscrittura non certificata. | |
| AT-03 | Azioni utente tracciabili | Eventi utente rilevanti per decisione/explainability registrati o documentati. | |
| AT-04 | Override tracciabili | Eventuali override documentati con motivo e collegamento ad audit. | |
| AT-05 | Coerenza timestamp | Formato e ordine timestamp coerente con audit core; documentato. | |
| AT-06 | Ordine eventi stabile | Ordine eventi deterministico e documentato. | |
| AT-07 | Allineamento con audit core | Modello UI traceability allineato a trace/explanation/outcome del core. | |

---

## 7. Validazione Release Governance

| Check ID | Descrizione | Metodo di verifica | Esito (PASS/FAIL) |
|----------|-------------|--------------------|-------------------|
| RG-01 | Condizioni minime di rilascio definite | Documento che elenca condizioni minime (build, test, certificazione). | |
| RG-02 | Motivi di blocco espliciti | Elenco motivi che bloccano il release; nessun blocco implicito. | |
| RG-03 | Processo di approvazione documentato | Chi approva; quale gate; in quale ordine; documentato. | |
| RG-04 | Impossibilità di release senza certificazione | Nessun percorso release che bypassi i Certification Gates. | |

---

## 8. Blocco Preventivo dello Sviluppo Flutter

**Sezione critica:** nessun codice Flutter implementativo prima del PASS della checklist.

| Check ID | Descrizione | Metodo di verifica | Esito (PASS/FAIL) |
|----------|-------------|--------------------|-------------------|
| BF-01 | Controllo repository | Ricerca cartelle/source Flutter (es. `lib/`, `*.dart`); assenza di implementazione operativa. | |
| BF-02 | Assenza cartella `lib/` operativa | Se esiste `lib/`, non contiene feature UI implementative; oppure cartella assente. | |
| BF-03 | Assenza dipendenze UI runtime Flutter | File di dipendenze (es. `pubspec.yaml`) assente o non usato per build produzione. | |

**Regola:** Se anche un solo check BF-xx = FAIL → sviluppo Flutter NON autorizzato.

---

## 9. Esito Finale della Validazione

Compilare dopo l’esecuzione di tutte le sezioni. Regola: **se QUALSIASI check = FAIL → Phase 11 NON può iniziare.**

| Section | Result (PASS/FAIL) | Notes |
|---------|--------------------|--------|
| 2. Pre-Conditions di Sistema | | |
| 3. Validazione Execution Protocol | | |
| 4. Validazione Certification Gates | | |
| 5. Validazione Definition of Done | | |
| 6. Validazione Audit Traceability UI | | |
| 7. Validazione Release Governance | | |
| 8. Blocco Preventivo Flutter | | |

**Esito globale:** PASS solo se tutte le righe sopra = PASS.

---

## 10. Certification Statement

**Da compilare solo se tutti i check sono PASS.**

| Campo | Valore |
|-------|--------|
| Phase 11 Governance | VALIDATED |
| Flutter Development | AUTHORIZED |
| Protocol Status | CERTIFIABLE |

**Dichiarazione formale:**

```
Phase 11 Governance: VALIDATED
Flutter Development: AUTHORIZED
Protocol Status: CERTIFIABLE
```

| Campo | Valore |
|-------|--------|
| Data validazione | (YYYY-MM-DD) |
| Responsabile validazione | (nome/ruolo) |
| Riferimento versione documenti | (commit/tag o path docs/phase-11) |

---

*Checklist operativa Phase 11 — Protocol Certification Readiness. Utilizzo: eseguire ogni metodo di verifica, compilare Esito (PASS/FAIL), compilare Sezione 9 e, in caso di tutti PASS, Sezione 10.*
