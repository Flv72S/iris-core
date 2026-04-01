// L8 — End-to-end deterministic flow test. Composes L4 → L3 → L6 → L7 → L5.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/application/contract/execution_contract_hasher.dart';
import 'package:iris_flutter_app/flow/application/idempotency/idempotency_guard.dart';
import 'package:iris_flutter_app/flow/application/idempotency/idempotency_registry.dart';
import 'package:iris_flutter_app/flow/application/model/operation_envelope_metadata.dart';
import 'package:iris_flutter_app/flow/application/retrieval/operation_retrieval_service.dart';
import 'package:iris_flutter_app/flow/application/retrieval/retrieved_operation_result.dart';
import 'package:iris_flutter_app/flow/application/serialization/operation_envelope_canonical.dart';
import 'package:iris_flutter_app/flow/application/serialization/operation_envelope_canonical_serializer.dart';
import 'package:iris_flutter_app/flow/application/service/signed_operation_request.dart';
import 'package:iris_flutter_app/flow/application/service/signed_operation_service.dart';
import 'package:iris_flutter_app/flow/application/validation/signed_operation_validator.dart';
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
      metadata: const SignatureMetadata(signerId: 'node-1', algorithm: 'HMAC-SHA256'),
    );
OperationEnvelopeMetadata _meta(Map<String, String> m) =>
    OperationEnvelopeMetadata(attributes: m);

/// In-memory storage: stores by (bucket, key), used by default orchestrator for persist/retrieve.
class _E2EStorage implements CloudStoragePort {
  final Map<String, List<int>> _store = {};

  String _key(String bucket, String key) => '$bucket/$key';

  @override
  Future<void> uploadObject(String bucket, String key, List<int> content) async {
    _store[_key(bucket, key)] = List<int>.from(content);
  }

  @override
  Future<List<int>> downloadObject(String bucket, String key) async =>
      List<int>.from(_store[_key(bucket, key)] ?? []);

  @override
  Future<bool> objectExists(String bucket, String key) async =>
      _store.containsKey(_key(bucket, key));
  @override
  Future<void> deleteObject(String bucket, String key) async {}
  @override
  Future<List<String>> listObjects(String bucket, {String prefix = ''}) async => [];
}

/// In-memory orchestrator: stores canonical bytes by resourceId, returns them on retrieve.
/// Overrides base to use a single in-memory map so L3 write and L5 read share the same store.
class _E2EOrchestrator extends InfrastructureOrchestrator {
  _E2EOrchestrator(_E2EStorage storage)
      : _store = storage,
        super(
          lock: _NoOpLock(),
          retry: _NoOpRetry(),
          storage: storage,
          signature: _NoOpSignature(),
          nodeIdentity: _NoOpNodeIdentity(),
          storageBucket: 'test',
        );

  final _E2EStorage _store;

