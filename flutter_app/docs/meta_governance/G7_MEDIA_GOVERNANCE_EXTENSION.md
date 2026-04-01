# G7 — Media Governance Extension

Estensione strutturale dichiarativa per le Media Storage Policy (Free / Pro / Enterprise). Nessuna modifica al Core; nessun enforcement runtime; solo metadati governati e versionabili.

---

## Motivazione architetturale

Le policy di storage (limiti, retention, compressione, sync) devono essere:

- **Versionate** e **ratificabili** come il resto della governance.
- **Non modificabili** senza GCP e attivazione tramite GovernanceActivationEngine.
- **Tracciabili** negli snapshot (H6) e nella provenance (H8).
- **Deterministiche**: nessuna risoluzione dinamica in fase di attivazione.

G7 introduce il dominio **media_governance** senza dipendenze da provider cloud o SDK.

---

## Posizionamento in Fase G

G7 è un’estensione della governance (Fase G), non del runtime. Si appoggia a:

- **H5**: GovernanceRegistry e GovernanceActivationEngine (unico punto di attivazione; no bypass).
- **H6**: GovernanceSnapshot (estensione con `activeMediaPolicyIds`).
- **H2**: GCP con scope `mediaStoragePolicy` per Creation / Update / Deprecation.

---

## Integrazione con Fase H

- **Attivazione**: solo tramite GovernanceActivationEngine; nessuna registrazione diretta.
- **Snapshot**: ogni snapshot può includere `activeMediaPolicyIds` (lista di id policy attive).
- **Protezione downgrade**: invariata; nessuna versione inferiore attivabile.
- **GCP**: scope `GCPScope.mediaStoragePolicy`; tipi di modifica: MediaPolicyCreation, MediaPolicyUpdate, MediaPolicyDeprecation.

---

## Modello di versioning

- **MediaStoragePolicy** ha `id` e `version` (stringa); confronto versioni tramite `MediaStoragePolicy.compareVersions`.
- **UserTierBinding** mappa un tier (FREE / PRO / ENTERPRISE) a un `mediaPolicyId`; è versionabile e ratificabile via GCP.
- Le policy sono **immutabili**; ogni modifica effettiva è una nuova versione attivata con il ciclo GCP → Ratifica → Activation.

---

## Flusso di ratifica

1. Proposta GCP con scope `mediaStoragePolicy` e tipo (creation / update / deprecation).
2. Impact analysis e decisione come per ogni altro scope.
3. Ratifica APPROVED.
4. Attivazione tramite GovernanceActivationEngine (nessun registro diretto).
5. Snapshot aggiornato con `activeMediaPolicyIds` (e, se previsto, tier bindings).

---

## Integrazione snapshot

- **GovernanceSnapshot** espone `activeMediaPolicyIds: List<String>` (default `[]`) e `activeTierBindings: List<UserTierBinding>` (default `[]`).
- Compatibilità indietro: snapshot costruiti senza i parametri restano validi (liste vuote).
- Hash e uguaglianza sono deterministici includendo `activeMediaPolicyIds` e `activeTierBindings`.

---

## Snapshot Tier Binding Embedding

**Motivazione forense**: Lo snapshot H6 deve rappresentare in modo completo lo stato governato al momento dell’attivazione. Includere i tier binding nello snapshot garantisce che, in sede di audit o replay, sia possibile ricostruire quale policy media era associata a ogni tier (FREE / PRO / ENTERPRISE) senza dipendenze runtime o risoluzioni dinamiche.

**Allineamento con H6**: Il campo `activeTierBindings` è un’estensione strutturale dello snapshot: stesso contratto immutabile, nessun timestamp aggiuntivo, nessuna dipendenza esterna. Il builder (`GovernanceSnapshotBuilder.build`) accetta il parametro opzionale `activeTierBindings`; in assenza, viene usata la lista vuota. L’ordine della lista è normalizzato (tier, poi `mediaPolicyId`) in fase di costruzione, così che due snapshot con gli stessi binding in ordine diverso risultino uguali e con lo stesso hashCode.

**Impatto su determinismo**: La lista in snapshot è immutabile e ordinata in modo deterministico (prima per `UserTier` ordinale, poi per `mediaPolicyId`). Stessi binding → stesso snapshot → stesso hash. Nessun elemento variabile o dipendente dal tempo è introdotto.

**Esempio snapshot con policy e binding**:
- `activeMediaPolicyIds`: `['MEDIA_FREE_V1', 'MEDIA_PRO_V1', 'MEDIA_ENTERPRISE_V1']`
- `activeTierBindings`: `[UserTierBinding(free, MEDIA_FREE_V1), UserTierBinding(pro, MEDIA_PRO_V1), UserTierBinding(enterprise, MEDIA_ENTERPRISE_V1)]`
- Serializzazione: in `toJson()` è esposto `activeTierBindingsCount`; i singoli binding sono serializzabili tramite `UserTierBinding.toJson()`.

---

## Modello binding tier

- **UserTier** (FREE, PRO, ENTERPRISE) e **UserTierBinding(tier, mediaPolicyId)**.
- Il tier non è la policy: è un mapping verso una MediaStoragePolicy versionata.
- Il binding è versionabile e ratificabile ed è **incluso nello snapshot** tramite `activeTierBindings`.

---

## Esempi concreti

### MEDIA_FREE_V1

- id: `MEDIA_FREE_V1`
- version: `1.0.0`
- storageMode: DEVICE_ONLY
- maxFileSizeMB: 10
- retentionPolicy: LOCAL_ONLY
- compressionRequired: true
- multiDeviceSync: false
- coldArchiveEnabled: false

### MEDIA_PRO_V1

- id: `MEDIA_PRO_V1`
- version: `1.0.0`
- storageMode: CLOUD
- maxFileSizeMB: 100
- retentionPolicy: DAYS_LIMITED(365)
- compressionRequired: true
- multiDeviceSync: true
- coldArchiveEnabled: false

### MEDIA_ENTERPRISE_V1

- id: `MEDIA_ENTERPRISE_V1`
- version: `1.0.0`
- storageMode: TIERED
- maxFileSizeMB: 1024
- retentionPolicy: CONFIGURABLE
- compressionRequired: true
- multiDeviceSync: true
- coldArchiveEnabled: true

---

## Evoluzione policy (upgrade)

1. Nuova policy MEDIA_PRO_V2 con parametri aggiornati.
2. GCP con MediaPolicyUpdate che riferisce da V1 a V2.
3. Impact, Decision, Ratification, Activation.
4. Snapshot successivo include `MEDIA_PRO_V2` in `activeMediaPolicyIds` (e il tier PRO punta a MEDIA_PRO_V2).

---

## Deprecazione

1. GCP con MediaPolicyDeprecation per una policy id.
2. Dopo ratifica e attivazione, la policy non è più inclusa negli snapshot successivi (o è marcata deprecata nel modello esteso).
3. Nessuna mutazione diretta: solo nuovo stato governato.

---

*Documentazione tecnica G7. Nessuna integrazione cloud; nessun enforcement runtime; solo governance metadata.*
