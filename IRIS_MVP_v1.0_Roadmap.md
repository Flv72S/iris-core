## IRIS — Roadmap MVP v1.0 (Documento Strategico)

## 1. Scopo della Roadmap

Questa roadmap definisce **cosa è IRIS v1.0** in modo vincolante:
- tutto ciò che è **fuori** da questa roadmap **non** è parte dell’MVP;
- questa roadmap è un **impegno tecnico** (scope controllato), non una wishlist;
- nessuna feature può essere aggiunta, rimossa o reinterpretata rispetto alle fonti normative.

**Fonti uniche di verità (vincolanti)**:
- `IRIS_STEP7B_Feature_Governance_Rules.md`
- `IRIS_STEP7C_Feature_Activation_Sequence.md` (tabella 50×)

---

## 2. Definizione formale di MVP v1.0

IRIS v1.0 è definito come un sistema:
- **deployabile** (runtime controllato e riproducibile);
- **semanticamente stabile** (nessuna mutazione implicita del comportamento);
- **osservabile e governabile** (logging strutturato, correlationId, error discipline);
- con feature **ALWAYS_ON** oppure **FLAGGED ma autorizzate** (per‑endpoint, fail‑closed), secondo la sequenza di attivazione.

---

## 3. Orizzonte temporale (senza date)

### 3.1 T0 — MVP Core
Baseline minima, sempre attiva, indispensabile al valore minimo e alla governance operativa.

### 3.2 T1 — MVP Stabilization
Rafforzamento e controllo operativo che **non** cambia il modello concettuale; può includere feature flaggate autorizzate.

### 3.3 T2 — MVP Extension (opzionale, flaggata / preview)
Estensioni opzionali abilitate solo tramite flag o preview-only; escludibili senza invalidare il valore minimo.

---

## 4. MVP Core (T0)

In T0 rientrano solo feature:
- **ALWAYS_ON**
- **senza flag** (nessun gating richiesto)
- indispensabili a deployabilità, stabilità semantica e governance operativa.

| Feature ID | Nome | Motivazione di inclusione | Stato di attivazione |
|---|---|---|---|
| F-01 | Structured logging (JSON) | Osservabilità minima non negoziabile | ALWAYS_ON |
| F-02 | Correlation ID end‑to‑end | Tracciabilità deterministica | ALWAYS_ON |
| F-03 | Error handling centralizzato | Disciplina errori, controllo failure | ALWAYS_ON |
| F-04 | Error visibility policy (CLIENT/INTERNAL) | Sicurezza passiva e auditabilità | ALWAYS_ON |
| F-05 | Logging enforcement (no-console) | Prevenzione regressioni di observability | ALWAYS_ON |
| F-06 | Config validation fail‑fast | Prevedibilità avvio, fail-fast | ALWAYS_ON |
| F-07 | Startup invariants enforcement | Avvio controllato, abort su violazioni | ALWAYS_ON |
| F-08 | Graceful shutdown deterministico (timeout) | Stop prevedibile, evita hang | ALWAYS_ON |
| F-09 | Health endpoint (liveness) | Deployability (probe liveness) | ALWAYS_ON |
| F-10 | Ready endpoint (readiness) | Deployability (probe readiness) | ALWAYS_ON |
| F-11 | Readiness state esplicito | Readiness non implicita | ALWAYS_ON |
| F-18 | Feature flag registry (audit) | Auditabilità dei flag | ALWAYS_ON |
| F-19 | Feature flag loader (env → map immutabile) | Determinismo e fail‑closed | ALWAYS_ON |
| F-20 | Feature guard middleware (404 se OFF) | Gating per‑endpoint, no semantica | ALWAYS_ON |
| F-32 | In‑memory persistence (swap‑in) | Baseline deterministica per runtime/test | ALWAYS_ON |
| F-33 | Composition root deterministico | Wiring unico, prevedibile e testabile | ALWAYS_ON |
| F-34 | HTTP server lifecycle controllato | Start/stop governabile | ALWAYS_ON |

---

## 5. MVP Stabilization (T1)

In T1 rientrano feature che:
- aumentano robustezza e controllo,
- possono essere **FLAGGED** o configurabili,
- non cambiano il modello concettuale (solo gating/swap operativo).

| Feature ID | Nome | Flag associato (se presente) | Rischio operativo |
|---|---|---|---|
| F-31 | SQLite persistence (swap‑in) | `PERSISTENCE=sqlite` | MEDIUM |
| F-12 | HTTP adapter: POST append message | `FEATURE_THREADS_ENABLED` | LOW |
| F-13 | HTTP adapter: GET thread state | `FEATURE_THREADS_ENABLED` | LOW |
| F-14 | HTTP adapter: PATCH thread transition | `FEATURE_THREADS_ENABLED` | LOW |
| F-15 | HTTP adapter: GET delivery status | `FEATURE_THREADS_ENABLED` | LOW |
| F-16 | HTTP adapter: POST retry message | `FEATURE_THREADS_ENABLED` | LOW |
| F-17 | HTTP adapter: GET sync status | `FEATURE_SYNC_ENABLED` | LOW |

