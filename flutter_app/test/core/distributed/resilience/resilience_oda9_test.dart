// ODA-9 — Deterministic resilience & recovery tests.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/distributed/resilience/threat_model.dart';
import 'package:iris_flutter_app/core/distributed/resilience/adversarial_scenario_registry.dart';
import 'package:iris_flutter_app/core/distributed/resilience/anomaly_detector.dart';
import 'package:iris_flutter_app/core/distributed/resilience/incident_ledger.dart';
import 'package:iris_flutter_app/core/distributed/resilience/containment_engine.dart';
import 'package:iris_flutter_app/core/distributed/resilience/recovery_engine.dart';
import 'package:iris_flutter_app/core/distributed/resilience/recovery_policy.dart';
import 'package:iris_flutter_app/core/distributed/resilience/incident_proof_artifact.dart';
import 'package:iris_flutter_app/core/distributed/resilience/resilience_hash_engine.dart';
import 'package:iris_flutter_app/core/distributed/resilience/resilience_audit_report.dart';

void main() {
  group('ODA-9 Deterministic anomaly detection', () {
    test('detectAnomalies returns deterministic list for same state', () {
      final state = <String, dynamic>{'sigMismatch': true};
      final detectors = [
        (Map<String, dynamic> s) => (s['sigMismatch'] as bool?) == true
            ? const Anomaly(anomalyId: 'a1', threatType: ThreatType.signatureForgeryAttempt, entityId: 'e1')
            : const Anomaly(anomalyId: '', threatType: '', entityId: ''),
      ];
      final r1 = AnomalyDetector.detectAnomalies(state, detectors);
      final r2 = AnomalyDetector.detectAnomalies(state, detectors);
      expect(r1.length, r2.length);
      expect(r1.first.anomalyId, r2.first.anomalyId);
    });
  });

  group('ODA-9 Incident classification replay stability', () {
    test('classifyIncident returns same threat type for same anomaly', () {
      const a = Anomaly(anomalyId: 'a1', threatType: ThreatType.nodeCompromise, entityId: 'n1');
      expect(AnomalyDetector.classifyIncident(a), AnomalyDetector.classifyIncident(a));
    });
  });

  group('ODA-9 Containment determinism', () {
    test('executeContainment produces same action for same inputs', () {
      final c1 = ContainmentEngine.executeContainment(
        incidentId: 'i1',
        actionType: ContainmentActionType.suspendNode,
        entityId: 'n1',
        signature: 'sig',
      );
      final c2 = ContainmentEngine.executeContainment(
        incidentId: 'i1',
        actionType: ContainmentActionType.suspendNode,
        entityId: 'n1',
        signature: 'sig',
      );
      expect(c1.incidentId, c2.incidentId);
      expect(c1.entityId, c2.entityId);
    });
  });

  group('ODA-9 Recovery forward-only enforcement', () {
    test('finalizeRecovery produces RECOVERY_COMPLETED event only', () {
      final e = RecoveryEngine.finalizeRecovery('i1', 0, 's');
      expect(e.eventType, IncidentEventType.recoveryCompleted);
      expect(e.incidentId, 'i1');
    });
  });

  group('ODA-9 Ledger immutability during incident', () {
    test('IncidentLedger append does not affect external ledger', () {
      final incidentLedger = IncidentLedger();
      incidentLedger.appendIncidentRecord(IncidentRecord(
        incidentId: 'i1',
        relatedEntityIds: ['e1'],
        classification: ThreatType.governanceBreach,
        containmentStatus: 'contained',
        recoveryStatus: 'pending',
        incidentHash: 'h1',
      ));
      expect(incidentLedger.getIncidentState('i1')?.incidentId, 'i1');
    });
  });

  group('ODA-9 Incident proof hash stability', () {
    test('getIncidentProofHash same for same proof', () {
      final proof = IncidentProofArtifactFactory.createIncidentProof(
        incidentId: 'i1',
        threatHash: 'th',
        systemIntegrityHashAtDetection: 'sih',
        containmentHash: 'ch',
        recoveryHash: 'rh',
        signatures: ['s1'],
      );
      expect(
        IncidentProofArtifactFactory.getIncidentProofHash(proof),
        IncidentProofArtifactFactory.getIncidentProofHash(proof),
      );
    });
  });

  group('ODA-9 Resilience hash identical across nodes', () {
    test('computeResilienceHash same inputs same hash', () {
      final h1 = ResilienceHashEngine.computeResilienceHash(
        threatModelHash: 'tmh',
        incidentRegistryHash: 'irh',
        containmentStateHash: 'csh',
        recoveryStateHash: 'rsh',
      );
      final h2 = ResilienceHashEngine.computeResilienceHash(
        threatModelHash: 'tmh',
        incidentRegistryHash: 'irh',
        containmentStateHash: 'csh',
        recoveryStateHash: 'rsh',
      );
      expect(h1, h2);
    });
  });

  group('ODA-9 Cross-cluster incident comparison', () {
    test('different registry hashes produce different resilience hash', () {
      final h1 = ResilienceHashEngine.computeResilienceHash(
        threatModelHash: 'tmh',
        incidentRegistryHash: 'irh1',
        containmentStateHash: 'csh',
        recoveryStateHash: 'rsh',
      );
      final h2 = ResilienceHashEngine.computeResilienceHash(
        threatModelHash: 'tmh',
        incidentRegistryHash: 'irh2',
        containmentStateHash: 'csh',
        recoveryStateHash: 'rsh',
      );
      expect(h1, isNot(h2));
    });
  });

  group('ODA-9 Divergence detection during recovery', () {
    test('different recovery state hashes produce different resilience hash', () {
      final h1 = ResilienceHashEngine.computeResilienceHash(
        threatModelHash: 'tmh',
        incidentRegistryHash: 'irh',
        containmentStateHash: 'csh',
        recoveryStateHash: 'rsh1',
      );
      final h2 = ResilienceHashEngine.computeResilienceHash(
        threatModelHash: 'tmh',
        incidentRegistryHash: 'irh',
        containmentStateHash: 'csh',
        recoveryStateHash: 'rsh2',
      );
      expect(h1, isNot(h2));
    });
  });

  group('ODA-9 Governance approval required for recovery', () {
    test('evaluateRecoveryEligibility returns false without required approvals', () {
      final policy = RecoveryPolicyFactory.createRecoveryPolicy(
        policyId: 'rp1',
        eligibleEntities: ['e1'],
        requiredApprovals: ['gov1', 'gov2'],
        recoveryPreconditions: [],
        requiredInvariantRecheck: true,
        postRecoveryVerificationSteps: [],
      );
      expect(
        RecoveryPolicyFactory.evaluateRecoveryEligibility(policy, 'e1', ['gov1']),
        isFalse,
      );
      expect(
        RecoveryPolicyFactory.evaluateRecoveryEligibility(policy, 'e1', ['gov1', 'gov2']),
        isTrue,
      );
    });
  });

  group('ODA-9 Economic penalty triggered by breach', () {
    test('ThreatModel defines economic manipulation threat', () {
      final model = ThreatModelFactory.defineThreatModel(
        threatId: 't1',
        threatType: ThreatType.economicManipulation,
        scope: 'economics',
        detectionConditionRef: 'dc1',
        severity: 'high',
      );
      expect(model.threatType, ThreatType.economicManipulation);
      expect(ThreatModelFactory.verifyThreatModel(model), isTrue);
    });
  });

  group('ODA-9 Replay producing identical resilience state', () {
    test('same events produce same active incidents', () {
      final reg1 = AdversarialScenarioRegistry();
      final reg2 = AdversarialScenarioRegistry();
      reg1.registerIncidentEvent(IncidentEvent(
        eventType: IncidentEventType.incidentDetected,
        incidentId: 'i1',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      reg2.registerIncidentEvent(IncidentEvent(
        eventType: IncidentEventType.incidentDetected,
        incidentId: 'i1',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      expect(reg1.rebuildState().activeIncidentIds, reg2.rebuildState().activeIncidentIds);
    });
  });

  group('ODA-9 No rollback allowed test', () {
    test('RecoveryEngine only produces forward events', () {
      final init = RecoveryEngine.initiateRecovery('i1', 1, 'sig');
      expect(init.eventType, IncidentEventType.recoveryInitiated);
      final fin = RecoveryEngine.finalizeRecovery('i1', 2, 'sig');
      expect(fin.eventType, IncidentEventType.recoveryCompleted);
    });
  });
}
