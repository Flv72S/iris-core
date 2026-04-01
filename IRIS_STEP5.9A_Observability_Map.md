# IRIS — STEP 5.9A: Observability Map

## Scopo

Documentazione vincolante dell'infrastruttura di **Observability & Error Discipline** implementata in STEP 5.9A.

---

## Architettura: Observability Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Request                            │
│  (Client)                                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (header: x-correlation-id)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Middleware                          │
│  (src/api/http/middleware/correlation.ts)                  │
│                                                             │
│  Responsabilità:                                            │
│  • Estrae/genera correlation ID                            │
│  • Aggiunge a request context                               │
│  • Aggiunge a response header                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (correlationId in request)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Routes                              │
│  (src/api/http/routes/*.ts)                                 │
│                                                             │
│  Responsabilità:                                            │
│  • Usa correlation ID per logging                          │
│  • Chiama Boundary                                          │
│  • Gestisce errori con error handler                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (chiamata Boundary)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    MessagingBoundary                        │
│  (src/api/boundary/)                                         │
│                                                             │
│  Nota: Boundary non modifica, correlation ID propagato     │
│  tramite logging (non tramite parametri)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (errori dichiarativi)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Error Handler                            │
│  (src/observability/errorHandler.ts)                        │
│                                                             │
│  Responsabilità:                                            │
│  • Gestisce errori centralizzati                           │
│  • Applica error visibility policy                         │
│  • Logga errori strutturati                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (log strutturato)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Structured Logger                        │
│  (src/observability/logger.ts)                              │
│                                                             │
│  Responsabilità:                                            │
│  • Output JSON strutturato                                  │
│  • Campi obbligatori: timestamp, level, service,           │
│    component, correlationId, message, context               │
└─────────────────────────────────────────────────────────────┘
```

---

## Flusso di Logging

### 1. HTTP Request → Correlation ID

```
HTTP Request con header x-correlation-id (opzionale)
    ↓
Correlation Middleware estrae o genera correlation ID
    ↓
Correlation ID aggiunto a request context
    ↓
Correlation ID aggiunto a response header
```

### 2. Request Processing → Structured Logging

```
Route HTTP riceve request
    ↓
Logger.info('http', correlationId, 'Request started', {...})
    ↓
Chiamata Boundary
    ↓
Logger.info('http', correlationId, 'Request completed', {...})
```

### 3. Error Handling → Error Handler

```
Errore durante processing
    ↓
Error Handler.handleHttpError(error, correlationId, ...)
    ↓
Determina visibility (CLIENT / INTERNAL)
    ↓
Logga errore strutturato
    ↓
Mappa a risposta HTTP (con visibility policy)
    ↓
Restituisce risposta HTTP
```

---

## Componenti Implementati

### 1. Structured Logger

**File**: `src/observability/logger.ts`

**Responsabilità**:
- Output JSON strutturato
- Campi obbligatori: timestamp, level, service, component, correlationId, message, context
- Supporto livelli: debug, info, warn, error

**Uso**:
```typescript
const logger = getLogger();
logger.info('http', correlationId, 'Message', { context });
```

### 2. Correlation ID

**File**: `src/observability/correlation.ts`

**Responsabilità**:
- Generare correlation ID
- Estrarre correlation ID da header HTTP
- Creare correlation context

**Middleware**: `src/api/http/middleware/correlation.ts`
- Estrae/genera correlation ID
- Aggiunge a request context
- Aggiunge a response header

### 3. Error Handler

**File**: `src/observability/errorHandler.ts`

**Responsabilità**:
- Gestire errori centralizzati
- Applicare error visibility policy
- Loggare errori strutturati
- Mappare errori a risposte HTTP

**Funzioni**:
- `handleError()` - Gestisce errore e logga
- `handleHttpError()` - Gestisce errore HTTP e restituisce risposta
- `mapErrorToHttpResponse()` - Applica visibility policy

---

## Error Visibility Policy

### CLIENT (Visibili al client)

Errori dichiarativi dal Boundary:
- Codice errore esplicito
- Messaggio dichiarativo
- Correlation ID incluso

**Esempio**:
```json
{
  "code": "THREAD_NOT_FOUND",
  "message": "Thread non trovato",
  "correlationId": "corr-123"
}
```

### INTERNAL (Solo interni)

Errori runtime, database, sistema:
- Client riceve solo: `{ code: "INTERNAL_ERROR", message: "An internal error occurred", correlationId: "..." }`
- Dettagli loggati internamente

**Esempio (al client)**:
```json
{
  "code": "INTERNAL_ERROR",
  "message": "An internal error occurred",
  "correlationId": "corr-123"
}
```

**Esempio (nel log)**:
```json
{
  "timestamp": "2026-01-26T10:00:00.000Z",
  "level": "error",
  "service": "iris-api",
  "component": "http",
  "correlationId": "corr-123",
  "message": "TypeError: ...",
  "context": {
    "errorCode": "TypeError",
    "source": "http",
    "visibility": "INTERNAL",
    "errorStack": "..."
  }
}
```

---

## Integrazione

### HTTP Server

**File**: `src/api/http/server.ts`

**Modifiche**:
- Logger strutturato inizializzato
- Correlation ID middleware aggiunto
- Error handler centralizzato configurato
- Logging onRequest/onResponse strutturato

### Main Entrypoint

**File**: `src/app/main.ts`

**Modifiche**:
- Logger strutturato inizializzato
- Tutti i `console.log` sostituiti con structured logger
- Correlation ID per bootstrap operations

### Routes HTTP

**File**: `src/api/http/routes/*.ts`

**Nota**: Routes non modificate (mantengono comportamento esistente).
Correlation ID disponibile tramite request context per logging futuro.

---

## Test Bloccanti

### 1. no-console-log.test.ts

Verifica che:
- Nessun `console.log` diretto (eccetto structured logger)
- Nessun `console.error` diretto (eccetto structured logger)

### 2. logging-structure.test.ts

Verifica che:
- Log sono strutturati (JSON)
- Log contengono campi obbligatori
- Correlation ID presente in tutti i log

### 3. error-logging.test.ts

Verifica che:
- Ogni errore genera log strutturato
- Errori hanno correlation ID
- Errori hanno errorCode, source, visibility
- Errori INTERNAL non espongono dettagli al client

---

## Cosa è VIETATO

### ❌ Console.log diretto

- Nessun `console.log()` fuori da structured logger
- Nessun `console.error()` fuori da structured logger

### ❌ Log non strutturati

- Nessun log testuale
- Tutti i log devono essere JSON

### ❌ Stacktrace al client

- Nessun stacktrace esposto al client
- Nessun dettaglio tecnico al client

### ❌ Messaggi ambigui

- Nessun messaggio vago
- Tutti i messaggi devono essere dichiarativi

---

## Cosa è AMMESSO

### ✅ Structured logging

- Logger strutturato con output JSON
- Campi obbligatori sempre presenti

### ✅ Correlation ID

- Propagazione correlation ID HTTP → Logging
- Correlation ID in tutti i log

### ✅ Error handling centralizzato

- Un solo punto di gestione errori
- Error visibility policy applicata

### ✅ Logging testuale in test

- Test possono usare console.log per output
- Test possono mockare logger

---

## Riferimenti Vincolanti

- `IRIS_STEP5.9A_Error_Visibility_Policy.md` - Policy visibilità errori
- `IRIS_STEP5.9A_Checklist_Bloccante.md` - Checklist verifica
- `IRIS_STEP5.9A_Completamento_v1.0.md` - Verdetto finale
- `IRIS_STEP5.9_MVP_Hardening_Checklist_and_Results.md` - Checklist hardening

---

## Note Finali

Observability è implementata come **infrastruttura additiva**.

Nessuna modifica a Core, Boundary, Repository, Contratti.

Tutti i log sono strutturati e tracciabili tramite correlation ID.

Errori sono gestiti centralmente con visibility policy esplicita.
