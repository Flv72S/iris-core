// M4 — ParallelFlowComposer tests. Order invariance, determinism, hash-collision secondary sort.

import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/composition/composite_deterministic_contract.dart';
import 'package:iris_flutter_app/flow/composition/parallel_flow_composer.dart';

DeterministicExecutionContract _dec({
  String operationId = 'op',
  String resourceId = 'res',
  List<int>? bytes,
  int deterministicHash = 0,
}) {
  final b = bytes ?? [1, 2, 3];
  return DeterministicExecutionContract(
    operationId: operationId,
    resourceId: resourceId,
    canonicalBytes: Uint8List.fromList(b),
    deterministicHash: deterministicHash,
  );
}

void main() {
  group('ParallelFlowComposer', () {
    late ParallelFlowComposer composer;

    setUp(() {
      composer = ParallelFlowComposer();
    });

    group('1. Basic composition', () {
      test('valid list → CDC created', () {
        final a = _dec(bytes: [1], deterministicHash: 10);
        final b = _dec(bytes: [2, 3], deterministicHash: 20);
        final cdc = composer.compose([a, b]);
        expect(cdc, isNotNull);
        expect(cdc.contracts.length, 2);
      });
    });

    group('2. Empty list → throws', () {
      test('empty list throws ArgumentError', () {
        expect(
          () => composer.compose([]),
          throwsA(isA<ArgumentError>()),
        );
      });
    });

    group('3. Order invariance', () {
      test('compose([A, B]) hash == compose([B, A]) hash, canonicalCompositeBytes identical', () {
        final a = _dec(bytes: [1, 2], deterministicHash: 1);
        final b = _dec(bytes: [3, 4], deterministicHash: 2);
        final cdcAB = composer.compose([a, b]);
        final cdcBA = composer.compose([b, a]);
        expect(cdcAB.compositeDeterministicHash, cdcBA.compositeDeterministicHash);
        expect(cdcAB.canonicalCompositeBytes.length, cdcBA.canonicalCompositeBytes.length);
        for (var i = 0; i < cdcAB.canonicalCompositeBytes.length; i++) {
          expect(cdcAB.canonicalCompositeBytes[i], cdcBA.canonicalCompositeBytes[i]);
        }
      });
    });

    group('4. Multiple permutations', () {
      test('3 contracts → all permutations → same hash', () {
        final a = _dec(bytes: [1], deterministicHash: 10);
        final b = _dec(bytes: [2], deterministicHash: 20);
        final c = _dec(bytes: [3], deterministicHash: 30);
        final refHash = composer.compose([a, b, c]).compositeDeterministicHash;
        expect(composer.compose([a, c, b]).compositeDeterministicHash, refHash);
        expect(composer.compose([b, a, c]).compositeDeterministicHash, refHash);
        expect(composer.compose([b, c, a]).compositeDeterministicHash, refHash);
        expect(composer.compose([c, a, b]).compositeDeterministicHash, refHash);
        expect(composer.compose([c, b, a]).compositeDeterministicHash, refHash);
      });
    });

    group('5. Determinism repeatability', () {
      test('50 iterations same list → hash invariant', () {
        final a = _dec(bytes: [7], deterministicHash: 7);
        final b = _dec(bytes: [8, 9], deterministicHash: 8);
        final list = [a, b];
        final firstHash = composer.compose(list).compositeDeterministicHash;
        for (var i = 0; i < 50; i++) {
          expect(composer.compose(list).compositeDeterministicHash, firstHash);
        }
      });
    });

    group('6. Hash collision secondary sort', () {
      test('two DEC same deterministicHash different canonicalBytes → secondary ordering applied, CDC deterministic', () {
        const sameHash = 42;
        final dec1 = DeterministicExecutionContract(
          operationId: 'op1',
          resourceId: 'r1',
          canonicalBytes: Uint8List.fromList([1, 2, 3]),
          deterministicHash: sameHash,
        );
        final dec2 = DeterministicExecutionContract(
          operationId: 'op2',
          resourceId: 'r2',
          canonicalBytes: Uint8List.fromList([1, 2, 4]),
          deterministicHash: sameHash,
        );
        final cdc1 = composer.compose([dec1, dec2]);
        final cdc2 = composer.compose([dec2, dec1]);
        expect(cdc1.compositeDeterministicHash, cdc2.compositeDeterministicHash);
        expect(cdc1.canonicalCompositeBytes.length, cdc2.canonicalCompositeBytes.length);
        for (var i = 0; i < cdc1.canonicalCompositeBytes.length; i++) {
          expect(cdc1.canonicalCompositeBytes[i], cdc2.canonicalCompositeBytes[i]);
        }
        expect(cdc1.contracts[0].canonicalBytes[2], 3);
        expect(cdc1.contracts[1].canonicalBytes[2], 4);
      });
    });

    group('7. No mutation propagation', () {
      test('mutate original list after compose() → CDC unchanged', () {
        final a = _dec(bytes: [1], deterministicHash: 1);
        final b = _dec(bytes: [2], deterministicHash: 2);
        final list = [a, b];
        final cdc = composer.compose(list);
        final hashBefore = cdc.compositeDeterministicHash;
        list.clear();
        list.add(_dec(bytes: [99], deterministicHash: 99));
        expect(cdc.contracts.length, 2);
        expect(cdc.compositeDeterministicHash, hashBefore);
      });
    });
  });
}
