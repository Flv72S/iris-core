// ODA-4 — Trust domain segmentation tests.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/distributed/trust/trust_domain_identity.dart';
import 'package:iris_flutter_app/core/distributed/trust/trust_domain_registry.dart';
import 'package:iris_flutter_app/core/distributed/trust/domain_membership_ledger.dart';
import 'package:iris_flutter_app/core/distributed/trust/domain_membership_validator.dart';
import 'package:iris_flutter_app/core/distributed/trust/domain_scoped_event.dart';
import 'package:iris_flutter_app/core/distributed/trust/cross_domain_authorization.dart';
import 'package:iris_flutter_app/core/distributed/trust/trust_boundary_validator.dart';
import 'package:iris_flutter_app/core/distributed/trust/domain_state_snapshot.dart';
import 'package:iris_flutter_app/core/distributed/trust/domain_hash_engine.dart';

void main() {
  group('ODA-4 Deterministic domain ID generation', () {
    test('same public key produces same domain ID', () {
      final id1 = TrustDomainIdentityFactory.domainIdFromPublicKey('pk1');
      final id2 = TrustDomainIdentityFactory.domainIdFromPublicKey('pk1');
      expect(id1, id2);
    });
    test('different public key produces different domain ID', () {
      final id1 = TrustDomainIdentityFactory.domainIdFromPublicKey('pk1');
      final id2 = TrustDomainIdentityFactory.domainIdFromPublicKey('pk2');
      expect(id1, isNot(id2));
    });
  });

  group('ODA-4 Domain registry replay', () {
    test('rebuildState produces same active domains after same events', () {
      final reg = TrustDomainRegistry();
      reg.appendDomainEvent(DomainRegistryEvent(
        eventType: DomainRegistryEventType.domainCreated,
        domainId: 'd1',
        eventIndex: 0,
        payload: {},
        signature: 's0',
      ));
      reg.appendDomainEvent(DomainRegistryEvent(
        eventType: DomainRegistryEventType.domainCreated,
        domainId: 'd2',
        eventIndex: 1,
        payload: {},
        signature: 's1',
      ));
      final state1 = reg.rebuildState();
      final state2 = reg.rebuildState();
      expect(state1.activeDomainIds, state2.activeDomainIds);
      expect(state1.activeDomainIds, {'d1', 'd2'});
    });
  });

  group('ODA-4 Domain membership replay', () {
    test('rebuildState produces same nodeToDomain after same events', () {
      final ledger = DomainMembershipLedger();
      ledger.appendMembershipEvent(DomainMembershipEvent(
        eventType: DomainMembershipEventType.nodeAssignedToDomain,
        nodeId: 'n1',
        domainId: 'd1',
        eventIndex: 0,
        payload: {},
        signature: 's0',
      ));
      final s1 = ledger.rebuildState();
      final s2 = ledger.rebuildState();
      expect(s1.nodeToDomain, s2.nodeToDomain);
      expect(ledger.getNodeDomain('n1'), 'd1');
    });
  });

  group('ODA-4 Node emitting event outside domain rejection', () {
    test('TrustBoundaryValidator rejects when node domain != event origin domain', () {
      final registry = TrustDomainRegistry();
      registry.appendDomainEvent(DomainRegistryEvent(
        eventType: DomainRegistryEventType.domainCreated,
        domainId: 'd1',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      registry.appendDomainEvent(DomainRegistryEvent(
        eventType: DomainRegistryEventType.domainCreated,
        domainId: 'd2',
        eventIndex: 1,
        payload: {},
        signature: 's2',
      ));
      final membership = DomainMembershipLedger();
      membership.appendMembershipEvent(DomainMembershipEvent(
        eventType: DomainMembershipEventType.nodeAssignedToDomain,
        nodeId: 'n1',
        domainId: 'd1',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      final event = DomainScopedEvent.createDomainScopedEvent(
        eventIndex: 0,
        originDomainId: 'd2',
        eventHash: 'h',
        domainSignature: 'sig',
      );
      final result = TrustBoundaryValidator.validateEventTrust(
        event: event,
        signingNodeId: 'n1',
        membershipLedger: membership,
        registry: registry,
      );
      expect(result.valid, isFalse);
      expect(result.domainMembershipInvalid, isTrue);
    });
  });

  group('ODA-4 Suspended domain rejection', () {
    test('TrustBoundaryValidator rejects event from suspended domain', () {
      final registry = TrustDomainRegistry();
      registry.appendDomainEvent(DomainRegistryEvent(
        eventType: DomainRegistryEventType.domainCreated,
        domainId: 'd1',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      registry.appendDomainEvent(DomainRegistryEvent(
        eventType: DomainRegistryEventType.domainSuspended,
        domainId: 'd1',
        eventIndex: 1,
        payload: {},
        signature: 's1',
      ));
      final membership = DomainMembershipLedger();
      membership.appendMembershipEvent(DomainMembershipEvent(
        eventType: DomainMembershipEventType.nodeAssignedToDomain,
        nodeId: 'n1',
        domainId: 'd1',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      final event = DomainScopedEvent.createDomainScopedEvent(
        eventIndex: 0,
        originDomainId: 'd1',
        eventHash: 'h',
        domainSignature: 'sig',
      );
      final result = TrustBoundaryValidator.validateEventTrust(
        event: event,
        signingNodeId: 'n1',
        membershipLedger: membership,
        registry: registry,
      );
      expect(result.valid, isFalse);
      expect(result.domainSuspended, isTrue);
    });
  });

  group('ODA-4 Cross-domain event without authorization rejection', () {
    test('TrustBoundaryValidator rejects cross-domain event when no auth', () {
      final registry = TrustDomainRegistry();
      registry.appendDomainEvent(DomainRegistryEvent(
        eventType: DomainRegistryEventType.domainCreated,
        domainId: 'd1',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      registry.appendDomainEvent(DomainRegistryEvent(
        eventType: DomainRegistryEventType.domainCreated,
        domainId: 'd2',
        eventIndex: 1,
        payload: {},
        signature: 's2',
      ));
      final membership = DomainMembershipLedger();
      membership.appendMembershipEvent(DomainMembershipEvent(
        eventType: DomainMembershipEventType.nodeAssignedToDomain,
        nodeId: 'n1',
        domainId: 'd1',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      final event = DomainScopedEvent.createDomainScopedEvent(
        eventIndex: 0,
        originDomainId: 'd1',
        eventHash: 'h',
        domainSignature: 'sig',
        crossDomain: true,
        authorizationReference: null,
      );
      final result = TrustBoundaryValidator.validateEventTrust(
        event: event,
        signingNodeId: 'n1',
        membershipLedger: membership,
        registry: registry,
      );
      expect(result.valid, isFalse);
      expect(result.crossDomainUnauthorized, isTrue);
    });
  });

  group('ODA-4 Cross-domain event with valid authorization acceptance', () {
    test('TrustBoundaryValidator accepts cross-domain when auth reference matches', () {
      final registry = TrustDomainRegistry();
      registry.appendDomainEvent(DomainRegistryEvent(
        eventType: DomainRegistryEventType.domainCreated,
        domainId: 'd1',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      registry.appendDomainEvent(DomainRegistryEvent(
        eventType: DomainRegistryEventType.domainCreated,
        domainId: 'd2',
        eventIndex: 1,
        payload: {},
        signature: 's2',
      ));
      final membership = DomainMembershipLedger();
      membership.appendMembershipEvent(DomainMembershipEvent(
        eventType: DomainMembershipEventType.nodeAssignedToDomain,
        nodeId: 'n1',
        domainId: 'd1',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      final auth = CrossDomainAuthorization.createCrossDomainAuthorization(
        originDomainId: 'd1',
        targetDomainId: 'd2',
        authorizationProof: 'proof1',
      );
      final event = DomainScopedEvent.createDomainScopedEvent(
        eventIndex: 0,
        originDomainId: 'd1',
        eventHash: 'h',
        domainSignature: 'sig',
        crossDomain: true,
        authorizationReference: auth.contractHash,
      );
      final result = TrustBoundaryValidator.validateEventTrust(
        event: event,
        signingNodeId: 'n1',
        membershipLedger: membership,
        registry: registry,
        crossDomainAuth: auth,
      );
      expect(result.valid, isTrue);
    });
  });

  group('ODA-4 Snapshot detecting domain divergence', () {
    test('DomainSnapshotComparator returns domainMismatch when registry hashes differ', () {
      final local = DomainStateSnapshot.createDomainSnapshot(
        domainRegistryHash: 'r1',
        domainMembershipHash: 'm1',
        domainActivityStatus: 'active',
        crossDomainAuthorizationState: 's1',
      );
      final peer = DomainStateSnapshot.createDomainSnapshot(
        domainRegistryHash: 'r2',
        domainMembershipHash: 'm1',
        domainActivityStatus: 'active',
        crossDomainAuthorizationState: 's1',
      );
      expect(
        DomainSnapshotComparator.compare(local, peer),
        DomainSnapshotCompareResult.domainMismatch,
      );
    });
    test('DomainSnapshotComparator returns membershipDivergence when membership hashes differ', () {
      final local = DomainStateSnapshot.createDomainSnapshot(
        domainRegistryHash: 'r',
        domainMembershipHash: 'm1',
        domainActivityStatus: 'active',
        crossDomainAuthorizationState: 's1',
      );
      final peer = DomainStateSnapshot.createDomainSnapshot(
        domainRegistryHash: 'r',
        domainMembershipHash: 'm2',
        domainActivityStatus: 'active',
        crossDomainAuthorizationState: 's1',
      );
      expect(
        DomainSnapshotComparator.compare(local, peer),
        DomainSnapshotCompareResult.membershipDivergence,
      );
    });
  });

  group('ODA-4 Domain transfer workflow validation', () {
    test('nodeDomainTransferApproved updates node to new domain', () {
      final ledger = DomainMembershipLedger();
      ledger.appendMembershipEvent(DomainMembershipEvent(
        eventType: DomainMembershipEventType.nodeAssignedToDomain,
        nodeId: 'n1',
        domainId: 'd1',
        eventIndex: 0,
        payload: {},
        signature: 's0',
      ));
      ledger.appendMembershipEvent(DomainMembershipEvent(
        eventType: DomainMembershipEventType.nodeDomainTransferRequest,
        nodeId: 'n1',
        domainId: 'd2',
        eventIndex: 1,
        payload: {},
        signature: 's1',
      ));
      ledger.appendMembershipEvent(DomainMembershipEvent(
        eventType: DomainMembershipEventType.nodeDomainTransferApproved,
        nodeId: 'n1',
        domainId: 'd2',
        eventIndex: 2,
        payload: {},
        signature: 's2',
      ));
      expect(ledger.getNodeDomain('n1'), 'd2');
    });
  });

  group('ODA-4 Replay producing identical domain state', () {
    test('replay of same registry events produces same active domains', () {
      final events = [
        DomainRegistryEvent(
          eventType: DomainRegistryEventType.domainCreated,
          domainId: 'd1',
          eventIndex: 0,
          payload: {},
          signature: 's0',
        ),
        DomainRegistryEvent(
          eventType: DomainRegistryEventType.domainCreated,
          domainId: 'd2',
          eventIndex: 1,
          payload: {},
          signature: 's1',
        ),
      ];
      final reg1 = TrustDomainRegistry();
      for (final e in events) reg1.appendDomainEvent(e);
      final reg2 = TrustDomainRegistry();
      for (final e in events) reg2.appendDomainEvent(e);
      expect(reg1.rebuildState().activeDomainIds, reg2.rebuildState().activeDomainIds);
    });
  });

  group('ODA-4 Mixed-domain cluster hash stability', () {
    test('DomainHashEngine produces same hash for same inputs', () {
      final identity = TrustDomainIdentityFactory.createTrustDomain(
        domainId: 'd1',
        domainPublicKey: 'pk1',
        metadata: {},
        domainSignature: 'sig',
      );
      final h1 = DomainHashEngine.computeDomainHash(
        domainRegistryHash: 'rh',
        domainMembershipLedgerHash: 'mh',
        domainIdentities: [identity],
      );
      final h2 = DomainHashEngine.computeDomainHash(
        domainRegistryHash: 'rh',
        domainMembershipLedgerHash: 'mh',
        domainIdentities: [identity],
      );
      expect(h1, h2);
    });
  });

  group('ODA-4 Domain hash identical across nodes', () {
    test('getDomainHash is deterministic for same identity', () {
      final identity = TrustDomainIdentityFactory.createTrustDomain(
        domainId: 'd1',
        domainPublicKey: 'pk1',
        metadata: {'k': 'v'},
        domainSignature: 'sig',
      );
      expect(
        TrustDomainIdentityFactory.getDomainHash(identity),
        TrustDomainIdentityFactory.getDomainHash(identity),
      );
    });
  });

  group('ODA-4 Domain integrity preserved under filtered replication', () {
    test('domain snapshot validation passes for valid snapshot', () {
      final snapshot = DomainStateSnapshot.createDomainSnapshot(
        domainRegistryHash: 'rh',
        domainMembershipHash: 'mh',
        domainActivityStatus: 'active',
        crossDomainAuthorizationState: 'ok',
      );
      expect(DomainStateSnapshot.validateDomainSnapshot(snapshot), isTrue);
    });
    test('domain snapshot validation fails when registry hash empty', () {
      const snapshot = DomainStateSnapshot(
        domainRegistryHash: '',
        domainMembershipHash: 'mh',
        domainActivityStatus: 'active',
        crossDomainAuthorizationState: 'ok',
      );
      expect(DomainStateSnapshot.validateDomainSnapshot(snapshot), isFalse);
    });
  });
}
