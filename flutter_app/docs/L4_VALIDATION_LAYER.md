# L4 — Validation Layer

## Perché la validazione è separata dal service

La validazione L4 è **pre-esecuzione** e **puramente strutturale**: verifica che una `SignedOperationRequest` rispetti invarianti sintattiche e coerenza dei campi **prima** che il `SignedOperationService` (L3) costruisca l’envelope e invochi l’orchestrator.

Separare il validator dal service permette di:

- **Fallire in fretta**: richieste malformate non arrivano mai a L3 né a K.
- **Mantenere L3 “stupido”**: il service non deve interpretare campi vuoti o incoerenti; riceve solo richieste già validate.
- **Aggregare errori in modo deterministico**: ordine fisso di verifica, nessuna eccezione, lista di errori immutabile.
- **Evitare side effect**: il validator non modifica la request, non accede a storage/crypto/orchestrator, non lancia eccezioni.

L4 non sostituisce la verifica della firma crittografica (che resta in K o in layer dedicati); garantisce solo che la richiesta sia strutturalmente valida per essere processata.

---

## Differenza tra validation e business rule

| L4 (Validation) | Business rule (non in L4) |
|-----------------|----------------------------|
| operationId / resourceId non vuoti e non solo whitespace | operationId in formato UUID o schema specifico |
| payload non vuoto | payload conforme a uno schema JSON o dimensione massima |
| signature.signatureBytes non vuoto, algorithm non vuoto | firma crittograficamente valida |
| metadata con chiavi non vuote | autorizzazioni, ownership, policy |

L4 verifica **solo** integrità strutturale e invarianti sintattiche. Regole di dominio (autorizzazioni, formato UUID, lunghezze massime, schema) non fanno parte di L4 e vanno gestite altrove (es. L7 per idempotenza, layer di autorizzazione, ecc.).

---

## Perché la firma NON viene validata qui

La **validazione della firma** (verifica crittografica che i bytes siano stati firmati correttamente) richiede:

- accesso a chiavi/certificati o a un servizio di verifica (infrastruttura),
- logica crittografica (crypto),
- possibili side effect (chiamate esterne).

L4 deve restare **puro** e **deterministico**: nessuna dipendenza da orchestrator, serializer, storage, lock, retry, crypto, cloud, UI. Quindi L4 si limita a controllare che:

- `signature.signatureBytes` non sia vuoto,
- `signature.metadata.algorithm` non sia vuoto,

senza interpretare il contenuto né verificare la firma. La verifica crittografica resta responsabilità di K o di un layer dedicato a valle.

---

## Determinismo e assenza di side effect

- **Ordine di verifica fisso**: operationId → resourceId → payload → signature (bytes, algorithm) → metadata (chiavi). Gli errori sono restituiti in questo ordine.
- **Nessuna mutazione**: la request non viene modificata; il validator non scrive su nessuna risorsa condivisa.
- **Nessuna eccezione**: il risultato è sempre un `ValidationResult` (valid o invalid con lista di errori). Il chiamante decide se procedere o meno.
- **Nessun uso di DateTime, Random, UUID**: nessuna entropia a runtime; stesso input → stesso output.

---

## Come L4 prepara L7 (idempotency guard)

L7 (Idempotency Guard) si baserà su richieste strutturalmente coerenti: stessi campi (operationId, resourceId, payload, signature, metadata) producono la stessa forma canonica e quindi la stessa chiave idempotente. Se L4 non garantisse coerenza (es. operationId vuoto o metadata con chiavi vuote), la serializzazione canonica o la chiave idempotente potrebbero essere ambigue o instabili. L4 assicura che solo richieste “ben formate” entrino nel flusso, riducendo il rischio di ambiguità in L7.

---

## Componenti

- **ValidationError**: `code`, `message`; immutabile; nessuna logica, nessun mapping a eccezioni.
- **ValidationResult**: `isValid`, `errors` (lista immutabile); factory `valid()` e `invalid(errors)`.
- **SignedOperationValidator**: `validate(SignedOperationRequest request)` → `ValidationResult`; verifica solo integrità strutturale e invarianti sintattiche in ordine deterministico.

---

## Posizionamento

- **Percorso**: `lib/flow/application/validation/`
- **Dipendenze consentite**: `SignedOperationRequest` (L3), modelli L1 (tramite request), `dart:core`.
- **Vietato**: orchestrator (K), serializer (L2), storage, lock, retry, crypto, cloud, UI.
