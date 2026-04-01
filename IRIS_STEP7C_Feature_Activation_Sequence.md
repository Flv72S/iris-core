## IRIS — STEP 7C: Feature Activation Sequence (Documento Normativo + Operativo)

## 1. Principi di attivazione

1. **Non tutte le feature sono uguali**: le feature hanno categorie e profili di rischio diversi; l’attivazione è governata da regole diverse.
2. **L’ordine di attivazione è una decisione architetturale**: anticipare o ritardare una feature modifica il profilo operativo del sistema e richiede governance.
3. **ALWAYS_ON è l’assenza di controllo**: se una feature non ha un meccanismo dichiarato di attivazione (flag/preview guard), è considerata **sempre attiva**.
4. **FLAGGED è esplicito e fail‑closed**: se una feature è “FLAGGED”, allora l’abilitazione è governata da un flag esplicito; in assenza del flag o con flag mancante, la feature è **OFF** (fail‑closed).
5. **PREVIEW_ONLY è confinato**: i controlli “preview” e le feature “preview-only” sono attive esclusivamente quando il runtime dichiara PREVIEW in modo esplicito.
6. **Auditabilità**: ogni feature attivabile deve essere tracciabile tramite registro centrale (chiave, scope, stato).
7. **Reversibilità operativa**: per tutte le feature non‑ALWAYS_ON deve esistere un percorso operativo chiaro per tornare allo stato precedente (disattivazione).

---

## 2. Stati di attivazione ammessi

### 2.1 ALWAYS_ON
- **Descrizione**: feature sempre attiva, nessun gating.
- **Implicazioni operative**: stabilità massima; nessuna flessibilità di rollout.
- **Rischio accettato**: rischio di regressione gestito solo tramite test e disciplina architetturale.

### 2.2 FLAGGED
- **Descrizione**: feature attivata/disattivata da flag deterministico per-endpoint.
- **Implicazioni operative**: controllabilità e rollback immediato tramite config/env.
- **Rischio accettato**: rischio di misconfigurazione mitigato da fail‑closed + test bloccanti.

### 2.3 PREVIEW_ONLY
- **Descrizione**: feature/guard attiva solo in ambiente PREVIEW (gating da env dedicato).
- **Implicazioni operative**: protezioni e indicatori attivi solo in preview; in produzione non devono influire.
- **Rischio accettato**: rischio di blocco accesso se misconfigurata in preview; mitigato da fail‑fast e documentazione.

### 2.4 POST_MVP
- **Descrizione**: elemento esplicitamente fuori MVP v1.0; non deve impattare il runtime attuale.
- **Implicazioni operative**: nessuna esecuzione runtime, nessun coupling; solo governance in roadmap.
- **Rischio accettato**: rischio di scope creep mitigato da regole STEP 7B.

### 2.5 DEFERRED
- **Descrizione**: elemento deliberatamente rinviato; non deve essere introdotto “parzialmente”.
- **Implicazioni operative**: nessuna implementazione o attivazione; richiede STEP dedicato quando ripreso.
- **Rischio accettato**: rischio di “mezze feature” mitigato dal divieto di implementazione incompleta.

---

## 3. Fasi temporali di rilascio

### 3.1 MVP v1.0
- Feature attive di default per il prodotto base.
- Nessun flag richiesto **salvo** feature dichiarate come FLAGGED.
- Priorità: **stabilità > flessibilità**.

### 3.2 Preview controllata
- Accesso operativo protetto (preview guard).
- Feature attivabili tramite flag per-endpoint.
- Attivazione selettiva per demo / stakeholder review in condizioni controllate.

### 3.3 Post‑MVP
- Feature pianificate ma **non implementate** nel runtime corrente.
- Nessun impatto sul comportamento runtime attuale.

---

## 4. Tabella di attivazione feature (50×)

Legenda colonne:
- **Categoria**: classificazione funzionale (coerente con STEP 7A e governance STEP 7B)
- **Stato iniziale**: ALWAYS_ON / FLAGGED / PREVIEW_ONLY / POST_MVP / DEFERRED
- **Flag associato**: env key o meccanismo di gating (se presente)
- **Fase**: MVP v1.0 / Preview controllata / Post‑MVP
- **Rischio**: LOW / MEDIUM / HIGH

