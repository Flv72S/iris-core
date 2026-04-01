// J6 — Single replay difference (immutable).

import 'package:iris_flutter_app/persistence/replay/replay_difference_type.dart';

class ReplayDifference {
  const ReplayDifference({
    required this.fieldName,
    required this.originalValue,
    required this.recomputedValue,
    required this.differenceType,
  });

  final String fieldName;
  final String originalValue;
  final String recomputedValue;
  final ReplayDifferenceType differenceType;
}
