// M3 — SequentialFlowComposer tests. Order preservation, determinism, no mutation propagation.

import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/composition/composite_deterministic_contract.dart';
import 'package:iris_flutter_app/flow/composition/sequential_flow_composer.dart';

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
  group('SequentialFlowComposer', () {
    late SequentialFlowComposer composer;

    setUp(() {
      composer = SequentialFlowComposer();
    });

    group('1. Basic composition', () {
      test('valid list → CDC created, contract count correct', () {
        final a = _dec(bytes: [1], deterministicHash: 10);
        final b = _dec(bytes: [2, 3], deterministicHash: 20);
        final cdc = composer.compose([a, b]);
        expect(cdc, isNotNull);
        expect(cdc.contracts.length, 2);
        expect(cdc.contracts[0].deterministicHash, 10);
        expect(cdc.contracts[1].deterministicHash, 20);
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

    group('3. Order preservation', () {
      test('compose([A, B]) hash != compose([B, A]) hash', () {
        final a = _dec(bytes: [1, 2], deterministicHash: 1);
        final b = _dec(bytes: [3, 4], deterministicHash: 2);
        final cdcAB = composer.compose([a, b]);
        final cdcBA = composer.compose([b, a]);
        expect(cdcAB.compositeDeterministicHash, isNot(cdcBA.compositeDeterministicHash));
      });
    });

    group('4. Determinism repeatability', () {
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

    group('5. No mutation propagation', () {
      test('mutate original list after compose() → CDC unchanged', () {
        final a = _dec(bytes: [1], deterministicHash: 1);
        final b = _dec(bytes: [2], deterministicHash: 2);
        final list = [a, b];
        final cdc = composer.compose(list);
        final hashBefore = cdc.compositeDeterministicHash;
        list.clear();
        list.add(_dec(bytes: [99], deterministicHash: 99));
        expect(cdc.contracts.length, 2);
        expect(cdc.contracts[0].deterministicHash, 1);
        expect(cdc.compositeDeterministicHash, hashBefore);
      });
    });

    group('6. No DEC mutation', () {
      test('mutate original canonicalBytes after compose() → CDC invariant', () {
        final mutableBytes = Uint8List.fromList([1, 2, 3]);
        final dec = DeterministicExecutionContract(
          operationId: 'o',
          resourceId: 'r',
          canonicalBytes: mutableBytes,
          deterministicHash: 42,
        );
        final cdc = composer.compose([dec]);
        final hashBefore = cdc.compositeDeterministicHash;
        mutableBytes[0] = 99;
        expect(cdc.contracts[0].canonicalBytes[0], 1);
        expect(cdc.compositeDeterministicHash, hashBefore);
      });
    });

    group('7. Nested composition compatibility', () {
      test('DEC from previous CDC chain → stability', () {
        final d1 = _dec(operationId: 'op1', bytes: [1], deterministicHash: 100);
        final d2 = _dec(operationId: 'op2', bytes: [2], deterministicHash: 200);
        final cdc1 = composer.compose([d1, d2]);
        final firstHash = cdc1.compositeDeterministicHash;
        final cdc2 = composer.compose([d1, d2]);
        expect(cdc2.compositeDeterministicHash, firstHash);
        expect(cdc2.contracts[0].operationId, 'op1');
        expect(cdc2.contracts[1].operationId, 'op2');
      });
    });
  });
}
