# L1 — Operation Envelope Model

## Scopo del modello

**OperationEnvelope** è il primo modello applicativo della Fase L. Rappresenta un’**operazione applicativa completa**, già firmata e pronta per essere validata o persistita. Non contiene logica di dominio né genera identificatori o timestamp: tutti i dati (incluso `operationId`) sono forniti dall’esterno.

## Differenza tra OperationEnvelope e SignedPayload

- **SignedPayload** (porta di infrastruttura, Fase K): incapsula solo **bytes della firma** e **metadata della firma** (signer, algorithm, attributi). È il tipo con cui il dominio dell’infrastruttura espone un payload firmato.
- **OperationEnvelope**: è un **contratto applicativo** che combina:
  - identificatori applicativi (`operationId`, `resourceId`),
  - il **payload** dell’operazione (bytes),
  - un **SignedPayload** (firma già prodotta),
  - **metadata applicativi** (OperationEnvelopeMetadata).

Quindi: `SignedPayload` è “firma + metadati firma”; `OperationEnvelope` è “operazione completa (id, risorsa, payload, firma, metadati applicativi)” senza logica di validazione o persistenza.

## Responsabilità applicativa

- Definire la **forma** di un’operazione pronta per il flusso (validazione, persistenza, ecc.).
- Garantire **invarianti strutturali** (id non vuoti, payload e firma non vuoti).
- Garantire **immutabilità** e **uguaglianza deterministica** (nessuna dipendenza da collezioni non ordinabili).

Non è responsabilità di L1: serializzazione (L2), servizi (L3), validazione (L4), storage, lock, retry, verifica della firma.

## Invarianti strutturali

Nel costruttore di `OperationEnvelope` vengono verificati solo invarianti **strutturali** (assert):

- `operationId.trim().isNotEmpty`
- `resourceId.trim().isNotEmpty`
- `payload.isNotEmpty`
- `signature.signatureBytes.isNotEmpty`

Non viene eseguita alcuna **verifica della firma** (né crittografica né semantica); quella spetta ad altri livelli.

## Garanzia di immutabilità

- Tutti i campi sono `final` e obbligatori.
- Il **payload** viene memorizzato come **copia difensiva** non modificabile (`List<int>.unmodifiable(List<int>.from(payload))`): la lista originale non è conservata né esposta; modifiche successive alla lista passata al costruttore non influenzano l’envelope; il getter `payload` restituisce una lista non modificabile.
- **OperationEnvelopeMetadata** riceve una **copia difensiva** della mappa `attributes` e la espone come **mappa non modificabile** (`Map.unmodifiable`), così:
  - modifiche alla mappa originale dopo la costruzione non influenzano l’envelope;
  - chi legge `metadata.attributes` non può mutarla.

`OperationEnvelope` non espone metodi che modificano stato.

## Motivazione dell’assenza di copyWith

L’envelope è **semanticamente immutabile**: rappresenta un’operazione completa e firmata in un dato istante. Fornire `copyWith` incoraggerebbe la creazione di “varianti” dello stesso envelope e introdurrebbe ambiguità su quale sia l’istanza canonica. Per creare un nuovo envelope con dati diversi si costruisce una nuova istanza con tutti i campi richiesti. L1 si limita al modello; eventuali helper di costruzione (se necessari) saranno introdotti in step successivi senza alterare l’immutabilità del tipo.

## Posizionamento

- **Percorso**: `lib/flow/application/model/`
- **Dipendenze ammesse**: modelli puri, tipi della porta di firma (`SignedPayload`, `SignatureMetadata`). Nessuna dipendenza da adapter di infrastruttura, storage, lock, retry, cloud, UI o Core.
