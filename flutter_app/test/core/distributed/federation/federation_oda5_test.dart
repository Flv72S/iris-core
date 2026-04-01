// ODA-5 — Federated IRIS networks tests.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/distributed/federation/federation_identity.dart';
import 'package:iris_flutter_app/core/distributed/federation/federation_registry.dart';
import 'package:iris_flutter_app/core/distributed/federation/federation_contract.dart';
import 'package:iris_flutter_app/core/distributed/federation/federation_membership_ledger.dart';
import 'package:iris_flutter_app/core/distributed/federation/cross_cluster_event.dart';
import 'package:iris_flutter_app/core/distributed/federation/remote_cluster_snapshot.dart';
import 'package:iris_flutter_app/core/distributed/federation/federation_validator.dart';
import 'package:iris_flutter_app/core/distributed/federation/remote_integrity_verifier.dart';
import 'package:iris_flutter_app/core/distributed/federation/federation_hash_engine.dart';
import 'package:iris_flutter_app/core/distributed/federation/federation_audit_report.dart';

void main() {
  group('ODA-5 Deterministic federation identity creation', () {
    test('createFederationIdentity produces same hash for same inputs', () {
      final id = FederationIdentityFactory.createFederationIdentity(
        clusterId: 'c1',
        clusterPublicKey: 'pk1',
        domainHash: 'dh1',
        clusterHash: 'ch1',
        federationSignature: 'sig1',
      );
      expect(
        FederationIdentityFactory.getFederationIdentityHash(id),
        FederationIdentityFactory.getFederationIdentityHash(id),
      );
    });
  });

  group('ODA-5 Bilateral federation handshake', () {
    test('FEDERATION_ACCEPTED produces active federation pair', () {
      final reg = FederationRegistry();
      reg.appendFederationEvent(FederationEvent(
        eventType: FederationEventType.federationRequest,
        localClusterId: 'c1',
        remoteClusterId: 'c2',
        eventIndex: 0,
        payload: {},
        signature: 's0',
      ));
      reg.appendFederationEvent(FederationEvent(
        eventType: FederationEventType.federationAccepted,
        localClusterId: 'c1',
        remoteClusterId: 'c2',
        eventIndex: 1,
        payload: {},
        signature: 's1',
      ));
      expect(reg.getActiveFederations().contains('c1:c2'), isTrue);
    });
  });

  group('ODA-5 Federation contract validation', () {
    test('verifyFederationContract returns true when both signatures valid', () {
      final contract = FederationContractFactory.createFederationContract(
        contractId: 'ct1',
        clusterAId: 'c1',
        clusterBId: 'c2',
        allowedDomains: ['d1'],
        allowedEventTypes: ['T1'],
        authorizationRequirements: {},
        scopeRestrictions: {},
        signatureA: 'sA',
        signatureB: 'sB',
      );
      final ok = FederationContractFactory.verifyFederationContract(
        contract,
        (cid, hash, sig) => sig.isNotEmpty,
      );
      expect(ok, isTrue);
    });
  });

  group('ODA-5 Contract mismatch rejection', () {
    test('FederationValidator rejects when event contract hash != contract', () {
      final reg = FederationRegistry();
      reg.appendFederationEvent(FederationEvent(
        eventType: FederationEventType.federationAccepted,
        localClusterId: 'c1',
        remoteClusterId: 'c2',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      final contract = FederationContractFactory.createFederationContract(
        contractId: 'ct1',
        clusterAId: 'c1',
        clusterBId: 'c2',
        allowedDomains: ['d1'],
        allowedEventTypes: [],
        authorizationRequirements: {},
        scopeRestrictions: {},
        signatureA: 'sA',
        signatureB: 'sB',
      );
      final event = CrossClusterEvent.createCrossClusterEvent(
        originClusterId: 'c1',
        originDomainId: 'd1',
        targetClusterId: 'c2',
        federationContractHash: 'wrong_hash',
        eventPayload: {},
        proofOfOriginLedgerInclusion: 'proof',
      );
      final ledger = FederationMembershipLedger();
      final result = FederationValidator.validateFederatedEvent(
        event: event,
        localClusterId: 'c2',
        registry: reg,
        contract: contract,
        membershipLedger: ledger,
        verifyProofOfOrigin: (_) => true,
        verifyOriginIntegrityHash: (_) => true,
      );
      expect(result.valid, isFalse);
      expect(result.contractInvalid, isTrue);
    });
  });

  group('ODA-5 Unauthorized domain rejection', () {
    test('FederationValidator rejects when origin domain not in allowedDomains', () {
      final reg = FederationRegistry();
      reg.appendFederationEvent(FederationEvent(
        eventType: FederationEventType.federationAccepted,
        localClusterId: 'c1',
        remoteClusterId: 'c2',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      final contract = FederationContractFactory.createFederationContract(
        contractId: 'ct1',
        clusterAId: 'c1',
        clusterBId: 'c2',
        allowedDomains: ['d1'],
        allowedEventTypes: [],
        authorizationRequirements: {},
        scopeRestrictions: {},
        signatureA: 'sA',
        signatureB: 'sB',
      );
      final event = CrossClusterEvent.createCrossClusterEvent(
        originClusterId: 'c1',
        originDomainId: 'd_unauthorized',
        targetClusterId: 'c2',
        federationContractHash: contract.contractHash,
        eventPayload: {},
        proofOfOriginLedgerInclusion: 'proof',
      );
      final ledger = FederationMembershipLedger();
      final result = FederationValidator.validateFederatedEvent(
        event: event,
        localClusterId: 'c2',
        registry: reg,
        contract: contract,
        membershipLedger: ledger,
        verifyProofOfOrigin: (_) => true,
        verifyOriginIntegrityHash: (_) => true,
      );
      expect(result.valid, isFalse);
      expect(result.domainUnauthorized, isTrue);
    });
  });

  group('ODA-5 Cross-cluster event without proof rejection', () {
    test('FederationValidator rejects when verifyProofOfOrigin returns false', () {
      final reg = FederationRegistry();
      reg.appendFederationEvent(FederationEvent(
        eventType: FederationEventType.federationAccepted,
        localClusterId: 'c1',
        remoteClusterId: 'c2',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      final contract = FederationContractFactory.createFederationContract(
        contractId: 'ct1',
        clusterAId: 'c1',
        clusterBId: 'c2',
        allowedDomains: ['d1'],
        allowedEventTypes: [],
        authorizationRequirements: {},
        scopeRestrictions: {},
        signatureA: 'sA',
        signatureB: 'sB',
      );
      final event = CrossClusterEvent.createCrossClusterEvent(
        originClusterId: 'c1',
        originDomainId: 'd1',
        targetClusterId: 'c2',
        federationContractHash: contract.contractHash,
        eventPayload: {},
        proofOfOriginLedgerInclusion: 'proof',
      );
      final ledger = FederationMembershipLedger();
      final result = FederationValidator.validateFederatedEvent(
        event: event,
        localClusterId: 'c2',
        registry: reg,
        contract: contract,
        membershipLedger: ledger,
        verifyProofOfOrigin: (_) => false,
        verifyOriginIntegrityHash: (_) => true,
      );
      expect(result.valid, isFalse);
      expect(result.proofOfOriginInvalid, isTrue);
    });
  });

  group('ODA-5 Valid cross-cluster event acceptance', () {
    test('FederationValidator accepts when all conditions pass', () {
      final reg = FederationRegistry();
      reg.appendFederationEvent(FederationEvent(
        eventType: FederationEventType.federationAccepted,
        localClusterId: 'c1',
        remoteClusterId: 'c2',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      final contract = FederationContractFactory.createFederationContract(
        contractId: 'ct1',
        clusterAId: 'c1',
        clusterBId: 'c2',
        allowedDomains: ['d1'],
        allowedEventTypes: [],
        authorizationRequirements: {},
        scopeRestrictions: {},
        signatureA: 'sA',
        signatureB: 'sB',
      );
      final event = CrossClusterEvent.createCrossClusterEvent(
        originClusterId: 'c1',
        originDomainId: 'd1',
        targetClusterId: 'c2',
        federationContractHash: contract.contractHash,
        eventPayload: {},
        proofOfOriginLedgerInclusion: 'proof',
      );
      final ledger = FederationMembershipLedger();
      final result = FederationValidator.validateFederatedEvent(
        event: event,
        localClusterId: 'c2',
        registry: reg,
        contract: contract,
        membershipLedger: ledger,
        verifyProofOfOrigin: (_) => true,
        verifyOriginIntegrityHash: (_) => true,
      );
      expect(result.valid, isTrue);
    });
  });

  group('ODA-5 Remote divergence detection', () {
    test('compareRemoteSnapshot returns remoteDivergence when ledger head differs', () {
      const remote = RemoteClusterSnapshot(
        remoteClusterHash: 'ch',
        remoteDomainHash: 'dh',
        remoteLedgerHeadHash: 'head1',
        federationContractHash: 'cth',
        federationMembershipHash: 'fmh',
      );
      final result = RemoteClusterSnapshotComparator.compareRemoteSnapshot(
        remote: remote,
        localExpectedClusterHash: 'ch',
        localExpectedDomainHash: 'dh',
        localExpectedLedgerHeadHash: 'head2',
        localExpectedContractHash: 'cth',
      );
      expect(result, RemoteSnapshotCompareResult.remoteDivergence);
    });
  });

  group('ODA-5 Federation suspension enforcement', () {
    test('FederationValidator rejects when federation is suspended', () {
      final reg = FederationRegistry();
      reg.appendFederationEvent(FederationEvent(
        eventType: FederationEventType.federationAccepted,
        localClusterId: 'c1',
        remoteClusterId: 'c2',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      reg.appendFederationEvent(FederationEvent(
        eventType: FederationEventType.federationSuspended,
        localClusterId: 'c1',
        remoteClusterId: 'c2',
        eventIndex: 1,
        payload: {},
        signature: 's1',
      ));
      final contract = FederationContractFactory.createFederationContract(
        contractId: 'ct1',
        clusterAId: 'c1',
        clusterBId: 'c2',
        allowedDomains: ['d1'],
        allowedEventTypes: [],
        authorizationRequirements: {},
        scopeRestrictions: {},
        signatureA: 'sA',
        signatureB: 'sB',
      );
      final event = CrossClusterEvent.createCrossClusterEvent(
        originClusterId: 'c1',
        originDomainId: 'd1',
        targetClusterId: 'c2',
        federationContractHash: contract.contractHash,
        eventPayload: {},
        proofOfOriginLedgerInclusion: 'proof',
      );
      final ledger = FederationMembershipLedger();
      final result = FederationValidator.validateFederatedEvent(
        event: event,
        localClusterId: 'c2',
        registry: reg,
        contract: contract,
        membershipLedger: ledger,
        verifyProofOfOrigin: (_) => true,
        verifyOriginIntegrityHash: (_) => true,
      );
      expect(result.valid, isFalse);
      expect(result.federationInactive, isTrue);
    });
  });

  group('ODA-5 Replay producing identical federation state', () {
    test('rebuildState produces same active federations after same events', () {
      final events = [
        FederationEvent(
          eventType: FederationEventType.federationAccepted,
          localClusterId: 'c1',
          remoteClusterId: 'c2',
          eventIndex: 0,
          payload: {},
          signature: 's',
        ),
      ];
      final reg1 = FederationRegistry();
      for (final e in events) reg1.appendFederationEvent(e);
      final reg2 = FederationRegistry();
      for (final e in events) reg2.appendFederationEvent(e);
      expect(reg1.rebuildState().activeFederationPairs, reg2.rebuildState().activeFederationPairs);
    });
  });

  group('ODA-5 Federation hash stability across nodes', () {
    test('computeFederationHash produces same hash for same inputs', () {
      final id = FederationIdentityFactory.createFederationIdentity(
        clusterId: 'c1',
        clusterPublicKey: 'pk1',
        domainHash: 'dh',
        clusterHash: 'ch',
        federationSignature: 'sig',
      );
      final h1 = FederationHashEngine.computeFederationHash(
        federationRegistryHash: 'rh',
        federationContractsHash: 'ch',
        federationMembershipHash: 'mh',
        federatedClusterIdentities: [id],
      );
      final h2 = FederationHashEngine.computeFederationHash(
        federationRegistryHash: 'rh',
        federationContractsHash: 'ch',
        federationMembershipHash: 'mh',
        federatedClusterIdentities: [id],
      );
      expect(h1, h2);
    });
  });

  group('ODA-5 Federation audit determinism', () {
    test('generateFederationAudit produces same reportHash on same inputs', () {
      final reg = FederationRegistry();
      reg.appendFederationEvent(FederationEvent(
        eventType: FederationEventType.federationAccepted,
        localClusterId: 'c1',
        remoteClusterId: 'c2',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      final contract = FederationContractFactory.createFederationContract(
        contractId: 'ct1',
        clusterAId: 'c1',
        clusterBId: 'c2',
        allowedDomains: ['d1'],
        allowedEventTypes: [],
        authorizationRequirements: {},
        scopeRestrictions: {},
        signatureA: 'sA',
        signatureB: 'sB',
      );
      final ledger = FederationMembershipLedger();
      final r1 = FederationAuditReportGenerator.generateFederationAudit(
        registry: reg,
        contracts: [contract],
        membershipLedger: ledger,
      );
      final r2 = FederationAuditReportGenerator.generateFederationAudit(
        registry: reg,
        contracts: [contract],
        membershipLedger: ledger,
      );
      expect(r1.reportHash, r2.reportHash);
    });
  });

  group('ODA-5 Remote integrity verification failure path', () {
    test('verifyRemoteIntegrity returns invalid when expected cluster hash differs', () {
      const snapshot = RemoteClusterSnapshot(
        remoteClusterHash: 'rh1',
        remoteDomainHash: 'dh',
        remoteLedgerHeadHash: 'lh',
        federationContractHash: 'cth',
        federationMembershipHash: 'fmh',
      );
      final result = RemoteIntegrityVerifier.verifyRemoteIntegrity(
        snapshot: snapshot,
        expectedRemoteClusterHash: 'rh2',
        expectedRemoteDomainHash: 'dh',
        expectedContractHash: 'cth',
      );
      expect(result.valid, isFalse);
      expect(result.remoteClusterHashInvalid, isTrue);
    });
  });
}
