// Phase 11.2.1 — Read-only DTO. No semantics, no defaults.

/// Explanation payload from Core. Immutable, structural only.
class ExplanationDto {
  const ExplanationDto({
    required this.title,
    required this.summary,
    required this.details,
    required this.safetyLevel,
    required this.traceId,
  });

  final String title;
  final String summary;
  final String details;
  final String safetyLevel;
  final String traceId;

  factory ExplanationDto.fromJson(Map<String, dynamic> json) {
    return ExplanationDto(
      title: json['title'] as String,
      summary: json['summary'] as String,
      details: json['details'] as String,
      safetyLevel: json['safetyLevel'] as String,
      traceId: json['traceId'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
        'title': title,
        'summary': summary,
        'details': details,
        'safetyLevel': safetyLevel,
        'traceId': traceId,
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ExplanationDto &&
          runtimeType == other.runtimeType &&
          title == other.title &&
          summary == other.summary &&
          details == other.details &&
          safetyLevel == other.safetyLevel &&
          traceId == other.traceId;

  @override
  int get hashCode =>
      Object.hash(title, summary, details, safetyLevel, traceId);
}
