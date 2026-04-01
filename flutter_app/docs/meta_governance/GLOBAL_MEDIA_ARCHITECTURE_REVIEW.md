# Global Media Architecture Review — F + G + H

**Data**: 2026-02-19  
**Stato**: REVIEW COMPLETATA  
**Esito**: CONFORME con gap identificati

---

## 1. Scopo

Verifica formale della coerenza architetturale del **Media Layer di IRIS** attraverso:
- FASE F — Flow Runtime
- FASE G — Governance
- FASE H — Meta-Governance

---

## 2. Principi architetturali verificati

### 2.1 Separation of Concerns

| Layer | Responsabilità | Stato |
|-------|---------------|-------|
| Governance (G) | Definisce le regole | ✅ Conforme |
| Meta-Governance (H) | Ratifica e congela | ✅ Conforme |
| Flow (F) | Applica senza inferire | ⚠️ Gap identificato |
| Core | Non conosce storage fisico | ✅ Conforme |

### 2.2 No Physical Media in Core

**Verifica eseguita**: grep su `core_freeze/` per pattern `storage|cloud|filesystem|path.*file`

**Risultato**: Nessun riferimento a storage fisico nel Core.  
Unici match sono commenti espliciti tipo `"no IO, no filesystem"`.

---

## 3. FASE G — Media Governance Extension

### 3.1 Artefatti implementati

| Artefatto | Path | Stato |
|-----------|------|-------|
| `MediaStoragePolicy` | `lib/meta_governance/extensions/media_governance/media_storage_policy.dart` | ✅ |
| `StorageMode` | `lib/meta_governance/extensions/media_governance/storage_mode.dart` | ✅ |
| `RetentionPolicy` | `lib/meta_governance/extensions/media_governance/retention_policy.dart` | ✅ |
| `UserTierBinding` | `lib/meta_governance/extensions/media_governance/user_tier_binding.dart` | ✅ |
| `MediaPolicyChangeKind` | `lib/meta_governance/extensions/media_governance/media_policy_change_kind.dart` | ✅ |
| GCP Scope | `GCPScope.mediaStoragePolicy` | ✅ |

### 3.2 Vincoli verificati

| Vincolo | Verifica | Stato |
|---------|----------|-------|
| Nessuna policy hardcoded | grep `hardcode.*policy` | ✅ Nessun match |
| Ogni modifica passa da GCP | Code review | ✅ Solo GCPScope |
| Nessuna attivazione senza ratifica | Activation engine | ✅ Solo APPROVED |
| Policy immutabile | `const` constructor, no setters | ✅ |
| Nessun riferimento cloud/SDK | grep `cloud|aws|gcp|azure` | ✅ Nessun match |

### 3.3 Conformità

```
FASE G: ✅ CONFORME
- MediaStoragePolicy è metadata-only
- StorageMode è enum logico (deviceOnly/cloud/tiered), non fisico
- Nessuna logica runtime
- Versioning semantico implementato
```

---

## 4. FASE H — Meta-Governance Media Control

### 4.1 Snapshot structure

```dart
// GovernanceSnapshot include:
final List<String> activeMediaPolicyIds;        // ✅ Implementato
final List<UserTierBinding> activeTierBindings; // ✅ Implementato
```

### 4.2 Garanzie verificate

| Garanzia | Implementazione | Test | Stato |
|----------|-----------------|------|-------|
| Snapshot autosufficiente | Tutti i dati in snapshot | snapshot_*_test.dart | ✅ |
| Ordinamento deterministico | `_sortedTierBindings` | snapshot_determinism_test.dart | ✅ |
| Immutabilità completa | `List.unmodifiable` | snapshot_immutability_test.dart | ✅ |
| Hash stabile | `Object.hash` + sorted | snapshot_embedding_test.dart | ✅ |
| Attivazione controllata | Solo via Engine | no_direct_injection_test.dart | ✅ |
| Protezione downgrade | `GovernanceDowngradeAttemptException` | downgrade_protection_media_test.dart | ✅ |

### 4.3 Conformità

```
FASE H: ✅ CONFORME
- Snapshot include activeMediaPolicyIds e activeTierBindings
- Determinismo verificato con 112 test
- Nessun timestamp non deterministico aggiunto
- Hash stabile per stessi input
```

---

## 5. FASE F — Flow Runtime Enforcement

### 5.1 Struttura esistente

| Componente | Path | Stato |
|------------|------|-------|
| `FlowPolicyEngine` | `lib/flow_policy/flow_policy_engine.dart` | ✅ Esiste |
| `FlowCoreContract` | `lib/flow_boundary/flow_core_contract.dart` | ✅ Read-only |
| `ForbiddenCoreOperations` | `lib/flow_boundary/forbidden_core_operations.dart` | ✅ Enforcement |

