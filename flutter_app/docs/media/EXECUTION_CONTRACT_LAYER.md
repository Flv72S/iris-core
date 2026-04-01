# Execution Contract Layer

## Panoramica

L'**Execution Contract Layer** definisce l'interfaccia astratta (Port) per l'esecuzione delle operazioni fisiche sui media. Questo layer implementa il pattern **Port & Adapter** (Hexagonal Architecture) per invertire le dipendenze e disaccoppiare la logica di dominio dall'implementazione infrastrutturale.

## Pattern Port & Adapter

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DOMAIN LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Governance → Enforcement → Lifecycle → Materialization      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              MediaExecutionPort (abstract)                  │    │
│  │              ════════════════════════════                   │    │
│  │              execute(PhysicalOperation)                     │    │
│  │                        │                                    │    │
│  │                        ▼                                    │    │
│  │              Future<ExecutionResult>                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ LocalStorage  │   │ CloudStorage  │   │ ColdArchive   │
│   Adapter     │   │   Adapter     │   │   Adapter     │
│  (FUTURO)     │   │  (FUTURO)     │   │  (FUTURO)     │
└───────────────┘   └───────────────┘   └───────────────┘
```

## Perché nessuna implementazione?

Questo layer contiene **solo contratti** per questi motivi:

1. **Dependency Inversion**: Il dominio non deve dipendere dall'infrastruttura
2. **Testabilità**: Permette mock e stub nei test
3. **Flessibilità**: Gli adapter possono essere sostituiti senza modificare il dominio
4. **Separazione**: Infrastruttura e dominio evolvono indipendentemente

## Componenti

### ExecutionStatus

```dart
enum ExecutionStatus {
  success,   // Operazione completata
  failure,   // Operazione fallita
  skipped,   // Operazione saltata
}
```

### ExecutionFailure

Value object per errori:

```dart
class ExecutionFailure {
  final String code;     // Codice macchina-leggibile
  final String message;  // Messaggio human-readable
}
```

Caratteristiche:
- Immutabile
- Nessun stack trace
- Nessun timestamp
- Nessun riferimento SDK

### ExecutionResult

Risultato dell'esecuzione:

```dart
class ExecutionResult {
  final PhysicalOperation operation;
  final ExecutionStatus status;
  final ExecutionFailure? failure;
  
  bool get isSuccess;
  bool get isFailure;
  bool get isSkipped;
}
```

Validazione stato:
- `success` → `failure` deve essere null
- `failure` → `failure` non può essere null
- `skipped` → `failure` deve essere null

### MediaExecutionPort

Interfaccia astratta:

```dart
abstract class MediaExecutionPort {
  Future<ExecutionResult> execute(PhysicalOperation operation);
}
```

Contratto:
- Mai lanciare eccezioni, sempre restituire un risultato
- success/failure/skipped sono gli unici stati
- L'operazione in input viene inclusa nel risultato

## Diagramma flusso completo

```
┌─────────────┐
│ Governance  │  (FASE G) — definisce policy
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Snapshot   │  (FASE H) — congela stato
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Enforcement │  (FASE F) — decide permessi
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Lifecycle  │  — pianifica stati
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Material.   │  (I1) — traduce in operazioni
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Port      │  (I2 — questo layer) — contratto
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Adapter    │  (FUTURO) — implementazione
└─────────────┘
```

## Esempio di utilizzo (futuro)

```dart
// Nel dominio (non conosce l'implementazione)
class MediaExecutor {
  final MediaExecutionPort port;
  
  MediaExecutor(this.port);
  
  Future<List<ExecutionResult>> executePlan(PhysicalOperationPlan plan) async {
    final results = <ExecutionResult>[];
    for (final operation in plan.operations) {
      results.add(await port.execute(operation));
    }
    return results;
  }
}

// Nell'applicazione (Dependency Injection)
final executor = MediaExecutor(LocalStorageAdapter());
// oppure
final executor = MediaExecutor(CloudStorageAdapter());
// oppure
final executor = MediaExecutor(MockExecutionPort()); // per test
```

## Test coverage

| Test | Verifica |
|------|----------|
| ExecutionStatus | Enum completo, 3 valori |
| ExecutionFailure | equality, hash, JSON |
| ExecutionResult | success/failure/skipped, coerenza stato |
| MediaExecutionPort | Implementabile, contratto rispettato |
| Forbidden Guard | Nessun pattern vietato, nessun dart:io |

## Vincoli architetturali

### Questo layer NON:

- Implementa adapter concreti
- Contiene logica di retry
- Accede a filesystem
- Usa DateTime/Random
- Dipende da SDK cloud

### Questo layer È:

- Puro contratto
- Punto di inversione dipendenze
- Base per Dependency Injection
- Completamente deterministico

## Prossimi passi

Gli adapter concreti saranno implementati nei microstep successivi:

```
I2 (questo) — Port Definition
     │
     ▼
I3 — Local Storage Adapter
     │
     ▼
I4 — Cloud Storage Adapter
     │
     ▼
I5 — Cold Archive Adapter
```
