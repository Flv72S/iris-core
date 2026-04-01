// M9 — Deterministic flow graph and builder tests. All tests deterministic; no Random/I/O.

import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/composition/composable_deterministic_unit.dart';
import 'package:iris_flutter_app/flow/composition/composite_deterministic_contract.dart';
import 'package:iris_flutter_app/flow/composition/nested_composite_deterministic_contract.dart';
import 'package:iris_flutter_app/flow/composition/nested_parallel_flow_composer.dart';
import 'package:iris_flutter_app/flow/composition/parallel_flow_composer.dart';
import 'package:iris_flutter_app/flow/graph/deterministic_flow_graph.dart';
import 'package:iris_flutter_app/flow/graph/deterministic_flow_graph_builder.dart';

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

bool _bytesEqual(Uint8List a, Uint8List b) {
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
}

/// Test-only unit to create an artificial cycle when used with getChildUnitsOverride.
class _CycleTestUnit implements ComposableDeterministicUnit {
  _CycleTestUnit(this.deterministicHash, this.canonicalBytes, this.children);
  @override
  final int deterministicHash;
  @override
  final Uint8List canonicalBytes;
  final List<ComposableDeterministicUnit> children;
}

ComposableDeterministicUnit _createCycleUnit() {
  final children = <ComposableDeterministicUnit>[];
  final unit = _CycleTestUnit(42, Uint8List.fromList([1]), children);
  children.add(unit);
  return unit;
}

