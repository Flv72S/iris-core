/// OX1 — Result of merge. Caller replay-validates mergedStateMap before commit.

enum ConflictResolutionStatus { merged, rejected, deferred }

class ConflictResolutionResult {
  const ConflictResolutionResult({
    required this.status,
    required this.message,
    this.mergedStateMap,
  });

  final ConflictResolutionStatus status;
  final String message;
  final Map<String, dynamic>? mergedStateMap;
}
