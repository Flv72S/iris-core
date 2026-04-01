import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';
import 'package:iris_flutter_app/core/deterministic/utils/canonical_serializer.dart';
import 'package:iris_flutter_app/core/deterministic/utils/deterministic_hash.dart';
import 'package:iris_flutter_app/core/deterministic/validation/canonical_serialization_validator.dart';

void main() {
  group('CanonicalSerializationValidator', () {
    test('validateMapOrdering: different key insertion order produces identical bytes', () {
      final unsorted = <String, dynamic>{'b': 1, 'a': 2};
      expect(
        () => CanonicalSerializationValidator.validateMapOrdering(unsorted),
        returnsNormally,
      );
      final sorted = <String, dynamic>{'a': 2, 'b': 1};
      final bytesUnsorted = CanonicalSerializer.canonicalSerialize(unsorted);
      final bytesSorted = CanonicalSerializer.canonicalSerialize(sorted);
      expect(bytesUnsorted, bytesSorted);
    });

    test('validateDeterministicEncoding passes for same input', () {
      final input = <String, dynamic>{'x': 1, 'y': 'hello'};
      expect(
        () => CanonicalSerializationValidator.validateDeterministicEncoding(input),
        returnsNormally,
      );
    });

    test('validateByteStability passes for same input', () {
      final input = <String, dynamic>{'a': 0, 'b': [1, 2]};
      expect(
        () => CanonicalSerializationValidator.validateByteStability(input),
        returnsNormally,
      );
    });

    test('validateMapOrdering with nested maps', () {
      final input = <String, dynamic>{
        'z': 1,
        'a': <String, dynamic>{'m': 2, 'b': 3},
      };
      expect(
        () => CanonicalSerializationValidator.validateMapOrdering(input),
        returnsNormally,
      );
    });

    test('rejects NaN in input', () {
      final input = <String, dynamic>{'v': double.nan};
      expect(
        () => CanonicalSerializationValidator.validateByteStability(input),
        throwsA(isA<DeterministicViolation>()),
      );
    });

    test('rejects Infinity in input', () {
      final input = <String, dynamic>{'v': double.infinity};
      expect(
        () => CanonicalSerializationValidator.validateDeterministicEncoding(input),
        throwsA(isA<DeterministicViolation>()),
      );
    });
  });

  group('Cross-structure stress', () {
    test('Nested maps 3+ levels deep produce identical bytes', () {
      final a = <String, dynamic>{
        'l1': <String, dynamic>{
          'l2': <String, dynamic>{
            'l3': 42,
          },
        },
      };
      final b = <String, dynamic>{
        'l1': <String, dynamic>{
          'l2': <String, dynamic>{
            'l3': 42,
          },
        },
      };
      expect(CanonicalSerializer.canonicalSerialize(a),
          CanonicalSerializer.canonicalSerialize(b));
    });

    test('Mixed map + list structures produce identical bytes', () {
      final a = <String, dynamic>{
        'k': [1, 2, <String, dynamic>{'a': 3}],
      };
      final b = <String, dynamic>{
        'k': [1, 2, <String, dynamic>{'a': 3}],
      };
      expect(CanonicalSerializer.canonicalSerialize(a),
          CanonicalSerializer.canonicalSerialize(b));
    });

    test('Large maps (100+ keys) produce identical bytes', () {
      final a = <String, dynamic>{};
      final b = <String, dynamic>{};
      for (var i = 0; i < 100; i++) {
        final key = 'key$i';
        a[key] = i;
        b[key] = i;
      }
      expect(CanonicalSerializer.canonicalSerialize(a),
          CanonicalSerializer.canonicalSerialize(b));
    });

    test('Same logical data with different insertion order → identical bytes', () {
      final a = <String, dynamic>{};
      for (var i = 99; i >= 0; i--) {
        a['key$i'] = i;
      }
      final b = <String, dynamic>{};
      for (var i = 0; i < 100; i++) {
        b['key$i'] = i;
      }
      expect(CanonicalSerializer.canonicalSerialize(a),
          CanonicalSerializer.canonicalSerialize(b));
    });

    test('Identical logical structure rebuilt separately → identical bytes', () {
      final a = <String, dynamic>{
        'alpha': 1,
        'beta': [2, 3],
        'gamma': <String, dynamic>{'x': 10, 'y': 20},
      };
      final b = <String, dynamic>{
        'alpha': 1,
        'beta': [2, 3],
        'gamma': <String, dynamic>{'x': 10, 'y': 20},
      };
      expect(CanonicalSerializer.canonicalSerialize(a),
          CanonicalSerializer.canonicalSerialize(b));
    });

    test('Deeply nested arrays produce identical bytes', () {
      final a = <String, dynamic>{
        'deep': [
          [
            [1, 2],
            [3, 4],
          ],
        ],
      };
      final b = <String, dynamic>{
        'deep': [
          [
            [1, 2],
            [3, 4],
          ],
        ],
      };
      expect(CanonicalSerializer.canonicalSerialize(a),
          CanonicalSerializer.canonicalSerialize(b));
    });

    test('Numeric edge cases: zero, negatives, large integers', () {
      final a = <String, dynamic>{
        'zero': 0,
        'neg': -1,
        'large': 0x7fffffffffffffff,
      };
      final b = <String, dynamic>{
        'zero': 0,
        'neg': -1,
        'large': 0x7fffffffffffffff,
      };
      final bytesA = CanonicalSerializer.canonicalSerialize(a);
      final bytesB = CanonicalSerializer.canonicalSerialize(b);
      expect(bytesA, bytesB);
      CanonicalSerializationValidator.validateByteStability(a);
    });
  });

  group('Deterministic byte fingerprint', () {
    const int expectedFingerprintHash = 164232763;

    test('Known map produces locked canonical hash (contract)', () {
      final input = <String, dynamic>{
        'alpha': 1,
        'beta': [2, 3],
        'gamma': <String, dynamic>{'x': 10, 'y': 20},
      };
      final bytes = CanonicalSerializer.canonicalSerialize(input);
      final hash = DeterministicHash.computeDeterministicHash(bytes);
      expect(hash, expectedFingerprintHash,
          reason: 'Canonical serialization contract changed; determinism broken');
    });
  });
}
