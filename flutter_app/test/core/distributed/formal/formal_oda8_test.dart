// ODA-8 — Formal verification & compliance tests.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/distributed/formal/invariant_definition.dart';
import 'package:iris_flutter_app/core/distributed/formal/invariant_registry.dart';
import 'package:iris_flutter_app/core/distributed/formal/invariant_evaluator.dart';
import 'package:iris_flutter_app/core/distributed/formal/compliance_rule.dart';
import 'package:iris_flutter_app/core/distributed/formal/compliance_registry.dart';
import 'package:iris_flutter_app/core/distributed/formal/compliance_evaluator.dart';
import 'package:iris_flutter_app/core/distributed/formal/proof_artifact.dart';
import 'package:iris_flutter_app/core/distributed/formal/certification_report.dart';
import 'package:iris_flutter_app/core/distributed/formal/formal_hash_engine.dart';
import 'package:iris_flutter_app/core/distributed/formal/compliance_audit_report.dart';

void main() {
  group('ODA-8 Deterministic invariant evaluation', () {
    test('evaluateInvariant returns same result for same context', () {
      final inv = InvariantDefinitionFactory.createInvariant(
        invariantId: 'i1',
        description: 'desc',
        scope: InvariantScope.cluster,
        version: 1,
      );
      final ctx = <String, dynamic>{'x': 1};
      final r1 = InvariantDefinitionFactory.evaluateInvariant(inv, ctx, (c) => (c['x'] as int) > 0);
      final r2 = InvariantDefinitionFactory.evaluateInvariant(inv, ctx, (c) => (c['x'] as int) > 0);
      expect(r1, r2);
    });
  });

  group('ODA-8 Invariant registry replay reconstruction', () {
    test('rebuildState produces same active invariants after same events', () {
      final reg = InvariantRegistry();
      reg.appendInvariantEvent(InvariantEvent(
        eventType: InvariantEventType.invariantActivated,
        invariantId: 'i1',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      expect(reg.rebuildState().activeInvariantIds, reg.rebuildState().activeInvariantIds);
      expect(reg.getActiveInvariants().contains('i1'), isTrue);
    });
  });

  group('ODA-8 Compliance rule evaluation determinism', () {
    test('evaluateCompliance returns same for same context', () {
      final rule = ComplianceRuleFactory.createComplianceRule(
        ruleId: 'r1',
        scope: 'cluster',
        requiredInvariantIds: [],
        complianceLevel: 'L1',
      );
      final ctx = <String, dynamic>{'ok': true};
      final r1 = ComplianceRuleFactory.evaluateCompliance(rule, ctx, (c) => c['ok'] as bool);
      final r2 = ComplianceRuleFactory.evaluateCompliance(rule, ctx, (c) => c['ok'] as bool);
      expect(r1, r2);
    });
  });

  group('ODA-8 Compliance rule version stability', () {
    test('getComplianceRuleHash stable for same rule', () {
      final rule = ComplianceRuleFactory.createComplianceRule(
        ruleId: 'r1',
        scope: 's',
        requiredInvariantIds: ['i1'],
        complianceLevel: 'L1',
      );
      expect(
        ComplianceRuleFactory.getComplianceRuleHash(rule),
        ComplianceRuleFactory.getComplianceRuleHash(rule),
      );
    });
  });

  group('ODA-8 Proof artifact hash stability', () {
    test('getProofHash same for same artifact', () {
      final proof = ProofArtifactFactory.createProofArtifact(
        proofId: 'p1',
        stateHash: 'sh',
        activeInvariantsHash: 'aih',
        activeComplianceRulesHash: 'acrh',
        evaluationResult: true,
        signature: 'sig',
      );
      expect(ProofArtifactFactory.getProofHash(proof), ProofArtifactFactory.getProofHash(proof));
    });
  });

  group('ODA-8 Certification report replay identity', () {
    test('generateCertificationReport same inputs same reportHash', () {
      final r1 = CertificationReportGenerator.generateCertificationReport(
        systemIntegrityHash: 'sih',
        governanceHash: 'gh',
        economicHash: 'eh',
        federationHash: 'fh',
        complianceHash: 'ch',
        invariantResults: {'i1': true},
        violationFlags: {'v1': false},
        signatures: ['s1'],
      );
      final r2 = CertificationReportGenerator.generateCertificationReport(
        systemIntegrityHash: 'sih',
        governanceHash: 'gh',
        economicHash: 'eh',
        federationHash: 'fh',
        complianceHash: 'ch',
        invariantResults: {'i1': true},
        violationFlags: {'v1': false},
        signatures: ['s1'],
      );
      expect(r1.reportHash, r2.reportHash);
    });
  });

  group('ODA-8 Divergence detection when invariant violated', () {
    test('evaluateAllInvariants produces violations when validator returns false', () {
      final inv = InvariantDefinitionFactory.createInvariant(
        invariantId: 'i1',
        description: 'd',
        scope: InvariantScope.cluster,
        version: 1,
      );
      final result = InvariantEvaluator.evaluateAllInvariants(
        systemState: {},
        activeInvariants: [inv],
        validators: {'i1': (_) => false},
      );
      expect(result.allPassed, isFalse);
      expect(result.violations.length, 1);
      expect(result.violations.first.invariantId, 'i1');
    });
  });

  group('ODA-8 Cross-cluster certification comparison', () {
    test('different compliance hashes produce different formal hash', () {
      final h1 = FormalHashEngine.computeFormalVerificationHash(
        invariantRegistryHash: 'irh',
        complianceRegistryHash: 'crh1',
        evaluationResultHash: 'erh',
        proofArtifactHashes: [],
      );
      final h2 = FormalHashEngine.computeFormalVerificationHash(
        invariantRegistryHash: 'irh',
        complianceRegistryHash: 'crh2',
        evaluationResultHash: 'erh',
        proofArtifactHashes: [],
      );
      expect(h1, isNot(h2));
    });
  });

  group('ODA-8 Formal hash identical across nodes', () {
    test('computeFormalVerificationHash same inputs same hash', () {
      final h1 = FormalHashEngine.computeFormalVerificationHash(
        invariantRegistryHash: 'irh',
        complianceRegistryHash: 'crh',
        evaluationResultHash: 'erh',
        proofArtifactHashes: ['ph1'],
      );
      final h2 = FormalHashEngine.computeFormalVerificationHash(
        invariantRegistryHash: 'irh',
        complianceRegistryHash: 'crh',
        evaluationResultHash: 'erh',
        proofArtifactHashes: ['ph1'],
      );
      expect(h1, h2);
    });
  });

  group('ODA-8 No side effects during invariant evaluation', () {
    test('evaluateAllInvariants does not mutate systemState', () {
      final state = <String, dynamic>{'x': 1};
      final inv = InvariantDefinitionFactory.createInvariant(
        invariantId: 'i1',
        description: 'd',
        scope: InvariantScope.cluster,
        version: 1,
      );
      InvariantEvaluator.evaluateAllInvariants(
        systemState: state,
        activeInvariants: [inv],
        validators: {'i1': (_) => true},
      );
      expect(state['x'], 1);
    });
  });

  group('ODA-8 Compliance score deterministic', () {
    test('evaluateComplianceState produces deterministic score', () {
      final rule = ComplianceRuleFactory.createComplianceRule(
        ruleId: 'r1',
        scope: 's',
        requiredInvariantIds: [],
        complianceLevel: 'L1',
      );
      final r1 = ComplianceEvaluator.evaluateComplianceState(
        systemState: {},
        activeRules: [rule],
        ruleEvaluators: {'r1': (_) => true},
      );
      final r2 = ComplianceEvaluator.evaluateComplianceState(
        systemState: {},
        activeRules: [rule],
        ruleEvaluators: {'r1': (_) => true},
      );
      expect(r1.complianceScore, r2.complianceScore);
      expect(r1.complianceScore, 100);
    });
  });

  group('ODA-8 Certification signature validation', () {
    test('verifyCertificationReport returns true when hash and signatures valid', () {
      final report = CertificationReportGenerator.generateCertificationReport(
        systemIntegrityHash: 'sih',
        governanceHash: 'gh',
        economicHash: 'eh',
        federationHash: 'fh',
        complianceHash: 'ch',
        invariantResults: {},
        violationFlags: {},
        signatures: ['sig1'],
      );
      final ok = CertificationReportGenerator.verifyCertificationReport(
        report,
        (hash, sigs) => sigs.isNotEmpty,
      );
      expect(ok, isTrue);
    });
  });

  group('ODA-8 Compliance audit determinism', () {
    test('generateComplianceAudit same inputs same certification status', () {
      final r1 = ComplianceAuditReportGenerator.generateComplianceAudit(
        activeInvariants: ['i1'],
        activeComplianceRules: ['r1'],
        evaluationResults: {'i1': true},
        violations: [],
        formalHash: 'fh',
      );
      final r2 = ComplianceAuditReportGenerator.generateComplianceAudit(
        activeInvariants: ['i1'],
        activeComplianceRules: ['r1'],
        evaluationResults: {'i1': true},
        violations: [],
        formalHash: 'fh',
      );
      expect(r1.certificationStatus, r2.certificationStatus);
      expect(r1.formalHash, r2.formalHash);
    });
  });
}
