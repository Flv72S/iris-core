import 'dart:io';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/model/operation_envelope.dart';
import 'package:iris_flutter_app/flow/application/model/operation_envelope_metadata.dart';
import 'package:iris_flutter_app/flow/application/retrieval/operation_retrieval_service.dart';
import 'package:iris_flutter_app/flow/application/retrieval/retrieved_operation_result.dart';
import 'package:iris_flutter_app/flow/application/serialization/operation_envelope_canonical_serializer.dart';
import 'package:iris_flutter_app/flow/infrastructure/composition/infrastructure_orchestrator.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/cloud_storage_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/distributed_lock_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/node_identity_provider.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/retry_policy_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_metadata.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_verification_result.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signed_payload.dart';

SignedPayload _sig(List<int> b) => SignedPayload(
      signatureBytes: b,
      metadata: const SignatureMetadata(signerId: 's', algorithm: 'HMAC-SHA256'),
    );
OperationEnvelopeMetadata _meta(Map<String, String> m) =>
    OperationEnvelopeMetadata(attributes: m);

OperationEnvelope _envelope({
  String operationId = 'op-1',
  String resourceId = 'res-1',
  List<int>? payload,
  SignedPayload? signature,
  OperationEnvelopeMetadata? metadata,
}) {
  return OperationEnvelope(
    operationId: operationId,
    resourceId: resourceId,
    payload: payload ?? [1, 2, 3],
    signature: signature ?? _sig([10, 20]),
    metadata: metadata ?? _meta({'k': 'v'}),
  );
}

/// Mock orchestrator: returns stored bytes or throws. Only retrievePersistedPayload is used by L5.
class _MockOrchestrator extends InfrastructureOrchestrator {
  _MockOrchestrator({List<int>? storedBytes, bool throwOnRetrieve = false})
      : _storedBytes = storedBytes ?? [],
        _throwOnRetrieve = throwOnRetrieve,
        super(
          lock: _NoOpLock(),
          retry: _NoOpRetry(),
          storage: _NoOpStorage(),
          signature: _NoOpSignature(),
          nodeIdentity: _NoOpNodeIdentity(),
          storageBucket: 'test',
        );

  final List<int> _storedBytes;
  final bool _throwOnRetrieve;

  void setStoredBytes(List<int> bytes) {
    _storedBytes.clear();
    _storedBytes.addAll(bytes);
  }

  @override
  Future<List<int>> retrievePersistedPayload(String resourceId) async {
    if (_throwOnRetrieve) throw Exception('orchestrator failure');
    return List<int>.from(_storedBytes);
  }
}

class _NoOpLock implements DistributedLockPort {
  @override
  Future<void> acquireLock(String lockKey) async {}
  @override
  Future<void> releaseLock(String lockKey) async {}
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

class _NoOpSignature implements SignaturePort {
  @override
  SignedPayload sign({required List<int> payload, required SignatureMetadata metadata}) =>
      SignedPayload(signatureBytes: [0], metadata: metadata);
  @override
  SignatureVerificationResult verify({required List<int> payload, required SignedPayload signature}) =>
      const SignatureVerificationResult.valid();
}

class _NoOpNodeIdentity implements NodeIdentityProvider {
  @override
  String getNodeId() => 'node-1';
}

/// Mock signature port: verify returns configurable valid/invalid.
class _MockSignaturePort implements SignaturePort {
  bool verifyReturnsValid = true;

  @override
  SignedPayload sign({required List<int> payload, required SignatureMetadata metadata}) =>
      SignedPayload(signatureBytes: [0], metadata: metadata);

