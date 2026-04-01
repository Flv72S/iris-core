// OX7 — Audit for signing. Does not influence logic.

/// Audit event types for signature layer.
class SignatureAuditEvent {
  SignatureAuditEvent._();
  static const String signed = 'SIGNED';
  static const String verified = 'VERIFIED';
  static const String verificationFailed = 'VERIFICATION_FAILED';
}

/// Emits audit events for signing/verification. Audit must not influence logic.
class SignatureAudit {
  SignatureAudit({void Function(String event, [Map<String, dynamic>? data])? onEvent})
      : _onEvent = onEvent ?? _noOp;

  static void _noOp(String event, [Map<String, dynamic>? data]) {}

  final void Function(String event, [Map<String, dynamic>? data]) _onEvent;

  void signed(String eventId, String identityId) =>
      _onEvent(SignatureAuditEvent.signed, {'eventId': eventId, 'identityId': identityId});

  void verified(String eventId) => _onEvent(SignatureAuditEvent.verified, {'eventId': eventId});

  void verificationFailed(String eventId, String reason) =>
      _onEvent(SignatureAuditEvent.verificationFailed, {'eventId': eventId, 'reason': reason});
}
