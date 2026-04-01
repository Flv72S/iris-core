// OX6 — Audit events. Does not influence logic.

/// Audit event types. Optional debug mode for PERMISSION_CHECKED.
class IdentityAuditEvent {
  IdentityAuditEvent._();
  static const String identityCreated = 'IDENTITY_CREATED';
  static const String roleChanged = 'ROLE_CHANGED';
  static const String deviceBound = 'DEVICE_BOUND';
  static const String deviceRevoked = 'DEVICE_REVOKED';
  static const String permissionChecked = 'PERMISSION_CHECKED';
}

void _identityAuditNoOp(String event, [Map<String, dynamic>? data]) {}

/// Emits audit events. Audit must not influence logic.
class IdentityAudit {
  IdentityAudit({void Function(String event, [Map<String, dynamic>? data])? onEvent})
      : _onEvent = onEvent ?? _identityAuditNoOp;

  final void Function(String event, [Map<String, dynamic>? data]) _onEvent;

  void identityCreated(String identityId) => _onEvent(IdentityAuditEvent.identityCreated, {'identityId': identityId});
  void roleChanged(String identityId, String role, bool added) => _onEvent(IdentityAuditEvent.roleChanged, {'identityId': identityId, 'role': role, 'added': added});
  void deviceBound(String identityId, String deviceId) => _onEvent(IdentityAuditEvent.deviceBound, {'identityId': identityId, 'deviceId': deviceId});
  void deviceRevoked(String identityId, String deviceId) => _onEvent(IdentityAuditEvent.deviceRevoked, {'identityId': identityId, 'deviceId': deviceId});
  void permissionChecked(String identityId, String permission, bool granted) =>
      _onEvent(IdentityAuditEvent.permissionChecked, {'identityId': identityId, 'permission': permission, 'granted': granted});
}