  @override
  SignatureVerificationResult verify({required List<int> payload, required SignedPayload signature}) =>
      verifyReturnsValid
          ? const SignatureVerificationResult.valid()
          : const SignatureVerificationResult.invalid('mock invalid');
}

void main() {
  group('OperationRetrievalService', () {
    late OperationEnvelopeCanonicalSerializer serializer;
    late _MockOrchestrator mockOrchestrator;
    late _MockSignaturePort mockSignature;
    late OperationRetrievalService service;

    setUp(() {
      serializer = OperationEnvelopeCanonicalSerializer();
      mockOrchestrator = _MockOrchestrator();
      mockSignature = _MockSignaturePort();
      service = OperationRetrievalService(
        orchestrator: mockOrchestrator,
        serializer: serializer,
        signaturePort: mockSignature,
      );
    });

    group('1. Happy Path', () {
      test('valid bytes and valid signature → envelope rebuilt, signatureValid == true', () async {
        final envelope = _envelope(operationId: 'op-a', resourceId: 'res-b', payload: [5, 6, 7]);
        final canonical = serializer.serialize(envelope);
        mockOrchestrator.setStoredBytes(canonical.bytes.toList());
        mockSignature.verifyReturnsValid = true;

        final result = await service.retrieve(operationId: 'op-a', resourceId: 'res-b');

        expect(result.envelope.operationId, 'op-a');
        expect(result.envelope.resourceId, 'res-b');
        expect(result.envelope.payload, [5, 6, 7]);
        expect(result.signatureValid, true);
      });
    });

    group('2. Invalid signature', () {
      test('correct bytes but verify returns invalid → signatureValid == false, no exception', () async {
        final envelope = _envelope(operationId: 'x', resourceId: 'y', payload: [1]);
        final canonical = serializer.serialize(envelope);
        mockOrchestrator.setStoredBytes(canonical.bytes.toList());
        mockSignature.verifyReturnsValid = false;

        final result = await service.retrieve(operationId: 'x', resourceId: 'y');

        expect(result.signatureValid, false);
        expect(result.envelope.operationId, 'x');
      });
    });

    group('3. Deterministic round-trip', () {
      test('serialize → persist mock → retrieve → reserialize → bytes identical', () async {
        final envelope = _envelope(
          operationId: 'oid',
          resourceId: 'rid',
          payload: [1, 2, 3, 4, 5],
          signature: _sig([10, 20, 30]),
          metadata: _meta({'x': 'y', 'a': 'b'}),
        );
        final can1 = serializer.serialize(envelope);
        mockOrchestrator.setStoredBytes(can1.bytes.toList());
        mockSignature.verifyReturnsValid = true;

        final result = await service.retrieve(operationId: 'oid', resourceId: 'rid');
        final can2 = serializer.serialize(result.envelope);

        expect(can2.bytes.length, can1.bytes.length);
        for (var i = 0; i < can1.bytes.length; i++) {
          expect(can2.bytes[i], can1.bytes[i], reason: 'index $i');
        }
      });
    });

    group('4. Deserialization stability', () {
      test('metadata with multiple keys and UTF-8 multibyte round-trip', () async {
        final envelope = _envelope(
          operationId: 'op-\u00e9',
          resourceId: 'res-\u20ac',
          payload: [1],
          signature: _sig([5]),
          metadata: _meta({'k\u00e9y': 'v\u00e0l', 'a': 'b'}),
        );
        final can1 = serializer.serialize(envelope);
        mockOrchestrator.setStoredBytes(can1.bytes.toList());
        mockSignature.verifyReturnsValid = true;

        final result = await service.retrieve(operationId: 'op-\u00e9', resourceId: 'res-\u20ac');

        expect(result.envelope.operationId, 'op-\u00e9');
        expect(result.envelope.resourceId, 'res-\u20ac');
        expect(result.envelope.metadata.attributes['k\u00e9y'], 'v\u00e0l');
        final can2 = serializer.serialize(result.envelope);
        expect(can2.bytes.length, can1.bytes.length);
        for (var i = 0; i < can1.bytes.length; i++) {
          expect(can2.bytes[i], can1.bytes[i], reason: 'index $i');
        }
      });
    });

    group('5. Failure propagation', () {
      test('orchestrator throws → exception propagates', () async {
        mockOrchestrator = _MockOrchestrator(throwOnRetrieve: true);
        service = OperationRetrievalService(
          orchestrator: mockOrchestrator,
          serializer: serializer,
          signaturePort: mockSignature,
        );

        expect(
          service.retrieve(operationId: 'op', resourceId: 'res'),
          throwsA(isA<Exception>()),
        );
      });
      test('empty payload from orchestrator → StateError', () async {
        mockOrchestrator.setStoredBytes([]);

        expect(
          service.retrieve(operationId: 'op', resourceId: 'res'),
          throwsA(isA<StateError>()),
        );
      });
    });

    group('6. Determinism guard', () {
      test('retrieval module does not use DateTime, Random, UUID, jsonEncode, reflection', () async {
        final dir = Directory('lib/flow/application/retrieval');
        expect(await dir.exists(), true);
        await for (final e in dir.list()) {
          if (e is File && e.path.replaceAll(r'\', '/').endsWith('.dart')) {
            final content = await e.readAsString();
            expect(content.contains('DateTime'), false);
            expect(content.contains('Random'), false);
            expect(content.contains('Uuid'), false);
            expect(content.contains('jsonEncode'), false);
            expect(content.contains('reflection'), false);
          }
        }
      });
    });
  });
}
