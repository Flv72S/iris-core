import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_store.dart';

void main() {
  late ProjectionStore store;

  setUp(() {
    store = ProjectionStore();
  });

  group('ProjectionStore', () {
    test('save and load roundtrip', () {
      final map = <String, dynamic>{'a': 1, 'b': 2};
      store.save('p1', map, 1, 5);
      final entry = store.load('p1');
      expect(entry, isNotNull);
      expect(entry!.version, 1);
      expect(entry.ledgerHeight, 5);
      expect(entry.stateMap['a'], 1);
      expect(entry.stateMap['b'], 2);
    });

    test('load returns null for missing id', () {
      expect(store.load('missing'), isNull);
    });

    test('clear removes entry', () {
      store.save('p1', <String, dynamic>{'x': 1}, 1, 0);
      store.clear('p1');
      expect(store.load('p1'), isNull);
    });

    test('hash verification: valid entry loads', () {
      store.save('p1', <String, dynamic>{'k': 42}, 1, 0);
      expect(store.load('p1'), isNotNull);
    });
  });
}
