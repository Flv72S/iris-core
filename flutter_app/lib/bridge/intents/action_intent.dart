// Phase 11.2.2 — Explicit intent DTO. Immutable, no semantics.

class ActionIntent {
  const ActionIntent({
    required this.intentId,
    required this.actionType,
    required this.parameters,
    required this.timestamp,
  });

  final String intentId;
  final String actionType;
  final Map<String, dynamic> parameters;
  final String timestamp;

  factory ActionIntent.fromJson(Map<String, dynamic> json) {
    return ActionIntent(
      intentId: json['intentId'] as String,
      actionType: json['actionType'] as String,
      parameters: Map<String, dynamic>.from(json['parameters'] as Map),
      timestamp: json['timestamp'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
        'intentId': intentId,
        'actionType': actionType,
        'parameters': Map<String, dynamic>.from(parameters),
        'timestamp': timestamp,
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ActionIntent &&
          runtimeType == other.runtimeType &&
          intentId == other.intentId &&
          actionType == other.actionType &&
          _mapEquals(parameters, other.parameters) &&
          timestamp == other.timestamp;

  @override
  int get hashCode => Object.hash(
        intentId,
        actionType,
        Object.hashAll(parameters.entries.map((e) => Object.hash(e.key, e.value))),
        timestamp,
      );

  static bool _mapEquals(Map<String, dynamic> a, Map<String, dynamic> b) {
    if (a.length != b.length) return false;
    for (final k in a.keys) {
      if (!b.containsKey(k) || a[k] != b[k]) return false;
    }
    return true;
  }
}
