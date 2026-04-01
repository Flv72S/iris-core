# IRIS — STEP 5.9B: Runtime Safety Map

## Scopo

Documentazione vincolante dell'infrastruttura di **Runtime Safety & Operational Hardening** implementata in STEP 5.9B.

---

## Architettura: Runtime Safety Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Startup                      │
│  (src/app/main.ts)                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (readConfigFromEnv)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Config Validation                        │
│  (src/runtime/config/validateConfig.ts)                     │
│                                                             │
│  Responsabilità:                                            │
│  • Validare configurazione fail-fast                       │
│  • Verificare range e tipi                                 │
│  • Abortire se invalida                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (config validata)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Startup Invariants                      │
│  (src/runtime/startup/startupInvariants.ts)                │
│                                                             │
│  Responsabilità:                                            │
│  • Verificare invarianti di avvio                         │
│  • Abortire se violati                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (invariants verificati)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    App Bootstrap                            │
│  (src/app/bootstrap/AppBootstrap.ts)                        │
│                                                             │
│  Responsabilità:                                            │
│  • Creare applicazione                                      │
│  • Istanzia persistence, boundary, HTTP                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (app creata)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Server Start                        │
│  (src/api/http/server.ts)                                   │
│                                                             │
│  Responsabilità:                                            │
│  • Avviare server HTTP                                      │
│  • Registrare health/readiness endpoints                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (server avviato)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Readiness State                          │
│  (src/api/http/routes/health.ts)                            │
│                                                             │
│  Responsabilità:                                            │
│  • Mantenere stato readiness                               │
│  • Verificare persistence e boundary                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (sistema operativo)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Running                     │
│                                                             │
│  Health: /health → liveness                                │
│  Readiness: /ready → readiness operativa                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (SIGINT/SIGTERM)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Graceful Shutdown                       │
│  (src/runtime/shutdown/gracefulShutdown.ts)                 │
│                                                             │
│  Responsabilità:                                            │
│  • Intercettare SIGINT/SIGTERM                             │
│  • Eseguire shutdown in ordine                              │
│  • Applicare timeout                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Componenti Implementati

### 1. Config Validation (H-05)

**File**: `src/runtime/config/validateConfig.ts`

**Responsabilità**:
- Validare configurazione fail-fast
- Verificare range e tipi
- Abortire immediatamente se invalida

**Schema**: `src/runtime/config/schema.ts`
- Schema esplicito per validazione
- Range definiti (port: 1-65535)
- Tipi enum (persistence: 'memory' | 'sqlite')

**Validazione**:
- Persistence: deve essere 'memory' o 'sqlite'
- HTTP port: deve essere 1-65535
- SQLite filePath: richiesto se persistence === 'sqlite', lunghezza >= 1

### 2. Startup Invariants (H-16, H-17)

**File**: `src/runtime/startup/startupInvariants.ts`

**Responsabilità**:
- Verificare invarianti di avvio
- Abortire immediatamente se violati

**Invarianti verificati**:
- CONFIG_PRESENT: Config deve essere presente
- HTTP_CONFIG_VALID: HTTP config deve essere valida
- LOGGER_OPERATIONAL: Logger deve essere operativo
- PERSISTENCE_CONFIG_COHERENT: Config persistence coerente

### 3. Health & Readiness Check (H-04)

**File**: `src/api/http/routes/health.ts`

**Responsabilità**:
- `/health` → liveness (process alive)
- `/ready` → readiness operativa

**Comportamento**:
- `/health`: ritorna 200 se processo attivo
- `/ready`: ritorna 200 solo se:
  - persistence inizializzata
  - boundary operativo
  - nessun errore critico attivo

**Stato readiness**:
- Mantenuto esplicitamente
- Verificato tramite boundary (operazione leggera)
- Aggiornato durante startup

### 4. Graceful Shutdown (H-08)

**File**: `src/runtime/shutdown/gracefulShutdown.ts`

**Responsabilità**:
- Intercettare SIGINT/SIGTERM
- Eseguire shutdown in ordine determinato
- Applicare timeout esplicito

**Ordine di chiusura**:
1. HTTP server
2. Boundary
3. Repository / DB

**Timeout**:
- Configurabile (default: 10s)
- Se timeout superato → exit forzata controllata

---

## Integrazione

### Main Entrypoint

**File**: `src/app/main.ts`

**Modifiche**:
- Config validation fail-fast prima del bootstrap
- Startup invariants verificati
- Readiness state impostato durante startup
- Graceful shutdown handlers registrati

### Bootstrap

**File**: `src/app/bootstrap/AppBootstrap.ts`

**Modifiche**:
- Config validation chiamata prima di creare app
- Startup invariants verificati
- Nessuna modifica semantica

### HTTP Server

**File**: `src/api/http/server.ts`

**Modifiche**:
- Health/readiness routes registrate
- `/health` endpoint per liveness
- `/ready` endpoint per readiness

---

## Test Bloccanti

### 1. config-validation.test.ts

Verifica che:
- Config valida passa validazione
- Config invalida fallisce (fail-fast)
- Range port validato (1-65535)
- SQLite config richiesto quando persistence === 'sqlite'

### 2. startup-invariants.test.ts

Verifica che:
- Invarianti verificati durante startup
- Violazione invariante → abort immediato
- Errori dichiarativi loggati

### 3. health-readiness.test.ts

Verifica che:
- `/health` ritorna 200 se processo attivo
- `/ready` ritorna 503 se not ready
- `/ready` ritorna 200 se ready
- Readiness verifica persistence tramite boundary

### 4. graceful-shutdown.test.ts

Verifica che:
- Shutdown chiama tutti gli handler in ordine
- Shutdown continua anche se un handler fallisce
- Timeout applicato correttamente
- Shutdown multipli prevenuti

---

## Cosa è VIETATO

### ❌ Default impliciti

- Nessun default implicito per config
- Tutti i valori devono essere espliciti

### ❌ Fallback silenziosi

- Nessun fallback silenzioso su errori
- Tutti gli errori devono essere dichiarativi

### ❌ Modifica semantica

- Nessuna modifica a Core, Boundary, Repository
- Nessuna modifica a API output

---

## Cosa è AMMESSO

### ✅ Config validation fail-fast

- Validazione eseguita prima del bootstrap
- Errori dichiarativi e immediati

### ✅ Startup invariants

- Invarianti verificati prima di procedere
- Abort immediato se violati

### ✅ Health & readiness

- Endpoint separati per liveness e readiness
- Stato readiness mantenuto esplicitamente

### ✅ Graceful shutdown

- Shutdown controllato con timeout
- Ordine di chiusura determinato

---

## Riferimenti Vincolanti

- `IRIS_STEP5.9B_Checklist_Bloccante.md` - Checklist verifica
- `IRIS_STEP5.9B_Completamento_v1.0.md` - Verdetto finale
- `IRIS_STEP5.9_MVP_Hardening_Checklist_and_Results.md` - Checklist hardening originale

---

## Note Finali

Runtime Safety è implementata come **infrastruttura additiva**.

Nessuna modifica a Core, Boundary, Repository, API semantics.

Sistema fail-fast, operativamente sicuro, prevedibile in avvio e shutdown.

Pronto al deploy controllato.
