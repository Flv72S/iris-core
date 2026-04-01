# K3 — Infrastructure Validation Report

## Elenco test implementati

Suite: **test/flow/infrastructure/integration/cloud_storage_integration_test.dart**

| # | Gruppo | Test | Descrizione |
|---|--------|------|-------------|
| 1 | End-to-End Byte Identity | small UTF-8 payload | Upload/download stringa UTF-8; lunghezza e contenuto identici. |
| 1 | End-to-End Byte Identity | static binary payload | Sequenza binaria deterministica (no Random runtime); byte identici. |
| 1 | End-to-End Byte Identity | 5MB payload | Payload 5MB; upload/download byte-identical. |
| 2 | Repeated Upload Determinism | same payload twice | Stesso payload caricato due volte, download dopo ciascuno; byte identici. |
| 3 | listObjects Deterministic Stability | same prefix, 3 calls | Più oggetti con stesso prefix; listObjects eseguito 3 volte; ordine lessicografico e identico. |
| 4 | Delete Semantics | upload → exists → delete → exists false | Upload → objectExists true → delete → objectExists false; download dopo delete restituisce lista vuota. |
| 5 | Exception Mapping Stability | FaultyS3Client | Client che lancia su put/get/head/delete/list; adapter lancia StorageException; cause preservata. |
| 6 | No Core Dependency Guard | scan adapter dir | Nessun import iris.core, persistence, replay, hash in lib/flow/infrastructure/adapter/. |
| 7 | No Entropy Verification | static scan | Nessun DateTime.now(), Uuid(), Random(), .now(), Random( nei file adapter. |
| 8 | Adapter Isolation | CloudStorageAdapterS3 imports | Dipende solo da CloudStoragePort, S3ClientPort, StorageException; nessun ReplayEngine, PersistencePort, HashEngine, ForensicExportService, DeterministicHashEngine. |

Support file: **test_support/faulty_s3_client.dart** — client che implementa S3ClientPort e lancia su ogni operazione per test di exception mapping.

---

## Garanzie validate

- **Determinismo infrastrutturale**: stesso input → stesso output; nessuna trasformazione su upload/download; listObjects ordinato e stabile.
- **Isolamento dal Core**: nessuna dipendenza da iris.core, persistence, replay, hash.
- **Stabilità byte-level**: payload piccolo, binario statico e 5MB verificati identici dopo round-trip.
- **Assenza entropia**: nessun DateTime.now(), UUID, Random o timestamp generato nei file adapter.
- **Coerenza semantica**: delete → exists false; download dopo delete restituisce []; eccezioni client mappate in StorageException con cause preservata.

---

## Ambiente utilizzato

- **InMemoryS3Client**: client in-memory che implementa S3ClientPort; nessuna rete, nessun bucket reale.
- **FaultyS3Client**: client che lancia un’eccezione custom su ogni chiamata (putObject, getObject, headObject, deleteObject, listObjectsV2).
- Nessuna credenziale reale, nessun endpoint S3 reale, nessun uso di rete.

---

## Limiti

- **No rete reale**: tutti i test usano InMemoryS3Client o FaultyS3Client; non viene validato un backend S3/MinIO reale.
- **Delete + download**: con il contratto attuale (download restituisce lista vuota se oggetto assente), dopo delete il download restituisce `[]`; non viene lanciata StorageException (comportamento conforme alla port).
- **Coverage**: per raggiungere ≥ 95% sul modulo adapter è necessario eseguire `flutter test --coverage` e verificare la report su lib/flow/infrastructure/adapter/.

---

## Stato determinismo verificato

- **Byte identity**: verificato per UTF-8, binario statico e 5MB.
- **Repeated upload**: stesso payload due volte → stessi byte in download.
- **listObjects**: ordine lessicografico e identico su tre chiamate consecutive.
- **Exception mapping**: FaultyS3Client → solo StorageException esposta; nessuna eccezione SDK o custom propagata al chiamante; cause preservata internamente.

K3 risulta **completato** con tutti i test implementati e passanti.
