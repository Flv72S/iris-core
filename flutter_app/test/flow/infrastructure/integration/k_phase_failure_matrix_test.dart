// K Phase — Failure matrix integration. No deadlock, no inconsistency, determinism preserved.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/infrastructure/composition/infrastructure_operation_context.dart';
import 'package:iris_flutter_app/flow/infrastructure/composition/infrastructure_orchestrator.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/cloud_storage_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/distributed_lock_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/node_identity_provider.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/retry_policy_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_metadata.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_verification_result.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signed_payload.dart';

void main() {
  group('K Phase — Failure Matrix', () {
    test('Lock failure: acquire throws → no lock held, exception propagated', () async {
      var releaseCalled = false;
      final lock = _LockThatFailsAcquire(() => releaseCalled = true);
      final orchestrator = InfrastructureOrchestrator(
        lock: lock,
        retry: _NoOpRetry(),
        storage: _NoOpStorage(),
        signature: _NoOpSignature(),
        nodeIdentity: _ConstNodeId('n'),
        storageBucket: 'b',
      );

      await expectLater(
        orchestrator.executeSignedStorageOperation(
          context: const InfrastructureOperationContext(operationId: 'o', resourceId: 'r'),
          payloadProvider: () async => [1],
        ),
        throwsA(anything),
      );

      expect(releaseCalled, isFalse);
    });

    test('Retry exhaustion: payloadProvider always fails → lock released, exception propagated', () async {
      var releaseCalled = false;
      final lock = _CountingLock(() => releaseCalled = true);
      final orchestrator = InfrastructureOrchestrator(
        lock: lock,
        retry: _NoOpRetry(),
        storage: _NoOpStorage(),
        signature: _NoOpSignature(),
        nodeIdentity: _ConstNodeId('n'),
        storageBucket: 'b',
      );

      await expectLater(
        orchestrator.executeSignedStorageOperation(
          context: const InfrastructureOperationContext(operationId: 'o', resourceId: 'r'),
          payloadProvider: () async => throw Exception('retry exhausted'),
        ),
        throwsA(anything),
      );

      expect(releaseCalled, isTrue);
    });

    test('Signature failure: sign throws → lock released, storage not called', () async {
      var releaseCalled = false;
      var storageCalled = false;
      final lock = _CountingLock(() => releaseCalled = true);
      final storage = _SpyStorage(() => storageCalled = true);
      final signature = _SignatureThatThrows();
      final orchestrator = InfrastructureOrchestrator(
        lock: lock,
        retry: _NoOpRetry(),
        storage: storage,
        signature: signature,
        nodeIdentity: _ConstNodeId('n'),
        storageBucket: 'b',
      );

      await expectLater(
        orchestrator.executeSignedStorageOperation(
          context: const InfrastructureOperationContext(operationId: 'o', resourceId: 'r'),
          payloadProvider: () async => [1],
        ),
        throwsA(anything),
      );

      expect(releaseCalled, isTrue);
      expect(storageCalled, isFalse);
    });

    test('Storage failure: upload throws → lock released, exception propagated', () async {
      var releaseCalled = false;
      final lock = _CountingLock(() => releaseCalled = true);
      final storage = _StorageThatThrows();
      final orchestrator = InfrastructureOrchestrator(
        lock: lock,
        retry: _NoOpRetry(),
        storage: storage,
        signature: _NoOpSignature(),
        nodeIdentity: _ConstNodeId('n'),
        storageBucket: 'b',
      );

      await expectLater(
        orchestrator.executeSignedStorageOperation(
          context: const InfrastructureOperationContext(operationId: 'o', resourceId: 'r'),
          payloadProvider: () async => [1],
        ),
        throwsA(anything),
      );

      expect(releaseCalled, isTrue);
    });

    test('No double sign: sign called once on happy path', () async {
      var signCount = 0;
      final lock = _CountingLock(() {});
      final signature = _CountingSignature(() => signCount++);
      final orchestrator = InfrastructureOrchestrator(
        lock: lock,
        retry: _NoOpRetry(),
        storage: _NoOpStorage(),
        signature: signature,
        nodeIdentity: _ConstNodeId('n'),
        storageBucket: 'b',
      );

      await orchestrator.executeSignedStorageOperation(
        context: const InfrastructureOperationContext(operationId: 'o', resourceId: 'r'),
        payloadProvider: () async => [1, 2, 3],
      );

      expect(signCount, 1);
    });

    test('No double write: storage.save called once on happy path', () async {
      var saveCount = 0;
      final lock = _CountingLock(() {});
      final storage = _SpyStorage(() => saveCount++);
      final orchestrator = InfrastructureOrchestrator(
        lock: lock,
        retry: _NoOpRetry(),
        storage: storage,
        signature: _NoOpSignature(),
        nodeIdentity: _ConstNodeId('n'),
        storageBucket: 'b',
      );

      await orchestrator.executeSignedStorageOperation(
        context: const InfrastructureOperationContext(operationId: 'o', resourceId: 'r'),
        payloadProvider: () async => [1],
      );

      expect(saveCount, 1);
    });
  });
}

