# IRIS — STEP 5.6: HTTP Adapter Map

## Scopo

Documentazione vincolante del **Transport Layer HTTP** come **adattatore puro** sopra il Boundary Layer.

---

## Architettura: HTTP → Boundary → Core

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Transport Layer                     │
│  (src/api/http/)                                            │
│                                                             │
│  Responsabilità ESCLUSIVE:                                  │
│  • Traduzione input/output (DTO ↔ Core Types)              │
│  • Mapping errori dichiarativi → HTTP status                │
│  • Validazione schema DTO                                   │
│  • Chiamata Boundary                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (solo chiamate Boundary)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Boundary Layer                           │
│  (src/api/boundary/)                                         │
│                                                             │
│  Responsabilità ESCLUSIVE:                                  │
│  • Validazione pre-Core                                     │
│  • Chiamata Core                                             │
│  • Persistenza tramite Repository                            │
│  • Output dichiarativo                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (solo chiamate Core)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Core Layer                               │
│  (src/api/core/)                                            │
│                                                             │
│  READ-ONLY                                                  │
│  • Logica di dominio                                        │
│  • Invarianti                                               │
│  • Tipi congelati                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Flusso di Dati

### 1. Request HTTP → Boundary

```
HTTP Request (DTO)
    ↓
Validazione Schema DTO (Fastify)
    ↓
Conversione DTO → Core Request
    ↓
Chiamata Boundary.appendMessage(...)
    ↓
Boundary valida e chiama Core
    ↓
Boundary persiste tramite Repository
    ↓
Boundary restituisce Core Response/Error
    ↓
Conversione Core Response/Error → DTO
    ↓
Mapping Error → HTTP Status (se errore)
    ↓
HTTP Response (DTO)
```

---

## Cosa è VIETATO

### ❌ Accesso diretto al Core

HTTP **NON può** importare da:
- `src/api/core/messageAppend`
- `src/api/core/threadState`
- `src/api/core/syncDelivery`
- `src/api/core/invariants`

**Eccezione**: Solo `src/api/core/types` per conversioni DTO ↔ Core Types.

### ❌ Accesso diretto ai Repository

HTTP **NON può** importare da:
- `src/api/repositories/**`

### ❌ Logica di dominio

HTTP **NON può** contenere:
- Decisioni di business
- Validazioni di dominio
- Calcoli di invarianti
- Retry automatici
- Fallback logic

### ❌ Persistenza diretta

HTTP **NON può**:
- Chiamare repository direttamente
- Persistere dati
- Modificare stato

### ❌ Semantica

HTTP **NON può**:
- Introdurre nuova semantica
- Modificare comportamento Boundary
- Cambiare significato degli errori

---

## Cosa è AMMESSO

### ✅ Import consentiti

HTTP può importare **SOLO**:
- `src/api/boundary/**` (unico punto di ingresso)
- `src/api/core/types` (solo per conversioni DTO ↔ Core)
- `src/api/http/dto/**` (DTO interni)
- `src/api/http/errorMapping.ts` (mapping errori)
- `src/api/http/routes/**` (route interne)
- `fastify` (framework HTTP)

### ✅ Responsabilità HTTP

HTTP può:
1. **Leggere input HTTP** (body, params, query)
2. **Validare schema DTO** (Fastify schema validation)
3. **Convertire DTO ↔ Core Types** (solo traduzione struttura)
4. **Chiamare Boundary** (unico punto di ingresso)
5. **Mappare errori → HTTP status** (dichiarativo)
6. **Restituire HTTP response** (DTO)

### ✅ Middleware ammessi

- JSON parsing (built-in Fastify)
- RequestId generation
- Logging minimale (request/response)

---

## Cosa è INTENZIONALMENTE NON IMPLEMENTATO

### 🚫 Autenticazione

HTTP **NON implementa**:
- Auth middleware
- Token validation
- User identification

**Motivo**: HTTP è puro adapter. Auth deve essere gestita a livello superiore o come middleware esterno.

### 🚫 Rate Limiting

HTTP **NON implementa**:
- Rate limiting middleware
- Throttling

**Motivo**: Rate limiting è gestito dal Core tramite Boundary. HTTP non deve duplicare questa logica.

### 🚫 Caching

HTTP **NON implementa**:
- Response caching
- Cache invalidation

**Motivo**: Caching deve essere gestito a livello superiore o come middleware esterno.

### 🚫 WebSocket / SSE

HTTP **NON implementa**:
- WebSocket connections
- Server-Sent Events

**Motivo**: HTTP è REST-only. WebSocket/SSE richiedono un layer separato.

---

## Mapping Errori → HTTP Status

### MessageAppendError

