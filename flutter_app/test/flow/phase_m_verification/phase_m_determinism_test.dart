// Phase M verification — Determinism property tests. No Random; deterministic data only.

import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/composition/composable_deterministic_unit.dart';
import 'package:iris_flutter_app/flow/composition/composite_deterministic_contract.dart';
import 'package:iris_flutter_app/flow/composition/composite_idempotency_registry.dart';
import 'package:iris_flutter_app/flow/composition/conditional_flow_composer.dart';
import 'package:iris_flutter_app/flow/composition/conditional_parallel_flow_composer.dart';
import 'package:iris_flutter_app/flow/composition/nested_composite_deterministic_contract.dart';
import 'package:iris_flutter_app/flow/composition/nested_parallel_flow_composer.dart';
import 'package:iris_flutter_app/flow/composition/parallel_flow_composer.dart';
import 'package:iris_flutter_app/flow/graph/deterministic_flow_graph.dart';
import 'package:iris_flutter_app/flow/graph/deterministic_flow_graph_builder.dart';

DeterministicExecutionContract _dec({List<int>? bytes, int deterministicHash = 0}) {
  final b = bytes ?? [1, 2, 3];
  return DeterministicExecutionContract(
    operationId: 'op',
    resourceId: 'res',
    canonicalBytes: Uint8List.fromList(b),
    deterministicHash: deterministicHash,
  );
}

void main() {
  group('Phase M determinism', () {
    group('1. DEC repeated builds', () {
      test('100 builds → identical deterministicHash', () {
        final dec = _dec(bytes: [7, 8, 9], deterministicHash: 100);
        final first = dec.deterministicHash;
        for (var i = 0; i < 100; i++) {
          final d = _dec(bytes: [7, 8, 9], deterministicHash: 100);
          expect(d.deterministicHash, first);
        }
      });
    });

    group('2. CDC repeated builds', () {
      test('100 builds → identical compositeDeterministicHash', () {
        final a = _dec(bytes: [1], deterministicHash: 10);
        final b = _dec(bytes: [2], deterministicHash: 20);
        final composer = ParallelFlowComposer();
        final first = composer.compose([a, b]).compositeDeterministicHash;
        for (var i = 0; i < 100; i++) {
          final cdc = composer.compose([a, b]);
          expect(cdc.compositeDeterministicHash, first);
        }
      });
    });

    group('3. Nested CDC repeated builds', () {
      test('100 builds → identical nested hash', () {
        final a = _dec(bytes: [1], deterministicHash: 1);
        final b = _dec(bytes: [2], deterministicHash: 2);
        final composer = NestedParallelFlowComposer();
        final units = [DecUnit(a), DecUnit(b)];
        final first = composer.compose(units).deterministicHash;
        for (var i = 0; i < 100; i++) {
          expect(composer.compose(units).deterministicHash, first);
        }
      });
    });

    group('4. ConditionalParallel repeated builds', () {
      test('100 builds → identical CDC hash', () {
        final a = _dec(bytes: [1], deterministicHash: 5);
        final b = _dec(bytes: [2], deterministicHash: 15);
        final c = _dec(bytes: [3], deterministicHash: 25);
        final composer = ConditionalParallelFlowComposer();
        final first = composer.compose([a, b, c], (d) => d.deterministicHash >= 10).compositeDeterministicHash;
        for (var i = 0; i < 100; i++) {
          final cdc = composer.compose([a, b, c], (d) => d.deterministicHash >= 10);
          expect(cdc.compositeDeterministicHash, first);
        }
      });
    });

    group('5. DAG repeated builds', () {
      test('100 graph builds → identical graph hash', () {
        final a = _dec(bytes: [1], deterministicHash: 1);
        final b = _dec(bytes: [2], deterministicHash: 2);
        final nested = NestedParallelFlowComposer().compose([DecUnit(a), DecUnit(b)]);
        final builder = DeterministicFlowGraphBuilder();
        final first = builder.build(nested).deterministicHash;
        for (var i = 0; i < 100; i++) {
          expect(builder.build(nested).deterministicHash, first);
        }
      });
    });

    group('6. Idempotency registry stable', () {
      test('register same unit 100 times → isDuplicate true after first, size 1', () {
        final a = _dec(bytes: [1], deterministicHash: 42);
        final unit = DecUnit(a);
        final registry = CompositeIdempotencyRegistry();
        registry.register(unit);
        expect(registry.size, 1);
        for (var i = 0; i < 99; i++) {
          expect(registry.isDuplicate(unit), true);
          registry.register(unit);
        }
        expect(registry.size, 1);
      });

      test('registerIfAbsent same unit 100 times → returns true once, then false', () {
        final a = _dec(bytes: [1], deterministicHash: 43);
        final unit = DecUnit(a);
        final registry = CompositeIdempotencyRegistry();
        expect(registry.registerIfAbsent(unit), true);
        for (var i = 0; i < 99; i++) {
          expect(registry.registerIfAbsent(unit), false);
        }
        expect(registry.size, 1);
      });
    });
  });
}