void main() {
  late DeterministicFlowGraphBuilder builder;
  late NestedParallelFlowComposer nestedComposer;
  late ParallelFlowComposer flatComposer;

  setUp(() {
    builder = DeterministicFlowGraphBuilder();
    nestedComposer = NestedParallelFlowComposer();
    flatComposer = ParallelFlowComposer();
  });

  group('DeterministicFlowGraphBuilder', () {
    group('1. Single DEC → leaf node', () {
      test('single DecUnit produces one node with no children', () {
        final dec = _dec(bytes: [1, 2, 3], deterministicHash: 100);
        final unit = DecUnit(dec);
        final graph = builder.build(unit);
        expect(graph.root.deterministicHash, 100);
        expect(graph.root.children, isEmpty);
        expect(graph.root.canonicalBytes.length, dec.canonicalBytes.length);
        expect(graph.deterministicHash, isNotNull);
        expect(graph.canonicalBytes.length, greaterThan(0));
      });
    });

    group('2. CDC → root with children', () {
      test('CdcUnit produces root with one child per contract', () {
        final a = _dec(bytes: [1], deterministicHash: 10);
        final b = _dec(bytes: [2], deterministicHash: 20);
        final cdc = flatComposer.compose([a, b]);
        final unit = CdcUnit(cdc);
        final graph = builder.build(unit);
        expect(graph.root.deterministicHash, cdc.compositeDeterministicHash);
        expect(graph.root.children.length, 2);
        expect(graph.root.children[0].deterministicHash, 10);
        expect(graph.root.children[1].deterministicHash, 20);
        expect(graph.root.children[0].children, isEmpty);
        expect(graph.root.children[1].children, isEmpty);
      });
    });

    group('3. Nested CDC multi-level (3 levels)', () {
      test('three levels of nesting produce correct tree', () {
        final d1 = _dec(bytes: [1], deterministicHash: 1);
        final d2 = _dec(bytes: [2], deterministicHash: 2);
        final level1 = nestedComposer.compose([DecUnit(d1), DecUnit(d2)]);
        final d3 = _dec(bytes: [3], deterministicHash: 3);
        final level2 = nestedComposer.compose([level1, DecUnit(d3)]);
        final d4 = _dec(bytes: [4], deterministicHash: 4);
        final level3 = nestedComposer.compose([level2, DecUnit(d4)]);
        final graph = builder.build(level3);
        expect(graph.root.children.length, 2);
        final withChildren = graph.root.children.where((n) => n.children.isNotEmpty).toList();
        final leaves = graph.root.children.where((n) => n.children.isEmpty).toList();
        expect(withChildren.length, 1);
        expect(leaves.length, 1);
        expect(withChildren[0].children.length, 2);
        final innerInner = withChildren[0].children.where((n) => n.children.isNotEmpty).toList();
        expect(innerInner.length, 1);
        expect(innerInner[0].children.length, 2);
        expect(innerInner[0].children[0].children, isEmpty);
        expect(innerInner[0].children[1].children, isEmpty);
      });
    });

    group('4. Order invariance between children', () {
      test('permuted input order yields same graph hash (children sorted by builder)', () {
        final a = _dec(bytes: [1], deterministicHash: 10);
        final b = _dec(bytes: [2], deterministicHash: 20);
        final n1 = nestedComposer.compose([DecUnit(a), DecUnit(b)]);
        final n2 = nestedComposer.compose([DecUnit(b), DecUnit(a)]);
        final g1 = builder.build(n1);
        final g2 = builder.build(n2);
        expect(g1.deterministicHash, g2.deterministicHash);
        expect(g1.canonicalBytes.length, g2.canonicalBytes.length);
      });
    });

    group('5. Structural difference detection', () {
      test('(A+B)+C and A+(B+C) produce different graph structure and hash', () {
        final a = _dec(bytes: [1], deterministicHash: 1);
        final b = _dec(bytes: [2], deterministicHash: 2);
        final c = _dec(bytes: [3], deterministicHash: 3);
        final ab = NestedCompositeDeterministicContract([DecUnit(a), DecUnit(b)]);
        final left = NestedCompositeDeterministicContract([ab, DecUnit(c)]);
        final bc = NestedCompositeDeterministicContract([DecUnit(b), DecUnit(c)]);
        final right = NestedCompositeDeterministicContract([DecUnit(a), bc]);
        final gLeft = builder.build(left);
        final gRight = builder.build(right);
        expect(_bytesEqual(gLeft.canonicalBytes, gRight.canonicalBytes), false);
        expect(gLeft.deterministicHash, isNot(gRight.deterministicHash));
      });
    });

    group('6. Cycle detection', () {
      test('cycle in unit tree throws StateError', () {
        final cycleRoot = _createCycleUnit();
        final builderWithOverride = DeterministicFlowGraphBuilder(
          getChildUnitsOverride: (u) {
            if (u is _CycleTestUnit) return u.children;
            return null;
          },
        );
        expect(
          () => builderWithOverride.build(cycleRoot),
          throwsA(isA<StateError>().having((e) => e.message, 'message', 'Cycle detected')),
        );
      });
    });

    group('7. Determinism across repeated builds', () {
      test('same root unit yields same graph hash and bytes every time', () {
        final a = _dec(bytes: [7], deterministicHash: 7);
        final b = _dec(bytes: [8], deterministicHash: 8);
        final nested = nestedComposer.compose([DecUnit(a), DecUnit(b)]);
        final first = builder.build(nested);
        for (var i = 0; i < 20; i++) {
          final again = builder.build(nested);
          expect(again.deterministicHash, first.deterministicHash);
          expect(again.canonicalBytes.length, first.canonicalBytes.length);
          for (var j = 0; j < first.canonicalBytes.length; j++) {
            expect(again.canonicalBytes[j], first.canonicalBytes[j]);
          }
        }
      });
    });

    group('8. Hash collision handling', () {
      test('two nodes same hash different canonicalBytes ordered by bytes', () {
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
        final nested = nestedComposer.compose([u1, u2]);
        final graph = builder.build(nested);
        expect(graph.root.children.length, 2);
        final c0 = graph.root.children[0];
        final c1 = graph.root.children[1];
        expect(c0.deterministicHash, sameHash);
        expect(c1.deterministicHash, sameHash);
        expect(c0.canonicalBytes[2], 3);
        expect(c1.canonicalBytes[2], 4);
        final permuted = nestedComposer.compose([u2, u1]);
        final graphPermuted = builder.build(permuted);
        expect(graphPermuted.deterministicHash, graph.deterministicHash);
      });
    });

    group('9. Graph canonicalBytes invariance', () {
      test('same structure produces identical canonicalBytes', () {
        final a = _dec(bytes: [1], deterministicHash: 1);
        final b = _dec(bytes: [2], deterministicHash: 2);
        final nested = nestedComposer.compose([DecUnit(a), DecUnit(b)]);
        final g1 = builder.build(nested);
        final g2 = builder.build(nested);
        expect(g1.canonicalBytes.length, g2.canonicalBytes.length);
        for (var i = 0; i < g1.canonicalBytes.length; i++) {
          expect(g2.canonicalBytes[i], g1.canonicalBytes[i]);
        }
      });
    });

    group('10. No mutation propagation', () {
      test('mutating list after build does not change graph', () {
        final a = _dec(bytes: [1], deterministicHash: 1);
        final b = _dec(bytes: [2], deterministicHash: 2);
        final list = [DecUnit(a), DecUnit(b)];
        final nested = nestedComposer.compose(list);
        final graph = builder.build(nested);
        final hashBefore = graph.deterministicHash;
        final bytesBefore = graph.canonicalBytes.toList();
        list.clear();
        list.add(DecUnit(_dec(bytes: [99], deterministicHash: 99)));
        expect(graph.deterministicHash, hashBefore);
        expect(graph.canonicalBytes.length, bytesBefore.length);
        for (var i = 0; i < bytesBefore.length; i++) {
          expect(graph.canonicalBytes[i], bytesBefore[i]);
        }
      });
    });
  });
}
