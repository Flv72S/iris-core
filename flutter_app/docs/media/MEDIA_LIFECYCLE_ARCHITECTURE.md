# Media Lifecycle Architecture

## Panoramica

Il **Media Lifecycle Layer** orchestrate il ciclo di vita dei media asset in modo completamente deterministico e provider-agnostic. Questo layer traduce le decisioni di enforcement (FASE F) in **stati e transizioni** senza eseguire alcuna azione fisica.

## Separazione architetturale

```
┌──────────────────────────────────────────────────────────────────┐
│                         FASE G                                   │
│                 Media Governance Extension                       │
│  - MediaStoragePolicy (definizione)                              │
│  - UserTierBinding (mapping tier → policy)                       │
│  - Versioning e deprecazione via GCP                             │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                         FASE H                                   │
│                 Meta-Governance Snapshot                         │
│  - activeMediaPolicyIds                                          │
│  - activeTierBindings                                            │
│  - Immutabile, deterministico                                    │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                         FASE F                                   │
│                 Media Enforcement Layer                          │
│  - MediaReference (riferimento logico)                           │
│  - MediaPolicyReader (lettura snapshot)                          │
│  - MediaEnforcementAdapter → MediaEnforcementDecision            │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    MEDIA LIFECYCLE LAYER                         │
│               (questo documento)                                 │
│  - MediaLifecycleEngine                                          │
│  - MediaLifecyclePlan                                            │
│  - Orchestrazione stati, nessuna azione fisica                   │
└──────────────────────────────────────────────────────────────────┘
```

## Responsabilità

| Layer | Responsabilità | Non fa |
|-------|----------------|--------|
| **G (Governance)** | Definisce policy | Non applica |
| **H (Meta-Gov)** | Ratifica e congela | Non inferisce |
| **F (Enforcement)** | Decide cosa è permesso | Non esegue |
| **Lifecycle** | Pianifica transizioni | Non salva/carica |

## State Machine

```
                    captureCompleted
                          │
                          ▼
                    ┌─────────────┐
                    │  captured   │
                    └──────┬──────┘
                           │ localPersisted
                           ▼
                    ┌─────────────┐
           ┌───────│  localOnly  │───────┐
           │       └──────┬──────┘       │
           │              │              │
  retentionExpired   syncStarted    userDeleted
  /userDeleted            │
           │              ▼
           │       ┌─────────────┐
           │       │   syncing   │────────┐
           │       └──────┬──────┘        │
           │              │               │
           │      uploadSucceeded    uploadFailed
           │              │               │
           │              ▼               │
           │       ┌─────────────┐        │
           │       │ cloudStored │◄───────┘
           │       └──────┬──────┘   (fallback)
           │              │
           │    ┌─────────┴─────────┐
           │    │                   │
           │  archiveCompleted  retentionExpired
           │    │               /userDeleted
           │    ▼                   │
           │ ┌──────────────┐       │
           │ │ coldArchived │       │
           │ └──────┬───────┘       │
           │        │               │
           │  retentionExpired      │
           │  /userDeleted          │
           │        │               │
           ▼        ▼               ▼
        ┌───────────────────────────────┐
        │       pendingDeletion         │
        └───────────────┬───────────────┘
                        │ deletionCompleted
                        ▼
                 ┌─────────────┐
                 │   deleted   │
                 └─────────────┘
```

## Componenti

### MediaLifecycleState

Enum che rappresenta gli stati logici del ciclo di vita:

| Stato | Descrizione |
|-------|-------------|
| `captured` | Media appena catturato, non ancora persistito |
| `localOnly` | Persistito localmente, nessun sync cloud |
| `syncing` | In fase di upload verso cloud |
| `cloudStored` | Memorizzato in cloud (storage attivo) |
| `coldArchived` | Archiviato in cold storage |
| `pendingDeletion` | In attesa di cancellazione |
| `deleted` | Cancellato |

### MediaLifecycleEvent

Eventi dichiarativi che descrivono transizioni:

| Evento | Descrizione |
|--------|-------------|
| `captureCompleted` | Cattura terminata |
| `localPersisted` | Persistenza locale completata |
| `syncStarted` | Avvio sincronizzazione cloud |
| `uploadSucceeded` | Upload completato con successo |
| `uploadFailed` | Upload fallito |
| `archiveCompleted` | Archiviazione cold completata |
| `retentionExpired` | Retention policy scaduta |
| `userDeleted` | Richiesta cancellazione utente |
| `deletionCompleted` | Cancellazione completata |

### MediaLifecycleTransition

Value object immutabile che rappresenta una singola transizione:

