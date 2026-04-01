// OX6 — Rebuild identity state from ledger. Replay-safe; fork invalidates.

import 'package:iris_flutter_app/core/identity/identity_model.dart';
import 'package:iris_flutter_app/core/identity/identity_events.dart';
import 'package:iris_flutter_app/core/identity/device_binding.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_definition.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/core/domain/primitives/primitive_events.dart';

/// Identity state: identities and device bindings. Rebuilds identically from replay.
class IdentityState {
  const IdentityState({
    this.identities = const {},
    this.deviceBindings = const [],
  });

  final Map<String, Identity> identities;
  final List<DeviceBinding> deviceBindings;

  Identity? getIdentity(String identityId) => identities[identityId];

  List<Identity> getAllActive() =>
      identities.values.where((i) => i.isActive).toList();

  List<DeviceBinding> getDevices(String identityId) =>
      deviceBindings.where((b) => b.identityId == identityId).toList();
}

/// Projection that consumes identity events. Ignores non-identity events.
class IdentityProjection extends ProjectionDefinition<IdentityState> {
  IdentityProjection({this.projectionId = 'identity', this.version = 1});
  final String projectionId;
  final int version;

  @override
  String get id => projectionId;

  static const Set<String> _identityEventTypes = {
    IdentityEventType.identityCreated,
    IdentityEventType.identityDisplayNameUpdated,
    IdentityEventType.roleAssigned,
    IdentityEventType.roleRemoved,
    IdentityEventType.identityDeactivated,
    IdentityEventType.identityReactivated,
    IdentityEventType.deviceBound,
    IdentityEventType.deviceRevoked,
  };

  @override
  IdentityState initialState() => const IdentityState();

  @override
  IdentityState applyEvent(IdentityState state, DeterministicEvent event) {
    if (event is! PrimitiveEvent) return state;
    final payload = event.payload;
    final type = event.eventType;
    if (!_identityEventTypes.contains(type)) return state;

    switch (type) {
      case IdentityEventType.identityCreated:
        return _applyIdentityCreated(state, payload);
      case IdentityEventType.identityDisplayNameUpdated:
        return _applyDisplayNameUpdated(state, payload);
      case IdentityEventType.roleAssigned:
        return _applyRoleAssigned(state, payload);
      case IdentityEventType.roleRemoved:
        return _applyRoleRemoved(state, payload);
      case IdentityEventType.identityDeactivated:
        return _applyDeactivated(state, payload);
      case IdentityEventType.identityReactivated:
        return _applyReactivated(state, payload);
      case IdentityEventType.deviceBound:
        return _applyDeviceBound(state, payload);
      case IdentityEventType.deviceRevoked:
        return _applyDeviceRevoked(state, payload);
      default:
        return state;
    }
  }

  IdentityState _applyIdentityCreated(IdentityState state, Map<String, dynamic> p) {
    final id = p['identityId'] as String? ?? '';
    if (state.identities.containsKey(id)) return state;
    final identity = Identity(
      id: id,
      publicKey: p['publicKey'] as String? ?? '',
      displayName: p['displayName'] as String? ?? '',
      roles: [],
      version: p['identityVersion'] as int? ?? 1,
      isActive: true,
      createdAtHeight: p['createdAtHeight'] as int? ?? 0,
      deactivatedAtHeight: null,
    );
    final identities = Map<String, Identity>.from(state.identities)..[id] = identity;
    return IdentityState(identities: identities, deviceBindings: state.deviceBindings);
  }

  IdentityState _applyDisplayNameUpdated(IdentityState state, Map<String, dynamic> p) {
    final id = p['identityId'] as String? ?? '';
    final existing = state.identities[id];
    if (existing == null) return state;
    final updated = existing.copyWith(displayName: p['newName'] as String? ?? existing.displayName, version: (p['identityVersion'] as int?) ?? existing.version + 1);
    final identities = Map<String, Identity>.from(state.identities)..[id] = updated;
    return IdentityState(identities: identities, deviceBindings: state.deviceBindings);
  }