  @override
  Future<List<int>> retrievePersistedPayload(String resourceId) async {
    return _store.downloadObject('test', resourceId);
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

class _NoOpSignature implements SignaturePort {
  @override
  SignedPayload sign({required List<int> payload, required SignatureMetadata metadata}) =>
      SignedPayload(signatureBytes: [0], metadata: metadata);
  @override
  SignatureVerificationResult verify({required List<int> payload, required SignedPayload signature}) =>
      const SignatureVerificationResult.valid();
}

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

class _NoOpNodeIdentity implements NodeIdentityProvider {
  @override
  String getNodeId() => 'node-1';
}

void main() {
  group('L8 — Deterministic Flow E2E', () {
    late SignedOperationValidator validator;
    late OperationEnvelopeCanonicalSerializer serializer;
    late ExecutionContractHasher hasher;
    late IdempotencyRegistry idempotencyRegistry;
    late IdempotencyGuard idempotencyGuard;
    late _E2EStorage e2eStorage;
    late _E2EOrchestrator orchestrator;
    late SignedOperationService writeService;
    late OperationRetrievalService readService;
    late _MockSignaturePort signaturePort;

    setUp(() {
      validator = SignedOperationValidator();
      serializer = OperationEnvelopeCanonicalSerializer();
      hasher = ExecutionContractHasher();
      idempotencyRegistry = IdempotencyRegistry();
      idempotencyGuard = IdempotencyGuard(registry: idempotencyRegistry);
      e2eStorage = _E2EStorage();
      orchestrator = _E2EOrchestrator(e2eStorage);
      signaturePort = _MockSignaturePort();
      writeService = SignedOperationService(orchestrator: orchestrator, serializer: serializer);
      readService = OperationRetrievalService(
        orchestrator: orchestrator,
        serializer: serializer,
        signaturePort: signaturePort,
      );
    });

    test('1. Full E2E scenario: L4 → L3 → L6 → L7 → L5', () async {
      const operationId = 'e2e-op-1';
      const resourceId = 'e2e-res-1';
      final request = SignedOperationRequest(
        operationId: operationId,
        resourceId: resourceId,
        payload: [1, 2, 3, 4, 5],
        signature: _sig([10, 20, 30]),
        metadata: _meta({'k': 'v'}),
      );

      // L4 validation
      final validationResult = validator.validate(request);
      expect(validationResult.isValid, true);

      // L3 execute (persist via mock orchestrator)
      final writeResult = await writeService.execute(request);
      expect(writeResult.persisted, true);

      // L6 execution contract
      final canonical = serializer.serialize(writeResult.envelope);
      final contract = DeterministicExecutionContract.fromCanonical(
        envelope: writeResult.envelope,
        canonical: canonical,
        hasher: hasher,
      );

      // L7 first execution → allowed
      final idemResult1 = idempotencyGuard.checkAndRegister(contract);
      expect(idemResult1.alreadyExecuted, false);

      // L7 second execution → blocked
      final idemResult2 = idempotencyGuard.checkAndRegister(contract);
      expect(idemResult2.alreadyExecuted, true);

      // L5 retrieve (signature valid)
      signaturePort.verifyReturnsValid = true;
      final retrieved = await readService.retrieve(operationId: operationId, resourceId: resourceId);
      expect(retrieved.signatureValid, true);
      expect(retrieved.envelope.operationId, operationId);
      expect(retrieved.envelope.resourceId, resourceId);

      // Round-trip: bytes from L3 must match bytes re-serialized in L5
      final canonicalAgain = serializer.serialize(retrieved.envelope);
      expect(canonicalAgain.bytes.length, canonical.bytes.length);
      for (var i = 0; i < canonical.bytes.length; i++) {
        expect(canonicalAgain.bytes[i], canonical.bytes[i], reason: 'index $i');
      }
    });

    test('2. Full determinism: repeat scenario twice → same bytes and hash', () async {
      const operationId = 'det-op';
      const resourceId = 'det-res';
      final request = SignedOperationRequest(
        operationId: operationId,
        resourceId: resourceId,
        payload: [7, 8, 9],
        signature: _sig([1, 2]),
        metadata: _meta({'a': 'b'}),
      );

      validator.validate(request);
      final result1 = await writeService.execute(request);
      final can1 = serializer.serialize(result1.envelope);
      final contract1 = DeterministicExecutionContract.fromCanonical(
        envelope: result1.envelope,
        canonical: can1,
        hasher: hasher,
      );

      idempotencyRegistry.clear();
      validator.validate(request);
      final result2 = await writeService.execute(request);
      final can2 = serializer.serialize(result2.envelope);
      final contract2 = DeterministicExecutionContract.fromCanonical(
        envelope: result2.envelope,
        canonical: can2,
        hasher: hasher,
      );

      expect(can1.bytes.length, can2.bytes.length);
      for (var i = 0; i < can1.bytes.length; i++) {
        expect(can2.bytes[i], can1.bytes[i]);
      }
      expect(contract1.deterministicHash, contract2.deterministicHash);
    });

    test('3. Idempotency: first allowed, second blocked', () async {
      idempotencyRegistry.clear();
      final request = SignedOperationRequest(
        operationId: 'idem-op',
        resourceId: 'idem-res',
        payload: [1],
        signature: _sig([5]),
        metadata: _meta({'x': 'y'}),
      );
      final result = await writeService.execute(request);
      final canonical = serializer.serialize(result.envelope);
      final contract = DeterministicExecutionContract.fromCanonical(
        envelope: result.envelope,
        canonical: canonical,
        hasher: hasher,
      );

      expect(idempotencyGuard.checkAndRegister(contract).alreadyExecuted, false);
      expect(idempotencyGuard.checkAndRegister(contract).alreadyExecuted, true);
    });

    test('4. L5 failure path: invalid signature → signatureValid false, no exception', () async {
      final request = SignedOperationRequest(
        operationId: 'inv-op',
        resourceId: 'inv-res',
        payload: [1, 2],
        signature: _sig([3]),
        metadata: _meta({'k': 'v'}),
      );
      await writeService.execute(request);
      signaturePort.verifyReturnsValid = false;

      final retrieved = await readService.retrieve(operationId: 'inv-op', resourceId: 'inv-res');
      expect(retrieved.signatureValid, false);
      expect(retrieved.envelope.operationId, 'inv-op');
    });
  });
}
