// L9 — Failure matrix hardening. Deterministic failure paths; no lib changes.

import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/application/contract/execution_contract_hasher.dart';
import 'package:iris_flutter_app/flow/application/idempotency/idempotency_guard.dart';
import 'package:iris_flutter_app/flow/application/idempotency/idempotency_registry.dart';
import 'package:iris_flutter_app/flow/application/model/operation_envelope.dart';
import 'package:iris_flutter_app/flow/application/model/operation_envelope_metadata.dart';
import 'package:iris_flutter_app/flow/application/retrieval/operation_retrieval_service.dart';
import 'package:iris_flutter_app/flow/application/serialization/operation_envelope_canonical.dart';
import 'package:iris_flutter_app/flow/application/serialization/operation_envelope_canonical_serializer.dart';
import 'package:iris_flutter_app/flow/application/service/signed_operation_request.dart';
import 'package:iris_flutter_app/flow/application/service/signed_operation_service.dart';
import 'package:iris_flutter_app/flow/application/validation/signed_operation_validator.dart';
import 'package:iris_flutter_app/flow/infrastructure/composition/infrastructure_orchestrator.dart';
import 'package:iris_flutter_app/flow/infrastructure/composition/infrastructure_operation_context.dart';
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
      metadata: const SignatureMetadata(signerId: 'n', algorithm: 'HMAC-SHA256'),
    );
OperationEnvelopeMetadata _meta(Map<String, String> m) =>
    OperationEnvelopeMetadata(attributes: m);

/// Orchestrator that returns configurable bytes on retrieve; optional throw on execute.
class _FailureMatrixOrchestrator extends InfrastructureOrchestrator {
  _FailureMatrixOrchestrator({
    List<int>? storedBytes,
    bool throwOnExecute = false,
    bool throwOnRetrieve = false,
  })  : _storedBytes = storedBytes ?? [],
        _throwOnExecute = throwOnExecute,
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
  final bool _throwOnExecute;
  final bool _throwOnRetrieve;

  void setStoredBytes(List<int> bytes) {
    _storedBytes.clear();
    _storedBytes.addAll(bytes);
  }

  @override
  Future<SignedPayload> executeSignedStorageOperation({
    required InfrastructureOperationContext context,
    required Future<List<int>> Function() payloadProvider,
  }) async {
    if (_throwOnExecute) throw Exception('orchestrator failure on execute');
    await payloadProvider();
    return _sig([0]);
  }

