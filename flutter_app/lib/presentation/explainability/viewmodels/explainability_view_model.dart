enum SafetyLevel { neutral, caution, block }

class ExplainabilityViewModel {
  const ExplainabilityViewModel({
    required this.title,
    required this.summary,
    required this.details,
    required this.safetyLevel,
    required this.timestampLabel,
  });
  final String title;
  final String summary;
  final String details;
  final SafetyLevel safetyLevel;
  final String timestampLabel;
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ExplainabilityViewModel &&
          title == other.title &&
          summary == other.summary &&
          details == other.details &&
          safetyLevel == other.safetyLevel &&
          timestampLabel == other.timestampLabel;
  @override
  int get hashCode =>
      Object.hash(title, summary, details, safetyLevel, timestampLabel);
}
