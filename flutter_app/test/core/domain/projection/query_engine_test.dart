import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_engine.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_registry.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_store.dart';
import 'package:iris_flutter_app/core/domain/projection/query_engine.dart';
import 'projection_test_helpers.dart';

void main() {
  late ProjectionEngine engine;
  late QueryEngine queryEngine;

  setUp(() {
    final registry = ProjectionRegistry();
    registry.register(CounterProjectionDefinition());
    final store = ProjectionStore();
    engine = ProjectionEngine(registry: registry, store: store);
    queryEngine = QueryEngine(engine);
  });

  group('QueryEngine', () {
    test('query returns selector result without mutating state', () {
      engine.setEvents(<DeterministicEvent>[
        TestProjectionEvent(eventIndex: 1, value: 10),
        TestProjectionEvent(eventIndex: 2, value: 5),
      ]);
      final def = CounterProjectionDefinition();
      final result = queryEngine.query(def.id, def, (s) => s.count);
      expect(result, 15);
      final again = queryEngine.query(def.id, def, (s) => s.count);
      expect(again, 15);
    });

    test('query with pure selector returns consistent value', () {
      engine.setEvents(<DeterministicEvent>[TestProjectionEvent(eventIndex: 1, value: 7)]);
      final def = CounterProjectionDefinition();
      final a = queryEngine.query(def.id, def, (s) => s.count + 1);
      final b = queryEngine.query(def.id, def, (s) => s.count + 1);
      expect(a, 8);
      expect(b, 8);
    });
  });
}
