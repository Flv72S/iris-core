# IRIS — STEP 5.8: Bootstrap Map

## Scopo

Documentazione vincolante del **Composition Root** per l'applicazione IRIS.

---

## Architettura: Composition Root

```
┌─────────────────────────────────────────────────────────────┐
│                    main.ts                                  │
│  (entrypoint)                                               │
│                                                             │
│  Responsabilità ESCLUSIVE:                                  │
│  • Leggere process.env                                      │
│  • Costruire AppConfig                                      │
│  • Chiamare createApp                                       │
│  • Avviare server HTTP                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (chiama)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    AppBootstrap.ts                          │
│  (Composition Root)                                         │
│                                                             │
│  Responsabilità ESCLUSIVE:                                  │
│  • Validare config                                          │
│  • Istanzia persistence (tramite factory)                   │
│  • Istanzia boundary                                        │
│  • Istanzia transport (tramite factory)                     │
│  • Restituire App con shutdown                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                              │
        ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│ PersistenceFactory│          │ HttpServerFactory│
│                  │          │                  │
│ Crea repository  │          │ Crea server HTTP │
│ (InMemory/SQLite)│          │                  │
└──────────────────┘          └──────────────────┘
        │                              │
        │                              │
        ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│ Repository       │          │ HTTP Server       │
│ (interfacce)     │          │ (Fastify)         │
└──────────────────┘          └──────────────────┘
        │                              │
        └──────────────┬───────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    MessagingBoundary                        │
│  (src/api/boundary/)                                        │
│                                                             │
│  Riceve repository come dipendenze                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Core API                                 │
│  (src/api/core/)                                            │
│                                                             │
│  READ-ONLY                                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Flusso di Bootstrap

### 1. main.ts

```
Legge process.env
    ↓
Costruisce AppConfig
    ↓
Chiama createApp(config)
    ↓
Avvia server HTTP
```

### 2. AppBootstrap.createApp()

```
Valida config (strutturale)
    ↓
PersistenceFactory.createRepositories(config)
    ↓
new MessagingBoundary(repositories...)
    ↓
HttpServerFactory.createHttpServerBundle(boundary)
    ↓
Restituisce App { boundary, httpServer, shutdown }
```

### 3. PersistenceFactory.createRepositories()

```
switch (config.persistence)
    case 'memory':
        → new InMemoryMessageRepository()
        → new InMemoryThreadRepository()
        → ...
    case 'sqlite':
        → createDatabase(config.sqlite.filePath)
        → new SQLiteMessageRepository(db)
        → new SQLiteThreadRepository(db)
        → ...
```

### 4. HttpServerFactory.createHttpServerBundle()

```
createHttpServer(boundary)
    ↓
Restituisce { server, start, stop }
```

---

## Wiring delle Dipendenze

### Repository → Boundary

```typescript
const repositories = createRepositories(config);

const boundary = new MessagingBoundary(
  repositories.messageRepository,
  repositories.threadRepository,
  repositories.aliasRepository,
  repositories.rateLimitRepository,
  repositories.offlineQueueRepository,
  repositories.syncStatusRepository
);
```

### Boundary → HTTP Server

```typescript
const httpServer = createHttpServerBundle(boundary);
```

---

## Swap Runtime: InMemory ↔ SQLite

### Configurazione Memory

```typescript
const config: AppConfig = {
  persistence: 'memory',
  http: { port: 3000 },
};

const app = createApp(config);
```

### Configurazione SQLite

```typescript
const config: AppConfig = {
  persistence: 'sqlite',
  http: { port: 3000 },
  sqlite: { filePath: ':memory:' },
};

const app = createApp(config);
```

**Swap**: Cambiare solo `config.persistence` e `config.sqlite` (se necessario).

---

## Cosa è VIETATO

### ❌ Singleton impliciti

- Nessun `getInstance()`
- Nessun `static instance`
- Nessun pattern singleton

### ❌ Accesso diretto a process.env fuori da main.ts

- Solo `main.ts` può leggere `process.env`
- Altri file ricevono `AppConfig` come parametro

### ❌ Import ciclici

- Nessun import circolare tra bootstrap files
- Dipendenze unidirezionali

### ❌ Decisioni runtime nascoste

- Tutte le decisioni esplicite nel bootstrap
- Nessuna magia nascosta

### ❌ Side effects all'import

- Nessun side effect quando si importa un modulo
- Tutto esplicito nel bootstrap

### ❌ Repository istanziati fuori dalla factory

- Solo `PersistenceFactory` può creare repository
- Nessun `new Repository()` fuori dalla factory

---

## Cosa è AMMESSO

### ✅ Un solo Composition Root

- `AppBootstrap.createApp()` è l'unico punto di composizione
- Tutte le dipendenze cablate esplicitamente

### ✅ Env-driven wiring

- Scelta persistence tramite `config.persistence`
- Configurazione tramite `AppConfig`

### ✅ Zero semantica

- Il bootstrap non interpreta dati o logica di dominio
- Solo wiring e composizione

### ✅ Core e Boundary invariati

- Nessuna modifica a `src/api/core/**`
- Nessuna modifica a `src/api/boundary/**`

### ✅ Testabile

- Il bootstrap è istanziabile nei test
- Config passata come parametro
- Shutdown esplicito

---

## Struttura File

```
src/app/
├── bootstrap/
│   ├── types.ts              # AppConfig, PersistenceType
│   ├── PersistenceFactory.ts # Crea repository
│   ├── HttpServerFactory.ts  # Crea server HTTP
│   ├── AppBootstrap.ts      # Composition Root
│   └── index.ts             # Export centralizzato
├── main.ts                   # Entrypoint (legge env)
└── tests/
    ├── bootstrap-memory.test.ts
    ├── bootstrap-sqlite.test.ts
    ├── bootstrap-swap.test.ts
    └── bootstrap-no-leakage.test.ts
```

---

## Test Bloccanti

### 1. bootstrap-memory.test.ts

Verifica che bootstrap con persistence 'memory' funziona.

### 2. bootstrap-sqlite.test.ts

Verifica che bootstrap con persistence 'sqlite' funziona.

### 3. bootstrap-swap.test.ts

Verifica che swap InMemory ↔ SQLite funziona senza errori.

### 4. bootstrap-no-leakage.test.ts

Verifica che:
- Repository non sono istanziati fuori dalla factory
- Nessun accesso a process.env fuori da main.ts
- Nessun singleton implicito
- HTTP non accede a repository o Core

---

## Riferimenti Vincolanti

- `IRIS_STEP5.8_Checklist_Bloccante.md` (checklist verifica)
- `IRIS_STEP5.8_Completamento_v1.0.md` (verdetto finale)
- `src/api/core/**` (READ-ONLY)
- `src/api/boundary/**` (READ-ONLY)
- `src/api/http/**` (HTTP Transport Layer)
- `src/api/repositories/**` (Repository interfaces)

---

## Note Finali

Il bootstrap è **l'unico punto di composizione**.

Persistence e transport sono **swappabili runtime**.

Core e Boundary restano **puri e invariati**.
