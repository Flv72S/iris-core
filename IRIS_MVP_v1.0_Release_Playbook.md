## IRIS — MVP v1.0 Release Playbook (Documento Operativo)

## 1. Scopo del playbook

Questo playbook descrive **come eseguire il rilascio** di IRIS MVP v1.0.
È usato durante il **release day** per:
- ridurre rischio umano e operativo;
- rendere la procedura **ripetibile**;
- supportare decisioni **GO / NO-GO** coerenti con i criteri vincolanti.

Fonti normative (vincolanti):
- `IRIS_MVP_v1.0_Release_Criteria.md`
- `IRIS_MVP_v1.0_Roadmap.md`
- STEP 5.9A / 5.9B (MVP Hardening)
- STEP 6A / 6B / 6C (Deployment, Preview, Feature Flags)
- STEP 7A / 7B / 7C (Governance & Activation)

---

## 2. Ruoli minimi

### 2.1 Release Owner
- Decide **GO / NO-GO**.
- Approva la configurazione finale (env + flags).
- Coordina comunicazioni interne.

### 2.2 Technical Operator
- Esegue i comandi operativi (build/deploy/rollback).
- Produce evidenze (log, output health/readiness, checklist compilate).
- Non modifica scope o semantica durante la finestra di release.

### 2.3 Observer (monitoring / logs)
- Monitora segnali runtime (log strutturati, error rate, crash loop).
- Registra timeline e anomalie.
- Non esegue cambi tecnici senza coordinamento con Release Owner.

Regola: un individuo può coprire più ruoli, ma le responsabilità restano distinte.

---

## 3. Pre-release checklist (T‑24h)

Regola: nessuna esecuzione di T0 (rilascio) è consentita se questa sezione non è completata.

| Check | Comando / Evidenza | Stato (PASS/FAIL) |
|---|---|---|
| Tutti i criteri BLOCCANTI = PASS | `IRIS_MVP_v1.0_Release_Criteria.md` compilato e firmato | FAIL |
| Feature flags coerenti con roadmap | `.env` / env runtime: `FEATURE_*` valori espliciti | FAIL |
| Production env validato (fail-fast) | Esecuzione di avvio con env prod in ambiente controllato (startup non fallisce) | FAIL |
| Preview disattivata in prod | `PREVIEW_MODE=false` confermato in env prod | FAIL |
| Access control preview non attivo in prod | Evidenza: header `X-IRIS-Mode` assente in prod, `X-Preview-Token` non richiesto | FAIL |
| Rate limit preview non attivo in prod | Evidenza: nessun 429 da preview middleware in prod | FAIL |
| Health/readiness disponibili | Evidenza: `GET /health`=200, `GET /ready`=200 in ambiente controllato | FAIL |
| Logging strutturato attivo | Evidenza: stdout JSON con campi obbligatori (timestamp/level/service/component/correlationId/message) | FAIL |
| Persistence (se SQLite) pronta | Evidenza: path DB valido, permessi e volume/persistenza disponibili | FAIL |
| Backup persistence verificato (se applicabile) | Evidenza: copia file SQLite o snapshot volume eseguito e verificato | FAIL |

Note operative (vincolanti):
- “Backup” è richiesto **solo se** la persistence configurata è SQLite e lo stato è considerato da preservare.
- È vietato introdurre tooling non previsto; usare solo procedure deterministiche documentate.

---

## 4. Procedura di rilascio (T0)

Procedura sequenziale numerata. Ogni step deve produrre evidenza.

### 4.1 Step 1 — Tag versione
- **Cosa fare**: creare tag `v1.0.0` (o versione approvata).
- **Verifica successo**: tag presente nel repository.
- **FAIL significa**: versione non identificabile; STOP.

Evidenza (esempio):
- `git tag v1.0.0`
- `git show v1.0.0`

### 4.2 Step 2 — Build immagine
- **Cosa fare**: build immagine release (riproducibile) usando artefatti definiti.
- **Verifica successo**: build completa senza errori; immagine disponibile localmente/registry.
- **FAIL significa**: artefatto non deployabile; NO-GO.

Evidenza (esempio):
- `docker build -t iris-api:v1.0.0 -f Dockerfile.preview .`

Nota: se esiste un Dockerfile prod separato, usare quello; in assenza, usare l’artefatto disponibile senza introdurre modifiche.

### 4.3 Step 3 — Deploy
- **Cosa fare**: avviare il servizio con env prod e persistence definita.
- **Verifica successo**: processo avviato; container/service in stato running.
- **FAIL significa**: avvio non deterministico o config invalida; NO-GO.

Evidenza (esempio, docker compose):
- `docker-compose -f docker-compose.preview.yml up -d`

### 4.4 Step 4 — Health check
- **Cosa fare**: verificare liveness.
- **Verifica successo**: `GET /health` restituisce HTTP 200.
- **FAIL significa**: processo non vivo; rollback immediato.

Evidenza:
- `curl http://<host>:<port>/health`

### 4.5 Step 5 — Readiness check
- **Cosa fare**: verificare readiness operativa.
- **Verifica successo**: `GET /ready` restituisce HTTP 200.
- **FAIL significa**: sistema non pronto (persistence/bootstrap/invariants); rollback o NO-GO.

