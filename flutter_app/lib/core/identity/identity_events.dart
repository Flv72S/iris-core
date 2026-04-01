// OX6 — Identity events. Deterministic envelope; ledger height; replay-safe.

/// Identity event type constants. Used as [PrimitiveEvent.eventType].
class IdentityEventType {
  IdentityEventType._();
  static const String identityCreated = 'IDENTITY_CREATED';
  static const String identityDisplayNameUpdated = 'IDENTITY_DISPLAYNAME_UPDATED';
  static const String roleAssigned = 'ROLE_ASSIGNED';
  static const String roleRemoved = 'ROLE_REMOVED';
  static const String identityDeactivated = 'IDENTITY_DEACTIVATED';
  static const String identityReactivated = 'IDENTITY_REACTIVATED';
  static const String deviceBound = 'DEVICE_BOUND';
  static const String deviceRevoked = 'DEVICE_REVOKED';
}

/// Builds identity event payloads. Each includes eventType and ledger/version fields. Replay-safe.
class IdentityEvents {
  IdentityEvents._();

  static Map<String, dynamic> createIdentity({
    required String identityId,
    required String publicKey,
    required String displayName,
    required int atHeight,
  }) {
    return <String, dynamic>{
      'eventType': IdentityEventType.identityCreated,
      'identityId': identityId,
      'publicKey': publicKey,
      'displayName': displayName,
      'identityVersion': 1,
      'createdAtHeight': atHeight,
    };
  }

  static Map<String, dynamic> updateDisplayName({
    required String identityId,
    required String newName,
    required int identityVersion,
    required int atHeight,
  }) {
    return <String, dynamic>{
      'eventType': IdentityEventType.identityDisplayNameUpdated,
      'identityId': identityId,
      'newName': newName,
      'identityVersion': identityVersion,
      'updatedAtHeight': atHeight,
    };
  }

  static Map<String, dynamic> assignRole({
    required String identityId,
    required String role,
    required int identityVersion,
    required int atHeight,
  }) {
    return <String, dynamic>{
      'eventType': IdentityEventType.roleAssigned,
      'identityId': identityId,
      'role': role,
      'identityVersion': identityVersion,
      'updatedAtHeight': atHeight,
    };
  }

  static Map<String, dynamic> removeRole({
    required String identityId,
    required String role,
    required int identityVersion,
    required int atHeight,
  }) {
    return <String, dynamic>{
      'eventType': IdentityEventType.roleRemoved,
      'identityId': identityId,
      'role': role,
      'identityVersion': identityVersion,
      'updatedAtHeight': atHeight,
    };
  }

  static Map<String, dynamic> deactivateIdentity({
    required String identityId,
    required int identityVersion,
    required int atHeight,
  }) {
    return <String, dynamic>{
      'eventType': IdentityEventType.identityDeactivated,
      'identityId': identityId,
      'identityVersion': identityVersion,
      'deactivatedAtHeight': atHeight,
    };
  }

  static Map<String, dynamic> reactivateIdentity({
    required String identityId,
    required int identityVersion,
    required int atHeight,
  }) {
    return <String, dynamic>{
      'eventType': IdentityEventType.identityReactivated,
      'identityId': identityId,
      'identityVersion': identityVersion,
      'reactivatedAtHeight': atHeight,
    };
  }

  static Map<String, dynamic> bindDevice({
    required String identityId,
    required String deviceId,
    required int atHeight,
  }) {
    return <String, dynamic>{
      'eventType': IdentityEventType.deviceBound,
      'identityId': identityId,
      'deviceId': deviceId,
      'registeredAtHeight': atHeight,
    };
  }

  static Map<String, dynamic> revokeDevice({
    required String identityId,
    required String deviceId,
    required int atHeight,
  }) {
    return <String, dynamic>{
      'eventType': IdentityEventType.deviceRevoked,
      'identityId': identityId,
      'deviceId': deviceId,
      'revokedAtHeight': atHeight,
    };
  }
}
