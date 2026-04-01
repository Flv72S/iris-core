import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_registry.dart';
import 'projection_test_helpers.dart';

void main() {
  late ProjectionRegistry registry;

  setUp(() {
    registry = ProjectionRegistry();
  });

  group('ProjectionRegistry', () {
    test('register and get', () {
      final def = CounterProjectionDefinition();
      registry.register(def);
      expect(registry.get('counter'), same(def));
      expect(registry.get('missing'), isNull);
    });

    test('getAll returns all registered', () {
      registry.register(CounterProjectionDefinition());
      registry.register(SumProjectionDefinition());
      final all = registry.getAll();
      expect(all.length, 2);
    });

    test('duplicate id throws', () {
      registry.register(CounterProjectionDefinition(projectionId: 'counter'));
      expect(
        () => registry.register(CounterProjectionDefinition(projectionId: 'counter')),
        throwsStateError,
      );
    });
  });
}
