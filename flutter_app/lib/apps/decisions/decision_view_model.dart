// OX5 — Decision state → view model.

import 'package:iris_flutter_app/core/ui/ui_projection_adapter.dart';
import 'package:iris_flutter_app/apps/decisions/decision_state.dart';

class DecisionItemViewModel {
  const DecisionItemViewModel({
    required this.id,
    required this.topic,
    required this.options,
    required this.chosenOption,
    required this.resolvedAtHeight,
  });
  final String id;
  final String topic;
  final List<String> options;
  final String? chosenOption;
  final int? resolvedAtHeight;
}

class DecisionCenterViewModel {
  const DecisionCenterViewModel({
    this.open = const [],
    this.resolved = const [],
  });
  final List<DecisionItemViewModel> open;
  final List<DecisionItemViewModel> resolved;
}

class DecisionViewModelAdapter extends UIProjectionAdapter<DecisionState, DecisionCenterViewModel> {
  @override
  DecisionCenterViewModel toViewModel(DecisionState state) {
    return DecisionCenterViewModel(
      open: state.open.map((d) => DecisionItemViewModel(id: d.id, topic: d.topic, options: d.options, chosenOption: d.chosenOption, resolvedAtHeight: d.resolvedAtHeight)).toList(),
      resolved: state.resolved.map((d) => DecisionItemViewModel(id: d.id, topic: d.topic, options: d.options, chosenOption: d.chosenOption, resolvedAtHeight: d.resolvedAtHeight)).toList(),
    );
  }
}
