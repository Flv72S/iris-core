// J7 — Single step in replay timeline (immutable).

import 'package:iris_flutter_app/persistence/replay/replay_difference.dart';
import 'package:iris_flutter_app/persistence/timetravel/step_type.dart';

class ReplayStep {
  const ReplayStep({
    required this.stepIndex,
    required this.stepType,
    required this.inputState,
    required this.outputState,
    required this.stateHash,
    required this.matchesPersistedState,
    required this.differences,
  });

  final int stepIndex;
  final StepType stepType;
  final Map<String, Object> inputState;
  final Map<String, Object> outputState;
  final String stateHash;
  final bool matchesPersistedState;
  final List<ReplayDifference> differences;
}