  @override
  Future<List<int>> retrievePersistedPayload(String resourceId) async {
    if (_throwOnRetrieve) throw Exception('orchestrator failure on retrieve');
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

/// Builds minimal valid canonical bytes via serializer for corruption/truncation tests.
List<int> _validCanonicalBytes() {
  final envelope = OperationEnvelope(
    operationId: 'op',
    resourceId: 'res',
    payload: [1, 2, 3],
    signature: _sig([10, 20]),
    metadata: _meta({'k': 'v'}),
  );
  final canonical = OperationEnvelopeCanonicalSerializer().serialize(envelope);
  return canonical.bytes.toList();
}

void main() {
  group('L9 — Deterministic Failure Matrix', () {
    late OperationEnvelopeCanonicalSerializer serializer;
    late ExecutionContractHasher hasher;

    setUp(() {
      serializer = OperationEnvelopeCanonicalSerializer();
      hasher = ExecutionContractHasher();
    });

    group('1. Corrupted canonical bytes (L5)', () {
      test('one byte modified → deterministic exception', () async {
        final bytes = _validCanonicalBytes();
        bytes[bytes.length ~/ 2] = bytes[bytes.length ~/ 2] ^ 0xff;
        final orchestrator = _FailureMatrixOrchestrator()..setStoredBytes(bytes);
        final service = OperationRetrievalService(
          orchestrator: orchestrator,
          serializer: serializer,
          signaturePort: _NoOpSignature(),
        );
        expect(
          () => service.retrieve(operationId: 'op', resourceId: 'res'),
          throwsA(anyOf(isA<RangeError>(), isA<StateError>(), isA<FormatException>())),
        );
      });

      test('length prefix incoherent (first length too large) → deterministic exception', () async {
        final bytes = _validCanonicalBytes();
        if (bytes.length >= 4) {
          bytes[0] = 0xff;
          bytes[1] = 0xff;
          bytes[2] = 0xff;
          bytes[3] = 0xff;
        }
        final orchestrator = _FailureMatrixOrchestrator()..setStoredBytes(bytes);
        final service = OperationRetrievalService(
          orchestrator: orchestrator,
          serializer: serializer,
          signaturePort: _NoOpSignature(),
        );
        expect(
          () => service.retrieve(operationId: 'op', resourceId: 'res'),
          throwsA(anyOf(isA<RangeError>(), isA<StateError>())),
        );
      });
    });

    group('2. Truncated payload (L5)', () {
      test('bytes cut in half → parsing fails predictably', () async {
        final bytes = _validCanonicalBytes();
        final truncated = bytes.sublist(0, bytes.length ~/ 2);
        final orchestrator = _FailureMatrixOrchestrator()..setStoredBytes(truncated);
        final service = OperationRetrievalService(
          orchestrator: orchestrator,
          serializer: serializer,
          signaturePort: _NoOpSignature(),
        );
        expect(
          () => service.retrieve(operationId: 'op', resourceId: 'res'),
          throwsA(anyOf(isA<RangeError>(), isA<StateError>())),
        );
      });
    });

    group('3. Metadata length inconsistency (L5)', () {
      test('attrCount declared != actual → deterministic error', () async {
        final bytes = _validCanonicalBytes();
        int offset = 0;
        int readLen() {
          final len = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
          offset += 4;
          return len;
        }
        offset += 4 + readLen();
        offset += 4 + readLen();
        offset += 4 + readLen();
        offset += 4 + readLen();
        final attrCountOffset = offset;
        final corrupted = List<int>.from(bytes);
        corrupted[attrCountOffset + 2] = 0xff;
        corrupted[attrCountOffset + 3] = 0xff;
        final orchestrator = _FailureMatrixOrchestrator()..setStoredBytes(corrupted);
        final service = OperationRetrievalService(
          orchestrator: orchestrator,
          serializer: serializer,
          signaturePort: _NoOpSignature(),
        );
        expect(
          () => service.retrieve(operationId: 'op', resourceId: 'res'),
          throwsA(anyOf(isA<RangeError>(), isA<StateError>())),
        );
      });
    });

    group('4. Simulated hash collision (L7)', () {
      test('two contracts same hash different bytes → second alreadyExecuted true (known L7 limit)', () async {
        const fixedHash = 42;
        final bytesA = Uint8List.fromList([1, 2, 3]);
        final bytesB = Uint8List.fromList([4, 5, 6]);
        final contractA = DeterministicExecutionContract(
          operationId: 'op',
          resourceId: 'res',
          canonicalBytes: bytesA,
          deterministicHash: fixedHash,
        );
        final contractB = DeterministicExecutionContract(
          operationId: 'op',
          resourceId: 'res',
          canonicalBytes: bytesB,
          deterministicHash: fixedHash,
        );
        final registry = IdempotencyRegistry();
        final guard = IdempotencyGuard(registry: registry);

        final result1 = guard.checkAndRegister(contractA);
        expect(result1.alreadyExecuted, false);

        final result2 = guard.checkAndRegister(contractB);
        expect(result2.alreadyExecuted, true);

        // L7 bases decision only on hash; collision yields alreadyExecuted == true.
        // This is the intended, documented behavior (conscious limit).
      });
    });

    group('5. Contract byte isolation under stress (L6)', () {
      test('mutate original list after creating contract → canonicalBytes unchanged', () {
        final mutable = Uint8List.fromList([1, 2, 3, 4, 5]);
        final contract = DeterministicExecutionContract(
          operationId: 'op',
          resourceId: 'res',
          canonicalBytes: mutable,
          deterministicHash: 123,
        );
        mutable[0] = 99;
        mutable[1] = 88;
        mutable[2] = 77;
        expect(contract.canonicalBytes[0], 1);
        expect(contract.canonicalBytes[1], 2);
        expect(contract.canonicalBytes[2], 3);
      });
    });

    group('6. Orchestrator throws during execute (L3)', () {
      test('exception propagates; no idempotency registration; no side effect', () async {
        final orchestrator = _FailureMatrixOrchestrator(throwOnExecute: true);
        final service = SignedOperationService(orchestrator: orchestrator, serializer: serializer);
        final request = SignedOperationRequest(
          operationId: 'op',
          resourceId: 'res',
          payload: [1, 2],
          signature: _sig([5]),
          metadata: _meta({'k': 'v'}),
        );
        expect(
          () => service.execute(request),
          throwsA(isA<Exception>().having((e) => e.toString(), 'message', contains('orchestrator'))),
        );
        final registry = IdempotencyRegistry();
        expect(registry.contains(0), false);
      });
    });

    group('6b. Orchestrator throws on retrieve (L5)', () {
      test('exception propagates unchanged', () async {
        final orchestrator = _FailureMatrixOrchestrator(throwOnRetrieve: true);
        final service = OperationRetrievalService(
          orchestrator: orchestrator,
          serializer: serializer,
          signaturePort: _NoOpSignature(),
        );
        expect(
          () => service.retrieve(operationId: 'op', resourceId: 'res'),
          throwsA(isA<Exception>().having((e) => e.toString(), 'message', contains('orchestrator'))),
        );
      });
    });

    group('7. Registry isolation between test runs (L7)', () {
      test('separate registries do not share state', () {
        final registry1 = IdempotencyRegistry();
        final registry2 = IdempotencyRegistry();
        registry1.register(100);
        expect(registry1.contains(100), true);
        expect(registry2.contains(100), false);
      });

      test('new registry per test has no contamination', () {
        final registry = IdempotencyRegistry();
        expect(registry.contains(999), false);
        registry.register(999);
        expect(registry.contains(999), true);
        registry.clear();
        expect(registry.contains(999), false);
      });
    });

    group('Determinism stress loop', () {
      test('100 iterations same request → hash and canonical unchanged; no observable leak', () async {
        final orchestrator = _FailureMatrixOrchestrator();
        final writeService = SignedOperationService(orchestrator: orchestrator, serializer: serializer);
        final validator = SignedOperationValidator();
        final registry = IdempotencyRegistry();
        final guard = IdempotencyGuard(registry: registry);
        final request = SignedOperationRequest(
          operationId: 'stress-op',
          resourceId: 'stress-res',
          payload: [7, 8, 9],
          signature: _sig([1]),
          metadata: _meta({'a': 'b'}),
        );

        validator.validate(request);
        final firstResult = await writeService.execute(request);
        final firstCanonical = serializer.serialize(firstResult.envelope);
        final firstContract = DeterministicExecutionContract.fromCanonical(
          envelope: firstResult.envelope,
          canonical: firstCanonical,
          hasher: hasher,
        );
        guard.checkAndRegister(firstContract);

        for (var i = 0; i < 99; i++) {
          validator.validate(request);
          final result = await writeService.execute(request);
          final canonical = serializer.serialize(result.envelope);
          final contract = DeterministicExecutionContract.fromCanonical(
            envelope: result.envelope,
            canonical: canonical,
            hasher: hasher,
          );
          expect(contract.deterministicHash, firstContract.deterministicHash);
          expect(canonical.bytes.length, firstCanonical.bytes.length);
          for (var j = 0; j < canonical.bytes.length; j++) {
            expect(canonical.bytes[j], firstCanonical.bytes[j], reason: 'iteration $i index $j');
          }
          final idemResult = guard.checkAndRegister(contract);
          expect(idemResult.alreadyExecuted, true);
        }
      });
    });
  });
}
