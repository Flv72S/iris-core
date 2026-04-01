// Phase 11.2.2 — Explicit intent DTO. Immutable, no semantics.

/// Mode-change intent sent to Core. No client-side policy evaluation.
class ModeChangeIntent {
  const ModeChangeIntent({
    required this.intentId,
    required this.targetModeId,
    required this.timestamp,
  });

  final String intentId;
  final String targetModeId;
  final String timestamp;

  factory ModeChangeIntent.fromJson(Map<String, dynamic> json) {
    return ModeChangeIntent(
      intentId: json['intentId'] as String,
      targetModeId: json['targetModeId'] as String,
      timestamp: json['timestamp'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
        'intentId': intentId,
        'targetModeId': targetModeId,
        'timestamp': timestamp,
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ModeChangeIntent &&
          runtimeType == other.runtimeType &&
          intentId == other.intentId &&
          targetModeId == other.targetModeId &&
          timestamp == other.timestamp;

  @override
  int get hashCode => Object.hash(intentId, targetModeId, timestamp);
}
