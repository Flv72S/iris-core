## IRIS — STEP 7B: Feature Governance Rules (Documento Normativo)

## 1. Scopo e ambito

### 1.1 Scopo

Questo documento esiste per governare in modo **vincolante** l’evoluzione funzionale di IRIS dopo l’MVP, al fine di:
- **proteggere il Core** da regressioni, contaminazioni e accoppiamenti impropri;
- **prevenire scope creep** (feature non dichiarate, espansioni implicite, “già che ci siamo”);
- garantire un’evoluzione **controllata, reversibile e auditabile**.

### 1.2 Ambito di applicazione

Queste regole si applicano a **qualsiasi cambiamento** che:
- aggiunga o modifichi una feature;
- esponga o modifichi un endpoint;
- introduca nuove dipendenze operative (runtime, job, integrazioni);
- introduca configurazioni/flag per abilitazioni progressive;
- modifichi flussi di runtime (startup/shutdown, sicurezza operativa, osservabilità).

### 1.3 Fuori ambito

Questo documento **non** copre:
- procedure di delivery (CI/CD), hosting, cost management;
- politiche aziendali di sicurezza enterprise (WAF, IAM corporate, compliance);
- definizioni di prodotto/UX o priorità di business;
- dettagli implementativi specifici (nessun codice, nessun framework, nessun pattern prescritto oltre i vincoli architetturali indicati).

---

## 2. Classificazione vincolante delle feature

Ogni feature deve essere classificata **prima** dell’implementazione in **una e una sola** categoria.

### 2.1 Core Guarantees

**Definizione**
- Requisiti e comportamenti che costituiscono le **garanzie fondamentali** del sistema e che non possono essere degradati senza rompere l’identità di IRIS.

**Criteri di ammissione**
- La feature è necessaria per preservare invarianti, contratti o proprietà non negoziabili (determinismo, reversibilità, isolamento del Core, disciplina degli errori).
- La feature è necessaria per garantire continuità operativa minima (fail-fast, readiness, shutdown deterministico, error discipline) senza cambiare semantica.

**Vincoli assoluti**
- **Core invariato per default**: modifiche al Core sono l’eccezione e richiedono uno **STEP architetturale dedicato** con freeze/upgrade contratti.
- **No semantica implicita**: nessun fallback silenzioso, nessuna mutazione non dichiarata.
- **Auditabilità**: ogni cambiamento deve produrre evidenza tecnica verificabile e test bloccanti.

**Politica di modifica / versioning**
- Cambiamenti ai contratti o alle invarianti sono ammessi solo con:
  - documento di versione (vX.Y) e rationale;
  - strategia di compatibilità (se applicabile);
  - test di regressione bloccanti;
  - approvazione tramite nuovo STEP architetturale.

---

### 2.2 Post-MVP Plug-in

**Definizione**
- Feature “plug-in” post‑MVP integrate come **componenti sostituibili** e disattivabili, senza contaminare il Core e senza introdurre dipendenze permanenti non necessarie.

**Superfici consentite**
- Boundary/adapter esterni, runtime edge, trasporto (HTTP edge), orchestrazione e wiring (composition root), moduli integrativi isolati.
- Qualsiasi superficie che consenta **swap deterministico** o **feature flag per‑endpoint** senza modifiche semantiche.

**Regole di attivazione/disattivazione**
- Deve esistere un meccanismo esplicito di ON/OFF (config/env/flag) con **fail‑closed** dove applicabile.
- Disattivare il plug-in deve:
  - ripristinare comportamento preesistente o ritornare “non disponibile” in modo dichiarativo e non ambiguo;
  - non lasciare stato permanente o side-effect non reversibili.

**Vincoli architetturali**
- Nessun import o branching nel Core.
- Nessuna modifica ai contratti pubblici senza uno STEP architetturale.
- Nessuna persistenza aggiunta senza un piano di migrazione e rollback.
- Osservabilità e error discipline devono essere mantenute (log strutturati, correlationId, policy di visibilità errori).

---

### 2.3 High‑Wow Optional Features

**Definizione**
- Feature opzionali ad alto impatto percepito (“wow”) ma non necessarie per la continuità del sistema. Devono essere **reversibili** e **non degradare** il sistema quando disattivate.

**Regole di rollout**
- Rollout **esplicito** e controllato (ON/OFF), preferibilmente per-endpoint o per superficie, senza rollout percentuali o A/B (salvo STEP dedicato).
- Default raccomandato: **OFF** fino a validazione completa in preview e post‑deploy.

**Gestione del fallimento**
- Fallimento deve essere:
  - **isolato** (non deve propagarsi nel Core);
  - **osservabile** (log + error classification);
  - **reversibile** (rollback di config senza interventi di codice).