| Core Error Code        | HTTP Status | Motivo                          |
|------------------------|-------------|---------------------------------|
| `THREAD_NOT_FOUND`     | 404         | Risorsa non trovata             |
| `ALIAS_NOT_FOUND`       | 404         | Risorsa non trovata             |
| `THREAD_CLOSED`         | 409         | Conflitto di stato              |
| `PAYLOAD_INVALID`       | 400         | Richiesta non valida            |
| `PAYLOAD_TOO_LARGE`     | 400         | Richiesta non valida            |
| `RATE_LIMIT`            | 429         | Troppe richieste                |
| `OFFLINE_QUEUE_FULL`    | 500         | Errore server                   |

### ThreadStateError

| Core Error Code           | HTTP Status | Motivo                          |
|---------------------------|-------------|---------------------------------|
| `THREAD_NOT_FOUND`        | 404         | Risorsa non trovata             |
| `INVALID_TRANSITION`       | 409         | Conflitto di stato              |
| `THREAD_ALREADY_ARCHIVED`  | 409         | Conflitto di stato              |
| `UNAUTHORIZED`             | 400         | Richiesta non valida            |

### MessageRetryError

| Core Error Code        | HTTP Status | Motivo                          |
|------------------------|-------------|---------------------------------|
| `MESSAGE_NOT_FOUND`    | 404         | Risorsa non trovata             |
| `MESSAGE_NOT_FAILED`    | 409         | Conflitto di stato              |
| `THREAD_CLOSED`         | 409         | Conflitto di stato              |
| `MAX_RETRIES_EXCEEDED`  | 409         | Conflitto di stato              |
| `UNAUTHORIZED`          | 400         | Richiesta non valida            |

---

## Struttura File

```
src/api/http/
├── server.ts              # Setup Fastify, middleware, registrazione route
├── errorMapping.ts        # Mapping errori → HTTP status
├── index.ts               # Export centralizzato
├── dto/
│   ├── MessageAppendDTO.ts
│   ├── ThreadStateDTO.ts
│   ├── SyncDeliveryDTO.ts
│   └── index.ts
└── routes/
    ├── messages.ts        # POST /threads/:threadId/messages
    ├── threads.ts         # GET /threads/:threadId/state, PATCH /threads/:threadId/state
    ├── sync.ts            # GET /threads/:threadId/messages/:messageId/delivery, POST /threads/:threadId/messages/:messageId/retry, GET /sync/status
    └── index.ts
```

---

## Endpoint HTTP

### Messages

- `POST /threads/:threadId/messages`
  - Body: `MessageAppendRequestDTO`
  - Response: `MessageAppendResponseDTO` (201) o `MessageAppendErrorDTO` (4xx/5xx)

### Threads

- `GET /threads/:threadId/state`
  - Response: `ThreadStateResponseDTO` (200) o `ThreadStateErrorDTO` (4xx/5xx)

- `PATCH /threads/:threadId/state`
  - Body: `ThreadStateTransitionRequestDTO` (senza threadId)
  - Response: `ThreadStateTransitionResponseDTO` (200) o `ThreadStateErrorDTO` (4xx/5xx)

### Sync / Delivery

- `GET /threads/:threadId/messages/:messageId/delivery`
  - Response: `MessageDeliveryResponseDTO` (200) o `MessageRetryErrorDTO` (4xx/5xx)

- `POST /threads/:threadId/messages/:messageId/retry`
  - Body: `MessageRetryRequestDTO` (senza threadId/messageId)
  - Response: `MessageRetryResponseDTO` (200) o `MessageRetryErrorDTO` (4xx/5xx)

- `GET /sync/status?isOnline=true|false`
  - Response: `SyncStatusResponseDTO` (200)

### Health

- `GET /health`
  - Response: `{ status: 'ok' }` (200)

---

## Verifica Conformità

### Test Bloccanti

1. **http-boundary-only.test.ts**
   - Verifica che HTTP NON importa Core/Repository direttamente
   - Verifica che HTTP importa SOLO Boundary

2. **http-no-semantics.test.ts**
   - Verifica che HTTP NON introduce semantica
   - Verifica che HTTP NON modifica comportamento Boundary
   - Verifica che HTTP NON persiste direttamente

3. **http-error-mapping.test.ts**
   - Verifica mapping errori → HTTP status
   - Verifica che messaggi errori siano dichiarativi

---

## Riferimenti Vincolanti

- `IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md` (contratti API congelati)
- `src/api/core/**` (READ-ONLY)
- `src/api/boundary/MessagingBoundary.ts` (unico punto di ingresso)
- `IRIS_STEP5.6_Checklist_Bloccante.md` (checklist verifica)
- `IRIS_STEP5.6_Completamento_v1.0.md` (verdetto finale)

---

## Note Finali

HTTP è **sostituibile** senza toccare il Core o il Boundary.

HTTP è **puro adapter** che traduce solo input/output.

HTTP **NON introduce semantica** e **NON decide nulla**.
