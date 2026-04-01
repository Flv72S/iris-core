// J6 — Immutable replay execution result.

import 'package:iris_flutter_app/persistence/replay/replay_difference.dart';

class ReplayResult {
  const ReplayResult({
    required this.executionId,
    required this.replaySuccessful,
    required this.originalHash,
    required this.recomputedHash,
    required this.differences,
  });

  final String executionId;
  final bool replaySuccessful;
  final String originalHash;
  final String recomputedHash;
  final List<ReplayDifference> differences;
}