Evidenza:
- `curl http://<host>:<port>/ready`

### 4.6 Step 6 — Smoke test funzionale (minimo)
- **Cosa fare**: esercitare endpoint core autorizzati dalla roadmap e attivazione.
- **Verifica successo**: risposte coerenti (status code e DTO) e log strutturati per request.
- **FAIL significa**: regressione funzionale; rollback.

Evidenza minima:
- almeno 1 request su `/threads/*` **se** `FEATURE_THREADS_ENABLED=true`
- almeno 1 request su `/sync/*` **se** `FEATURE_SYNC_ENABLED=true`

### 4.7 Step 7 — Attivazione feature flaggate (se previste)
- **Cosa fare**: impostare esplicitamente i flag `FEATURE_*` secondo release decision.
- **Verifica successo**: endpoint protetti rispettano ON/OFF:
  - OFF ⇒ 404
  - ON ⇒ comportamento invariato
- **FAIL significa**: flag invalidi/mancanti o gating errato; NO-GO.

Regole:
- È vietato cambiare flag senza tracciamento: aggiornare evidenza di configurazione e log di audit.

---

## 5. Post-release validation (T+15min / T+1h)

### 5.1 Tabella segnali obbligatori

| Segnale | Fonte | Stato atteso |
|---|---|---|
| Log strutturati presenti | stdout/log collector | JSON valido, campi obbligatori presenti |
| correlationId presente | log | presente su tutte le request |
| Error rate accettabile | log (count error level) | nessun spike anomalo |
| Nessun crash loop | orchestratore / process monitor | processo stabile |
| Health OK | `GET /health` | 200 |
| Readiness OK | `GET /ready` | 200 |
| Feature core funzionanti | smoke test | risposte coerenti |
| Persistence integra (se SQLite) | log + readiness | nessun errore DB critico |

Regola: se un segnale critico fallisce entro T+15min, applicare rollback.

---

## 6. Rollback playbook (deterministico)

### 6.1 Trigger di rollback (qualsiasi ⇒ rollback)
- `GET /health` non 200 dopo deploy
- `GET /ready` non 200 dopo finestra di stabilizzazione (definita dal Release Owner)
- crash loop / restart continui
- error rate critico sostenuto
- persistence non accessibile / errori DB critici
- feature gating errato (ON/OFF non rispettato)

### 6.2 Procedura tecnica di rollback

1. **Stop del servizio corrente**
   - Evidenza: processo/container fermato.
2. **Ripristino versione precedente**
   - Avvio immagine precedente (tag precedente approvato).
3. **Ripristino persistence (se applicabile)**
   - Solo se esiste un backup valido e la policy lo richiede.
4. **Verifica rollback riuscito**
   - `/health` 200, `/ready` 200, log strutturati presenti.

Esempi (docker):
- `docker stop <container>`
- `docker run ... iris-api:<previous-tag>`

### 6.3 Cosa NON tentare (vietato)
- “Fix al volo” con patch non governate.
- Modifiche a Core/Boundary/semantica durante rollback.
- Reset “distruttivi” della persistence senza backup verificato.
- Disattivare logging/error discipline per “stabilizzare”.

### 6.4 Comunicazione interna (obbligatoria)
- Release Owner comunica: trigger, azione, stato dopo rollback.
- Observer archivia evidenze: log, timeline, comandi eseguiti.

---

## 7. Incident handling (prime 24h)

### 7.1 Quando intervenire
- crash loop
- regressione su criteri bloccanti
- readiness instabile
- error rate critico
- impossibilità di gestire persistence

### 7.2 Quando NON intervenire
- micro-anomalie non persistenti che non violano criteri bloccanti
- ottimizzazioni o refactor (vietati in finestra post-release)

### 7.3 Raccolta evidenze (obbligatoria)
- timestamp inizio/fine
- correlationId di request fallite (campione)
- estratti log strutturati (senza secret)
- stato dei flag e config (snapshot)

Regola: nessuna azione correttiva senza evidenze minime.

---

## 8. Freeze window

### 8.1 Periodo di freeze
- Freeze post-release attivo per un periodo deciso dal Release Owner e registrato nella chiusura rilascio.

### 8.2 Vietato durante freeze
- modifiche a Core/Boundary/semantica
- introduzione nuove feature
- cambi non governati di attivazione (flag) senza evidenza e approvazione

### 8.3 Ammesso durante freeze
- rollback deterministico
- disattivazione flag (se previsto) come misura di contenimento, con evidenza e approvazione
- raccolta evidenze e reporting

---

## 9. Chiusura rilascio

Checklist finale (obbligatoria):
- Release dichiarata stabile (health/readiness OK, no crash loop)
- Evidenze archiviate (criteri release compilati, log e timeline)
- Versione marcata come “LIVE”
- Freeze window registrato
- Firma di chiusura del Release Owner

---

## 10. Stato del documento

- **Versione**: v1.0
- **Stato**: OPERATIVO
- **Ambito**: MVP Release
- **Uso**: obbligatorio (release day)

