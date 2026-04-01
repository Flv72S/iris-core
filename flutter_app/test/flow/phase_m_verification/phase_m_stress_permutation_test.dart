// Phase M verification — Order-invariance: all permutations yield same hash. Deterministic permutation set.

import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/composition/composable_deterministic_unit.dart';
import 'package:iris_flutter_app/flow/composition/conditional_flow_composer.dart';
import 'package:iris_flutter_app/flow/composition/conditional_parallel_flow_composer.dart';
import 'package:iris_flutter_app/flow/composition/nested_parallel_flow_composer.dart';
import 'package:iris_flutter_app/flow/composition/parallel_flow_composer.dart';

DeterministicExecutionContract _dec({List<int>? bytes, int deterministicHash = 0}) {
  final b = bytes ?? [1, 2, 3];
  return DeterministicExecutionContract(
    operationId: 'op',
    resourceId: 'res',
    canonicalBytes: Uint8List.fromList(b),
    deterministicHash: deterministicHash,
  );
}

/// All 6 permutations of [0,1,2]. Deterministic order.
List<List<int>> _perm3() {
  return [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];
}

void main() {
  late DeterministicExecutionContract a;
  late DeterministicExecutionContract b;
  late DeterministicExecutionContract c;

  setUp(() {
    a = _dec(bytes: [1], deterministicHash: 10);
    b = _dec(bytes: [2], deterministicHash: 20);
    c = _dec(bytes: [3], deterministicHash: 30);
  });

  group('Phase M order-invariance', () {
    group('1. ParallelFlowComposer', () {
      test('all 6 permutations of 3 DECs → same compositeDeterministicHash', () {
        final composer = ParallelFlowComposer();
        final contracts = [a, b, c];
        int? refHash;
        for (final perm in _perm3()) {
          final list = [contracts[perm[0]], contracts[perm[1]], contracts[perm[2]]];
          final cdc = composer.compose(list);
          refHash ??= cdc.compositeDeterministicHash;
          expect(cdc.compositeDeterministicHash, refHash);
        }
      });
    });

    group('2. ConditionalFlowComposer (include-all predicate)', () {
      test('all 6 permutations → same compositeDeterministicHash', () {
        final composer = ConditionalFlowComposer();
        final contracts = [a, b, c];
        int? refHash;
        for (final perm in _perm3()) {
          final list = [contracts[perm[0]], contracts[perm[1]], contracts[perm[2]]];
          final cdc = composer.compose(list, (_) => true);
          refHash ??= cdc.compositeDeterministicHash;
          expect(cdc.compositeDeterministicHash, refHash);
        }
      });
    });

    group('3. ConditionalParallelFlowComposer (include-all predicate)', () {
      test('all 6 permutations → same compositeDeterministicHash', () {
        final composer = ConditionalParallelFlowComposer();
        final contracts = [a, b, c];
        int? refHash;
        for (final perm in _perm3()) {
          final list = [contracts[perm[0]], contracts[perm[1]], contracts[perm[2]]];
          final cdc = composer.compose(list, (_) => true);
          refHash ??= cdc.compositeDeterministicHash;
          expect(cdc.compositeDeterministicHash, refHash);
        }
      });
    });

    group('4. NestedParallelFlowComposer', () {
      test('all 6 permutations of 3 DecUnits → same nested deterministicHash', () {
        final composer = NestedParallelFlowComposer();
        final units = [DecUnit(a), DecUnit(b), DecUnit(c)];
        int? refHash;
        for (final perm in _perm3()) {
          final list = [units[perm[0]], units[perm[1]], units[perm[2]]];
          final nested = composer.compose(list);
          refHash ??= nested.deterministicHash;
          expect(nested.deterministicHash, refHash);
        }
      });
    });
  });
}
