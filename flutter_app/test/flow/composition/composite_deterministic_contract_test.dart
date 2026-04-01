// M1 — CompositeDeterministicContract tests. Does not modify L tests or L code.

import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/composition/composite_deterministic_contract.dart';

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
  group('CompositeDeterministicContract', () {
    group('1. Creation with valid contracts', () {
      test('composite non null, contractCount correct', () {
        final a = _dec(bytes: [1, 2], deterministicHash: 10);
        final b = _dec(bytes: [4, 5, 6], deterministicHash: 20);
        final cdc = CompositeDeterministicContract([a, b]);
        expect(cdc, isNotNull);
        expect(cdc.contracts.length, 2);
        expect(cdc.contracts[0].deterministicHash, 10);
        expect(cdc.contracts[1].deterministicHash, 20);
        expect(cdc.canonicalCompositeBytes.length, greaterThan(0));
        expect(cdc.compositeDeterministicHash, isNotNull);
      });
    });

    group('2. Empty list → throws', () {
      test('empty list throws ArgumentError', () {
        expect(
          () => CompositeDeterministicContract([]),
          throwsA(isA<ArgumentError>()),
        );
      });
    });

    group('3. Immutability test', () {
      test('mutate original list after construction → CDC unchanged', () {
        final a = _dec(bytes: [1], deterministicHash: 1);
        final b = _dec(bytes: [2], deterministicHash: 2);
        final list = [a, b];
        final cdc = CompositeDeterministicContract(list);
        final hashBefore = cdc.compositeDeterministicHash;
        final bytesBefore = cdc.canonicalCompositeBytes.toList();
        list.clear();
        list.add(_dec(bytes: [99], deterministicHash: 99));
        expect(cdc.contracts.length, 2);
        expect(cdc.contracts[0].deterministicHash, 1);
        expect(cdc.compositeDeterministicHash, hashBefore);
        expect(cdc.canonicalCompositeBytes.length, bytesBefore.length);
      });

      test('mutate original canonicalBytes after DEC in list → CDC invariant', () {
        final mutableBytes = Uint8List.fromList([1, 2, 3]);
        final dec = DeterministicExecutionContract(
          operationId: 'o',
          resourceId: 'r',
          canonicalBytes: mutableBytes,
          deterministicHash: 42,
        );
        final cdc = CompositeDeterministicContract([dec]);
        final hashBefore = cdc.compositeDeterministicHash;
        mutableBytes[0] = 99;
        expect(cdc.contracts[0].canonicalBytes[0], 1);
        expect(cdc.compositeDeterministicHash, hashBefore);
      });
    });

    group('4. Determinism test', () {
      test('two CDC from same DEC list → same hash and same canonicalCompositeBytes', () {
        final a = _dec(bytes: [7, 8], deterministicHash: 100);
        final b = _dec(bytes: [9, 10, 11], deterministicHash: 200);
        final cdc1 = CompositeDeterministicContract([a, b]);
        final cdc2 = CompositeDeterministicContract([a, b]);
        expect(cdc1.compositeDeterministicHash, cdc2.compositeDeterministicHash);
        expect(cdc1.canonicalCompositeBytes.length, cdc2.canonicalCompositeBytes.length);
        for (var i = 0; i < cdc1.canonicalCompositeBytes.length; i++) {
          expect(cdc1.canonicalCompositeBytes[i], cdc2.canonicalCompositeBytes[i]);
        }
      });
    });

    group('5. Order sensitivity test', () {
      test('reversed order of DECs → different hash', () {
        final a = _dec(bytes: [1], deterministicHash: 1);
        final b = _dec(bytes: [2], deterministicHash: 2);
        final cdcForward = CompositeDeterministicContract([a, b]);
        final cdcReversed = CompositeDeterministicContract([b, a]);
        expect(cdcForward.compositeDeterministicHash, isNot(cdcReversed.compositeDeterministicHash));
        expect(cdcForward.canonicalCompositeBytes.length, cdcReversed.canonicalCompositeBytes.length);
      });
    });

    group('6. Deep copy validation', () {
      test('external mutation of list used to build CDC does not alter composite bytes', () {
        final a = _dec(bytes: [1, 2], deterministicHash: 10);
        final b = _dec(bytes: [3, 4], deterministicHash: 20);
        final inputList = [a, b];
        final cdc = CompositeDeterministicContract(inputList);
        final snapshot = cdc.canonicalCompositeBytes.toList();
        inputList.add(_dec(bytes: [5], deterministicHash: 30));
        expect(cdc.contracts.length, 2);
        for (var i = 0; i < snapshot.length; i++) {
          expect(cdc.canonicalCompositeBytes[i], snapshot[i]);
        }
      });
    });
  });
}