| Feature ID | Nome feature (reale) | Categoria | Stato di attivazione iniziale | Flag associato (se presente) | Fase di rilascio | Rischio operativo | Note architetturali |
|---|---|---|---|---|---|---|---|
| F-01 | Structured logging (JSON) | Core Guarantees | ALWAYS_ON | — | MVP v1.0 | LOW | Log strutturati obbligatori; nessuna semantica. |
| F-02 | Correlation ID end‑to‑end | Core Guarantees | ALWAYS_ON | — | MVP v1.0 | LOW | CorrelationId sempre presente nei log HTTP. |
| F-03 | Error handling centralizzato | Core Guarantees | ALWAYS_ON | — | MVP v1.0 | LOW | Policy error discipline; nessun stacktrace al client. |
| F-04 | Error visibility policy (CLIENT/INTERNAL) | Core Guarantees | ALWAYS_ON | — | MVP v1.0 | LOW | Visibilità errori vincolante e non emozionale. |
| F-05 | Logging enforcement (no-console) | Core Guarantees | ALWAYS_ON | — | MVP v1.0 | LOW | Test bloccanti per prevenire regressioni osservabilità. |
| F-06 | Config validation fail‑fast | Core Guarantees | ALWAYS_ON | — | MVP v1.0 | MEDIUM | Avvio bloccato su config invalida; prevedibilità runtime. |
| F-07 | Startup invariants enforcement | Core Guarantees | ALWAYS_ON | — | MVP v1.0 | MEDIUM | Abort immediato su violazioni; protegge avvio controllato. |
| F-08 | Graceful shutdown deterministico (timeout) | Core Guarantees | ALWAYS_ON | SHUTDOWN_TIMEOUT_MS | MVP v1.0 | MEDIUM | Shutdown ordinato e con timeout; evita hang indefiniti. |
| F-09 | Health endpoint (liveness) | Core Guarantees | ALWAYS_ON | — | MVP v1.0 | LOW | `/health` sempre accessibile. |
| F-10 | Ready endpoint (readiness) | Core Guarantees | ALWAYS_ON | — | MVP v1.0 | MEDIUM | `/ready` riflette stato operativo; readiness esplicita. |
| F-11 | Readiness state esplicito | Core Guarantees | ALWAYS_ON | — | MVP v1.0 | MEDIUM | Stato readiness mantenuto esplicitamente, non implicito. |
| F-12 | HTTP adapter: POST append message | Post‑MVP Plug‑in | FLAGGED | FEATURE_THREADS_ENABLED | MVP v1.0 | LOW | Endpoint `/threads/:threadId/messages` protetto da flag per‑endpoint. |
| F-13 | HTTP adapter: GET thread state | Post‑MVP Plug‑in | FLAGGED | FEATURE_THREADS_ENABLED | MVP v1.0 | LOW | Endpoint `/threads/:threadId/state` protetto da flag per‑endpoint. |
| F-14 | HTTP adapter: PATCH thread transition | Post‑MVP Plug‑in | FLAGGED | FEATURE_THREADS_ENABLED | MVP v1.0 | LOW | Endpoint `/threads/:threadId/state` (PATCH) protetto da flag per‑endpoint. |
| F-15 | HTTP adapter: GET delivery status | Post‑MVP Plug‑in | FLAGGED | FEATURE_THREADS_ENABLED | MVP v1.0 | LOW | Endpoint `/threads/:threadId/messages/:messageId/delivery` protetto da flag. |
| F-16 | HTTP adapter: POST retry message | Post‑MVP Plug‑in | FLAGGED | FEATURE_THREADS_ENABLED | MVP v1.0 | LOW | Endpoint `/threads/:threadId/messages/:messageId/retry` protetto da flag. |
| F-17 | HTTP adapter: GET sync status | Post‑MVP Plug‑in | FLAGGED | FEATURE_SYNC_ENABLED | MVP v1.0 | LOW | Endpoint `/sync/status` protetto da flag per‑endpoint. |
| F-18 | Feature flag registry (audit) | Core Guarantees | ALWAYS_ON | — | MVP v1.0 | LOW | Registro centralizzato; nessuna lettura env. |
| F-19 | Feature flag loader (env → map immutabile) | Core Guarantees | ALWAYS_ON | FEATURE_* | MVP v1.0 | MEDIUM | Valore invalido abort; mancante OFF (fail‑closed). |
| F-20 | Feature guard middleware (404 se OFF) | Core Guarantees | ALWAYS_ON | FEATURE_* | MVP v1.0 | MEDIUM | Gating per-endpoint; no coupling con preview. |
| F-21 | Preview mode banner/header | Post‑MVP Plug‑in | PREVIEW_ONLY | PREVIEW_MODE | Preview controllata | LOW | Header `X-IRIS-Mode: PREVIEW` per identificazione. |
| F-22 | Preview access token (operational access) | Post‑MVP Plug‑in | PREVIEW_ONLY | PREVIEW_MODE + PREVIEW_ACCESS_TOKEN | Preview controllata | MEDIUM | Protegge preview; `/health` e `/ready` esclusi. |
| F-23 | Preview rate limit per IP | Post‑MVP Plug‑in | PREVIEW_ONLY | PREVIEW_MODE + PREVIEW_RATE_LIMIT_RPM | Preview controllata | MEDIUM | Mitiga abuso accidentale; 429 + Retry-After. |
| F-24 | Preview endpoint allowlist | Post‑MVP Plug‑in | PREVIEW_ONLY | PREVIEW_MODE | Preview controllata | MEDIUM | Fuori allowlist → 404; safety net in preview. |
| F-25 | Preview guard composition | Core Guarantees | PREVIEW_ONLY | PREVIEW_MODE | Preview controllata | MEDIUM | Composizione controlli preview in ordine deterministico. |
| F-26 | Deployment env baseline (development) | Core Guarantees | ALWAYS_ON | — | MVP v1.0 | LOW | `.env.example` come reference vincolante. |
| F-27 | Deployment env baseline (preview) | Core Guarantees | ALWAYS_ON | — | Preview controllata | LOW | `.env.preview.example` come reference vincolante. |
| F-28 | Docker preview packaging | Post‑MVP Plug‑in | PREVIEW_ONLY | — | Preview controllata | MEDIUM | `Dockerfile.preview` + compose preview per runtime riproducibile. |
| F-29 | Preview startup script | Post‑MVP Plug‑in | PREVIEW_ONLY | — | Preview controllata | LOW | Script avvio preview + log contesto; no semantica. |
| F-30 | Preview health validation script | Post‑MVP Plug‑in | PREVIEW_ONLY | — | Preview controllata | LOW | Script check `/health` e `/ready` in preview. |
| F-31 | SQLite persistence (swap‑in) | Post‑MVP Plug‑in | FLAGGED | PERSISTENCE=sqlite | MVP v1.0 | MEDIUM | Persistenza reale minimale; reversibile tramite wiring. |
| F-32 | In‑memory persistence (swap‑in) | Core Guarantees | ALWAYS_ON | PERSISTENCE=memory | MVP v1.0 | LOW | Baseline deterministica; utile per test e fallback controllato. |
| F-33 | Composition root deterministico | Core Guarantees | ALWAYS_ON | — | MVP v1.0 | MEDIUM | Wiring unico e testabile; no side-effect su import. |
| F-34 | HTTP server lifecycle controllato | Core Guarantees | ALWAYS_ON | — | MVP v1.0 | MEDIUM | Start/stop deterministico; log strutturato. |
| F-35 | Observability examples (preview docs) | Core Guarantees | PREVIEW_ONLY | — | Preview controllata | LOW | Documentazione esempi log (audit). |
| F-36 | Rollback & failure modes (preview docs) | Core Guarantees | PREVIEW_ONLY | — | Preview controllata | LOW | Documento operativo rollback, senza automazioni complesse. |
| F-37 | User authentication (utente finale) | Post‑MVP Plug‑in | POST_MVP | — | Post‑MVP | HIGH | Esplicitamente OUT fino a STEP dedicato; non introdurre parzialmente. |
| F-38 | Authorization/RBAC (utente finale) | Post‑MVP Plug‑in | POST_MVP | — | Post‑MVP | HIGH | Richiede governance separata e contratti; vietato scope creep. |
| F-39 | Advanced metrics (Prometheus) | High‑Wow Optional Features | POST_MVP | — | Post‑MVP | MEDIUM | Esplicitamente fuori MVP hardening; richiede piano misurazione. |
| F-40 | Monitoring/APM integration | High‑Wow Optional Features | POST_MVP | — | Post‑MVP | MEDIUM | Ammesso solo con failure isolation e rollback operativo. |
| F-41 | Distributed tracing | High‑Wow Optional Features | POST_MVP | — | Post‑MVP | MEDIUM | Vietato introdurre parzialmente; richiede governance dedicata. |
| F-42 | WebSocket/SSE transport | Post‑MVP Plug‑in | POST_MVP | — | Post‑MVP | HIGH | Out of scope; richiede layer separato e test dedicati. |
| F-43 | Response caching | Post‑MVP Plug‑in | POST_MVP | — | Post‑MVP | HIGH | Vietato introdurre implicitamente; richiede policy invalidazione. |
| F-44 | Backup/restore automation | Core Guarantees | DEFERRED | — | Post‑MVP | MEDIUM | Esplicitamente deferred; richiede STEP architetturale. |
| F-45 | Multi‑tenancy | Differenziatori Killer | POST_MVP | — | Post‑MVP | HIGH | Richiede governance speciale e isolamento strategico. |
| F-46 | Advanced DB migrations automation | Core Guarantees | DEFERRED | — | Post‑MVP | MEDIUM | Vietato introdurre senza piano rollback e test. |
| F-47 | Admin UI / dashboard | High‑Wow Optional Features | POST_MVP | — | Post‑MVP | MEDIUM | Esplicitamente non pronta; non impatta runtime attuale. |
| F-48 | AI integration | High‑Wow Optional Features | POST_MVP | — | Post‑MVP | HIGH | Out of scope; richiede failure isolation e misurazione. |
| F-49 | WhatsApp / external messaging connector | Differenziatori Killer | POST_MVP | — | Post‑MVP | HIGH | Integrazione esterna critica; governance speciale e isolamento. |
| F-50 | Progressive rollout / percentuali / A‑B | High‑Wow Optional Features | DEFERRED | — | Post‑MVP | HIGH | Esplicitamente OUT per ora; richiede STEP dedicato. |