### 5.2 Gap identificati

| Gap | Descrizione | Priorità |
|-----|-------------|----------|
| **MediaReference** | Value object per riferimento logico a media non esiste | Alta |
| **GovernanceSnapshotReader** | Flow non legge ancora snapshot governance per media | Alta |
| **MediaPolicyEnforcer** | Manca adapter che applica policy da snapshot a operazioni media | Alta |
| **PhysicalLocation enum** | Enum logico per location non definito in Flow | Media |

### 5.3 Conformità

```
FASE F: ⚠️ PARZIALMENTE CONFORME
- Boundary read-only: ✅
- Forbidden operations: ✅
- Policy engine esiste: ✅
- Consumo snapshot media: ❌ NON IMPLEMENTATO
- MediaReference: ❌ NON IMPLEMENTATO
```

---

## 6. MediaReference — Contratto proposto

### 6.1 Definizione

```dart
/// Riferimento logico a media. No path fisici; no URL; no endpoint.
class MediaReference {
  const MediaReference({
    required this.hash,
    required this.sizeBytes,
    required this.mimeType,
    required this.storagePolicyId,
    required this.physicalLocation,
  });

  final String hash;              // sha256:...
  final int sizeBytes;
  final String mimeType;
  final String storagePolicyId;   // es. MEDIA_PRO_V2
  final PhysicalLocation physicalLocation;
}

enum PhysicalLocation {
  localDevice,
  cloud,
  archive,
}
```

### 6.2 Vincoli architetturali

- `physicalLocation` è **descrittivo**, non operativo
- Nessun `path`, `url`, `endpoint`, `bucket`
- Nessuna logica di storage in Core
- Solo metadata governato

---

## 7. Anti-pattern verificati

| Anti-pattern | Verifica | Risultato |
|--------------|----------|-----------|
| Flow che decide retention | Code review FlowPolicyEngine | ✅ Non presente |
| Core che salva file | grep storage/cloud in core_freeze | ✅ Non presente |
| Governance che accede a runtime | Code review meta_governance | ✅ Non presente |
| Snapshot con timestamp non deterministici | Analisi GovernanceSnapshot | ✅ Solo `capturedAt` da ratification |
| Policy duplicate nel Flow | grep policy in flow_policy | ✅ Non presente |

---

## 8. Checklist di conformità

| # | Criterio | Stato |
|---|----------|-------|
| 1 | Core ignaro dello storage | ✅ |
| 2 | Flow applica solo snapshot | ⚠️ Da implementare |
| 3 | Governance unica fonte di verità | ✅ |
| 4 | Snapshot autosufficiente | ✅ |
| 5 | Nessuna logica media hardcoded | ✅ |
| 6 | MediaReference senza path fisici | ⚠️ Da implementare |
| 7 | Tier binding nello snapshot | ✅ |
| 8 | Protezione downgrade invariata | ✅ |

---

## 9. Roadmap per completamento

### 9.1 Fase F — Media Enforcement Layer

```
1. Creare lib/flow_media/
   ├── media_reference.dart           # Value object
   ├── physical_location.dart         # Enum logico
   ├── media_policy_reader.dart       # Legge snapshot governance
   └── media_enforcement_adapter.dart # Applica policy

2. Integrare con FlowPolicyEngine
   - Aggiungere valutazione policy media
   - Nessuna deduzione di regole
   - Solo allow/block basato su snapshot
```

### 9.2 Test richiesti

```
test/flow_media/
├── media_reference_immutability_test.dart
├── media_policy_reader_test.dart
├── media_enforcement_no_inference_test.dart
└── media_no_physical_path_test.dart
```

---

## 10. Conclusione

### Stato finale

| Fase | Conformità | Note |
|------|------------|------|
| **G** | ✅ 100% | Implementazione completa |
| **H** | ✅ 100% | Snapshot allineato con G7 |
| **F** | ⚠️ ~60% | Manca layer media enforcement |

### Decisione

- **G + H**: Pronti per production
- **F Media**: Richiede implementazione dedicata prima del Media Lifecycle

### Riferimenti

- `docs/meta_governance/G7_MEDIA_GOVERNANCE_EXTENSION.md`
- `lib/meta_governance/extensions/media_governance/`
- `lib/meta_governance/snapshot/governance_snapshot.dart`
- `lib/flow_boundary/flow_core_contract.dart`

---

*Documento di controllo architetturale. Riferimento ufficiale per Media Lifecycle Architecture.*
