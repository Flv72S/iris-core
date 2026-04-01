## IRIS — MVP v1.0 Incident Playbook (Documento Operativo)

## 1. Scopo del Playbook

Questo playbook definisce come gestire un incidente su IRIS MVP v1.0.

### 1.1 Cos’è un incidente
Un incidente è una condizione operativa che:
- rende IRIS **non disponibile** o **instabile**;
- degrada una funzione critica rispetto alla roadmap MVP v1.0;
- viola uno o più criteri bloccanti di rilascio (o segnali equivalenti in produzione/preview).

### 1.2 Cosa NON è un incidente
Non è un incidente:
- un miglioramento desiderabile (UX/performance) che non viola criteri bloccanti;
- un “rumore” isolato senza impatto e senza persistenza;
- un task di prodotto o una feature non pianificata.

### 1.3 Obiettivi
- **Primario**: stabilizzare il sistema (ripristino di health/readiness e riduzione del rischio).
- **Secondario**: analisi, prevenzione, e aggiornamento evidenze/documentazione post‑evento.

Fonti vincolanti:
- `IRIS_MVP_v1.0_Release_Playbook.md`
- `IRIS_MVP_v1.0_Release_Criteria.md`
- `IRIS_MVP_v1.0_Go_NoGo_Dry_Run.md`
- STEP 5.x (Observability & Runtime Safety)
- STEP 6.x (Deployment & Preview Hardening)
- STEP 7.x (Feature Governance)

---

## 2. Definizione di incidente (SEV)

| Livello | Descrizione | Esempi |
|---|---|---|
| **SEV‑1** | Sistema non disponibile | App non avviabile; `/health` non 200; crash loop |
| **SEV‑2** | Funzione critica degradata | `/ready` non 200; persistence non accessibile; endpoint core non funzionanti con feature ON |
| **SEV‑3** | Problema minore | Log rumorosi; errori sporadici senza impatto; warning ripetuti |
| **SEV‑4** | Rumore / falso positivo | Allarme non riproducibile; metrica anomala senza evidenza nei log |

Regola: la severità è determinata dall’**impatto** e dalla **persistenza**, non dalla percezione.

---

## 3. Principi guida (vincolanti)

- **Stabilità > Feature**
- **Ripristino > Root cause** (prima si stabilizza, poi si analizza)
- **Nessuna modifica al Core durante incidente**
- **Preferire rollback a hotfix**
- **Una sola persona guida** (Incident Commander)
- **Nessun cambio non tracciato** (config/flag/deploy devono essere evidenziati)

---

## 4. Ruoli durante un incidente

### 4.1 Incident Commander (IC)
- Decide priorità e ordina le azioni.
- Approva rollback e cambi di flag/config.
- Mantiene canale unico e timeline decisionale.

### 4.2 Technical Responder (TR)
- Esegue azioni tecniche (rollback, disable flags, restart controllato).
- Produce evidenze e output (health/readiness/log).
- Non prende decisioni di scope senza IC.

### 4.3 Observer / Recorder (OR)
- Registra timeline, evidenze, correlationId campione.
- Compila PIR post‑incidente.
- Verifica coerenza con release criteria.

Regola: i ruoli possono coincidere, ma le responsabilità restano separate.

---

## 5. Rilevazione dell’incidente

### 5.1 Trigger di rilevazione
- Health check falliti (`/health` non 200)
- Readiness degradato (`/ready` non 200)
- Log strutturati con livello `error` sostenuto
- Crash loop / restart continui
- Segnalazione esterna (stakeholder / demo) con evidenza riproducibile

### 5.2 Checklist di conferma (obbligatoria)

| Check | Esito (PASS/FAIL) | Evidenza |
|---|---|---|
| `/health` verificato | FAIL | |
| `/ready` verificato | FAIL | |
| Log strutturati presenti | FAIL | |
| CorrelationId disponibile | FAIL | |
| Impatto e scope stimati | FAIL | |

Regola: se non è possibile raccogliere evidenza minima, trattare come SEV‑1 fino a chiarimento.

---

## 6. Procedura immediata (T+0 → T+15)

Tabella temporizzata: compilare in tempo reale.

| Timestamp | Azione | Owner (IC/TR/OR) | Evidenza | Stato |
|---|---|---|---|---|
| T+0 | Confermare impatto (health/readiness) | | | |
| T+2 | Identificare scope (endpoint/flag/persistence) | | | |
| T+4 | Attivare “modalità incidente” (canale unico, IC nominato) | | | |
| T+5 | Bloccare deploy e cambi flag non autorizzati | | | |
| T+7 | Raccogliere evidenze minime (log + correlationId campione) | | | |
| T+10 | Decidere mitigazione primaria (rollback/disable flags) | | | |
| T+15 | Verificare mitigazione (health/readiness) | | | |

Regole:
- È vietato eseguire più mitigazioni in parallelo senza registrazione e senza IC.
- Ogni azione deve lasciare evidenza (log/output/comando).

---

## 7. Procedure di mitigazione rapide

Ogni procedura è associata a tipi di incidente. Se una procedura non risolve, passare alla successiva **solo con decisione IC**.

### 7.1 Rollback deploy (SEV‑1 / SEV‑2)
- **Quando**: crash loop, health/readiness persistenti in FAIL, regressione critica.
- **Cosa fare**:
  1) fermare la versione corrente;
  2) avviare la versione precedente approvata;
  3) verificare `/health` e `/ready`.