**Obblighi di misurazione**
- Ogni High‑Wow deve dichiarare metriche minime (almeno):
  - impatto sulla stabilità (error rate, crash, timeouts);
  - impatto su latenza (se rilevante);
  - impatto su throughput (se rilevante).
- Se le metriche non sono dichiarate a priori, la feature è **respinta**.

---

### 2.4 Differenziatori Killer

**Definizione**
- Feature strategiche che rappresentano un vantaggio competitivo (“killer differentiator”) e richiedono governance speciale per protezione, isolamento e evoluzione.

**Regole di progettazione**
- Deve essere progettata come “isola” con confini espliciti:
  - interfacce chiare;
  - dipendenze minime;
  - attivazione/disattivazione esplicita;
  - piani di degrado controllato (fail-safe verso comportamento base).

**Isolamento strategico**
- Nessun accoppiamento diretto con Core; il Core resta general purpose e stabile.
- Qualsiasi logica “killer” deve essere incapsulata in un modulo sostituibile e testabile.

**Governance speciale**
- Richiede:
  - threat model operativo (anche minimo) e failure modes espliciti;
  - test bloccanti dedicati;
  - documentazione di rollback e dismissione;
  - revisione architetturale tramite STEP dedicato se coinvolge contratti o persistenza.

---

## 3. Regole di ingresso per nuove feature (gate vincolante)

Ogni proposta di feature **deve dichiarare a priori**:
- **categoria** (una sola tra 2.1–2.4);
- **rischio operativo** (basso/medio/alto) con motivazione tecnica;
- **superfici toccate** (elenco dei layer e dei punti di integrazione);
- **strategia di rollback** (come disattivare e come tornare allo stato precedente).

**Regola di rifiuto automatico**
- Se manca anche **una sola** delle informazioni sopra, la feature è **automaticamente respinta** e non può essere implementata.

---

## 4. Regole sui test (vincolanti)

### 4.1 Regola generale
- Ogni feature deve introdurre test **additivi**; è vietato rimuovere test bloccanti esistenti.
- I test devono verificare:
  - comportamento ON/OFF (se applicabile);
  - invarianti architetturali (no leakage verso Core, no semantica);
  - error discipline (mappatura e visibilità coerenti).

### 4.2 Minimi per categoria

- **Core Guarantees**
  - Test di regressione sugli invarianti e contratti congelati
  - Test di determinismo (stessi input ⇒ stessi output, dove applicabile)
  - Test di non‑leakage (Core/Boundary isolati)

- **Post‑MVP Plug‑in**
  - Test di swap/disattivazione (OFF ⇒ comportamento base o “non disponibile” dichiarativo)
  - Test di isolamento (il fallimento del plug‑in non degrada il Core)
  - Test di config validation (fail‑fast su config invalida)

- **High‑Wow Optional Features**
  - Test ON/OFF bloccanti per-endpoint o per superficie
  - Test di failure isolation (fallimento contenuto + log)
  - Test di rollback (disattivazione ripristina comportamento previsto)

- **Differenziatori Killer**
  - Test end‑to‑end minimi + test di isolamento
  - Test di failure modes dichiarati (almeno i principali)
  - Test di dismissione/rollback (OFF ⇒ sistema resta operativo)

---

## 5. Regola anti‑scope‑creep (vincolante)

### 5.1 Divieto di cambio categoria post‑implementazione
- Una feature **non può** cambiare categoria dopo che l’implementazione è iniziata o completata.
- Se emerge la necessità di cambiare categoria, si applica STOP e si avvia la procedura corretta (5.2).

### 5.2 Procedura corretta per evoluzione funzionale
- Aprire un nuovo STEP (o appendice architetturale) che:
  - motivi il cambio;
  - ridefinisca vincoli e test;
  - aggiorni la documentazione normativa correlata;
  - fornisca un piano di rollback.

**Qualsiasi evoluzione “in corsa” senza STEP dedicato è vietata.**

---

## 6. Impatto sulla roadmap

### 6.1 Governo di STEP 7C e successivi
- Ogni STEP successivo che introduca funzionalità deve essere valutato con questa classificazione.
- Gli STEP devono essere costruiti come incrementi **auditabili** e **reversibili**, con evidenza tecnica e checklist bloccanti.

### 6.2 Relazione con MVP v1.0
- MVP v1.0 è considerato baseline: qualunque variazione che impatti contratti/invarianti richiede un nuovo STEP architetturale.
- Post‑MVP, la crescita deve privilegiare:
  - plug‑in sostituibili;
  - feature flag deterministici per‑endpoint;
  - isolamento delle feature ad alto rischio.

---

## 7. Stato del documento

- **Stato**: **APPROVATO**
- **Natura**: **NORMATIVO**
- **Modificabilità**: questo documento può essere modificato **solo** tramite un nuovo STEP architetturale esplicito.

