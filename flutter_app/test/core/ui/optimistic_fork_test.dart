import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/ui/optimistic_state_layer.dart';
import 'package:iris_flutter_app/core/ui/ui_fork_handler.dart';
import 'package:iris_flutter_app/core/ui/ui_intent.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_engine.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_registry.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_store.dart';
import 'package:iris_flutter_app/core/ui/ui_state_bridge.dart';
import '../domain/projection/projection_test_helpers.dart';

void main() {
  group('OptimisticStateLayer', () {
    late OptimisticStateLayer layer;

    setUp(() {
      layer = OptimisticStateLayer();
    });

    test('applyOptimistic and getOptimisticOverlays', () {
      final intent = UIIntent(
        type: 'T',
        payload: <String, dynamic>{},
        intentId: 'i1',
        targetProjectionId: 'counter',
      );
      layer.applyOptimistic(intent);
      expect(layer.hasPending, isTrue);
      expect(layer.getOptimisticOverlays('counter').length, 1);
      expect(layer.getOptimisticOverlays('other'), isEmpty);
    });

    test('rollback removes overlay', () {
      layer.applyOptimistic(UIIntent(type: 'T', payload: <String, dynamic>{}, intentId: 'i1'));
      layer.rollback('i1');
      expect(layer.hasPending, isFalse);
      expect(layer.getOptimisticOverlays(null), isEmpty);
    });

    test('confirm removes overlay', () {
      layer.applyOptimistic(UIIntent(type: 'T', payload: <String, dynamic>{}, intentId: 'i1'));
      layer.confirm('i1');
      expect(layer.hasPending, isFalse);
    });

    test('clearAll on fork', () {
      layer.applyOptimistic(UIIntent(type: 'T', payload: <String, dynamic>{}, intentId: 'i1'));
      layer.clearAll();
      expect(layer.hasPending, isFalse);
    });
  });

  group('UIForkHandler', () {
    test('handleForkResolution clears optimistic', () {
      final optimistic = OptimisticStateLayer();
      optimistic.applyOptimistic(UIIntent(type: 'T', payload: <String, dynamic>{}, intentId: 'i1'));
      final registry = ProjectionRegistry();
      registry.register(CounterProjectionDefinition());
      final engine = ProjectionEngine(registry: registry, store: ProjectionStore());
      final bridge = UIStateBridge(engine: engine, registry: registry);
      final handler = UIForkHandler(optimisticLayer: optimistic, bridge: bridge);
      handler.registerProjectionId('counter');
      handler.handleForkResolution(const ForkInfo(message: 'merged'));
      expect(optimistic.hasPending, isFalse);
    });
  });
}
