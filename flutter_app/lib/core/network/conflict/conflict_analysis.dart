/// OX1 — Result of conflict analysis. Read-only; no mutation.

import 'package:iris_flutter_app/core/network/conflict/conflict_type.dart';

/// Output of [ConflictAnalyzer]. Mergeable indicates automatic merge is possible under policy.
class ConflictAnalysis {
  const ConflictAnalysis({
    required this.conflictType,
    required this.conflictingPaths,
    required this.mergeable,
  });

  final ConflictType conflictType;
  final List<String> conflictingPaths;
  final bool mergeable;
}