- **Verifica successo**: `/health`=200 e `/ready`=200 + log strutturati presenti.
- **FAIL significa**: problema non legato al deploy; passare a 7.4/7.5.

### 7.2 Disabilitazione feature flag (SEV‑2 / SEV‑3)
- **Quando**: errore isolato su endpoint protetti da feature guard; gating errato o degrado funzionale.
- **Cosa fare**:
  - impostare flag target a `false` (fail‑closed) e riavviare se richiesto dal runtime.
- **Verifica successo**:
  - endpoint protetto ⇒ 404;
  - health/readiness stabili.
- **FAIL significa**: problema non isolabile via flag; valutare rollback deploy.

### 7.3 Shutdown controllato (SEV‑1)
- **Quando**: sistema instabile e non recuperabile immediatamente.
- **Cosa fare**: inviare SIGTERM e attendere shutdown deterministico (timeout applicato).
- **Verifica successo**: log di shutdown completato; processo fermo; nessun hang.
- **FAIL significa**: timeout scaduto; exit forzata controllata.

### 7.4 Limitazione accessi (SEV‑2)
- **Quando**: abuso accidentale in preview o accesso non autorizzato sospetto.
- **Cosa fare**:
  - in preview: verificare `PREVIEW_MODE=true`, token valido, rate limit attivo.
  - ridurre superficie: disabilitare feature flag non critiche (fail‑closed).
- **Verifica successo**: 401 su richieste senza token; 429 su rate limit; header preview presente.

### 7.5 Ripristino stato noto (SEV‑2)
- **Quando**: persistence degradata o non accessibile.
- **Cosa fare**:
  - se esiste backup verificato e policy lo consente, ripristinare DB/volume;
  - altrimenti rollback deploy e mantenere sistema in modalità sicura.
- **Verifica successo**: `/ready` torna 200; assenza errori DB critici nei log.

Regola: è vietato improvvisare ripristini distruttivi senza backup verificato.

---

## 8. Uso dell’osservabilità

### 8.1 Prima cosa da guardare (ordine vincolante)
1. `/health` (liveness)
2. `/ready` (readiness)
3. Log strutturati `error` (startup failure, runtime exceptions)
4. correlationId di richieste fallite (campione)
5. Audit log di feature flags e preview guard (gating, 404/401/429)

### 8.2 Dopo stabilizzazione
1. Timeline degli eventi (deploy/flag/config)
2. Clusterizzazione errori per tipo (errorCode/source/visibility)
3. Verifica che non ci siano loop di errori
4. Raccolta evidenze per PIR

### 8.3 Strumenti e segnali (vincolanti)
- correlationId: usato per ricostruire catena request‑log
- structured logs: unica fonte operativa primaria
- health/readiness: segnali binari di disponibilità
- startup invariants: motivo di abort immediato in caso di violazione
- error visibility policy: nessuna informazione sensibile al client

---

## 9. Comunicazione durante incidente

### 9.1 Regole
- Unico canale e unico “speaker” (IC).
- Aggiornamenti a intervalli regolari (definiti da IC).
- Comunicare solo fatti verificabili.

### 9.2 Cosa comunicare
- severità (SEV‑1..4)
- impatto (health/readiness, scope)
- azione in corso (rollback/flags)
- ETA stimata solo se basata su evidenze

### 9.3 Cosa NON comunicare
- ipotesi non verificate
- dettagli sensibili (token, path interni sensibili, stacktrace)
- promesse su root cause prima della stabilizzazione

### 9.4 Template aggiornamento (breve)

> **[IRIS Incident] SEV‑X** — Stato: (stabilizzazione/rollback/investigation)  
> Impatto: (/health=?, /ready=?, scope=…)  
> Azione: (rollback/disable flag/…)  
> Evidenza: (correlationId campione, log summary)  
> Prossimo update: (HH:MM)

---

## 10. Risoluzione e verifica (uscita incidente)

Checklist di uscita (tutti PASS):

| Check | Stato (PASS/FAIL) | Evidenza |
|---|---|---|
| Sistema stabile (no crash loop) | FAIL | |
| `/health` verde (200) | FAIL | |
| `/ready` verde (200) | FAIL | |
| Log strutturati presenti e coerenti | FAIL | |
| Feature flags coerenti (no drift) | FAIL | |
| Nessun loop di errori | FAIL | |
| Persistence integra (se applicabile) | FAIL | |

Regola: non si chiude un incidente se `/ready` non torna verde (salvo SEV‑3/4 esplicitamente approvati da IC).

---

## 11. Post‑Incident Review (PIR)

Obbligatoria per **SEV‑1** e **SEV‑2**.

Template PIR:
- **Timeline** (T0..Tn con azioni e owner)
- **Root cause** (solo evidenze)
- **Azioni correttive** (immediate, già eseguite)
- **Azioni preventive** (con owner e priorità)
- **Ownership** e scadenze operative (senza date calendariali se non stabilite dal processo)

---

## 12. Errori da evitare (vietati)

- Hotfix non tracciati o fuori governance.
- Cambiare Core sotto pressione.
- Mancata documentazione (timeline/evidenze).
- Spegnere logging/error discipline per “ridurre rumore”.
- Riavviare alla cieca senza verifiche health/readiness e senza correlationId.

---

## 13. Stato del documento

- **Versione**: v1.0
- **Stato**: OPERATIVO
- **Ambito**: MVP & produzione
- **Uso**: obbligatorio in caso di incidente

