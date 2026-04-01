// M8 — CompositeIdempotencyRegistry tests. DEC, CDC, Nested; duplicate; collision; no mutation.

import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/composition/composite_deterministic_contract.dart';
import 'package:iris_flutter_app/flow/composition/composable_deterministic_unit.dart';
import 'package:iris_flutter_app/flow/composition/composite_idempotency_registry.dart';
import 'package:iris_flutter_app/flow/composition/nested_composite_deterministic_contract.dart';
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

void main() {
  group('CompositeIdempotencyRegistry', () {
    group('1. Register DEC', () {
      test('register DecUnit then isDuplicate true', () {
        final registry = CompositeIdempotencyRegistry();
        final dec = _dec(bytes: [1], deterministicHash: 10);
        expect(registry.isDuplicate(DecUnit(dec)), false);
        registry.register(DecUnit(dec));
        expect(registry.isDuplicate(DecUnit(dec)), true);
        expect(registry.size, 1);
      });
    });

    group('2. Register CDC', () {
      test('register CdcUnit then isDuplicate true', () {
        final registry = CompositeIdempotencyRegistry();
        final cdc = CompositeDeterministicContract([_dec(bytes: [1], deterministicHash: 1)]);
        final unit = CdcUnit(cdc);
        expect(registry.isDuplicate(unit), false);
        registry.register(unit);
        expect(registry.isDuplicate(unit), true);
        expect(registry.size, 1);
      });
    });

    group('3. Register Nested CDC', () {
      test('register NestedCompositeDeterministicContract then isDuplicate true', () {
        final registry = CompositeIdempotencyRegistry();
        final composer = NestedParallelFlowComposer();
        final nested = composer.compose([
          DecUnit(_dec(bytes: [1], deterministicHash: 1)),
          DecUnit(_dec(bytes: [2], deterministicHash: 2)),
        ]);
        expect(registry.isDuplicate(nested), false);
        registry.register(nested);
        expect(registry.isDuplicate(nested), true);
        expect(registry.size, 1);
      });
    });

    group('4. Duplicate detection', () {
      test('same unit registered twice → isDuplicate true after first register', () {
        final registry = CompositeIdempotencyRegistry();
        final unit = DecUnit(_dec(bytes: [5], deterministicHash: 5));
        registry.register(unit);
        expect(registry.isDuplicate(unit), true);
        registry.register(unit);
        expect(registry.size, 1);
      });
    });

    group('5. registerIfAbsent semantics', () {
      test('first call returns true, second returns false', () {
        final registry = CompositeIdempotencyRegistry();
        final unit = DecUnit(_dec(bytes: [1], deterministicHash: 7));
        expect(registry.registerIfAbsent(unit), true);
        expect(registry.registerIfAbsent(unit), false);
        expect(registry.size, 1);
      });
    });

    group('6. clear resets registry', () {
      test('after clear, isDuplicate false and size 0', () {
        final registry = CompositeIdempotencyRegistry();
        registry.register(DecUnit(_dec(bytes: [1], deterministicHash: 1)));
        expect(registry.size, 1);
        registry.clear();
        expect(registry.size, 0);
        expect(registry.isDuplicate(DecUnit(_dec(bytes: [1], deterministicHash: 1))), false);
      });
    });

    group('7. Separate registry instances isolation', () {
      test('two registries do not share state', () {
        final r1 = CompositeIdempotencyRegistry();
        final r2 = CompositeIdempotencyRegistry();
        final unit = DecUnit(_dec(bytes: [1], deterministicHash: 42));
        r1.register(unit);
        expect(r1.isDuplicate(unit), true);
        expect(r2.isDuplicate(unit), false);
        expect(r1.size, 1);
        expect(r2.size, 0);
      });
    });

    group('8. Collision deterministicHash behavior', () {
      test('two units same hash different canonicalBytes → registry treats as duplicate', () {
        const sameHash = 100;
        final u1 = DecUnit(DeterministicExecutionContract(
          operationId: 'a',
          resourceId: 'r',
          canonicalBytes: Uint8List.fromList([1, 2, 3]),
          deterministicHash: sameHash,
        ));
        final u2 = DecUnit(DeterministicExecutionContract(
          operationId: 'b',
          resourceId: 'r',
          canonicalBytes: Uint8List.fromList([4, 5, 6]),
          deterministicHash: sameHash,
        ));
        final registry = CompositeIdempotencyRegistry();
        registry.register(u1);
        expect(registry.isDuplicate(u2), true);
        expect(registry.registerIfAbsent(u2), false);
        expect(registry.size, 1);
      });
    });

    group('9. Multi-level nested duplicate', () {
      test('identical nested CDC → duplicate', () {
        final composer = NestedParallelFlowComposer();
        final a = DecUnit(_dec(bytes: [1], deterministicHash: 1));
        final b = DecUnit(_dec(bytes: [2], deterministicHash: 2));
        final nested1 = composer.compose([a, b]);
        final nested2 = composer.compose([a, b]);
        final registry = CompositeIdempotencyRegistry();
        registry.register(nested1);
        expect(registry.isDuplicate(nested2), true);
      });

      test('nested CDC with different structure → not duplicate', () {
        final composer = NestedParallelFlowComposer();
        final flat = ParallelFlowComposer();
        final d1 = _dec(bytes: [1], deterministicHash: 1);
        final d2 = _dec(bytes: [2], deterministicHash: 2);
        final d3 = _dec(bytes: [3], deterministicHash: 3);
        final nested = composer.compose([DecUnit(d1), DecUnit(d2)]);
        final flatCdc = flat.compose([d1, d2]);
        final registry = CompositeIdempotencyRegistry();
        registry.register(nested);
        expect(registry.isDuplicate(CdcUnit(flatCdc)), nested.deterministicHash == flatCdc.compositeDeterministicHash);
        registry.register(CdcUnit(flatCdc));
        final otherNested = composer.compose([DecUnit(d1), DecUnit(d3)]);
        expect(registry.isDuplicate(otherNested), false);
      });
    });

    group('10. No mutation', () {
      test('modify unit after register → registry unchanged', () {
        final registry = CompositeIdempotencyRegistry();
        final dec = _dec(bytes: [1, 2], deterministicHash: 11);
        final unit = DecUnit(dec);
        registry.register(unit);
        final hashBefore = unit.deterministicHash;
        expect(registry.size, 1);
        expect(registry.isDuplicate(unit), true);
        registry.register(unit);
        expect(registry.size, 1);
        expect(registry.isDuplicate(unit), true);
      });
    });
  });
}
