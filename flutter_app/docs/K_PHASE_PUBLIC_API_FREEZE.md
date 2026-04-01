# K Phase — Public API Freeze

## Dichiarazione

**Da questo punto, modifiche breaking alle API sotto elencate richiedono una nuova major phase (es. Fase L o versioning semantico major).**

Le port e i contratti sotto sono considerati **immutabili** per compatibilità; eventuali estensioni devono essere additive (nuovi metodi opzionali, nuovi tipi senza rimozione di esistenti).

---

## Port pubbliche (contratti immutabili)

| Port | File | Metodi / Contratto |
|------|------|--------------------|
| **DistributedLockPort** | port/distributed_lock_port.dart | acquireLock(lockKey), releaseLock(lockKey), tryAcquireLock(lockKey, timeout) |
| **RetryPolicyPort** | port/retry_policy_port.dart | executeWithRetry&lt;T&gt;(operation) |
| **CloudStoragePort** | port/cloud_storage_port.dart | uploadObject(bucket, key, content), downloadObject(bucket, key), objectExists, deleteObject, listObjects |
| **SignaturePort** | port/signature/signature_port.dart | sign(payload, metadata) → SignedPayload, verify(payload, signature) → SignatureVerificationResult |
| **NodeIdentityProvider** | port/node_identity_provider.dart | getNodeId() → String |
| **S3ClientPort** | adapter/s3/s3_client_port.dart | (interno S3) getObject, putObject, listObjects, deleteObject |

---

## Adapter pubblici (implementazioni sostituibili)

| Adapter | Port implementata | File |
|---------|-------------------|------|
| InMemoryDistributedLockAdapter | DistributedLockPort | adapter/lock/distributed_lock_adapter.dart |
| ExponentialBackoffRetryPolicyAdapter | RetryPolicyPort | adapter/retry/retry_policy_adapter.dart |
| CloudStorageAdapterS3 | CloudStoragePort | adapter/s3/cloud_storage_adapter_s3.dart |
| DeterministicSignatureAdapter | SignaturePort | adapter/signature/deterministic_signature_adapter.dart |
| VersionedDeterministicSignatureAdapter | SignaturePort | adapter/signature/key_management/versioned_deterministic_signature_adapter.dart |
| FileBasedNodeIdentityProvider | NodeIdentityProvider | adapter/node_identity/node_identity_provider.dart |
| FileBasedSigningKeyProvider | SigningKeyProvider | adapter/signature/key_management/file_based_signing_key_provider.dart |
| InfrastructureOrchestrator | (orchestrator) | composition/infrastructure_orchestrator.dart |

---

## Classi esposte (value types / DTO)

| Classe | File | Uso |
|--------|------|-----|
| InfrastructureException (e sottotipi) | port/infrastructure_exception.dart | StorageException, LockException, RetryException, NodeIdentityException |
| SignatureMetadata | port/signature/signature_metadata.dart | signerId, algorithm, attributes |
| SignedPayload | port/signature/signed_payload.dart | signatureBytes, metadata |
| SignatureVerificationResult | port/signature/signature_verification_result.dart | valid(), invalid(failureReason) |
| InfrastructureOperationContext | composition/infrastructure_operation_context.dart | operationId, resourceId |
| InfrastructureCompositionException | composition/infrastructure_exceptions.dart | Wrapping errori composizione |
| SigningKey | adapter/signature/key_management/signing_key_provider.dart | version, keyBytes |
| SigningKeyProvider | adapter/signature/key_management/signing_key_provider.dart | getActiveKey(), getKeyByVersion(version) |

---

## Versioni chiave signature (K7–K8)

- **K7**: firma con chiave unica derivata da nodeId + salt; nessun keyVersion in metadata.
- **K8**: key versioning; metadata.attributes["keyVersion"] presente; version 0 = legacy K7; versioni 1+ da FileBasedSigningKeyProvider.
- **Compatibilità**: verify con keyVersion assente o "0" usa chiave legacy (K7). Contratto SignedPayload e SignatureVerificationResult invariato.

---

## Contratti immutabili (nessuna modifica breaking)

- Firma delle port (nomi metodi, tipi argomenti e ritorno).
- Struttura di SignatureMetadata, SignedPayload, SignatureVerificationResult.
- Struttura di InfrastructureOperationContext.
- Comportamento di executeSignedStorageOperation (ordine: lock → retry → sign → store → release).

Fine del freeze documentale. Modifiche breaking = nuova major phase.