```dart
class MediaLifecycleTransition {
  final MediaLifecycleState from;
  final MediaLifecycleState to;
  final MediaLifecycleEvent event;
}
```

### MediaLifecyclePlan

Descrive il percorso completo consentito per un media:

```dart
class MediaLifecyclePlan {
  final MediaLifecycleState initial;
  final List<MediaLifecycleTransition> transitions;
  
  bool get allowsCloud;
  bool get includesArchive;
  MediaLifecycleState get terminalState;
}
```

### MediaLifecycleEngine

Costruisce il plan basandosi esclusivamente su `MediaEnforcementDecision`:

```dart
class MediaLifecycleEngine {
  MediaLifecyclePlan buildPlan(
    MediaReference media,
    MediaEnforcementDecision decision,
  );
}
```

**Regole di derivazione:**

| Condizione | Risultato |
|------------|-----------|
| `decision.localOnly == true` | Nessuna transizione cloud |
| `decision.cloudAllowed == true` | Include `syncing → cloudStored` |
| `decision.coldArchiveAllowed == true` | Include `cloudStored → coldArchived` |
| Sempre | Include path verso `deleted` |

## Esempio completo

### Input

```dart
// MediaReference
const media = MediaReference(
  hash: 'sha256:a1b2c3d4...',
  sizeBytes: 52428800,  // 50 MB
  mimeType: 'video/mp4',
  mediaPolicyId: 'MEDIA_PRO_V2',
  location: PhysicalLocation.localDevice,
);

// MediaEnforcementDecision (da FASE F)
const decision = MediaEnforcementDecision(
  uploadAllowed: true,
  localOnly: false,
  cloudAllowed: true,
  compressionRequired: false,
  coldArchiveAllowed: true,
  multiDeviceSyncAllowed: true,
  maxFileSizeBytes: 104857600,  // 100 MB
);
```

### Output

```dart
// MediaLifecyclePlan generato
MediaLifecyclePlan(
  initial: captured,
  transitions: [
    captured --[localPersisted]--> localOnly,
    localOnly --[syncStarted]--> syncing,
    syncing --[uploadSucceeded]--> cloudStored,
    syncing --[uploadFailed]--> localOnly,
    cloudStored --[archiveCompleted]--> coldArchived,
    coldArchived --[retentionExpired]--> pendingDeletion,
    coldArchived --[userDeleted]--> pendingDeletion,
    pendingDeletion --[deletionCompleted]--> deleted,
  ]
)
```

### Scenario local-only (tier FREE)

```dart
// MediaEnforcementDecision per tier FREE
const freeDecision = MediaEnforcementDecision(
  uploadAllowed: false,
  localOnly: true,
  cloudAllowed: false,
  compressionRequired: true,
  coldArchiveAllowed: false,
  multiDeviceSyncAllowed: false,
  maxFileSizeBytes: 0,
);

// Plan risultante
MediaLifecyclePlan(
  initial: captured,
  transitions: [
    captured --[localPersisted]--> localOnly,
    localOnly --[retentionExpired]--> pendingDeletion,
    localOnly --[userDeleted]--> pendingDeletion,
    pendingDeletion --[deletionCompleted]--> deleted,
  ]
)
```

## Vincoli architetturali

### Divieti assoluti

- **NO** modifiche a F, G, H
- **NO** decisioni autonome
- **NO** dipendenze da filesystem, cloud SDK, IO
- **NO** uso di DateTime, Random, Timer
- **NO** path fisici, URL, endpoint
- **NO** logica normativa o di enforcement

### Garanzie

- **Determinismo**: stessi input → stesso plan
- **Immutabilità**: plan e transitions sono immutabili
- **Provider-agnostic**: nessun riferimento a vendor specifici
- **Auditabilità**: ogni transizione è tracciabile

## Test coverage

| Test | Verifica |
|------|----------|
| Determinism | Stessi input → stesso plan |
| Local-only | Nessuna transizione cloud |
| Cloud-enabled | Presenza syncing/cloudStored |
| Retention/Archive | Presenza coldArchived/pendingDeletion |
| Forbidden guard | Assenza pattern vietati |
| Immutability | Liste non modificabili |

## Prossimi passi

Questo layer definisce **cosa può accadere**. L'implementazione fisica (device storage, cloud upload, cold archive) sarà costruita sopra questo contratto stabile in un layer separato.

```
Media Lifecycle Layer (questo documento)
         │
         ▼
┌─────────────────────────────────────┐
│     FUTURO: Physical Media Layer    │
│  - Device storage adapter           │
│  - Cloud provider adapter           │
│  - Archive provider adapter         │
│  - Implementa le transizioni        │
└─────────────────────────────────────┘
```
