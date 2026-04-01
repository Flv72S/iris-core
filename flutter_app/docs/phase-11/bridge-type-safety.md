# Phase 11.2 — Bridge type-safety (IRIS Core → Flutter)

## Ruolo del bridge in IRIS

Il bridge è l’unico punto di passaggio dati tra **Core IRIS (TypeScript)** e **UI Flutter (Dart)**. Non contiene logica di business, policy o decisioni: solo **deserializzazione**, **validazione di struttura** ed **esposizione di DTO immutabili**.

- **Consentito:** mapping 1-a-1, validazione di tipo, hash deterministico, versioning del contratto.
- **Vietato:** trasformazioni semantiche, safety evaluation, explainability generation, default impliciti, normalizzazioni “intelligenti”.

## Separazione semantica UI / Core

- **Core:** policy, sicurezza, explainability, decisioni. Produce payload JSON secondo il contratto.
- **Flutter:** riceve DTO, li valida, li mostra. Non interpreta “cosa significhi” un valore (es. non decide livelli di safety).
- **Bridge:** traduce solo struttura (JSON → DTO). Errore esplicito se un campo richiesto manca o ha tipo errato; nessun fallback silenzioso.

## Determinismo strutturale

- Stesso payload TS → stesso DTO Dart → stesso hash → stesso rendering UI.
- L’hash è SHA-256 su rappresentazione canonica (chiavi ordinate, UTF-8). Nessuna dipendenza da tempo, random, ordine di parsing o locale.
- Round-trip: `json → dto → toJson()` deve riprodurre la struttura originale (verificato dai test).

## Versioning dei contratti

- `irisBridgeContractVersion` (in `lib/bridge/contracts/bridge_contract.dart`) identifica il contratto.
- **Forward:** il Core può aggiungere campi opzionali; il client ignora gli sconosciuti.
- **Backward:** rimozione/rinominazione di campi o cambio di tipo = breaking change → bump di versione (es. MAJOR) e documentazione.
- Bump MINOR: nuovi DTO o campi opzionali. Bump PATCH: solo documentazione o chiarimenti non breaking.

## Implicazioni di audit

- Il bridge è **read-only** verso il Core: nessuna modifica, arricchimento o interpretazione.
- DTO immutabili e serializzabili consentono tracciabilità e riproducibilità.
- Hash deterministico permette di verificare che un dato payload corrisponda a un determinato stato UI (stesso hash = stesso contenuto logico).
- Assenza di logica decisionale nel client riduce la superficie di rischio e semplifica la certificazione.

## Struttura

- `lib/bridge/dto/` — DTO immutabili (DecisionTrace, Explanation, Mode, Outcome).
- `lib/bridge/contracts/` — Versione e regole di compatibilità.
- `lib/bridge/mappers/` — `hash_utils.dart` (hash canonico), `dto_mappers.dart` (mapping puri, errori espliciti).
- `test/bridge/` — Serialization, hash determinism, mapper validation.
