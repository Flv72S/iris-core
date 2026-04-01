import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/mappers/hash_utils.dart';

void main() {
  group('Hash determinism', () {
    test('same json yields same hash', () {
      final json = <String, dynamic>{'a': 1, 'b': 'two'};
      final h1 = computeDeterministicHash(json);
      final h2 = computeDeterministicHash(json);
      expect(h1, h2);
      expect(h1.length, 64);
    });

    test('different key order yields same hash', () {
      final j1 = <String, dynamic>{'a': 1, 'b': 2};
      final j2 = <String, dynamic>{'b': 2, 'a': 1};
      expect(computeDeterministicHash(j1), computeDeterministicHash(j2));
    });

    test('different content yields different hash', () {
      final j1 = <String, dynamic>{'a': 1};
      final j2 = <String, dynamic>{'a': 2};
      expect(computeDeterministicHash(j1), isNot(computeDeterministicHash(j2)));
    });

    test('hash is SHA-256 hex', () {
      final h = computeDeterministicHash(<String, dynamic>{'x': 0});
      expect(h.length, 64);
      expect(RegExp(r'^[a-f0-9]+$').hasMatch(h), isTrue);
    });
  });
}
