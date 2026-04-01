/**
 * Microstep 16D — IRIS Control Plane (registry, ingestion, cluster snapshot).
 */

export type { IrisNodeId, ControlPlaneNodeInfo, ControlPlaneSnapshot } from './control_plane_types.js';
export { CP_ONLINE_MAX_MS, CP_STALE_MAX_MS } from './control_plane_types.js';
export type { TrustState } from './trust_types.js';

export { ControlPlaneRegistry, computeNodeStatus } from './control_plane_registry.js';
export { ControlPlaneState } from './control_plane_state.js';
export type { NodeStateEntry } from './control_plane_state.js';

export { validateIngestPayload } from './control_plane_ingestion.js';
export type { IngestResult } from './control_plane_ingestion.js';

export { verifyIngestRequestAuth, buildSignedPayloadString } from './control_plane_ingest_auth.js';
export type { IngestAuthMode, IngestAuthResult } from './control_plane_ingest_auth.js';

export { buildClusterSnapshot } from './control_plane_snapshot.js';
export { initiateRotation, finalizeRotation } from './control_plane_rotation.js';
export type { TrustEvent, TrustEventType, UnsignedTrustEvent } from './trust_events.js';
export { createUnsignedTrustEvent, buildTrustEventSigningPayload } from './trust_events.js';
export { TrustSyncEngine, makeLocalTrustEvent } from './trust_sync_engine.js';
export { TrustReputationEngine, type NodeReputation } from './trust_reputation.js';
export { QuorumValidator, type QuorumPolicy } from './quorum_validator.js';
export { MisbehaviorDetector, type MisbehaviorResult } from './misbehavior_detector.js';
export { NodeIsolationManager } from './node_isolation.js';
export type { TrustAuditRecord } from './audit_types.js';
export { computeAuditRecordHash, chainAuditRecord } from './audit_hash.js';
export { signAuditRecord, verifyAuditRecordSignature } from './audit_sign.js';
export type { AuditMeta } from './audit_meta.js';
export { assertAuditMetaConsistent } from './audit_meta.js';
export { AuditLog, tryAuditSummary, type AuditLogOptions, type AuditVerifyOptions } from './audit_log.js';
export {
  appendAuditRecord,
  loadAuditLog,
  TRUST_AUDIT_LOG_FILENAME,
  TRUST_AUDIT_META_FILENAME,
  writeAuditMeta,
  readAuditMeta,
} from './audit_persist.js';
export { EvidenceStore, type EvidenceRecord } from './evidence_store.js';

export type { MerkleNode, MerkleProof, MerkleProofStep } from './merkle_types.js';
export { hashLeaf, hashInternal, emptyMerkleLeafHash } from './merkle_hash.js';
export { buildMerkleTree, getMerkleRoot } from './merkle_tree.js';
export { generateMerkleProof, verifyMerkleProof } from './merkle_proof.js';
export {
  createAuditSnapshot,
  verifyAuditSnapshotMatchesLog,
  type AuditSnapshot,
} from './audit_snapshot.js';

export type {
  RootAnnouncement,
  ProofRequest,
  ProofResponse,
  SyncState,
} from './trust_sync_protocol.js';
export {
  signProtocolMessage,
  verifyProtocolMessage,
  signProtocolMessageLegacySync,
  verifyProtocolMessageLegacySync,
  canonicalProtocolPayload,
} from './trust_sync_protocol_sign.js';
export {
  DistributedSyncManager,
  tryLoadSyncMetrics,
  SYNC_PROTOCOL_MAX_SKEW_MS,
  type DistributedSyncOptions,
} from './distributed_sync.js';
export { deriveNodeId } from './identity/node_identity.js';
export {
  canonicalizePublicKey,
  tryCanonicalizePublicKey,
  deriveNodeIdFromDer,
  publicKeyDerFingerprint,
  type CanonicalizeFailureCode,
} from './identity/key_canonicalization.js';
export { tryLoadNodeIdentity, type NodeIdentityFile } from './identity/identity_persist.js';
export type { KeyPurpose, KeyProvider, KeyPair, KeyDescriptor } from './keys/key_types.js';
export { HmacLegacyKeyProvider } from './keys/hmac_legacy_provider.js';
export { InMemoryEd25519KeyProvider } from './keys/in_memory_key_provider.js';
export { verifyWithCompositeStrategy, type CompositeVerifyContext } from './keys/composite_provider.js';
export type { PeerInfo } from './peer_types.js';
export type { PeerRegistry } from './peer_registry.js';
export { InMemoryPeerRegistry } from './peer_registry_memory.js';
export type { DomainRegistry } from './domain_registry.js';
export { InMemoryDomainRegistry } from './domain_registry_memory.js';

// 16F.X4.X5 — Trust distribution & lifecycle.
export type { TrustSnapshot } from './federation/trust_snapshot.js';
export { bootstrapTrust } from './federation/bootstrap.js';
export {
  InMemoryTrustDistribution,
  type TrustDistribution,
} from './federation/trust_distribution.js';
export { TrustPropagationEngine } from './federation/trust_propagation.js';
export { InMemoryDomainGovernanceRegistry } from './federation/domain_governance.js';
export { FederationTrustSyncEngine } from './federation/trust_sync.js';
export { TrustLifecycleManager } from './federation/trust_lifecycle.js';

export {
  ControlPlane,
  DEFAULT_MAX_INGEST_BYTES,
  type ControlPlaneOptions,
  type IngestSnapshotResult,
} from './control_plane.js';

export {
  controlPlaneSnapshotPath,
  writeControlPlaneSnapshot,
  readControlPlaneSnapshot,
  sanitizeClusterSnapshotForJson,
  CONTROL_PLANE_SNAPSHOT_FILENAME,
} from './control_plane_persist.js';

export { postObservabilityIngest } from './transport/http_client.js';
export type { PostIngestOptions } from './transport/http_client.js';

export {
  createControlPlaneHttpServer,
  listenControlPlaneHttpServer,
} from './transport/http_server.js';
export type { ControlPlaneHttpServerOptions } from './transport/http_server.js';
