// OX5 — Agreement tracker app. Uses AgreementProjection + IntentDispatcher.

import 'package:iris_flutter_app/core/ui/ui_state_bridge.dart';
import 'package:iris_flutter_app/apps/agreements/agreement_projection.dart';
import 'package:iris_flutter_app/apps/agreements/agreement_state.dart';
import 'package:iris_flutter_app/apps/agreements/agreement_view_model.dart';

/// Application facade for agreement tracking. Read via bridge + AgreementProjection; write via IntentDispatcher.
class AgreementTracker {
  AgreementTracker({
    required UIStateBridge bridge,
    required AgreementProjection projection,
  })  : _bridge = bridge,
        _projection = projection;

  final UIStateBridge _bridge;
  final AgreementProjection _projection;

  static const String projectionId = 'agreements';

  AgreementState getState() => _bridge.getProjection(projectionId, _projection);

  AgreementViewModel toViewModel(AgreementState state) =>
      AgreementViewModelAdapter().toViewModel(state);
}
