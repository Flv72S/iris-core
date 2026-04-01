// KX — Infrastructure orchestrator tests.

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
  group('KX — 1. Happy Path', () {
    test('order: acquire lock → retry invoked → payloadProvider → sign → storage.save → release lock', () async {
      final callOrder = <String>[];

      final lock = _FakeLock(() => callOrder.add('acquire'), () => callOrder.add('release'));
      final retry = _FakeRetry(() => callOrder.add('retry'));
      List<int>? storedContent;
      String? storedKey;
      final storage = _FakeStorage(
        onUpload: (bucket, key, content) {
          callOrder.add('storage.save');
          storedKey = key;
          storedContent = content;
        },
      );
      final signature = _FakeSignature(() => callOrder.add('sign'));
      final nodeId = _FakeNodeId('node-1');

      final orchestrator = InfrastructureOrchestrator(
        lock: lock,
        retry: retry,
        storage: storage,
        signature: signature,
        nodeIdentity: nodeId,
        storageBucket: 'b1',
      );

      final context = InfrastructureOperationContext(operationId: 'op-1', resourceId: 'res-1');
      final payloadProviderCalled = <bool>[];
      final result = await orchestrator.executeSignedStorageOperation(
        context: context,
        payloadProvider: () async {
          payloadProviderCalled.add(true);
          callOrder.add('payloadProvider');
          return [1, 2, 3];
        },
      );

      expect(result, isNotNull);
      expect(callOrder, ['acquire', 'retry', 'payloadProvider', 'sign', 'storage.save', 'release']);
      expect(storedKey, 'res-1');
      expect(storedContent, [1, 2, 3]);
    });
  });

  group('KX — 2. Retry Failure', () {
    test('payloadProvider always fails → lock released, exception propagated, storage not called', () async {
      final callOrder = <String>[];

      final lock = _FakeLock(() => callOrder.add('acquire'), () => callOrder.add('release'));
      final retry = _FakeRetry(() => callOrder.add('retry'));
      var storageCalled = false;
      final storage = _FakeStorage(onUpload: (_, __, ___) => storageCalled = true);
      final signature = _FakeSignature(() {});
      final nodeId = _FakeNodeId('n');

      final orchestrator = InfrastructureOrchestrator(
        lock: lock,
        retry: retry,
        storage: storage,
        signature: signature,
        nodeIdentity: nodeId,
        storageBucket: 'b',
      );

      final context = InfrastructureOperationContext(operationId: 'o', resourceId: 'r');

      await expectLater(
        orchestrator.executeSignedStorageOperation(
          context: context,
          payloadProvider: () async => throw Exception('payload fail'),
        ),
        throwsA(isA<Exception>()),
      );

      expect(callOrder, contains('release'));
      expect(storageCalled, isFalse);
    });
  });

  group('KX — 3. Signature Failure', () {
    test('sign throws → lock released, storage not called', () async {
      final callOrder = <String>[];

      final lock = _FakeLock(() => callOrder.add('acquire'), () => callOrder.add('release'));
      final retry = _FakeRetry(() {});
      var storageCalled = false;
      final storage = _FakeStorage(onUpload: (_, __, ___) => storageCalled = true);
      final signature = _FakeSignature(() => throw Exception('sign fail'));
      final nodeId = _FakeNodeId('n');

      final orchestrator = InfrastructureOrchestrator(
        lock: lock,
        retry: retry,
        storage: storage,
        signature: signature,
        nodeIdentity: nodeId,
        storageBucket: 'b',
      );

      final context = InfrastructureOperationContext(operationId: 'o', resourceId: 'r');

      await expectLater(
        orchestrator.executeSignedStorageOperation(
          context: context,
          payloadProvider: () async => [1],
        ),
        throwsA(isA<Exception>()),
      );

      expect(callOrder, contains('release'));
      expect(storageCalled, isFalse);
    });
  });

  group('KX — 4. Storage Failure', () {
    test('storage.save throws → lock released, exception propagated', () async {
      final callOrder = <String>[];

      final lock = _FakeLock(() => callOrder.add('acquire'), () => callOrder.add('release'));
      final retry = _FakeRetry(() {});
      final storage = _FakeStorage(
        onUpload: (_, __, ___) => throw Exception('storage fail'),
      );
      final signature = _FakeSignature(() {});
      final nodeId = _FakeNodeId('n');

      final orchestrator = InfrastructureOrchestrator(
        lock: lock,
        retry: retry,
        storage: storage,
        signature: signature,
        nodeIdentity: nodeId,
        storageBucket: 'b',
      );

      final context = InfrastructureOperationContext(operationId: 'o', resourceId: 'r');

      await expectLater(
        orchestrator.executeSignedStorageOperation(
          context: context,
          payloadProvider: () async => [1],
        ),
        throwsA(isA<Exception>()),
      );

      expect(callOrder, contains('release'));
    });
  });

  group('KX — 5. Orchestrator Contract', () {
    test('lock always released even when nodeIdentity.getNodeId throws', () async {
      var releaseCalled = false;
      final lock = _FakeLock(() {}, () => releaseCalled = true);
      final nodeId = _NodeIdThatThrows();
      final orchestrator = InfrastructureOrchestrator(
        lock: lock,
        retry: _FakeRetry(() {}),
        storage: _FakeStorage(onUpload: (_, __, ___) {}),
        signature: _FakeSignature(() {}),
        nodeIdentity: nodeId,
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

    test('metadata passed to sign does not contain operationId', () async {
      SignatureMetadata? captured;
      final signature = _SignatureCapturingMeta((m) => captured = m);
      final orchestrator = InfrastructureOrchestrator(
        lock: _FakeLock(() {}, () {}),
        retry: _FakeRetry(() {}),
        storage: _FakeStorage(onUpload: (_, __, ___) {}),
        signature: signature,
        nodeIdentity: _FakeNodeId('n'),
        storageBucket: 'b',
      );
      await orchestrator.executeSignedStorageOperation(
        context: const InfrastructureOperationContext(operationId: 'op-x', resourceId: 'r'),
        payloadProvider: () async => [1],
      );
      expect(captured, isNotNull);
      expect(captured!.attributes.containsKey('operationId'), isFalse);
    });
  });

  group('KX — 6. Determinism Guard', () {
    test('composition module has no DateTime.now, Random, UUID, Core import', () {
      final dir = Directory('lib/flow/infrastructure/composition');
      expect(dir.existsSync(), isTrue);
      final forbidden = [
        'DateTime.now',
        'Random()',
        'Random.',
        'Uuid',
        'UUID',
        'package:iris_flutter_app/core',
      ];
      for (final entity in dir.listSync()) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final content = entity.readAsStringSync();
        for (final pattern in forbidden) {
          expect(
            content.contains(pattern),
            isFalse,
            reason: '${entity.path} must not reference $pattern',
          );
        }
      }
    });
  });

  group('KX — 7. Immutable Config Guard', () {
    test('storageBucket is immutable after construction', () async {
      final orchestrator = InfrastructureOrchestrator(
        lock: _FakeLock(() {}, () {}),
        retry: _FakeRetry(() {}),
        storage: _FakeStorage(onUpload: (_, __, ___) {}),
        signature: _FakeSignature(() {}),
        nodeIdentity: _FakeNodeId('n'),
        storageBucket: 'bucket-frozen',
      );
      expect(orchestrator.storageBucket, 'bucket-frozen');
      await orchestrator.executeSignedStorageOperation(
        context: const InfrastructureOperationContext(operationId: 'o', resourceId: 'r'),
        payloadProvider: () async => [1],
      );
      expect(orchestrator.storageBucket, 'bucket-frozen');
    });

    test('orchestrator module has no public setters', () {
      final dir = Directory('lib/flow/infrastructure/composition');
      for (final entity in dir.listSync()) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final content = File(entity.path).readAsStringSync();
        expect(
          content.contains(' set '),
          isFalse,
          reason: '${entity.path} must not declare public setters',
        );
      }
    });
  });
}

