/// OX4 — Fork resolution: clear optimistic, notify UI, ensure canonical state.

import 'package:iris_flutter_app/core/ui/optimistic_state_layer.dart';
import 'package:iris_flutter_app/core/ui/ui_state_bridge.dart';

/// Info passed when fork is resolved (e.g. merged or branch chosen).
class ForkInfo {
  const ForkInfo({this.resolvedAtHeight, this.message = ''});
  final int? resolvedAtHeight;
  final String message;
}

/// On fork: clear optimistic state and notify bridge so UI refreshes from projection.
class UIForkHandler {
  UIForkHandler({
    required OptimisticStateLayer optimisticLayer,
    required UIStateBridge bridge,
  })  : _optimistic = optimisticLayer,
        _bridge = bridge;

  final OptimisticStateLayer _optimistic;
  final UIStateBridge _bridge;

  void handleForkResolution(ForkInfo forkInfo) {
    _optimistic.clearAll();
    _notifyAllProjections();
  }

  void _notifyAllProjections() {
    for (final id in _knownProjectionIds) {
      _bridge.notifyProjectionChanged(id);
    }
  }

  final List<String> _knownProjectionIds = [];

  /// Register projection ids that should be notified on fork.
  void registerProjectionId(String id) {
    if (!_knownProjectionIds.contains(id)) _knownProjectionIds.add(id);
  }
}