class _LockThatFailsAcquire implements DistributedLockPort {
  _LockThatFailsAcquire(this._onRelease);
  final void Function() _onRelease;

  @override
  Future<void> acquireLock(String lockKey) async => throw Exception('lock acquire fail');

  @override
  Future<void> releaseLock(String lockKey) async => _onRelease();

  @override
  Future<bool> tryAcquireLock(String lockKey, Duration timeout) async => false;
}

class _CountingLock implements DistributedLockPort {
  _CountingLock(this._onRelease);
  final void Function() _onRelease;

  @override
  Future<void> acquireLock(String lockKey) async {}

  @override
  Future<void> releaseLock(String lockKey) async => _onRelease();

  @override
  Future<bool> tryAcquireLock(String lockKey, Duration timeout) async => true;
}

class _NoOpRetry implements RetryPolicyPort {
  @override
  T executeWithRetry<T>(T Function() operation) => operation();
}

class _NoOpStorage implements CloudStoragePort {
  @override
  Future<void> uploadObject(String bucket, String key, List<int> content) async {}

  @override
  Future<List<int>> downloadObject(String bucket, String key) async => [];

  @override
  Future<bool> objectExists(String bucket, String key) async => false;

  @override
  Future<void> deleteObject(String bucket, String key) async {}

  @override
  Future<List<String>> listObjects(String bucket, {String prefix = ''}) async => [];
}

class _SpyStorage implements CloudStoragePort {
  _SpyStorage(this._onUpload);
  final void Function() _onUpload;

  @override
  Future<void> uploadObject(String bucket, String key, List<int> content) async => _onUpload();

  @override
  Future<List<int>> downloadObject(String bucket, String key) async => [];

  @override
  Future<bool> objectExists(String bucket, String key) async => false;

  @override
  Future<void> deleteObject(String bucket, String key) async {}

  @override
  Future<List<String>> listObjects(String bucket, {String prefix = ''}) async => [];
}

class _StorageThatThrows implements CloudStoragePort {
  @override
  Future<void> uploadObject(String bucket, String key, List<int> content) async =>
      throw Exception('storage fail');

  @override
  Future<List<int>> downloadObject(String bucket, String key) async => [];

  @override
  Future<bool> objectExists(String bucket, String key) async => false;

  @override
  Future<void> deleteObject(String bucket, String key) async {}

  @override
  Future<List<String>> listObjects(String bucket, {String prefix = ''}) async => [];
}

class _NoOpSignature implements SignaturePort {
  @override
  SignedPayload sign({required List<int> payload, required SignatureMetadata metadata}) =>
      SignedPayload(signatureBytes: List.filled(32, 0), metadata: metadata);

  @override
  SignatureVerificationResult verify({required List<int> payload, required SignedPayload signature}) =>
      const SignatureVerificationResult.valid();
}

class _SignatureThatThrows implements SignaturePort {
  @override
  SignedPayload sign({required List<int> payload, required SignatureMetadata metadata}) =>
      throw Exception('sign fail');

  @override
  SignatureVerificationResult verify({required List<int> payload, required SignedPayload signature}) =>
      const SignatureVerificationResult.valid();
}

class _CountingSignature implements SignaturePort {
  _CountingSignature(this._onSign);
  final void Function() _onSign;

  @override
  SignedPayload sign({required List<int> payload, required SignatureMetadata metadata}) {
    _onSign();
    return SignedPayload(signatureBytes: List.filled(32, 0), metadata: metadata);
  }

  @override
  SignatureVerificationResult verify({required List<int> payload, required SignedPayload signature}) =>
      const SignatureVerificationResult.valid();
}

class _ConstNodeId implements NodeIdentityProvider {
  _ConstNodeId(this.id);
  final String id;
  @override
  String getNodeId() => id;
}
