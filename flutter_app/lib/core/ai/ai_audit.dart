// OX8 — Audit AI suggestions. Does not affect state.

class AIAuditEvent {
  AIAuditEvent._();
  static const String suggestionGenerated = 'AI_SUGGESTION_GENERATED';
  static const String suggestionConfirmed = 'AI_SUGGESTION_CONFIRMED';
  static const String suggestionRejected = 'AI_SUGGESTION_REJECTED';
  static const String suggestionInvalidatedByFork = 'AI_SUGGESTION_INVALIDATED_BY_FORK';
}

class AIAudit {
  AIAudit({void Function(String event, [Map<String, dynamic>? data])? onEvent})
      : _onEvent = onEvent ?? _noOp;
  static void _noOp(String event, [Map<String, dynamic>? data]) {}
  final void Function(String event, [Map<String, dynamic>? data]) _onEvent;

  void suggestionGenerated(String suggestionId, String inputHash, String modelIdentifier) =>
      _onEvent(AIAuditEvent.suggestionGenerated, {'suggestionId': suggestionId, 'inputHash': inputHash, 'modelIdentifier': modelIdentifier});
  void suggestionConfirmed(String suggestionId, String inputHash, String modelIdentifier) =>
      _onEvent(AIAuditEvent.suggestionConfirmed, {'suggestionId': suggestionId, 'inputHash': inputHash, 'modelIdentifier': modelIdentifier, 'confirmationStatus': 'confirmed'});
  void suggestionRejected(String suggestionId, String inputHash, String modelIdentifier) =>
      _onEvent(AIAuditEvent.suggestionRejected, {'suggestionId': suggestionId, 'inputHash': inputHash, 'modelIdentifier': modelIdentifier, 'confirmationStatus': 'rejected'});
  void suggestionInvalidatedByFork(String suggestionId, String inputHash) =>
      _onEvent(AIAuditEvent.suggestionInvalidatedByFork, {'suggestionId': suggestionId, 'inputHash': inputHash});
}
