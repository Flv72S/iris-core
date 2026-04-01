// OX6 — Identity layer tests: deterministic creation, replay, permissions, device, deactivation.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/identity/identity_events.dart';
import 'package:iris_flutter_app/core/identity/identity_lifecycle.dart';
import 'package:iris_flutter_app/core/identity/identity_model.dart';
import 'package:iris_flutter_app/core/identity/identity_projection.dart';
import 'package:iris_flutter_app/core/identity/device_binding.dart';
import 'package:iris_flutter_app/core/identity/role_model.dart';
import 'package:iris_flutter_app/core/identity/permission_engine.dart';
import 'package:iris_flutter_app/core/identity/intent_validator.dart';
import 'package:iris_flutter_app/core/domain/primitives/primitive_events.dart';

PrimitiveEvent pe(String eventType, Map<String, dynamic> payload, int index) {
  return PrimitiveEvent(eventType: eventType, payload: payload, eventIndex: index);
}

void main() {
  group('OX6 Deterministic identity creation', () {
    test('same publicKey produces same identityId', () {
      final a = deterministicIdentityId('pk1');
      final b = deterministicIdentityId('pk1');
      expect(a, b);
      expect(a.startsWith('identity_'), isTrue);
    });

    test('different publicKey produces different identityId', () {
      final a = deterministicIdentityId('pk1');
      final b = deterministicIdentityId('pk2');
      expect(a, isNot(b));
    });

    test('createIdentity payload is deterministic and replayable', () {
      final id = deterministicIdentityId('keyA');
      final p1 = IdentityEvents.createIdentity(identityId: id, publicKey: 'keyA', displayName: 'Alice', atHeight: 1);
      final p2 = IdentityEvents.createIdentity(identityId: id, publicKey: 'keyA', displayName: 'Alice', atHeight: 1);
      expect(p1['identityId'], p2['identityId']);
      expect(p1['createdAtHeight'], 1);
    });
  });

  group('OX6 Identity projection replay', () {
    test('same events produce same state (replay rebuild correctness)', () {
      final proj = IdentityProjection();
      final id = deterministicIdentityId('pkX');
      final events = <PrimitiveEvent>[
        pe(IdentityEventType.identityCreated, IdentityEvents.createIdentity(identityId: id, publicKey: 'pkX', displayName: 'Bob', atHeight: 1), 0),
        pe(IdentityEventType.roleAssigned, IdentityEvents.assignRole(identityId: id, role: 'editor', identityVersion: 1, atHeight: 2), 1),
      ];
      IdentityState state = proj.initialState();
      for (final e in events) {
        state = proj.applyEvent(state, e);
      }
      IdentityState state2 = proj.initialState();
      for (final e in events) {
        state2 = proj.applyEvent(state2, e);
      }
      expect(state.identities.length, state2.identities.length);
      final i1 = state.getIdentity(id);
      final i2 = state2.getIdentity(id);
      expect(i1?.id, i2?.id);
      expect(i1?.roles, i2?.roles);
      expect(i1?.version, i2?.version);
    });

    test('identity created then role assigned then deactivated', () {
      final proj = IdentityProjection();
      final id = deterministicIdentityId('pkD');
      final events = <PrimitiveEvent>[
        pe(IdentityEventType.identityCreated, IdentityEvents.createIdentity(identityId: id, publicKey: 'pkD', displayName: 'Dee', atHeight: 1), 0),
        pe(IdentityEventType.roleAssigned, IdentityEvents.assignRole(identityId: id, role: 'viewer', identityVersion: 1, atHeight: 2), 1),
        pe(IdentityEventType.identityDeactivated, IdentityEvents.deactivateIdentity(identityId: id, identityVersion: 2, atHeight: 3), 2),
      ];
      IdentityState state = proj.initialState();
      for (final e in events) {
        state = proj.applyEvent(state, e);
      }
      final i = state.getIdentity(id);
      expect(i, isNotNull);
      expect(i!.isActive, isFalse);
      expect(i.deactivatedAtHeight, 3);
      expect(i.roles, contains('viewer'));
    });
  });

  group('OX6 Permission consistency', () {
    test('hasPermission is deterministic: same state same result', () {
      final id = deterministicIdentityId('pkP');
      final state = IdentityState(identities: {
        id: Identity(
          id: id,
          publicKey: 'pkP',
          displayName: 'P',
          roles: ['editor'],
          version: 1,
          isActive: true,
          createdAtHeight: 1,
          deactivatedAtHeight: null,
        ),
      }, deviceBindings: const []);
      final engine1 = PermissionEngine(state: state);
      final engine2 = PermissionEngine(state: state);
      expect(engine1.hasPermission(id, 'write'), engine2.hasPermission(id, 'write'));
      expect(engine1.hasPermission(id, 'write'), isTrue);
      expect(engine1.hasPermission(id, 'unknown_perm'), isFalse);
    });

    test('deactivated identity has no permissions', () {
      final id = deterministicIdentityId('pkInactive');
      final state = IdentityState(identities: {
        id: Identity(
          id: id,
          publicKey: 'pkInactive',
          displayName: 'Inactive',
          roles: ['admin'],
          version: 1,
          isActive: false,
          createdAtHeight: 1,
          deactivatedAtHeight: 10,
        ),
      }, deviceBindings: const []);
      final engine = PermissionEngine(state: state);
      expect(engine.hasPermission(id, '*'), isFalse);
    });
  });

  group('OX6 Device binding and revocation', () {
    test('device binding deterministic; revocation append-only', () {
      final proj = IdentityProjection();
      final id = deterministicIdentityId('pkDev');
      final devId = deterministicDeviceId(id, 'descriptor1');
      final events = <PrimitiveEvent>[
        pe(IdentityEventType.identityCreated, IdentityEvents.createIdentity(identityId: id, publicKey: 'pkDev', displayName: 'Dev', atHeight: 1), 0),
        pe(IdentityEventType.deviceBound, IdentityEvents.bindDevice(identityId: id, deviceId: devId, atHeight: 2), 1),
        pe(IdentityEventType.deviceRevoked, IdentityEvents.revokeDevice(identityId: id, deviceId: devId, atHeight: 3), 2),
      ];
      IdentityState state = proj.initialState();
      for (final e in events) {
        state = proj.applyEvent(state, e);
      }
      final devices = state.getDevices(id);
      expect(devices.length, 1);
      expect(devices.first.deviceId, devId);
      expect(devices.first.isRevoked, isTrue);
      expect(devices.first.revokedAtHeight, 3);
    });

    test('same descriptor produces same deviceId', () {
      final id = deterministicIdentityId('pkX');
      final d1 = deterministicDeviceId(id, 'desc');
      final d2 = deterministicDeviceId(id, 'desc');
      expect(d1, d2);
    });
  });

  group('OX6 Lifecycle validation', () {
    test('updateDisplayName on deactivated identity fails', () {
      final id = deterministicIdentityId('pkF');
      final state = IdentityState(identities: {
        id: Identity(id: id, publicKey: 'pkF', displayName: 'F', roles: [], version: 1, isActive: false, createdAtHeight: 1, deactivatedAtHeight: 5),
      }, deviceBindings: const []);
      final r = IdentityLifecycle.updateDisplayName(state: state, identityId: id, newName: 'New', atHeight: 6);
      expect(r.isOk, isFalse);
    });

    test('reactivateIdentity on deactivated identity succeeds', () {
      final id = deterministicIdentityId('pkR');
      final state = IdentityState(identities: {
        id: Identity(id: id, publicKey: 'pkR', displayName: 'R', roles: [], version: 1, isActive: false, createdAtHeight: 1, deactivatedAtHeight: 5),
      }, deviceBindings: const []);
      final r = IdentityLifecycle.reactivateIdentity(state: state, identityId: id, atHeight: 6);
      expect(r.isOk, isTrue);
      expect(r.payload!['eventType'], IdentityEventType.identityReactivated);
    });
  });

  group('OX6 IntentValidator', () {
    test('canPerform denies when identity has no permission', () {
      final id = deterministicIdentityId('pkNoPerm');
      final state = IdentityState(identities: {
        id: Identity(id: id, publicKey: 'pkNoPerm', displayName: 'N', roles: ['viewer'], version: 1, isActive: true, createdAtHeight: 1, deactivatedAtHeight: null),
      }, deviceBindings: const []);
      final engine = PermissionEngine(state: state);
      final validator = IntentValidator(engine);
      expect(validator.canPerform(id, 'write'), isFalse);
    });

    test('canPerform allows when identity has permission', () {
      final id = deterministicIdentityId('pkPerm');
      final state = IdentityState(identities: {
        id: Identity(id: id, publicKey: 'pkPerm', displayName: 'P', roles: ['editor'], version: 1, isActive: true, createdAtHeight: 1, deactivatedAtHeight: null),
      }, deviceBindings: const []);
      final engine = PermissionEngine(state: state);
      final validator = IntentValidator(engine);
      expect(validator.canPerform(id, 'task:edit'), isTrue);
    });
  });

  group('OX6 Role model', () {
    test('resolvePermissions is deterministic', () {
      final model = RoleModel();
      final a = model.resolvePermissions(['editor', 'viewer']);
      final b = model.resolvePermissions(['editor', 'viewer']);
      expect(a, b);
      expect(a.contains('read'), isTrue);
      expect(a.contains('write'), isTrue);
    });

    test('admin has wildcard', () {
      final model = RoleModel();
      final perms = model.resolvePermissions(['admin']);
      expect(perms, {'*'});
    });
  });
}
