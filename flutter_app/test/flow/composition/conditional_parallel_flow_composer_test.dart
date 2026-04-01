// M6 — ConditionalParallelFlowComposer tests. Filter + parallel; no Random; deterministic data only.

import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/composition/conditional_parallel_flow_composer.dart';
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
  group('ConditionalParallelFlowComposer', () {
    late ConditionalParallelFlowComposer composer;
    late ParallelFlowComposer parallel;

    setUp(() {
      composer = ConditionalParallelFlowComposer();
      parallel = ParallelFlowComposer();
    });

    group('1. Include all (predicate = true)', () {
      test('produces same result as ParallelFlowComposer', () {
        final a = _dec(bytes: [1], deterministicHash: 10);
        final b = _dec(bytes: [2, 3], deterministicHash: 20);
        final list = [a, b];
        final cdcM6 = composer.compose(list, (_) => true);
        final cdcParallel = parallel.compose(list);
        expect(cdcM6.compositeDeterministicHash, cdcParallel.compositeDeterministicHash);
        expect(cdcM6.canonicalCompositeBytes.length, cdcParallel.canonicalCompositeBytes.length);
        for (var i = 0; i < cdcM6.canonicalCompositeBytes.length; i++) {
          expect(cdcM6.canonicalCompositeBytes[i], cdcParallel.canonicalCompositeBytes[i]);
        }
      });
    });

    group('2. Partial filter', () {
      test('only DEC that satisfy predicate are included', () {
        final a = _dec(bytes: [1], deterministicHash: 5);
        final b = _dec(bytes: [2], deterministicHash: 15);
        final c = _dec(bytes: [3], deterministicHash: 25);
        final list = [a, b, c];
        final cdc = composer.compose(list, (d) => d.deterministicHash >= 10 && d.deterministicHash <= 20);
        expect(cdc.contracts.length, 1);
        expect(cdc.contracts.single.deterministicHash, 15);
      });
    });

    group('3. Filter removes all', () {
      test('throws ArgumentError', () {
        final a = _dec(bytes: [1], deterministicHash: 10);
        expect(
          () => composer.compose([a], (d) => d.deterministicHash == 99),
          throwsA(isA<ArgumentError>()),
        );
      });

      test('empty contracts throws ArgumentError', () {
        expect(
          () => composer.compose([], (_) => true),
          throwsA(isA<ArgumentError>()),
        );
      });
    });

    group('4. Order invariance', () {
      test('permuted input → CDC identical', () {
        final a = _dec(bytes: [1], deterministicHash: 10);
        final b = _dec(bytes: [2], deterministicHash: 20);
        final c = _dec(bytes: [3], deterministicHash: 30);
        bool all(DeterministicExecutionContract d) => true;
        final cdc1 = composer.compose([a, b, c], all);
        final cdc2 = composer.compose([c, a, b], all);
        expect(cdc1.compositeDeterministicHash, cdc2.compositeDeterministicHash);
        expect(cdc1.canonicalCompositeBytes.length, cdc2.canonicalCompositeBytes.length);
      });
    });

    group('5. Predicate sensitivity', () {
      test('two different predicates → different CDC', () {
        final a = _dec(bytes: [1], deterministicHash: 10);
        final b = _dec(bytes: [2], deterministicHash: 20);
        final c = _dec(bytes: [3], deterministicHash: 30);
        final list = [a, b, c];
        final cdcA = composer.compose(list, (d) => d.deterministicHash == 10);
        final cdcB = composer.compose(list, (d) => d.deterministicHash == 20);
        expect(cdcA.compositeDeterministicHash, isNot(cdcB.compositeDeterministicHash));
        expect(cdcA.contracts.length, 1);
        expect(cdcB.contracts.length, 1);
      });
    });

    group('6. Collision deterministicHash', () {
      test('secondary sort on canonicalBytes when hash equal', () {
        const sameHash = 7;
        final dec1 = DeterministicExecutionContract(
          operationId: 'o1',
          resourceId: 'r1',
          canonicalBytes: Uint8List.fromList([1, 2, 3]),
          deterministicHash: sameHash,
        );
        final dec2 = DeterministicExecutionContract(
          operationId: 'o2',
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

    group('7. No mutation', () {
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

    group('8. Multiple permutations deterministic', () {
      test('all permutations of same set → same CDC', () {
        final a = _dec(bytes: [1], deterministicHash: 1);
        final b = _dec(bytes: [2], deterministicHash: 2);
        final c = _dec(bytes: [3], deterministicHash: 3);
        bool all(DeterministicExecutionContract d) => true;
        final ref = composer.compose([a, b, c], all);
        final permutations = [
          [a, b, c],
          [a, c, b],
          [b, a, c],
          [b, c, a],
          [c, a, b],
          [c, b, a],
        ];
        for (final p in permutations) {
          final cdc = composer.compose(p, all);
          expect(cdc.compositeDeterministicHash, ref.compositeDeterministicHash);
        }
      });
    });
  });
}
