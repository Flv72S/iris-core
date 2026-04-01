import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_engine.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_registry.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_store.dart';
import 'package:iris_flutter_app/core/ui/ui_state_bridge.dart';
import '../domain/projection/projection_test_helpers.dart';

void main() {
  late UIStateBridge bridge;
  late ProjectionEngine engine;
  late ProjectionRegistry registry;

  setUp(() {
    registry = ProjectionRegistry();
    registry.register(CounterProjectionDefinition());
    engine = ProjectionEngine(registry: registry, store: ProjectionStore());
    bridge = UIStateBridge(engine: engine, registry: registry);
  });

  group('UIStateBridge', () {
    test('getProjection returns state from engine', () {
      engine.setEvents(<DeterministicEvent>[]);
      final state = bridge.getProjection('counter', CounterProjectionDefinition());
      expect(state.count, 0);
    });

    test('getProjection returns same reference when unchanged', () {
      engine.setEvents(<DeterministicEvent>[]);
      final a = bridge.getProjection('counter', CounterProjectionDefinition());
      final b = bridge.getProjection('counter', CounterProjectionDefinition());
      expect(identical(a, b), isTrue);
    });

    test('subscribe and notifyProjectionChanged invokes callback', () {
      engine.setEvents(<DeterministicEvent>[]);
      Object? received;
      bridge.subscribe('counter', (state) {
        received = state;
      });
      bridge.notifyProjectionChanged('counter');
      expect(received, isNotNull);
      expect((received as CounterProjectionState).count, 0);
    });

    test('unsubscribe stops callbacks', () {
      engine.setEvents(<DeterministicEvent>[]);
      var count = 0;
      final unsub = bridge.subscribe('counter', (_) => count++);
      bridge.notifyProjectionChanged('counter');
      expect(count, 1);
      unsub();
      bridge.notifyProjectionChanged('counter');
      expect(count, 1);
    });

    test('multiple subscribers all receive', () {
      engine.setEvents(<DeterministicEvent>[]);
      var a = 0, b = 0;
      bridge.subscribe('counter', (_) => a++);
      bridge.subscribe('counter', (_) => b++);
      bridge.notifyProjectionChanged('counter');
      expect(a, 1);
      expect(b, 1);
    });
  });
}
