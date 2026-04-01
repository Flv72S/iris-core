// Phase 11.3.1 — UI-ready immutable ViewModel. No logic, representation only.

class ExplainabilityViewModel {
  const ExplainabilityViewModel({
    required this.traceId,
    required this.state,
    required this.resolution,
    required this.outcomeStatus,
    required this.outcomeEffects,
    required this.explanationTitle,
    required this.explanationSummary,
    required this.explanationDetails,
    required this.safetyLevel,
    required this.timestamp,
  });

  final String traceId;
  final String state;
  final String resolution;
  final String outcomeStatus;
  final List<String> outcomeEffects;
  final String explanationTitle;
  final String explanationSummary;
  final String explanationDetails;
  final String safetyLevel;
  final String timestamp;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ExplainabilityViewModel &&
          runtimeType == other.runtimeType &&
          traceId == other.traceId &&
          state == other.state &&
          resolution == other.resolution &&
          outcomeStatus == other.outcomeStatus &&
          _listEq(outcomeEffects, other.outcomeEffects) &&
          explanationTitle == other.explanationTitle &&
          explanationSummary == other.explanationSummary &&
          explanationDetails == other.explanationDetails &&
          safetyLevel == other.safetyLevel &&
          timestamp == other.timestamp;

  @override
  int get hashCode => Object.hash(
        traceId,
        state,
        resolution,
        outcomeStatus,
        Object.hashAll(outcomeEffects),
        explanationTitle,
        explanationSummary,
        explanationDetails,
        safetyLevel,
        timestamp,
      );

  static bool _listEq(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
    return true;
  }
}
