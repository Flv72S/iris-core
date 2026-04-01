# Audit Snapshots — Phase 7.V

Questa cartella è destinata agli **audit snapshot** prodotti dall’harness di esecuzione.

## Scopo

- Ogni run dell’**execution harness** può registrare uno snapshot del log di audit (append-only) dopo l’esecuzione.
- Gli snapshot possono essere salvati qui (es. come JSON deterministico) per:
  - confronto post-mortem con replay;
  - verifica di coerenza tra run originale e replay;
  - base per la Phase 7 Certification.

## Formato

- Snapshot = array di entry di audit (stesso formato di `ExecutionAuditEntry`).
- Serializzazione deterministica (es. `JSON.stringify` con chiavi ordinate) per confronto bit-a-bit.

## Utilizzo

- I **runner** (run-all-phase7-tests, run-determinism-suite) usano gli snapshot in memoria; l’eventuale persistenza in questa cartella è opzionale e può essere aggiunta in seguito per certificazione o debug.
