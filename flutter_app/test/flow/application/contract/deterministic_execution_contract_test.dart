import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/application/contract/execution_contract_hasher.dart';
import 'package:iris_flutter_app/flow/application/model/operation_envelope.dart';
import 'package:iris_flutter_app/flow/application/model/operation_envelope_metadata.dart';
import 'package:iris_flutter_app/flow/application/serialization/operation_envelope_canonical.dart';
import 'package:iris_flutter_app/flow/application/serialization/operation_envelope_canonical_serializer.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signed_payload.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_metadata.dart';

SignedPayload _sig(List<int> b) => SignedPayload(
      signatureBytes: b,
      metadata: const SignatureMetadata(signerId: 's', algorithm: 'a'),
    );
OperationEnvelopeMetadata _meta(Map<String, String> m) =>
    OperationEnvelopeMetadata(attributes: m);

OperationEnvelope _envelope({
  String operationId = 'op-1',
  String resourceId = 'res-1',
  List<int>? payload,
  OperationEnvelopeMetadata? metadata,
}) {
  return OperationEnvelope(
    operationId: operationId,
    resourceId: resourceId,
    payload: payload ?? [1, 2, 3],
    signature: _sig([10, 20]),
    metadata: metadata ?? _meta({'k': 'v'}),
  );
}

void main() {
  group('ExecutionContractHasher', () {
    test('same bytes → same hash', () {
      final hasher = ExecutionContractHasher();
      final bytes = Uint8List.fromList([1, 2, 3, 4, 5]);
      expect(hasher.hash(bytes), hasher.hash(Uint8List.fromList([1, 2, 3, 4, 5])));
    });
    test('different bytes → different hash', () {
      final hasher = ExecutionContractHasher();
      final a = Uint8List.fromList([1, 2, 3]);
      final b = Uint8List.fromList([1, 2, 4]);
      expect(hasher.hash(a), isNot(equals(hasher.hash(b))));
    });
    test('empty bytes has fixed hash (FNV-1a offset basis)', () {
      final hasher = ExecutionContractHasher();
      final h = hasher.hash(Uint8List(0));
      expect(h, 0x811c9dc5);
    });
  });

  group('DeterministicExecutionContract', () {
    late OperationEnvelopeCanonicalSerializer serializer;
    late ExecutionContractHasher hasher;

    setUp(() {
      serializer = OperationEnvelopeCanonicalSerializer();
      hasher = ExecutionContractHasher();
    });

    group('1. Deterministic hash stability', () {
      test('same bytes → same hash across calls', () {
        final envelope = _envelope(operationId: 'a', resourceId: 'b');
        final canonical = serializer.serialize(envelope);
        final c1 = DeterministicExecutionContract.fromCanonical(
          envelope: envelope,
          canonical: canonical,
          hasher: hasher,
        );
        final c2 = DeterministicExecutionContract.fromCanonical(
          envelope: envelope,
          canonical: canonical,
          hasher: hasher,
        );
        expect(c1.deterministicHash, c2.deterministicHash);
      });
      test('known bytes produce stable hash value', () {
        final bytes = Uint8List.fromList([72, 101, 108, 108, 111]); // "Hello"
        final h = ExecutionContractHasher().hash(bytes);
        expect(h, ExecutionContractHasher().hash(bytes));
        expect(h, isNonZero);
      });
    });

    group('2. Hash changes if byte changes', () {
      test('mutate one byte → different hash', () {
        final envelope = _envelope(operationId: 'x', resourceId: 'y', payload: [1, 2, 3]);
        final canonical = serializer.serialize(envelope);
        final contract = DeterministicExecutionContract.fromCanonical(
          envelope: envelope,
          canonical: canonical,
          hasher: hasher,
        );
        final tampered = Uint8List.fromList(canonical.bytes.toList());
        tampered[tampered.length - 1] ^= 0xff;
        final hashTampered = hasher.hash(tampered);
        expect(hashTampered, isNot(equals(contract.deterministicHash)));
      });
    });

    group('3. Canonical isolation', () {
      test('mutating bytes passed to constructor does not change contract bytes', () {
        final mutable = Uint8List.fromList([1, 2, 3, 4, 5]);
        final h = hasher.hash(mutable);
        final contract = DeterministicExecutionContract(
          operationId: 'o',
          resourceId: 'r',
          canonicalBytes: mutable,
          deterministicHash: h,
        );
        mutable[0] = 99;
        expect(contract.canonicalBytes[0], 1);
      });
      test('contract canonicalBytes is unmodifiable', () {
        final envelope = _envelope();
        final canonical = serializer.serialize(envelope);
        final contract = DeterministicExecutionContract.fromCanonical(
          envelope: envelope,
          canonical: canonical,
          hasher: hasher,
        );
        expect(
          () => contract.canonicalBytes[0] = 0,
          throwsA(isA<UnsupportedError>()),
        );
      });
    });

    group('4. Equality semantics', () {
      test('two contracts from same bytes → equal hash and equal bytes', () {
        final envelope = _envelope(operationId: 'id', resourceId: 'res');
        final canonical = serializer.serialize(envelope);
        final c1 = DeterministicExecutionContract.fromCanonical(
          envelope: envelope,
          canonical: canonical,
          hasher: hasher,
        );
        final c2 = DeterministicExecutionContract.fromCanonical(
          envelope: envelope,
          canonical: canonical,
          hasher: hasher,
        );
        expect(c1.deterministicHash, c2.deterministicHash);
        expect(c1.canonicalBytes.length, c2.canonicalBytes.length);
        for (var i = 0; i < c1.canonicalBytes.length; i++) {
          expect(c1.canonicalBytes[i], c2.canonicalBytes[i]);
        }
        expect(c1, equals(c2));
        expect(c1.hashCode, c2.hashCode);
      });
      test('different operationId → not equal', () {
        final e1 = _envelope(operationId: 'a', resourceId: 'r');
        final e2 = _envelope(operationId: 'b', resourceId: 'r');
        final can = serializer.serialize(e1);
        final c1 = DeterministicExecutionContract.fromCanonical(envelope: e1, canonical: can, hasher: hasher);
        final c2 = DeterministicExecutionContract.fromCanonical(envelope: e2, canonical: can, hasher: hasher);
        expect(c1, isNot(equals(c2)));
      });
    });

    group('5. Determinism guard', () {
      test('contract module does not use DateTime, Random, UUID, crypto, serializer, orchestrator', () async {
        final dir = Directory('lib/flow/application/contract');
        expect(await dir.exists(), true);
        await for (final e in dir.list()) {
          if (e is! File || !e.path.replaceAll(r'\', '/').endsWith('.dart')) continue;
          final content = await e.readAsString();
          expect(content.contains('DateTime'), false, reason: e.path);
          expect(content.contains('Random'), false, reason: e.path);
          expect(content.contains('Uuid'), false, reason: e.path);
          expect(content.contains("package:crypto") || content.contains("import 'crypto"), false, reason: e.path);
          expect(content.contains('CanonicalSerializer'), false, reason: e.path);
          expect(content.contains('orchestrator'), false, reason: e.path);
        }
      });
    });
  });
}
