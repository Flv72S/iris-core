// OX5 — Context dashboard app. Unified view over tasks, decisions, agreements, knowledge.

import 'package:iris_flutter_app/core/ui/ui_state_bridge.dart';
import 'package:iris_flutter_app/apps/dashboard/dashboard_projection.dart';
import 'package:iris_flutter_app/apps/dashboard/dashboard_state.dart';
import 'package:iris_flutter_app/apps/dashboard/dashboard_view_model.dart';

class ContextDashboard {
  ContextDashboard({
    required UIStateBridge bridge,
    required DashboardProjection projection,
  })  : _bridge = bridge,
        _projection = projection;

  final UIStateBridge _bridge;
  final DashboardProjection _projection;

  static const String projectionId = 'dashboard';

  DashboardState getState() => _bridge.getProjection(projectionId, _projection);

  DashboardViewModel toViewModel(DashboardState state) =>
      DashboardViewModelAdapter().toViewModel(state);
}