**Nota vincolante**: per feature FLAGGED, **mancante ⇒ OFF** e **valore invalido ⇒ abort startup**, come da STEP 7C.

---

## 6. MVP Extension (T2)

In T2 rientrano feature:
- **PREVIEW_ONLY** o comunque opzionali,
- abilitate solo in preview/flag,
- escludibili senza invalidare T0.

| Feature ID | Nome | Modalità di attivazione | Motivo dell’esclusione da T0 |
|---|---|---|---|
| F-21 | Preview mode banner/header | PREVIEW_ONLY (`PREVIEW_MODE=true`) | Non essenziale al runtime base |
| F-22 | Preview access token | PREVIEW_ONLY (`PREVIEW_MODE` + token) | Hardening per esposizione controllata |
| F-23 | Preview rate limit per IP | PREVIEW_ONLY (`PREVIEW_MODE` + rpm) | Protezione anti‑abuso in preview |
| F-24 | Preview endpoint allowlist | PREVIEW_ONLY (`PREVIEW_MODE=true`) | Safety net preview, non base |
| F-25 | Preview guard composition | PREVIEW_ONLY (`PREVIEW_MODE=true`) | Governanza preview, non base |
| F-27 | Deployment env baseline (preview) | PREVIEW_ONLY (uso operativo preview) | Rilevante solo per preview |
| F-28 | Docker preview packaging | PREVIEW_ONLY | Packaging preview, non runtime base |
| F-29 | Preview startup script | PREVIEW_ONLY | Operatività preview |
| F-30 | Preview health validation script | PREVIEW_ONLY | Validazione preview |
| F-35 | Observability examples (preview docs) | PREVIEW_ONLY | Evidenza/documentazione preview |
| F-36 | Rollback & failure modes (preview docs) | PREVIEW_ONLY | Documento operativo preview |

---

## 7. Feature esplicitamente escluse da MVP v1.0

Le feature con stato **POST_MVP** o **DEFERRED** (e i differenziatori killer non rilasciabili) **non** fanno parte dell’MVP v1.0.

### POST_MVP
- F-37 User authentication (utente finale)
- F-38 Authorization/RBAC (utente finale)
- F-39 Advanced metrics (Prometheus)
- F-40 Monitoring/APM integration
- F-41 Distributed tracing
- F-42 WebSocket/SSE transport
- F-43 Response caching
- F-45 Multi‑tenancy (Differenziatore Killer)
- F-47 Admin UI / dashboard
- F-48 AI integration
- F-49 WhatsApp / external messaging connector (Differenziatore Killer)

### DEFERRED
- F-44 Backup/restore automation
- F-46 Advanced DB migrations automation
- F-50 Progressive rollout / percentuali / A‑B

**Motivo normativo**: queste feature aumentano rischio e superficie; richiedono governance dedicata e/o STEP architetturale, e sono esplicitamente fuori da MVP v1.0 secondo STEP 7C.

---

## 8. Rischi accettati e non accettati

### 8.1 Rischi accettati (per MVP v1.0)
- Assenza di ottimizzazioni avanzate (performance non ottimizzata oltre il necessario).
- Assenza di automazioni avanzate (migrations avanzate, backup/restore automatizzati).
- Assenza di integrazioni esterne “wow” (AI, connettori esterni).

### 8.2 Rischi non accettati (vincolanti)
- Compromissione di **coerenza semantica** e contratti.
- Compromissione di **observability** (log non strutturati, errori non tracciabili).
- Compromissione di **fail‑fast / determinismo** (fallback silenziosi, mutazioni runtime).
- Contaminazione del Core (flag/branching/import nel Core).

---

## 9. Regole di modifica della Roadmap

1. La roadmap è vincolante fino al rilascio di v1.0.
2. Qualsiasi modifica richiede **revisione architetturale** tramite nuovo STEP, coerente con:
   - regole STEP 7B (governance);
   - sequenza STEP 7C (stati e fasi).
3. È vietato introdurre “feature piccole ma urgenti” fuori tabella: se non è in STEP 7C, non entra in roadmap.
4. È vietato anticipare una feature di fase senza STEP dedicato (es. POST_MVP → MVP).

---

## 10. Stato del documento

- **Stato**: **APPROVATO**
- **Versione**: **v1.0**
- **Natura**: **STRATEGICA + OPERATIVA**
- **Fonte unica di verità** per la definizione di IRIS v1.0, vincolata a STEP 7B e STEP 7C.

