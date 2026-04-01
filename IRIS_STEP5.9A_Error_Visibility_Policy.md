# IRIS — STEP 5.9A: Error Visibility Policy

## Scopo

Definire policy esplicita per visibilità errori:
- Quali errori sono visibili al client
- Quali errori sono solo interni
- Come gestire errori runtime non gestiti

---

## Policy di Visibilità

### CLIENT (Visibili al client)

Errori **dichiarativi** dal Boundary che devono essere esposti al client:

- `THREAD_NOT_FOUND` → 404
- `ALIAS_NOT_FOUND` → 404
- `THREAD_CLOSED` → 409
- `PAYLOAD_INVALID` → 400
- `PAYLOAD_TOO_LARGE` → 400
- `RATE_LIMIT` → 429
- `INVALID_TRANSITION` → 409
- `MESSAGE_NOT_FOUND` → 404
- `MAX_RETRIES_EXCEEDED` → 409

**Caratteristiche**:
- Errori previsti e gestiti
- Codice errore esplicito
- Messaggio dichiarativo (non emozionale)
- Correlation ID incluso

---

### INTERNAL (Solo interni)

Errori che **NON devono** essere esposti al client:

- Errori runtime (TypeError, ReferenceError, ecc.)
- Errori database (SQLite errors)
- Errori di sistema (memory, disk, ecc.)
- Errori non previsti

**Caratteristiche**:
- Loggati internamente con dettagli completi
- Client riceve solo: `{ code: 'INTERNAL_ERROR', message: 'An internal error occurred', correlationId: '...' }`
- Nessun stacktrace al client
- Nessun dettaglio tecnico al client

---

## Regole di Implementazione

### 1. Errori Boundary

Errori dal `MessagingBoundary` sono **CLIENT** per default:
- Sono errori dichiarativi previsti
- Hanno codice errore esplicito
- Sono mappati a HTTP status coerenti

**Eccezione**: Se errore Boundary non ha codice → INTERNAL

### 2. Errori Runtime

Errori runtime (TypeError, ReferenceError, ecc.) sono **INTERNAL**:
- Non previsti
- Possono contenere informazioni sensibili
- Richiedono investigazione

### 3. Errori Repository

Errori repository sono **INTERNAL**:
- Dettagli tecnici (SQL, file system, ecc.)
- Non rilevanti per client
- Loggati internamente

### 4. Errori HTTP

Errori HTTP (validazione schema, parsing, ecc.) sono **CLIENT**:
- Errori di input
- Client può correggere
- Messaggio chiaro

---

## Messaggi Errore

### CLIENT

```json
{
  "code": "THREAD_NOT_FOUND",
  "message": "Thread non trovato",
  "correlationId": "corr-1234567890-abc"
}
```

**Caratteristiche**:
- Codice errore esplicito
- Messaggio dichiarativo
- Correlation ID per tracciamento
- Nessun stacktrace
- Nessun dettaglio tecnico

### INTERNAL

**Al client**:
```json
{
  "code": "INTERNAL_ERROR",
  "message": "An internal error occurred",
  "correlationId": "corr-1234567890-abc"
}
```

**Nel log** (strutturato):
```json
{
  "timestamp": "2026-01-26T10:00:00.000Z",
  "level": "error",
  "service": "iris-api",
  "component": "http",
  "correlationId": "corr-1234567890-abc",
  "message": "TypeError: Cannot read property 'x' of undefined",
  "context": {
    "errorCode": "TypeError",
    "source": "http",
    "visibility": "INTERNAL",
    "method": "POST",
    "url": "/threads/123/messages",
    "errorStack": "..."
  }
}
```

---

## Vietato

### ❌ Stacktrace al client

Nessun stacktrace deve essere esposto al client, anche in sviluppo.

### ❌ Messaggi ambigui

Messaggi come "Something went wrong" o "Error occurred" sono vietati.

### ❌ Silenzio sugli errori

Ogni errore deve essere loggato, anche se INTERNAL.

### ❌ Dettagli tecnici al client

Nessun dettaglio tecnico (SQL, file path, ecc.) deve essere esposto al client.

---

## Implementazione

### Error Handler

`src/observability/errorHandler.ts` implementa questa policy:

- `handleError()` - Determina visibility e logga
- `mapErrorToHttpResponse()` - Applica policy (solo CLIENT → dettagli)
- `handleHttpError()` - Gestisce errore HTTP con policy

### HTTP Server

`src/api/http/server.ts` usa error handler centralizzato:

- Errori Boundary → CLIENT (se hanno codice)
- Errori runtime → INTERNAL
- Tutti gli errori loggati strutturati

---

## Riferimenti Vincolanti

- `IRIS_STEP5.9A_Observability_Map.md`
- `IRIS_STEP5.9_MVP_Hardening_Checklist_and_Results.md` (H-19)
- `src/observability/errorHandler.ts`

---

**Documento vincolante**: Modifiche richiedono nuovo STEP o appendice.