class _FakeLock implements DistributedLockPort {
  _FakeLock(this._onAcquire, this._onRelease);

  final void Function() _onAcquire;
  final void Function() _onRelease;

  @override
  Future<void> acquireLock(String lockKey) async => _onAcquire();

  @override
  Future<void> releaseLock(String lockKey) async => _onRelease();

  @override
  Future<bool> tryAcquireLock(String lockKey, Duration timeout) async => true;
}

class _FakeRetry implements RetryPolicyPort {
  _FakeRetry(this._onInvoke);

  final void Function() _onInvoke;

  @override
  T executeWithRetry<T>(T Function() operation) {
    _onInvoke();
    return operation();
  }
}

class _FakeStorage implements CloudStoragePort {
  _FakeStorage({required this.onUpload});

  final void Function(String bucket, String key, List<int> content) onUpload;

  @override
  Future<void> uploadObject(String bucket, String key, List<int> content) async {
    onUpload(bucket, key, content);
  }

  @override
  Future<List<int>> downloadObject(String bucket, String key) async => [];

  @override
  Future<bool> objectExists(String bucket, String key) async => false;

  @override
  Future<void> deleteObject(String bucket, String key) async {}

  @override
  Future<List<String>> listObjects(String bucket, {String prefix = ''}) async => [];
}

class _FakeSignature implements SignaturePort {
  _FakeSignature(this._onSign);

  final void Function() _onSign;

  @override
  SignedPayload sign({
    required List<int> payload,
    required SignatureMetadata metadata,
  }) {
    _onSign();
    return SignedPayload(
      signatureBytes: List.filled(32, 0),
      metadata: metadata,
    );
  }

  @override
  SignatureVerificationResult verify({
    required List<int> payload,
    required SignedPayload signature,
  }) =>
      const SignatureVerificationResult.valid();
}

class _FakeNodeId implements NodeIdentityProvider {
  _FakeNodeId(this.id);
  final String id;
  @override
  String getNodeId() => id;
}

class _NodeIdThatThrows implements NodeIdentityProvider {
  @override
  String getNodeId() => throw Exception('nodeId fail');
}

class _SignatureCapturingMeta implements SignaturePort {
  _SignatureCapturingMeta(this._onSign);
  final void Function(SignatureMetadata meta) _onSign;

  @override
  SignedPayload sign({
    required List<int> payload,
    required SignatureMetadata metadata,
  }) {
    _onSign(metadata);
    return SignedPayload(signatureBytes: List.filled(32, 0), metadata: metadata);
  }

  @override
  SignatureVerificationResult verify({
    required List<int> payload,
    required SignedPayload signature,
  }) =>
      const SignatureVerificationResult.valid();
}
