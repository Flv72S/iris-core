// J7 — Immutable replay timeline for one execution.

import 'package:iris_flutter_app/persistence/timetravel/replay_step.dart';

/// Immutable sequence of steps for deterministic time-travel replay.
class ReplayTimeline {
  const ReplayTimeline({
    required this.executionId,
    required this.steps,
    required this.deterministic,
    required this.finalOriginalHash,
    required this.finalRecomputedHash,
  });

  final String executionId;
  final List<ReplayStep> steps;
  final bool deterministic;
  final String finalOriginalHash;
  final String finalRecomputedHash;
}
