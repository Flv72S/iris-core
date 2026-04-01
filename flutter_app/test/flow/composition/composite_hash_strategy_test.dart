// M2 — CompositeHashStrategy tests. Determinism, bit sensitivity, order, stability, collision sanity.

import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/composition/composite_deterministic_contract.dart';
import 'package:iris_flutter_app/flow/composition/composite_hash_strategy.dart';

void main() {
  group('CompositeHashStrategy', () {
    group('1. Deterministic repeatability', () {
      test('same bytes → same hash (100 iterations)', () {
        final bytes = Uint8List.fromList([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        final first = CompositeHashStrategy.compute(bytes);
        for (var i = 0; i < 100; i++) {
          expect(CompositeHashStrategy.compute(bytes), first);
        }
      });
    });

    group('2. Bit flip sensitivity', () {
      test('modify 1 byte → hash different', () {
        final bytes = Uint8List.fromList([1, 2, 3, 4, 5]);
        final originalHash = CompositeHashStrategy.compute(bytes);
        for (var i = 0; i < bytes.length; i++) {
          final flipped = Uint8List.fromList(bytes.toList());
          flipped[i] = flipped[i] ^ 0xff;
          expect(CompositeHashStrategy.compute(flipped), isNot(originalHash));
        }
      });
    });

    group('3. Order sensitivity preservation', () {
      test('two canonicalCompositeBytes with reversed order → different hash', () {
        final a = Uint8List.fromList([1, 2, 3]);
        final b = Uint8List.fromList([4, 5, 6]);
        final forward = Uint8List.fromList([...a, ...b]);
        final reversed = Uint8List.fromList([...b, ...a]);
        expect(CompositeHashStrategy.compute(forward), isNot(CompositeHashStrategy.compute(reversed)));
      });
    });

    group('4. Stability test', () {
      test('precomputed hash for fixed sequence is constant', () {
        // FNV-1a offset basis for empty input is the basis itself.
        final empty = Uint8List(0);
        expect(CompositeHashStrategy.compute(empty), 0x811c9dc5);

        final fixed = Uint8List.fromList([0, 0, 0, 1]);
        final h = CompositeHashStrategy.compute(fixed);
        for (var i = 0; i < 20; i++) {
          expect(CompositeHashStrategy.compute(fixed), h);
        }
      });
    });

    group('5. Collision sanity check', () {
      test('100 distinct compositions → no hash collisions in test', () {
        final hashes = <int>{};
        for (var n = 0; n < 100; n++) {
          final dec = DeterministicExecutionContract(
            operationId: 'op-$n',
            resourceId: 'res-$n',
            canonicalBytes: Uint8List.fromList([n, n + 1, n + 2]),
            deterministicHash: n * 31 + 1,
          );
          final cdc = CompositeDeterministicContract([dec]);
          final h = cdc.compositeDeterministicHash;
          expect(hashes.contains(h), false, reason: 'collision at n=$n');
          hashes.add(h);
        }
        expect(hashes.length, 100);
      });
    });
  });
}
