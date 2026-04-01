// M5 — ConditionalFlowComposer tests. Predicate inclusion, order invariance, no mutation.

import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/composition/composite_deterministic_contract.dart';
import 'package:iris_flutter_app/flow/composition/conditional_flow_composer.dart';
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
  group('ConditionalFlowComposer', () {
    late ConditionalFlowComposer composer;
    late ParallelFlowComposer parallel;

    setUp(() {
      composer = ConditionalFlowComposer();
      parallel = ParallelFlowComposer();
    });

    group('1. Basic conditional inclusion', () {
      test('predicate include all → CDC identical to ParallelFlowComposer', () {
        final a = _dec(bytes: [1], deterministicHash: 10);
        final b = _dec(bytes: [2, 3], deterministicHash: 20);
        final list = [a, b];
        final cdcConditional = composer.compose(list, (_) => true);
        final cdcParallel = parallel.compose(list);
        expect(cdcConditional.compositeDeterministicHash, cdcParallel.compositeDeterministicHash);
        expect(cdcConditional.canonicalCompositeBytes.length, cdcParallel.canonicalCompositeBytes.length);
        for (var i = 0; i < cdcConditional.canonicalCompositeBytes.length; i++) {
          expect(cdcConditional.canonicalCompositeBytes[i], cdcParallel.canonicalCompositeBytes[i]);
        }
      });
    });

    group('2. Conditional filtering', () {
      test('predicate include half → CDC contains only selected DECs, composite hash verified', () {
        final a = _dec(bytes: [1], deterministicHash: 10);
        final b = _dec(bytes: [2], deterministicHash: 20);
        final c = _dec(bytes: [3], deterministicHash: 30);
        final list = [a, b, c];
        final cdc = composer.compose(list, (dec) => dec.deterministicHash == 10 || dec.deterministicHash == 30);
        expect(cdc.contracts.length, 2);
        expect(cdc.contracts.any((d) => d.deterministicHash == 10), true);
        expect(cdc.contracts.any((d) => d.deterministicHash == 30), true);
        expect(cdc.contracts.any((d) => d.deterministicHash == 20), false);
        final expected = parallel.compose([a, c]);
        expect(cdc.compositeDeterministicHash, expected.compositeDeterministicHash);
      });
    });

    group('3. Empty after filter → throws', () {
      test('no DEC satisfies predicate → ArgumentError', () {
        final a = _dec(bytes: [1], deterministicHash: 10);
        expect(
          () => composer.compose([a], (dec) => dec.deterministicHash == 99),
          throwsA(isA<ArgumentError>()),
        );
      });
    });

    group('4. Order invariance', () {
      test('different order of DEC in input, same included set → CDC unchanged', () {
        final a = _dec(bytes: [1], deterministicHash: 10);
        final b = _dec(bytes: [2], deterministicHash: 20);
        final c = _dec(bytes: [3], deterministicHash: 30);
        bool include(DeterministicExecutionContract d) => d.deterministicHash >= 15;
        final cdc1 = composer.compose([a, b, c], include);
        final cdc2 = composer.compose([c, a, b], include);
        expect(cdc1.compositeDeterministicHash, cdc2.compositeDeterministicHash);
        expect(cdc1.canonicalCompositeBytes.length, cdc2.canonicalCompositeBytes.length);
      });
    });

    group('5. Multiple permutations', () {
      test('same included list across permutations → CDC invariant', () {
        final a = _dec(bytes: [1], deterministicHash: 1);
        final b = _dec(bytes: [2], deterministicHash: 2);
        final c = _dec(bytes: [3], deterministicHash: 3);
        bool includeAll(DeterministicExecutionContract d) => true;
        final ref = composer.compose([a, b, c], includeAll);
        expect(composer.compose([a, c, b], includeAll).compositeDeterministicHash, ref.compositeDeterministicHash);
        expect(composer.compose([b, a, c], includeAll).compositeDeterministicHash, ref.compositeDeterministicHash);
        expect(composer.compose([b, c, a], includeAll).compositeDeterministicHash, ref.compositeDeterministicHash);
        expect(composer.compose([c, a, b], includeAll).compositeDeterministicHash, ref.compositeDeterministicHash);
        expect(composer.compose([c, b, a], includeAll).compositeDeterministicHash, ref.compositeDeterministicHash);
      });
    });

    group('6. Hash collision secondary sort', () {
      test('two DEC same deterministicHash different canonicalBytes, predicate includes both → secondary sort', () {
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
        final cdc1 = composer.compose([dec1, dec2], (_) => true);
        final cdc2 = composer.compose([dec2, dec1], (_) => true);
        expect(cdc1.compositeDeterministicHash, cdc2.compositeDeterministicHash);
        expect(cdc1.contracts[0].canonicalBytes[2], 3);
        expect(cdc1.contracts[1].canonicalBytes[2], 4);
      });
    });

    group('7. No mutation propagation', () {
      test('mutate original list after compose() → CDC unchanged', () {
        final a = _dec(bytes: [1], deterministicHash: 1);
        final b = _dec(bytes: [2], deterministicHash: 2);
        final list = [a, b];
        final cdc = composer.compose(list, (_) => true);
        final hashBefore = cdc.compositeDeterministicHash;
        list.clear();
        list.add(_dec(bytes: [99], deterministicHash: 99));
        expect(cdc.contracts.length, 2);
        expect(cdc.compositeDeterministicHash, hashBefore);
      });
    });
  });
}
