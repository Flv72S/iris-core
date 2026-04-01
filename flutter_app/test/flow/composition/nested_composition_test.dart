// M7 — Nested composition tests. DEC/CDC as units; structural difference; determinism.

import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/composition/composite_deterministic_contract.dart';
import 'package:iris_flutter_app/flow/composition/composable_deterministic_unit.dart';
import 'package:iris_flutter_app/flow/composition/nested_composite_deterministic_contract.dart';
import 'package:iris_flutter_app/flow/composition/nested_parallel_flow_composer.dart';
import 'package:iris_flutter_app/flow/composition/parallel_flow_composer.dart';

DeterministicExecutionContract _dec({
  List<int>? bytes,
  int deterministicHash = 0,
}) {
  final b = bytes ?? [1, 2, 3];
  return DeterministicExecutionContract(
    operationId: 'op',
    resourceId: 'res',
    canonicalBytes: Uint8List.fromList(b),
    deterministicHash: deterministicHash,
  );
}

void main() {
  group('Nested composition', () {
    late NestedParallelFlowComposer nestedComposer;
    late ParallelFlowComposer flatComposer;

    setUp(() {
      nestedComposer = NestedParallelFlowComposer();
      flatComposer = ParallelFlowComposer();
    });

    group('1. DEC + DEC → Nested CDC', () {
      test('two DecUnits compose to NestedCompositeDeterministicContract', () {
        final a = _dec(bytes: [1], deterministicHash: 10);
        final b = _dec(bytes: [2], deterministicHash: 20);
        final nested = nestedComposer.compose([DecUnit(a), DecUnit(b)]);
        expect(nested, isA<NestedCompositeDeterministicContract>());
        expect(nested.units.length, 2);
        expect(nested.deterministicHash, isNotNull);
        expect(nested.canonicalBytes.length, greaterThan(0));
      });
    });

    group('2. CDC + DEC → Nested CDC', () {
      test('CdcUnit and DecUnit compose', () {
        final a = _dec(bytes: [1], deterministicHash: 5);
        final b = _dec(bytes: [2], deterministicHash: 15);
        final cdc = flatComposer.compose([a, b]);
        final c = _dec(bytes: [3], deterministicHash: 25);
        final nested = nestedComposer.compose([CdcUnit(cdc), DecUnit(c)]);
        expect(nested.units.length, 2);
        expect(nested.deterministicHash, isNotNull);
      });
    });

    group('3. CDC + CDC → Nested CDC', () {
      test('two CdcUnits compose', () {
        final cdc1 = flatComposer.compose([_dec(bytes: [1], deterministicHash: 1)]);
        final cdc2 = flatComposer.compose([_dec(bytes: [2], deterministicHash: 2)]);
        final nested = nestedComposer.compose([CdcUnit(cdc1), CdcUnit(cdc2)]);
        expect(nested.units.length, 2);
        expect(nested.deterministicHash, isNotNull);
      });
    });

    group('4. Multi-level nesting (3 levels)', () {
      test('DEC → nested → nested', () {
        final d1 = _dec(bytes: [1], deterministicHash: 1);
        final d2 = _dec(bytes: [2], deterministicHash: 2);
        final level1 = nestedComposer.compose([DecUnit(d1), DecUnit(d2)]);
        final d3 = _dec(bytes: [3], deterministicHash: 3);
        final level2 = nestedComposer.compose([level1, DecUnit(d3)]);
        final d4 = _dec(bytes: [4], deterministicHash: 4);
        final level3 = nestedComposer.compose([level2, DecUnit(d4)]);
        expect(level3.units.length, 2);
        expect(level3.deterministicHash, isNotNull);
        expect(level3.canonicalBytes.length, greaterThan(0));
      });
    });

    group('5. Order invariance at same level', () {
      test('permuted units → same nested CDC', () {
        final a = _dec(bytes: [1], deterministicHash: 10);
        final b = _dec(bytes: [2], deterministicHash: 20);
        final n1 = nestedComposer.compose([DecUnit(a), DecUnit(b)]);
        final n2 = nestedComposer.compose([DecUnit(b), DecUnit(a)]);
        expect(n1.deterministicHash, n2.deterministicHash);
        expect(n1.canonicalBytes.length, n2.canonicalBytes.length);
      });
    });

    group('6. Structural difference detection', () {
      test('(A+B)+C ≠ A+(B+C) as structure', () {
        final a = _dec(bytes: [1], deterministicHash: 1);
        final b = _dec(bytes: [2], deterministicHash: 2);
        final c = _dec(bytes: [3], deterministicHash: 3);
        final ab = nestedComposer.compose([DecUnit(a), DecUnit(b)]);
        final left = nestedComposer.compose([ab, DecUnit(c)]);
        final bc = nestedComposer.compose([DecUnit(b), DecUnit(c)]);
        final right = nestedComposer.compose([DecUnit(a), bc]);
        expect(left.deterministicHash, isNot(right.deterministicHash));
      });
    });

    group('7. Collision deterministicHash handling', () {
      test('two units same hash different bytes → secondary sort', () {
        const sameHash = 42;
        final u1 = DecUnit(DeterministicExecutionContract(
          operationId: 'o1',
          resourceId: 'r1',
          canonicalBytes: Uint8List.fromList([1, 2, 3]),
          deterministicHash: sameHash,
        ));
        final u2 = DecUnit(DeterministicExecutionContract(
          operationId: 'o2',
          resourceId: 'r2',
          canonicalBytes: Uint8List.fromList([1, 2, 4]),
          deterministicHash: sameHash,
        ));
        final n1 = nestedComposer.compose([u1, u2]);
        final n2 = nestedComposer.compose([u2, u1]);
        expect(n1.deterministicHash, n2.deterministicHash);
        expect(n1.units.first.canonicalBytes[2], 3);
        expect(n1.units[1].canonicalBytes[2], 4);
      });
    });

    group('8. No mutation propagation', () {
      test('mutate list after compose() → nested CDC unchanged', () {
        final a = _dec(bytes: [1], deterministicHash: 1);
        final b = _dec(bytes: [2], deterministicHash: 2);
        final list = [DecUnit(a), DecUnit(b)];
        final nested = nestedComposer.compose(list);
        final hashBefore = nested.deterministicHash;
        list.clear();
        list.add(DecUnit(_dec(bytes: [99], deterministicHash: 99)));
        expect(nested.units.length, 2);
        expect(nested.deterministicHash, hashBefore);
      });
    });

    group('9. Determinism across repeated builds', () {
      test('same units → same nested CDC hash repeatedly', () {
        final a = _dec(bytes: [7], deterministicHash: 7);
        final b = _dec(bytes: [8], deterministicHash: 8);
        final units = [DecUnit(a), DecUnit(b)];
        final first = nestedComposer.compose(units).deterministicHash;
        for (var i = 0; i < 20; i++) {
          expect(nestedComposer.compose(units).deterministicHash, first);
        }
      });
    });
  });
}
