# K2 — S3 Adapter Design

## Scopo dell'adapter

L'adapter **CloudStorageAdapterS3** realizza l'interfaccia **CloudStoragePort** (K1) tramite un backend S3-compatible. È il primo binding infrastrutturale reale della Fase K.

- **Posizione**: `lib/flow/infrastructure/adapter/s3/cloud_storage_adapter_s3.dart`
- **Client iniettato**: l'adapter non crea il client; riceve un **S3ClientPort** (astrazione minima) iniettato via costruttore. In produzione si usa **AwsS3ClientAdapter(s3.S3(...))**; in test **InMemoryS3Client**.
- **Responsabilità**: upload/download/delete/list/exists con garanzia byte-identical e ordinamento deterministico di `listObjects`.

---

## Garanzie deterministiche

- **Upload**: il payload viene inviato così com'è (Uint8List); nessuna trasformazione, nessun Content-Type/metadata/cache/checksum lato adapter.
- **Download**: i byte restituiti sono quelli ricevuti dal backend; nessuna conversione di encoding, decompressione o normalizzazione.
- **listObjects**: dopo il recupero delle key dall’SDK, l’adapter le ordina lessicograficamente e restituisce sempre lo stesso ordine a parità di stato del bucket (ordinamento stabile).
- **Nessuna entropia**: nessun UUID, timestamp, random o generazione di chiavi; bucket e key sono usati come forniti dal chiamante.

---

## Limitazioni

- **Nessun retry**: eventuali retry vanno gestiti a livello superiore (es. K5); l’adapter non ritenta in caso di errore.
- **Nessuna cifratura**: nessuna server-side encryption né gestione chiavi.
- **Nessun metadata**: nessun Content-Type, cache-control o custom metadata impostato dall’adapter.
- **Paginazione listObjects**: l’adapter consuma tutti i token di continuazione fino a esaurimento e poi ordina; per bucket molto grandi il comportamento è deterministico ma può richiedere più chiamate.

---

## Configurazione client

Il client S3 **non** è creato dall’adapter.

- **Produzione**: costruire `s3.S3` (aws_s3_api) con region, credentials ed eventuale endpoint (es. MinIO), poi wrapparlo in **AwsS3ClientAdapter** e passarlo a **CloudStorageAdapterS3**.
- **Test**: usare **InMemoryS3Client** (stesso package) per test senza rete.

Esempio produzione:

```dart
final s3 = s3.S3(region: 'us-east-1', endpointUrl: optionalMinioUrl);
final port = AwsS3ClientAdapter(s3);
final adapter = CloudStorageAdapterS3(port);
```

---

## Assenza retry

L’adapter non implementa retry. Ogni errore dell’SDK/client viene mappato in **StorageException** e propagato. La politica di retry (K5) va applicata al di fuori dell’adapter (es. tramite **RetryPolicyPort**).

Se l’SDK S3 ha retry automatici, vanno disabilitati o lasciati in configurazione neutra; l’adapter non aggiunge retry propri.

---

## Assenza entropia

- Nessun timestamp generato dall’adapter.
- Nessun UUID o identificatore generato dall’adapter.
- Nessuna normalizzazione di path, prefix o bucket; bucket e key sono usati in modo identico a come ricevuti.
- Nessuna generazione di checksum o digest da parte dell’adapter.

Il comportamento è deterministico rispetto a input (bucket, key, content) e stato del backend.