---

## 5. Regole di modifica della sequenza (vincolanti)

1. **Divieto di anticipo di fase**: una feature non può anticipare la propria fase (es. POST_MVP → MVP v1.0) senza un nuovo STEP architetturale.
2. **Cambio di stato richiede revisione formale**: ogni transizione tra stati (es. POST_MVP → FLAGGED, DEFERRED → PREVIEW_ONLY) richiede:
   - motivazione tecnica;
   - aggiornamento della tabella (questo documento) tramite STEP dedicato;
   - test bloccanti aggiornati/additivi.
3. **Differenziatori killer**: qualsiasi feature classificata come Differenziatore Killer richiede governance separata e revisione architetturale esplicita.

---

## 6. Impatto sulla roadmap MVP

1. Questo documento è **input diretto** per la roadmap: nessuna feature può entrare in roadmap se non è presente in tabella con stato e fase.
2. MVP v1.0 è baseline: feature ALWAYS_ON devono preservare stabilità; feature FLAGGED devono essere attivabili in modo deterministico e reversibile.
3. Feature POST_MVP/DEFERRED non devono introdurre alcun impatto sul runtime corrente.

---

## 7. Stato del documento

- **Stato**: **APPROVATO**
- **Natura**: **NORMATIVO + OPERATIVO**
- **Modificabilità**: modificabile solo tramite nuovo STEP architetturale.

