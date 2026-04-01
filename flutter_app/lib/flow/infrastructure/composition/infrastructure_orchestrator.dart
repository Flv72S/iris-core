// KX — Infrastructure composition layer. Stateless orchestrator; no domain logic.

import 'package:iris_flutter_app/flow/infrastructure/composition/infrastructure_operation_context.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/cloud_storage_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/distributed_lock_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/node_identity_provider.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/retry_policy_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_metadata.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signed_payload.dart';

/// Orchestrates lock → retry → sign → store; always releases lock (including on error).
/// Stateless; uses only injected ports. No domain logic, no entropy.
class InfrastructureOrchestrator {
  InfrastructureOrchestrator({
    required DistributedLockPort lock,
    required RetryPolicyPort retry,
    required CloudStoragePort storage,
    required SignaturePort signature,
    required NodeIdentityProvider nodeIdentity,
    required this.storageBucket,
  })  : _lock = lock,
        _retry = retry,
        _storage = storage,
        _signature = signature,
        _nodeIdentity = nodeIdentity;

  final DistributedLockPort _lock;
  final RetryPolicyPort _retry;
  final CloudStoragePort _storage;
  final SignaturePort _signature;
  final NodeIdentityProvider _nodeIdentity;
  final String storageBucket;

  /// Order: acquire lock → execute payloadProvider under retry → sign → store → release lock.
  /// Lock is always released, even on failure.
  Future<SignedPayload> executeSignedStorageOperation({
    required InfrastructureOperationContext context,
    required Future<List<int>> Function() payloadProvider,
  }) async {
    final resourceId = context.resourceId;
    await _lock.acquireLock(resourceId);
    try {
      final payload = await _retry.executeWithRetry<Future<List<int>>>(() => payloadProvider());

      final signerId = _nodeIdentity.getNodeId();
      final metadata = SignatureMetadata(
        signerId: signerId,
        algorithm: 'HMAC-SHA256',
      );
      final signed = _signature.sign(payload: payload, metadata: metadata);

      await _storage.uploadObject(storageBucket, resourceId, payload);

      return signed;
    } finally {
      await _lock.releaseLock(resourceId);
    }
  }

  /// Read path: downloads persisted payload for [resourceId]. No lock, no sign.
  Future<List<int>> retrievePersistedPayload(String resourceId) async {
    return _storage.downloadObject(storageBucket, resourceId);
  }
}
