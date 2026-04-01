# IRIS — STEP 5.X: MVP Readiness Check

## Analisi tecnica rapida — Stato attuale

**Data analisi**: 2026-01-26  
**Ambito**: STEP 5.1 → STEP 5.8 completati  
**Metodo**: Analisi READ-ONLY, nessuna modifica al codice

---

## A. Tabella di sintesi

| Domanda | SI / NO | Rischio | Nota breve |
|---------|---------|---------|------------|
| **1. Avviabilità deterministica** | ✅ **SI** | Basso | Entrypoint unico (`main.ts`), config esplicita da env, wiring esplicito nel bootstrap |
| **2. Isolamento del dominio** | ✅ **SI** | Basso | Core zero dipendenze runtime, Boundary-only enforcement, test bloccanti verificano |
| **3. Reversibilità tecnica** | ✅ **SI** | Basso | Persistence swap funzionante, HTTP adapter puro sostituibile, composition root unico |
| **4. Comportamento osservabile** | ⚠️ **PARZIALE** | Medio | Logging minimale presente (main.ts + HTTP), errori espliciti, ma manca strutturazione avanzata |
| **5. Fallimento controllato** | ✅ **SI** | Basso | Errori dichiarativi con codici, nessun fallback silenzioso, limiti espliciti (queue 1000, retry 5) |
| **6. Blocco delle regressioni** | ✅ **SI** | Basso | 19+ test bloccanti, enforcement architetturale (http-boundary-only, bootstrap-no-leakage), coverage confini |

---

## B. Verdetto MVP

### ⚠️ **MVP-Ready con hardening minimo**

**Motivazione**:
- ✅ Architettura solida: Core isolato, Boundary enforcement, persistence reversibile
- ✅ Test bloccanti: 19+ test verificano vincoli architetturali
- ✅ Bootstrap deterministico: entrypoint unico, config esplicita
- ⚠️ Logging minimale: presente ma non strutturato per produzione
- ⚠️ Observability base: errori espliciti ma manca telemetria strutturata

**Gap reali**:
1. Logging non strutturato (console.log vs structured logging)
2. Nessuna metrica esplicita (solo logging HTTP base)
3. Nessun health check avanzato (solo `/health` minimale)

**Gap NON critici per MVP**:
- Auth/Authorization (intenzionalmente non implementato)
- Rate limiting avanzato (gestito dal Core)
- Caching (intenzionalmente non implementato)

---

## C. Raccomandazione Step successivo

### **STEP 5.9 — MVP Hardening**

**Focus**:
1. **Structured logging**: Sostituire `console.log` con logger strutturato (Pino/JSON)
2. **Health check avanzato**: Endpoint `/health` con verifica repository/DB
3. **Error handling centralizzato**: Middleware error handler per errori non gestiti
4. **Config validation**: Validazione env vars con messaggi chiari

**NON includere**:
- Auth/Authorization (out of scope MVP)
- Metriche avanzate (post-MVP)
- Monitoring/APM (post-MVP)

**Durata stimata**: 1-2 giorni

---

## D. Rischi reali (max 5)

1. **Logging non strutturato**
   - **Rischio**: Difficile debug in produzione
   - **Evidenza**: `main.ts` usa `console.log`, HTTP server usa Fastify logger base
   - **Impatto**: Medio (mitigabile con STEP 5.9)

2. **Nessuna validazione env vars**
   - **Rischio**: Config errata → crash runtime
   - **Evidenza**: `readConfigFromEnv()` usa default ma non valida range (es. port < 0)
   - **Impatto**: Basso (mitigabile con STEP 5.9)

3. **Health check minimale**
   - **Rischio**: `/health` non verifica DB/repository
   - **Evidenza**: `server.get('/health')` restituisce solo `{ status: 'ok' }`
   - **Impatto**: Basso (mitigabile con STEP 5.9)

4. **Nessun graceful shutdown timeout**
   - **Rischio**: Shutdown può bloccarsi indefinitamente
   - **Evidenza**: `app.shutdown()` non ha timeout
   - **Impatto**: Basso (edge case)

5. **Errori non gestiti in route**
   - **Rischio**: Errori non mappati → 500 generico
   - **Evidenza**: Route HTTP gestiscono solo errori Boundary, non errori runtime
   - **Impatto**: Basso (mitigabile con error handler middleware)

---

## Evidenze tecniche

### 1. Avviabilità deterministica

**File**: `src/app/main.ts`
- Entrypoint unico: `main()` funzione esplicita
- Config esplicita: `readConfigFromEnv()` → `AppConfig`
- Wiring esplicito: `createApp(config)` → `App`

**Pattern**: Composition Root pattern implementato correttamente

---

### 2. Isolamento del dominio

**File**: `src/api/core/messageAppend.ts`
- Zero import da `../` (solo tipi e invariants interni)
- Core riceve repository come interfacce
- Nessuna dipendenza runtime

**Test**: `src/api/tests/http-boundary-only.test.ts`
- Verifica che HTTP non accede a Core direttamente
- Verifica che HTTP accede solo a Boundary

---

### 3. Reversibilità tecnica

**Test**: `src/app/tests/bootstrap-swap.test.ts`
- Swap InMemory ↔ SQLite funziona
- Output identico tra implementazioni

**File**: `src/app/bootstrap/PersistenceFactory.ts`
- Switch esplicito `memory` vs `sqlite`
- Repository intercambiabili runtime

---

### 4. Comportamento osservabile

**File**: `src/app/main.ts`
- `console.log` per startup/shutdown
- `console.error` per errori

**File**: `src/api/http/server.ts`
- Fastify logger (level: 'info')
- RequestId middleware
- Logging response (method, url, statusCode, responseTime)

**Gap**: Logging non strutturato (JSON), nessuna metrica esplicita

---

### 5. Fallimento controllato

**File**: `src/api/core/invariants.ts`
- Errori dichiarativi con codici SYS-*
- Nessun fallback silenzioso
- Limiti espliciti: `MAX_OFFLINE_QUEUE_SIZE = 1000`, `MAX_RETRIES = 5`

**File**: `src/api/http/errorMapping.ts`
- Mapping errori → HTTP status coerenti
- Nessun messaggio emozionale

**Test**: `src/api/tests/sqlite-invariants.test.ts`
- Verifica che violazioni invarianti → errore esplicito

---

### 6. Blocco delle regressioni

**Test bloccanti** (19+ file):
- `http-boundary-only.test.ts` - Enforcement HTTP → Boundary
- `bootstrap-no-leakage.test.ts` - Enforcement repository factory
- `sqlite-invariants.test.ts` - Enforcement invarianti
- `repository-swap.test.ts` - Enforcement intercambiabilità

**Pattern**: Test verificano vincoli architetturali, non solo comportamento

---

## Conclusioni

**Stato attuale**: Sistema architetturalmente solido, MVP-ready con hardening minimo.

**Prossimo step**: STEP 5.9 — MVP Hardening (structured logging, health check avanzato, error handling centralizzato).

**Rischi residui**: Tutti mitigabili con STEP 5.9, nessun blocco architetturale.

---

**Analisi completata**: 2026-01-26  
**Analista**: Auto (AI Assistant)  
**Metodo**: READ-ONLY, nessuna modifica al codice
