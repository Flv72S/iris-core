# Phase 11.6.1 — Forensic Export Bundle

## Esportazione deterministica e verificabile del log IRIS UI

Il bundle è un **file esportabile** (.irisbundle.json) che contiene solo dati (nessun codice), è deterministico, verificabile via hash e consente il replay completo. Non modifica lo store; è riproducibile byte-per-byte.

## Differenza export vs backup

- **Backup:** copia di stato o file per ripristino; può essere opaco o proprietario; non necessariamente verificabile.
- **Export forense:** snapshot immutabile del log in formato canonico (JSON), con hash esplicito. Ogni bundle è autoverificabile (ricalcolo hash su contenuto) e riproducibile (stesso store → stesso file). Destinato a certificazione, compliance e audit esterno.

Il bundle non è un backup dell’app; è l’esportazione del **log decisionale** in forma leggibile e verificabile fuori dall’app.

## Valore regolatorio

- **Auditability esternalizzata:** un revisore può ricevere il file .irisbundle.json, verificare l’hash e riprodurre lo stato (ReplayTraceStore + TimeContext) senza eseguire l’app. La prova è il file stesso.
- **Chain-of-custody:** il file è immutabile (append-only source); l’hash permette di dimostrare che il contenuto non è stato alterato dopo l’export.
- **Riproducibilità esterna:** qualsiasi strumento che implementi la stessa logica di parsing e reidratazione può ricostruire lo stesso stato a partire dal bundle.

## Componenti

- **ForensicBundle:** immutabile; contiene bundleVersion, appVersion, exportedAtLogicalTime (LogicalTime, no wall-clock), sessionId, records (lista PersistenceRecord), bundleHash (SHA-256 su JSON canonico del contenuto). fromJson per caricamento da file.
- **ForensicBundleBuilder:** build(store): loadAll(), validazione completa tramite rehydrateFromRecords (throw su record invalido), costruzione contenuto, calcolo hash, restituzione bundle. Non scrive sullo store.
- **ForensicBundleSerializer:** toCanonicalJson(bundle) (mappa con chiavi in ordine deterministico), toCanonicalJsonString(bundle) (UTF-8), verifyHash(bundle). Ordine: chiavi JSON ordinate; record in ordine di append.
- **ForensicBundleWriter:** write(bundle, filePath): serializzazione canonica, scrittura atomica (temp + rename), formato .irisbundle.json, UTF-8. Nessuna compressione né cifratura in questo step. Non decide la destinazione (path fornito dal chiamante).

## Vincoli

- Read-only assoluto; nessuna mutazione dello store; nessun DateTime/Random; nessun ordine implicito; JSON canonico; hash espliciti e verificabili.
