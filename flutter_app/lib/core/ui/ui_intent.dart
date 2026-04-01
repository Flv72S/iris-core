/// OX4 — User intent. Immutable; maps to deterministic domain action.

class UIIntent {
  const UIIntent({
    required this.type,
    required this.payload,
    this.intentId,
    this.targetProjectionId,
  });

  final String type;
  final Map<String, dynamic> payload;
  final String? intentId;
  final String? targetProjectionId;
}
