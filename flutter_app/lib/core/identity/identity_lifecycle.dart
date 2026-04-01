// OX6 — Deterministic identity lifecycle. Emit ledger events; validate state transitions.

import 'package:iris_flutter_app/core/identity/identity_model.dart';
import 'package:iris_flutter_app/core/identity/identity_events.dart';
import 'package:iris_flutter_app/core/identity/identity_projection.dart';

/// Result of a lifecycle validation (payload to append, or error).
class LifecycleResult {
  const LifecycleResult._({this.payload, this.error});
  const LifecycleResult.ok(Map<String, dynamic> p) : this._(payload: p, error: null);
  const LifecycleResult.fail(String message) : this._(payload: null, error: message);

  final Map<String, dynamic>? payload;
  final String? error;
  bool get isOk => error == null;
}

/// Deterministic operations that emit ledger events. No direct mutation.
/// Validation uses current [IdentityState]; reject operations on deactivated identity (except reactivation).
class IdentityLifecycle {
  IdentityLifecycle._();

  /// Returns payload to append for create. No state check.
  static LifecycleResult createIdentity({
    required String publicKey,
    required String displayName,
    required int atHeight,
  }) {
    final id = deterministicIdentityId(publicKey);
    final payload = IdentityEvents.createIdentity(
      identityId: id,
      publicKey: publicKey,
      displayName: displayName,
      atHeight: atHeight,
    );
    return LifecycleResult.ok(payload);
  }

  static LifecycleResult updateDisplayName({
    required IdentityState state,
    required String identityId,
    required String newName,
    required int atHeight,
  }) {
    final identity = state.getIdentity(identityId);
    if (identity == null) return const LifecycleResult.fail('Identity not found');
    if (!identity.isActive) return const LifecycleResult.fail('Identity is deactivated');
    final payload = IdentityEvents.updateDisplayName(
      identityId: identityId,
      newName: newName,
      identityVersion: identity.version,
      atHeight: atHeight,
    );
    return LifecycleResult.ok(payload);
  }

  static LifecycleResult assignRole({
    required IdentityState state,
    required String identityId,
    required String role,
    required int atHeight,
  }) {
    final identity = state.getIdentity(identityId);
    if (identity == null) return const LifecycleResult.fail('Identity not found');
    if (!identity.isActive) return const LifecycleResult.fail('Identity is deactivated');
    if (identity.roles.contains(role)) return const LifecycleResult.fail('Role already assigned');
    final payload = IdentityEvents.assignRole(
      identityId: identityId,
      role: role,
      identityVersion: identity.version,
      atHeight: atHeight,
    );
    return LifecycleResult.ok(payload);
  }

  static LifecycleResult removeRole({
    required IdentityState state,
    required String identityId,
    required String role,
    required int atHeight,
  }) {
    final identity = state.getIdentity(identityId);
    if (identity == null) return const LifecycleResult.fail('Identity not found');
    if (!identity.isActive) return const LifecycleResult.fail('Identity is deactivated');
    final payload = IdentityEvents.removeRole(
      identityId: identityId,
      role: role,
      identityVersion: identity.version,
      atHeight: atHeight,
    );
    return LifecycleResult.ok(payload);
  }

  static LifecycleResult deactivateIdentity({
    required IdentityState state,
    required String identityId,
    required int atHeight,
  }) {
    final identity = state.getIdentity(identityId);
    if (identity == null) return const LifecycleResult.fail('Identity not found');
    if (!identity.isActive) return const LifecycleResult.fail('Identity already deactivated');
    final payload = IdentityEvents.deactivateIdentity(
      identityId: identityId,
      identityVersion: identity.version,
      atHeight: atHeight,
    );
    return LifecycleResult.ok(payload);
  }

  static LifecycleResult reactivateIdentity({
    required IdentityState state,
    required String identityId,
    required int atHeight,
  }) {
    final identity = state.getIdentity(identityId);
    if (identity == null) return const LifecycleResult.fail('Identity not found');
    if (identity.isActive) return const LifecycleResult.fail('Identity already active');
    final payload = IdentityEvents.reactivateIdentity(
      identityId: identityId,
      identityVersion: identity.version,
      atHeight: atHeight,
    );
    return LifecycleResult.ok(payload);
  }

  static LifecycleResult bindDevice({
    required IdentityState state,
    required String identityId,
    required String deviceId,
    required int atHeight,
  }) {
    final identity = state.getIdentity(identityId);
    if (identity == null) return const LifecycleResult.fail('Identity not found');
    if (!identity.isActive) return const LifecycleResult.fail('Identity is deactivated');
    final payload = IdentityEvents.bindDevice(
      identityId: identityId,
      deviceId: deviceId,
      atHeight: atHeight,
    );
    return LifecycleResult.ok(payload);
  }

  static LifecycleResult revokeDevice({
    required IdentityState state,
    required String identityId,
    required String deviceId,
    required int atHeight,
  }) {
    final identity = state.getIdentity(identityId);
    if (identity == null) return const LifecycleResult.fail('Identity not found');
    final bindings = state.getDevices(identityId);
    final active = bindings.where((b) => b.deviceId == deviceId && !b.isRevoked).toList();
    if (active.isEmpty) return const LifecycleResult.fail('Device not bound or already revoked');
    final payload = IdentityEvents.revokeDevice(
      identityId: identityId,
      deviceId: deviceId,
      atHeight: atHeight,
    );
    return LifecycleResult.ok(payload);
  }
}
