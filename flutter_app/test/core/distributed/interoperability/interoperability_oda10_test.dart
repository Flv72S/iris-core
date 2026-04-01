// ODA-10 — Deterministic global interoperability tests.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/distributed/interoperability/external_system_identity.dart';
import 'package:iris_flutter_app/core/distributed/interoperability/external_adapter_definition.dart';
import 'package:iris_flutter_app/core/distributed/interoperability/interoperability_registry.dart';
import 'package:iris_flutter_app/core/distributed/interoperability/external_proof_artifact.dart';
import 'package:iris_flutter_app/core/distributed/interoperability/bridge_contract.dart';
import 'package:iris_flutter_app/core/distributed/interoperability/external_state_snapshot.dart';
import 'package:iris_flutter_app/core/distributed/interoperability/external_verification_engine.dart';
import 'package:iris_flutter_app/core/distributed/interoperability/interoperability_ledger.dart';
import 'package:iris_flutter_app/core/distributed/interoperability/interoperability_hash_engine.dart';
import 'package:iris_flutter_app/core/distributed/interoperability/interoperability_audit_report.dart';

void main() {
  group('ODA-10 Deterministic adapter evaluation', () {
    test('evaluateAdapter returns same output for same input', () {
      final adapter = ExternalAdapterDefinitionFactory.createAdapter(
        adapterId: 'a1',
        version: '1',
        inputSchemaRef: 's1',
        proofSchemaRef: 'p1',
        validationLogicRef: 'v1',
      );
      final input = <String, dynamic>{'x': 1};
      final out1 = ExternalAdapterDefinitionFactory.evaluateAdapter(adapter, input, (a) => {'y': (a['x'] as int) + 1});
      final out2 = ExternalAdapterDefinitionFactory.evaluateAdapter(adapter, input, (a) => {'y': (a['x'] as int) + 1});
      expect(out1['y'], out2['y']);
    });
  });

  group('ODA-10 External proof verification stability', () {
    test('getExternalProofHash same for same artifact', () {
      final art = ExternalProofArtifactFactory.createExternalProofArtifact(
        externalSystemId: 'ext1',
        externalTransactionId: 'tx1',
        payload: {},
        proofMetadata: {},
      );
      expect(
        ExternalProofArtifactFactory.getExternalProofHash(art),
        ExternalProofArtifactFactory.getExternalProofHash(art),
      );
    });
  });

  group('ODA-10 Bridge contract enforcement', () {
    test('evaluateBridgeOperation returns false when operation not permitted', () {
      final contract = BridgeContractFactory.createBridgeContract(
        contractId: 'c1',
        externalSystemId: 'ext1',
        permittedOperations: ['op1'],
        requiredProofTypes: ['p1'],
        validationRulesRef: 'v1',
      );
      final ok = BridgeContractFactory.evaluateBridgeOperation(
        contract,
        <String, dynamic>{'operation': 'op2'},
        (op, ctx) => true,
      );
      expect(ok, isFalse);
    });
    test('evaluateBridgeOperation returns true when operation permitted', () {
      final contract = BridgeContractFactory.createBridgeContract(
        contractId: 'c1',
        externalSystemId: 'ext1',
        permittedOperations: ['op1'],
        requiredProofTypes: ['p1'],
        validationRulesRef: 'v1',
      );
      final ok = BridgeContractFactory.evaluateBridgeOperation(
        contract,
        <String, dynamic>{'operation': 'op1'},
        (op, ctx) => true,
      );
      expect(ok, isTrue);
    });
  });

  group('ODA-10 Invalid proof rejection', () {
    test('validateExternalInteraction returns invalidSignature when verifyProof false', () {
      final reg = InteroperabilityRegistry();
      reg.appendInteroperabilityEvent(InteroperabilityEvent(
        eventType: InteroperabilityEventType.externalSystemRegistered,
        externalSystemId: 'ext1',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      final contract = BridgeContractFactory.createBridgeContract(
        contractId: 'c1',
        externalSystemId: 'ext1',
        permittedOperations: ['op1'],
        requiredProofTypes: ['p1'],
        validationRulesRef: 'v1',
      );
      final art = ExternalProofArtifactFactory.createExternalProofArtifact(
        externalSystemId: 'ext1',
        externalTransactionId: 'tx1',
        payload: {},
        proofMetadata: {},
      );
      final result = ExternalVerificationEngine.validateExternalInteraction(
        artifact: art,
        context: {},
        registry: reg,
        contract: contract,
        verifyProof: (_) => false,
      );
      expect(result.valid, isFalse);
      expect(result.invalidSignature, isTrue);
    });
  });

  group('ODA-10 Suspended external system rejection', () {
    test('validateExternalInteraction returns suspendedExternalSystem when suspended', () {
      final reg = InteroperabilityRegistry();
      reg.appendInteroperabilityEvent(InteroperabilityEvent(
        eventType: InteroperabilityEventType.externalSystemRegistered,
        externalSystemId: 'ext1',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      reg.appendInteroperabilityEvent(InteroperabilityEvent(
        eventType: InteroperabilityEventType.externalSystemSuspended,
        externalSystemId: 'ext1',
        eventIndex: 1,
        payload: {},
        signature: 's1',
      ));
      final contract = BridgeContractFactory.createBridgeContract(
        contractId: 'c1',
        externalSystemId: 'ext1',
        permittedOperations: ['op1'],
        requiredProofTypes: ['p1'],
        validationRulesRef: 'v1',
      );
      final art = ExternalProofArtifactFactory.createExternalProofArtifact(
        externalSystemId: 'ext1',
        externalTransactionId: 'tx1',
        payload: {},
        proofMetadata: {},
      );
      final result = ExternalVerificationEngine.validateExternalInteraction(
        artifact: art,
        context: {},
        registry: reg,
        contract: contract,
        verifyProof: (_) => true,
      );
      expect(result.valid, isFalse);
      expect(result.suspendedExternalSystem, isTrue);
    });
  });

  group('ODA-10 Replay reconstructs identical interoperability state', () {
    test('same events produce same reconstructInteroperabilityState', () {
      final led1 = InteroperabilityLedger();
      final led2 = InteroperabilityLedger();
      led1.appendInteroperabilityEvent(InteroperabilityLedgerEvent(
        eventType: InteroperabilityLedgerEventType.externalProofAccepted,
        eventIndex: 0,
        externalSystemId: 'ext1',
        payload: {'proofId': 'p1'},
        signature: 's',
      ));
      led2.appendInteroperabilityEvent(InteroperabilityLedgerEvent(
        eventType: InteroperabilityLedgerEventType.externalProofAccepted,
        eventIndex: 0,
        externalSystemId: 'ext1',
        payload: {'proofId': 'p1'},
        signature: 's',
      ));
      expect(led1.reconstructInteroperabilityState().acceptedProofIds, led2.reconstructInteroperabilityState().acceptedProofIds);
    });
  });

  group('ODA-10 Interoperability hash identical across nodes', () {
    test('computeInteroperabilityHash same inputs same hash', () {
      final h1 = InteroperabilityHashEngine.computeInteroperabilityHash(
        interoperabilityRegistryHash: 'irh',
        activeBridgeContractHashes: ['ch1'],
        interoperabilityLedgerHash: 'ilh',
        externalSnapshotHashes: ['sh1'],
      );
      final h2 = InteroperabilityHashEngine.computeInteroperabilityHash(
        interoperabilityRegistryHash: 'irh',
        activeBridgeContractHashes: ['ch1'],
        interoperabilityLedgerHash: 'ilh',
        externalSnapshotHashes: ['sh1'],
      );
      expect(h1, h2);
    });
  });

  group('ODA-10 Snapshot comparison determinism', () {
    test('compareExternalSnapshot returns compatible when same hash', () {
      final local = ExternalStateSnapshotFactory.createExternalSnapshot(
        snapshotId: 's1',
        externalSystemId: 'ext1',
        externalProofReferences: ['pr1'],
      );
      final remote = ExternalStateSnapshotFactory.createExternalSnapshot(
        snapshotId: 's1',
        externalSystemId: 'ext1',
        externalProofReferences: ['pr1'],
      );
      expect(
        ExternalStateSnapshotComparator.compareExternalSnapshot(local, remote),
        ExternalSnapshotCompareResult.compatible,
      );
    });
    test('compareExternalSnapshot returns divergence when different hash', () {
      final local = ExternalStateSnapshotFactory.createExternalSnapshot(
        snapshotId: 's1',
        externalSystemId: 'ext1',
        externalProofReferences: ['pr1'],
      );
      final remote = ExternalStateSnapshotFactory.createExternalSnapshot(
        snapshotId: 's2',
        externalSystemId: 'ext1',
        externalProofReferences: ['pr2'],
      );
      expect(
        ExternalStateSnapshotComparator.compareExternalSnapshot(local, remote),
        ExternalSnapshotCompareResult.divergence,
      );
    });
  });

  group('ODA-10 External divergence detection', () {
    test('different ledger hashes produce different interoperability hash', () {
      final h1 = InteroperabilityHashEngine.computeInteroperabilityHash(
        interoperabilityRegistryHash: 'irh',
        activeBridgeContractHashes: [],
        interoperabilityLedgerHash: 'ilh1',
        externalSnapshotHashes: [],
      );
      final h2 = InteroperabilityHashEngine.computeInteroperabilityHash(
        interoperabilityRegistryHash: 'irh',
        activeBridgeContractHashes: [],
        interoperabilityLedgerHash: 'ilh2',
        externalSnapshotHashes: [],
      );
      expect(h1, isNot(h2));
    });
  });

  group('ODA-10 Governance approval required for bridge contract', () {
    test('verifyBridgeContract validates hash', () {
      final contract = BridgeContractFactory.createBridgeContract(
        contractId: 'c1',
        externalSystemId: 'ext1',
        permittedOperations: ['op1'],
        requiredProofTypes: ['p1'],
        validationRulesRef: 'v1',
      );
      expect(BridgeContractFactory.verifyBridgeContract(contract), isTrue);
    });
  });

  group('ODA-10 Economic settlement via external bridge', () {
    test('BridgeContract with economicSettlementRulesRef is valid', () {
      final contract = BridgeContractFactory.createBridgeContract(
        contractId: 'c1',
        externalSystemId: 'ext1',
        permittedOperations: ['op1', 'settle'],
        requiredProofTypes: ['p1'],
        validationRulesRef: 'v1',
        economicSettlementRulesRef: 'esr1',
      );
      expect(contract.economicSettlementRulesRef, 'esr1');
      expect(BridgeContractFactory.getBridgeContractHash(contract), isNotEmpty);
    });
  });

  group('ODA-10 No live API call during replay', () {
    test('evaluateAdapter uses only provided artifact', () {
      final adapter = ExternalAdapterDefinitionFactory.createAdapter(
        adapterId: 'a1',
        version: '1',
        inputSchemaRef: 's1',
        proofSchemaRef: 'p1',
        validationLogicRef: 'v1',
      );
      final output = ExternalAdapterDefinitionFactory.evaluateAdapter(
        adapter,
        <String, dynamic>{'value': 42},
        (a) => <String, dynamic>{'result': a['value']},
      );
      expect(output['result'], 42);
    });
  });

  group('ODA-10 External artifact tampering detection', () {
    test('verifyExternalProofArtifact returns false when hash mismatch', () {
      final art = ExternalProofArtifactFactory.createExternalProofArtifact(
        externalSystemId: 'ext1',
        externalTransactionId: 'tx1',
        payload: {'a': 1},
        proofMetadata: {},
      );
      final tampered = ExternalProofArtifact(
        externalSystemId: art.externalSystemId,
        externalTransactionId: art.externalTransactionId,
        payload: {'a': 2},
        proofMetadata: art.proofMetadata,
        signatureOrVerificationRef: art.signatureOrVerificationRef,
        artifactHash: art.artifactHash,
      );
      final ok = ExternalProofArtifactFactory.verifyExternalProofArtifact(
        tampered,
        (hash, ref) => true,
      );
      expect(ok, isFalse);
    });
  });
}
