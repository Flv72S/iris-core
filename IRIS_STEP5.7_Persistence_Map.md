# IRIS — STEP 5.7: Persistence Map

## Scopo

Documentazione vincolante della **persistence reale minimale** con SQLite, senza introdurre nuova semantica o modificare Core/Boundary.

---

## Architettura: Repository → SQLite → Tabelle

```
┌─────────────────────────────────────────────────────────────┐
│                    Boundary Layer                           │
│  (src/api/boundary/)                                         │
│                                                             │
│  Usa Repository interfaces (astrazione pura)                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (iniezione runtime)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Repository Interfaces                    │
│  (src/api/repositories/*.ts)                               │
│                                                             │
│  - MessageRepository                                        │
│  - ThreadRepository                                         │
│  - SyncStatusRepository                                     │
│  - OfflineQueueRepository                                   │
│  - RateLimitRepository                                      │
│  - AliasRepository                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (implementazione)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Repository Implementations                     │
│                                                             │
│  InMemory              SQLite                               │
│  ────────              ──────                               │
│  • InMemoryMessage    • SQLiteMessage                      │
│  • InMemoryThread     • SQLiteThread                        │
│  • InMemorySync       • SQLiteSync                          │
│                                                             │
│  Intercambiabili runtime                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (SQL esplicito)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    SQLite Database                          │
│                                                             │
│  Tabelle:                                                   │
│  • threads                                                  │
│  • messages                                                 │
│  • delivery_status                                          │
│  • sync_status                                              │
│  • offline_queue                                            │
│  • rate_limits                                              │
│  • aliases                                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Mappatura Repository → Tabelle

### MessageRepository → `messages` + `delivery_status`

| Repository Method          | SQL Operation              | Tabella         | Contratto → Invariante |
|----------------------------|----------------------------|-----------------|------------------------|
| `append(message)`          | `INSERT INTO messages`     | `messages`      | SYS-01 (Append-Only)   |
| `get(messageId, threadId)` | `SELECT FROM messages`      | `messages`      | SYS-02 (Thread-First)  |
| `listByThread(...)`        | `SELECT ... ORDER BY`      | `messages`      | SYS-02, SYS-10         |
| `findByClientMessageId()` | `SELECT ... WHERE`         | `messages`      | SYS-01 (Idempotenza)   |
| `updateDeliveryState()`    | `UPDATE delivery_status`   | `delivery_status`| SYS-04, SYS-05         |
| `updateRetryCount()`       | `UPDATE messages`          | `messages`      | -                      |

### ThreadRepository → `threads`

| Repository Method          | SQL Operation              | Tabella  | Contratto → Invariante |
|----------------------------|----------------------------|----------|------------------------|
| `exists(threadId)`         | `SELECT EXISTS(...)`       | `threads`| -                      |
| `get(threadId)`            | `SELECT FROM threads`       | `threads`| SYS-04 (Stato Esplicito) |
| `set(thread)`              | `INSERT OR REPLACE`         | `threads`| -                      |
| `updateState(...)`         | `UPDATE threads`            | `threads`| SYS-04, SYS-05         |
| `getState(threadId)`       | `SELECT state FROM threads` | `threads`| SYS-04                |

### SyncStatusRepository → `sync_status`

| Repository Method          | SQL Operation              | Tabella      | Contratto → Invariante |
|----------------------------|----------------------------|--------------|------------------------|
| `getLastSyncAt()`          | `SELECT last_sync_at`      | `sync_status`| SYS-05 (Timestamp)      |
| `setLastSyncAt(...)`       | `UPDATE sync_status`       | `sync_status`| SYS-05                 |
| `getEstimatedLatency()`    | `SELECT estimated_latency`| `sync_status`| SYS-08 (Latenza)        |
| `setEstimatedLatency(...)` | `UPDATE sync_status`       | `sync_status`| SYS-08                 |

### OfflineQueueRepository → `offline_queue`

| Repository Method          | SQL Operation              | Tabella        | Contratto → Invariante |
|----------------------------|----------------------------|----------------|------------------------|
| `getSize()`                | `SELECT COUNT(*)`          | `offline_queue`| SYS-07, SYS-10          |
| `getPendingMessages()`     | `SELECT ... ORDER BY`      | `offline_queue`| SYS-07                  |
| `enqueue(message)`         | `INSERT INTO offline_queue`| `offline_queue`| SYS-07 (Max 1000)       |
| `dequeue(messageId)`       | `DELETE FROM offline_queue`| `offline_queue`| -                      |

### RateLimitRepository → `rate_limits`

| Repository Method          | SQL Operation              | Tabella      | Contratto → Invariante |
|----------------------------|----------------------------|--------------|------------------------|
| `checkLimit(...)`          | `SELECT COUNT(*) WHERE`    | `rate_limits`| -                      |
| `recordRequest(...)`       | `INSERT INTO rate_limits`   | `rate_limits`| -                      |

### AliasRepository → `aliases`

| Repository Method          | SQL Operation              | Tabella | Contratto → Invariante |
|----------------------------|----------------------------|---------|------------------------|
| `exists(aliasId)`          | `SELECT EXISTS(...)`       | `aliases`| SYS-03 (Alias-Only)    |
| `isRootIdentity(...)`      | `SELECT is_root`           | `aliases`| SYS-03                 |

---

## Schema Database

### Tabella: `threads`

```sql
CREATE TABLE threads (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL CHECK(state IN ('OPEN', 'PAUSED', 'CLOSED', 'ARCHIVED')),
    last_state_change_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

**Vincoli**:
- `state` enum chiuso, finito (SYS-04)
- `last_state_change_at` timestamp arrotondato (SYS-05)

### Tabella: `messages`

```sql
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    sender_alias TEXT NOT NULL,
    payload TEXT NOT NULL,
    state TEXT NOT NULL CHECK(state IN (...)),
    created_at INTEGER NOT NULL,
    client_message_id TEXT UNIQUE,
    retry_count INTEGER DEFAULT 0,
    FOREIGN KEY (thread_id) REFERENCES threads(id)
);
```

**Vincoli**:
- `thread_id` obbligatorio (SYS-02: Thread-First)
- `client_message_id` UNIQUE (idempotenza)
- `state` enum chiuso (SYS-04)

### Tabella: `delivery_status`

```sql
CREATE TABLE delivery_status (
    message_id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    state TEXT NOT NULL CHECK(state IN ('SENT', 'DELIVERED', 'READ', 'FAILED')),
    sent_at INTEGER NOT NULL,
    delivered_at INTEGER,
    read_at INTEGER,
    failed_at INTEGER,
    failure_reason TEXT,
    FOREIGN KEY (message_id) REFERENCES messages(id)
);
```

**Vincoli**:
- `state` enum chiuso (SYS-04)
- Timestamp arrotondati (SYS-05)

### Tabella: `sync_status`

```sql
CREATE TABLE sync_status (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    last_sync_at INTEGER,
    estimated_latency INTEGER
);
```

**Vincoli**:
- Singola riga (id = 1)
- Timestamp espliciti (SYS-05, SYS-08)

### Tabella: `offline_queue`

```sql
CREATE TABLE offline_queue (
    message_id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    sender_alias TEXT NOT NULL,
    payload TEXT NOT NULL,
    state TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    client_message_id TEXT,
    retry_count INTEGER DEFAULT 0,
    FOREIGN KEY (message_id) REFERENCES messages(id)
);
```

**Vincoli**:
- Max 1000 messaggi (SYS-07)
- Ordinamento per `created_at` ASC

### Tabella: `rate_limits`

```sql
CREATE TABLE rate_limits (
    sender_alias TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    PRIMARY KEY (sender_alias, timestamp)
);
```

### Tabella: `aliases`

```sql
CREATE TABLE aliases (
    id TEXT PRIMARY KEY,
    is_root INTEGER NOT NULL DEFAULT 0 CHECK(is_root IN (0, 1))
);
```

---

## Query → Contratto → Invariante

### Esempio: Message Append

```
HTTP Request
    ↓
Boundary.appendMessage(request)
    ↓
MessageRepository.append(message)
    ↓
SQL: INSERT INTO messages (...)
    ↓
Constraint: UNIQUE client_message_id
    ↓
Errore dichiarativo se duplicato
    ↓
HTTP Response (errore)
```

**Invarianti coinvolte**:
- SYS-01: Append-Only (messageId non duplicato)
- SYS-02: Thread-First (thread_id obbligatorio)
- SYS-03: Alias-Only (sender_alias obbligatorio)
- SYS-04: Stato Esplicito (state enum chiuso)

---

## Cosa è VIETATO

### ❌ Modifiche a Core/Boundary

- Nessuna modifica a `src/api/core/**`
- Nessuna modifica a `src/api/boundary/**`
- Nessuna modifica ai contratti STEP 5.3

### ❌ Logica di dominio nei Repository

- Nessuna decisione di business
- Nessuna trasformazione semantica
- Nessun fallback silenzioso
- Nessun comportamento implicito

### ❌ ORM o astrazioni magiche

- Nessun ORM (TypeORM, Sequelize, etc.)
- SQL esplicito
- Nessuna magia nascosta

### ❌ Ottimizzazioni premature

- Nessun caching
- Nessun batch processing
- Nessuna join "intelligente"

---

## Cosa è AMMESSO

### ✅ SQL esplicito

- Query SQL dirette
- Prepared statements (performance)
- Transazioni esplicite

### ✅ Errori dichiarativi

- Errori espliciti per violazioni constraint
- Nessun fallback silenzioso
- Messaggi chiari

### ✅ Intercambiabilità runtime

- InMemory ↔ SQLite senza modifiche
- Iniezione dependency
- Nessuna conoscenza DB nel Boundary

---

## Migrazioni

### Migration 001: Initial Schema

Crea tutte le tabelle necessarie:
- `threads`
- `messages`
- `delivery_status`
- `sync_status`
- `offline_queue`
- `rate_limits`
- `aliases`

**File**: `src/api/repositories/sqlite/migrations/001_initial.sql`

---

## Test Bloccanti

### 1. repository-swap.test.ts

Verifica che InMemory e SQLite producano output identico.

### 2. sqlite-idempotency.test.ts

Verifica che `clientMessageId` duplicato → errore esplicito.

### 3. sqlite-invariants.test.ts

Verifica che violazioni SYS-* → errore esplicito.

### 4. persistence-no-semantics.test.ts

Verifica che lo stato UI non cambia tra InMemory e SQLite.

---

## Riferimenti Vincolanti

- `IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md` (contratti congelati)
- `IRIS_API_Invariants_and_Failure_Modes.md` (invarianti SYS-*)
- `src/api/core/**` (READ-ONLY)
- `src/api/boundary/**` (READ-ONLY)
- `IRIS_STEP5.7_Checklist_Bloccante.md` (checklist verifica)
- `IRIS_STEP5.7_Completamento_v1.0.md` (verdetto finale)

---

## Note Finali

Persistence è **un dettaglio sostituibile**, non un elemento architetturale.

Repository sono **intercambiabili runtime** senza modifiche a Core/Boundary.

SQLite è **persistence-safe**: nessuna semantica introdotta.
