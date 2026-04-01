import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/model/operation_envelope.dart';
import 'package:iris_flutter_app/flow/application/model/operation_envelope_metadata.dart';
import 'package:iris_flutter_app/flow/application/serialization/operation_envelope_canonical_serializer.dart';
import 'package:iris_flutter_app/flow/application/service/signed_operation_request.dart';
import 'package:iris_flutter_app/flow/application/service/signed_operation_result.dart';
import 'package:iris_flutter_app/flow/application/service/signed_operation_service.dart';
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

SignedPayload _sig(List<int> b) => SignedPayload(
      signatureBytes: b,
      metadata: const SignatureMetadata(signerId: 's', algorithm: 'a'),
    );
OperationEnvelopeMetadata _meta(Map<String, String> m) =>
    OperationEnvelopeMetadata(attributes: m);

SignedOperationRequest _request({
  String operationId = 'op-1',
  String resourceId = 'res-1',
  List<int>? payload,
  SignedPayload? signature,
  OperationEnvelopeMetadata? metadata,
}) {
  return SignedOperationRequest(
    operationId: operationId,
    resourceId: resourceId,
    payload: payload ?? [1, 2, 3],
    signature: signature ?? _sig([10, 20]),
    metadata: metadata ?? _meta({'k': 'v'}),
  );
}

/// Mock orchestrator: records calls, returns or throws as configured.
class _MockOrchestrator extends InfrastructureOrchestrator {
  _MockOrchestrator()
      : super(
          lock: _NoOpLock(),
          retry: _NoOpRetry(),
          storage: _NoOpStorage(),
          signature: _NoOpSignature(),
          nodeIdentity: _NoOpNodeIdentity(),
          storageBucket: 'test',
        );

  int callCount = 0;
  InfrastructureOperationContext? lastContext;
  List<int>? lastPayload;
  bool throwOnExecute = false;

  @override
  Future<SignedPayload> executeSignedStorageOperation({
    required InfrastructureOperationContext context,
    required Future<List<int>> Function() payloadProvider,
  }) async {
    callCount++;
    lastContext = context;
    lastPayload = await payloadProvider();
    if (throwOnExecute) {
      throw Exception('orchestrator failure');
    }
    return _sig([99]);
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
      throw UnimplementedError();
}

class _NoOpNodeIdentity implements NodeIdentityProvider {
  @override
  String getNodeId() => 'node-1';
}

void main() {
  group('SignedOperationService', () {
    late _MockOrchestrator mockOrchestrator;
    late OperationEnvelopeCanonicalSerializer serializer;
    late SignedOperationService service;

    setUp(() {
      mockOrchestrator = _MockOrchestrator();
      serializer = OperationEnvelopeCanonicalSerializer();
      service = SignedOperationService(orchestrator: mockOrchestrator, serializer: serializer);
    });

    group('1. Happy Path', () {
      test('valid request → envelope built, canonical bytes produced, orchestrator called once, persisted true', () async {
        final request = _request();
        final result = await service.execute(request);

        expect(result.envelope.operationId, request.operationId);
        expect(result.envelope.resourceId, request.resourceId);
        expect(result.envelope.payload, [1, 2, 3]);
        expect(result.persisted, true);
        expect(mockOrchestrator.callCount, 1);
        expect(mockOrchestrator.lastContext?.operationId, request.operationId);
        expect(mockOrchestrator.lastContext?.resourceId, request.resourceId);
        expect(mockOrchestrator.lastPayload, isNotNull);
        expect(mockOrchestrator.lastPayload!.isNotEmpty, true);
      });
    });

    group('2. Determinism Test', () {
      test('same request → same envelope → same canonical bytes', () async {
        final request = _request(operationId: 'op-x', resourceId: 'res-y', payload: [5, 6]);
        final result1 = await service.execute(request);
        mockOrchestrator.callCount = 0;
        final result2 = await service.execute(request);

        expect(result1.envelope.operationId, result2.envelope.operationId);
        expect(result1.envelope.resourceId, result2.envelope.resourceId);
        expect(result1.envelope.payload, result2.envelope.payload);
        expect(mockOrchestrator.lastPayload, isNotNull);
        final payloadFirst = List<int>.from(mockOrchestrator.lastPayload!);
        await service.execute(request);
        expect(mockOrchestrator.lastPayload, payloadFirst);
      });
    });

    group('3. Payload Isolation', () {
      test('mutating payload after execute does not change returned envelope', () async {
        final payload = <int>[1, 2, 3];
        final request = _request(payload: payload);
        final result = await service.execute(request);

        payload[0] = 99;
        payload.add(4);
        expect(result.envelope.payload, [1, 2, 3]);
      });
    });

    group('4. Orchestrator Delegation', () {
      test('orchestrator receives canonical bytes from serializer; no signature verification here', () async {
        final request = _request(operationId: 'a', resourceId: 'b', payload: [7]);
        await service.execute(request);

        expect(mockOrchestrator.callCount, 1);
        final canonicalBytes = mockOrchestrator.lastPayload!;
        expect(canonicalBytes, isNotEmpty);
        final expectedEnvelope = OperationEnvelope(
          operationId: 'a',
          resourceId: 'b',
          payload: [7],
          signature: request.signature,
          metadata: request.metadata,
        );
        final expectedCanonical = serializer.serialize(expectedEnvelope);
        expect(canonicalBytes.length, expectedCanonical.bytes.length);
        for (var i = 0; i < expectedCanonical.bytes.length; i++) {
          expect(canonicalBytes[i], expectedCanonical.bytes[i]);
        }
      });
    });

    group('5. Failure Propagation', () {
      test('orchestrator throws → exception propagates, no result returned', () async {
        mockOrchestrator.throwOnExecute = true;
        final request = _request();

        expect(service.execute(request), throwsA(isA<Exception>()));
      });
    });

    group('6. Determinism Guard', () {
      test('service module does not use DateTime, Random, UUID, or generate IDs', () async {
        final dir = Directory('lib/flow/application/service');
        expect(await dir.exists(), true);
        await for (final e in dir.list()) {
          if (e is File && e.path.replaceAll(r'\', '/').endsWith('.dart')) {
            final content = await e.readAsString();
            expect(content.contains('DateTime'), false);
            expect(content.contains('Random'), false);
            expect(content.contains('Uuid'), false);
          }
        }
      });
    });
  });
}
