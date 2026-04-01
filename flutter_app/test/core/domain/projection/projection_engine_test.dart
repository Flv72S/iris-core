import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_engine.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_registry.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_store.dart';
import 'projection_test_helpers.dart';

void main() {
  late ProjectionRegistry registry;
  late ProjectionStore store;
  late ProjectionEngine engine;

  setUp(() {
    registry = ProjectionRegistry();
    store = ProjectionStore();
    engine = ProjectionEngine(registry: registry, store: store);
  });

  group('ProjectionEngine', () {
    test('build from empty ledger returns initial state', () {
      registry.register(CounterProjectionDefinition());
      engine.setEvents(<DeterministicEvent>[]);
      final state = engine.build(CounterProjectionDefinition());
      expect(state.count, 0);
    });

    test('build after events applies all events', () {
      registry.register(CounterProjectionDefinition());
      engine.setEvents(<DeterministicEvent>[
        TestProjectionEvent(eventIndex: 1, value: 10),
        TestProjectionEvent(eventIndex: 2, value: 5),
      ]);
      final state = engine.build(CounterProjectionDefinition());
      expect(state.count, 15);
    });

    test('incremental update correctness', () {
      registry.register(CounterProjectionDefinition());
      engine.setEvents(<DeterministicEvent>[TestProjectionEvent(eventIndex: 1, value: 3)]);
      engine.build(CounterProjectionDefinition());
      engine.applyNewEvent(TestProjectionEvent(eventIndex: 2, value: 7));
      final state = engine.getOrBuild(CounterProjectionDefinition());
      expect(state.count, 10);
    });

    test('rebuild after fork (setEvents) produces same result', () {
      final def = CounterProjectionDefinition();
      registry.register(def);
      final events = <dynamic>[
        TestProjectionEvent(eventIndex: 1, value: 1),
        TestProjectionEvent(eventIndex: 2, value: 2),
      ];
      engine.setEvents(events.cast<DeterministicEvent>());
      final first = engine.build(def);
      engine.invalidate();
      engine.setEvents(events.cast<DeterministicEvent>());
      final second = engine.build(def);
      expect(first.count, second.count);
      expect(first.count, 3);
    });

    test('invalidate clears cache and store', () {
      registry.register(CounterProjectionDefinition());
      engine.setEvents(<DeterministicEvent>[TestProjectionEvent(eventIndex: 1, value: 1)]);
      engine.build(CounterProjectionDefinition());
      expect(store.load('counter'), isNotNull);
      engine.invalidate();
      expect(store.load('counter'), isNull);
      final state = engine.getOrBuild(CounterProjectionDefinition());
      expect(state.count, 1);
    });

    test('deterministic rebuild: same events same hash', () {
      final def = CounterProjectionDefinition();
      registry.register(def);
      final events = [
        TestProjectionEvent(eventIndex: 1, value: 10),
        TestProjectionEvent(eventIndex: 2, value: 20),
      ];
      engine.setEvents(events.cast<DeterministicEvent>());
      engine.build(def);
      final snap1 = engine.getSnapshot('counter');
      engine.invalidate();
      engine.setEvents(events.cast<DeterministicEvent>());
      engine.build(def);
      final snap2 = engine.getSnapshot('counter');
      expect(snap1?.stateHash, snap2?.stateHash);
      expect(snap1?.ledgerHeight, 2);
    });

    test('multiple projections coexist', () {
      registry.register(CounterProjectionDefinition());
      registry.register(SumProjectionDefinition());
      engine.setEvents(<DeterministicEvent>[
        TestProjectionEvent(eventIndex: 1, value: 4),
        TestProjectionEvent(eventIndex: 2, value: 6),
      ]);
      engine.rebuildAll();
      expect(engine.getOrBuild(CounterProjectionDefinition()).count, 10);
      expect(engine.getOrBuild(SumProjectionDefinition()).sum, 10);
    });

    test('ledgerHeight equals event count', () {
      engine.setEvents(<DeterministicEvent>[
        TestProjectionEvent(eventIndex: 1, value: 0),
        TestProjectionEvent(eventIndex: 2, value: 0),
      ]);
      expect(engine.ledgerHeight, 2);
    });
  });
}
