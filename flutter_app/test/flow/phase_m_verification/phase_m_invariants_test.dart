// Phase M verification — Invariants, structural sensitivity, collision, cycle A→B→A, memory isolation, entropy audit.

import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/composition/composable_deterministic_unit.dart';
import 'package:iris_flutter_app/flow/composition/composite_deterministic_contract.dart';
import 'package:iris_flutter_app/flow/composition/composite_idempotency_registry.dart';
import 'package:iris_flutter_app/flow/composition/nested_composite_deterministic_contract.dart';
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

bool _bytesEqual(Uint8List a, Uint8List b) {
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
  return true;
}

/// Test-only unit for cycle A→B→A.
class _CycleUnit implements ComposableDeterministicUnit {
  _CycleUnit(this.deterministicHash, this.canonicalBytes, this.children);
  @override
  final int deterministicHash;
  @override
  final Uint8List canonicalBytes;
  final List<ComposableDeterministicUnit> children;
}

void main() {
  group('Phase M invariants', () {
    group('1. Structural sensitivity (A+B)+C ≠ A+(B+C)', () {
      test('Nested CDC: left vs right structure → different hash and canonicalBytes', () {
        final a = _dec(bytes: [1], deterministicHash: 1);
        final b = _dec(bytes: [2], deterministicHash: 2);
        final c = _dec(bytes: [3], deterministicHash: 3);
        final ab = NestedCompositeDeterministicContract([DecUnit(a), DecUnit(b)]);
        final left = NestedCompositeDeterministicContract([ab, DecUnit(c)]);
        final bc = NestedCompositeDeterministicContract([DecUnit(b), DecUnit(c)]);
        final right = NestedCompositeDeterministicContract([DecUnit(a), bc]);
        expect(left.deterministicHash, isNot(right.deterministicHash));
        expect(_bytesEqual(left.canonicalBytes, right.canonicalBytes), false);
      });

      test('DAG: (A+B)+C vs A+(B+C) → different graph hash and canonicalBytes', () {
        final a = _dec(bytes: [1], deterministicHash: 1);
        final b = _dec(bytes: [2], deterministicHash: 2);
        final c = _dec(bytes: [3], deterministicHash: 3);
        final ab = NestedCompositeDeterministicContract([DecUnit(a), DecUnit(b)]);
        final left = NestedCompositeDeterministicContract([ab, DecUnit(c)]);
        final bc = NestedCompositeDeterministicContract([DecUnit(b), DecUnit(c)]);
        final right = NestedCompositeDeterministicContract([DecUnit(a), bc]);
        final builder = DeterministicFlowGraphBuilder();
        final gLeft = builder.build(left);
        final gRight = builder.build(right);
        expect(_bytesEqual(gLeft.canonicalBytes, gRight.canonicalBytes), false);
        expect(gLeft.deterministicHash, isNot(gRight.deterministicHash));
      });
    });

    group('2. Hash collision behavior', () {
      test('same deterministicHash different canonicalBytes → secondary sort consistent', () {
        const h = 42;
        final u1 = DecUnit(_dec(bytes: [1, 2, 3], deterministicHash: h));
        final u2 = DecUnit(_dec(bytes: [1, 2, 4], deterministicHash: h));
        final nested = NestedCompositeDeterministicContract([u1, u2]);
        final builder = DeterministicFlowGraphBuilder();
        final graph = builder.build(nested);
        expect(graph.root.children.length, 2);
        expect(graph.root.children[0].canonicalBytes[2], 3);
        expect(graph.root.children[1].canonicalBytes[2], 4);
      });

      test('idempotency registry: two units same hash → single entry, isDuplicate for both', () {
        final registry = CompositeIdempotencyRegistry();
        final u1 = DecUnit(_dec(bytes: [1, 2, 3], deterministicHash: 50));
        final u2 = DecUnit(_dec(bytes: [1, 2, 4], deterministicHash: 50));
        registry.register(u1);
        expect(registry.isDuplicate(u2), true);
        expect(registry.size, 1);
      });
    });

    group('3. Cycle detection A→B→A', () {
      test('artificial cycle A→B→A throws StateError', () {
        final childListA = <ComposableDeterministicUnit>[];
        final childListB = <ComposableDeterministicUnit>[];
        final unitA = _CycleUnit(1, Uint8List.fromList([1]), childListA);
        final unitB = _CycleUnit(2, Uint8List.fromList([2]), childListB);
        childListA.add(unitB);
        childListB.add(unitA);
        final builder = DeterministicFlowGraphBuilder(
          getChildUnitsOverride: (u) {
            if (u is _CycleUnit) return u.children;
            return null;
          },
        );
        expect(
          () => builder.build(unitA),
          throwsA(isA<StateError>().having((e) => e.message, 'message', 'Cycle detected')),
        );
      });
    });

    group('4. Memory isolation', () {
      test('two registries do not share state', () {
        final r1 = CompositeIdempotencyRegistry();
        final r2 = CompositeIdempotencyRegistry();
        final unit = DecUnit(_dec(bytes: [1], deterministicHash: 7));
        r1.register(unit);
        expect(r1.isDuplicate(unit), true);
        expect(r2.isDuplicate(unit), false);
        expect(r1.size, 1);
        expect(r2.size, 0);
      });

      test('two builders produce independent graphs', () {
        final a = _dec(bytes: [1], deterministicHash: 1);
        final nested = NestedCompositeDeterministicContract([DecUnit(a)]);
        final g1 = DeterministicFlowGraphBuilder().build(nested);
        final g2 = DeterministicFlowGraphBuilder().build(nested);
        expect(g1.deterministicHash, g2.deterministicHash);
        expect(identical(g1.root, g2.root), false);
      });
    });

    group('5. No entropy audit (Phase M lib)', () {
      test('composition and graph libs contain no DateTime/Random/UUID/JSON/async/Future/Timer', () {
        final dirs = [
          Directory('lib/flow/composition'),
          Directory('lib/flow/graph'),
        ];
        final forbidden = [
          'DateTime.',
          'Random',
          'UUID',
          'uuid.',
          'jsonEncode',
          'jsonDecode',
          'dart:convert',
          ' async ',
          ' await ',
          'Future<',
          'Timer.',
          'Timer(',
        ];
        final failures = <String>[];
        for (final dir in dirs) {
          if (!dir.existsSync()) continue;
          for (final e in dir.listSync(recursive: true)) {
            if (e is File && e.path.endsWith('.dart')) {
              final content = e.readAsStringSync();
              final path = e.path.replaceAll('\\', '/');
              for (final f in forbidden) {
                if (content.contains(f)) {
                  failures.add('$path: contains "$f"');
                }
              }
            }
          }
        }
        expect(failures, isEmpty);
      });
    });
  });
}