  IdentityState _applyRoleAssigned(IdentityState state, Map<String, dynamic> p) {
    final id = p['identityId'] as String? ?? '';
    final role = p['role'] as String? ?? '';
    final existing = state.identities[id];
    if (existing == null || existing.roles.contains(role)) return state;
    final roles = List<String>.from(existing.roles)..add(role);
    final updated = existing.copyWith(roles: roles, version: (p['identityVersion'] as int?) ?? existing.version + 1);
    final identities = Map<String, Identity>.from(state.identities)..[id] = updated;
    return IdentityState(identities: identities, deviceBindings: state.deviceBindings);
  }

  IdentityState _applyRoleRemoved(IdentityState state, Map<String, dynamic> p) {
    final id = p['identityId'] as String? ?? '';
    final role = p['role'] as String? ?? '';
    final existing = state.identities[id];
    if (existing == null) return state;
    final roles = List<String>.from(existing.roles)..remove(role);
    final updated = existing.copyWith(roles: roles, version: (p['identityVersion'] as int?) ?? existing.version + 1);
    final identities = Map<String, Identity>.from(state.identities)..[id] = updated;
    return IdentityState(identities: identities, deviceBindings: state.deviceBindings);
  }

  IdentityState _applyDeactivated(IdentityState state, Map<String, dynamic> p) {
    final id = p['identityId'] as String? ?? '';
    final atHeight = p['deactivatedAtHeight'] as int? ?? 0;
    final existing = state.identities[id];
    if (existing == null) return state;
    final updated = existing.copyWith(isActive: false, deactivatedAtHeight: atHeight, version: (p['identityVersion'] as int?) ?? existing.version + 1);
    final identities = Map<String, Identity>.from(state.identities)..[id] = updated;
    return IdentityState(identities: identities, deviceBindings: state.deviceBindings);
  }

  IdentityState _applyReactivated(IdentityState state, Map<String, dynamic> p) {
    final id = p['identityId'] as String? ?? '';
    final existing = state.identities[id];
    if (existing == null) return state;
    final updated = existing.copyWith(isActive: true, deactivatedAtHeight: null, version: (p['identityVersion'] as int?) ?? existing.version + 1);
    final identities = Map<String, Identity>.from(state.identities)..[id] = updated;
    return IdentityState(identities: identities, deviceBindings: state.deviceBindings);
  }

  IdentityState _applyDeviceBound(IdentityState state, Map<String, dynamic> p) {
    final identityId = p['identityId'] as String? ?? '';
    final deviceId = p['deviceId'] as String? ?? '';
    final registeredAtHeight = p['registeredAtHeight'] as int? ?? 0;
    final binding = DeviceBinding(identityId: identityId, deviceId: deviceId, registeredAtHeight: registeredAtHeight, revokedAtHeight: null);
    final bindings = List<DeviceBinding>.from(state.deviceBindings)..add(binding);
    return IdentityState(identities: state.identities, deviceBindings: bindings);
  }

  IdentityState _applyDeviceRevoked(IdentityState state, Map<String, dynamic> p) {
    final identityId = p['identityId'] as String? ?? '';
    final deviceId = p['deviceId'] as String? ?? '';
    final revokedAtHeight = p['revokedAtHeight'] as int? ?? 0;
    final bindings = state.deviceBindings.map((b) {
      if (b.identityId == identityId && b.deviceId == deviceId && b.revokedAtHeight == null) {
        return DeviceBinding(identityId: b.identityId, deviceId: b.deviceId, registeredAtHeight: b.registeredAtHeight, revokedAtHeight: revokedAtHeight);
      }
      return b;
    }).toList();
    return IdentityState(identities: state.identities, deviceBindings: bindings);
  }

  @override
  int getVersion() => version;

  @override
  Map<String, dynamic> stateToCanonicalMap(IdentityState state) => <String, dynamic>{
        'identityCount': state.identities.length,
        'deviceBindingCount': state.deviceBindings.length,
      };
}
