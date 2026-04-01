// ODA-6 — Governance & deterministic inter-cluster policy tests.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/distributed/governance/governance_identity.dart';
import 'package:iris_flutter_app/core/distributed/governance/governance_registry.dart';
import 'package:iris_flutter_app/core/distributed/governance/governance_policy.dart';
import 'package:iris_flutter_app/core/distributed/governance/policy_version_ledger.dart';
import 'package:iris_flutter_app/core/distributed/governance/policy_proposal.dart';
import 'package:iris_flutter_app/core/distributed/governance/policy_approval_engine.dart';
import 'package:iris_flutter_app/core/distributed/governance/policy_activation_manager.dart';
import 'package:iris_flutter_app/core/distributed/governance/inter_cluster_policy_evaluator.dart';
import 'package:iris_flutter_app/core/distributed/governance/governance_hash_engine.dart';
import 'package:iris_flutter_app/core/distributed/governance/governance_audit_report.dart';

void main() {
  group('ODA-6 Deterministic governance identity creation', () {
    test('createGovernanceIdentity produces same hash for same inputs', () {
      final id = GovernanceIdentityFactory.createGovernanceIdentity(
        federationId: 'f1',
        participatingClusterIds: ['c1', 'c2'],
        governancePublicKeys: {'c1': 'pk1', 'c2': 'pk2'},
        governanceSignatureSet: ['s1', 's2'],
      );
      expect(
        GovernanceIdentityFactory.getGovernanceHash(id),
        GovernanceIdentityFactory.getGovernanceHash(id),
      );
    });
  });

  group('ODA-6 Policy proposal replay reconstruction', () {
    test('rebuildState reproduces pendingProposals after same events', () {
      final reg = GovernanceRegistry();
      reg.appendGovernanceEvent(GovernanceEvent(
        eventType: GovernanceEventType.policyProposed,
        policyId: 'pol1',
        eventIndex: 0,
        payload: {},
        signature: 's0',
      ));
      final s1 = reg.rebuildState();
      final s2 = reg.rebuildState();
      expect(s1.pendingProposals, s2.pendingProposals);
      expect(s1.pendingProposals.contains('pol1'), isTrue);
    });
  });

  group('ODA-6 Approval signature validation', () {
    test('validatePolicyApproval returns true when required approvals present', () {
      final policy = GovernancePolicyFactory.createPolicy(
        policyId: 'p1',
        version: 1,
        scopeDomains: ['d1'],
        scopeClusters: ['c1', 'c2'],
        scopeEventTypes: [],
        requiredApprovalClusterIds: ['c1', 'c2'],
      );
      final approvals = [
        const PolicyApprovalRecord(policyId: 'p1', clusterId: 'c1', signature: 's1'),
        const PolicyApprovalRecord(policyId: 'p1', clusterId: 'c2', signature: 's2'),
      ];
      expect(
        PolicyApprovalEngine.validatePolicyApproval(
          policyId: 'p1',
          policy: policy,
          approvals: approvals,
        ),
        isTrue,
      );
    });
  });

  group('ODA-6 Unauthorized approval rejection', () {
    test('approvePolicy returns false when cluster not in requiredApprovalClusterIds', () {
      final policy = GovernancePolicyFactory.createPolicy(
        policyId: 'p1',
        version: 1,
        scopeDomains: [],
        scopeClusters: [],
        scopeEventTypes: [],
        requiredApprovalClusterIds: ['c1', 'c2'],
      );
      final ok = PolicyApprovalEngine.approvePolicy(
        policyId: 'p1',
        clusterId: 'c3',
        signature: 's',
        existingApprovals: [],
        policy: policy,
      );
      expect(ok, isFalse);
    });
    test('approvePolicy returns false for duplicate approval', () {
      final policy = GovernancePolicyFactory.createPolicy(
        policyId: 'p1',
        version: 1,
        scopeDomains: [],
        scopeClusters: [],
        scopeEventTypes: [],
        requiredApprovalClusterIds: ['c1'],
      );
      final ok = PolicyApprovalEngine.approvePolicy(
        policyId: 'p1',
        clusterId: 'c1',
        signature: 's2',
        existingApprovals: [const PolicyApprovalRecord(policyId: 'p1', clusterId: 'c1', signature: 's1')],
        policy: policy,
      );
      expect(ok, isFalse);
    });
  });

  group('ODA-6 Policy activation only after full approval', () {
    test('activatePolicy returns false when approvals incomplete', () {
      final policy = GovernancePolicyFactory.createPolicy(
        policyId: 'p1',
        version: 1,
        scopeDomains: [],
        scopeClusters: [],
        scopeEventTypes: [],
        requiredApprovalClusterIds: ['c1', 'c2'],
      );
      final reg = GovernanceRegistry();
      final ok = PolicyActivationManager.activatePolicy(
        policyId: 'p1',
        registry: reg,
        approvals: [const PolicyApprovalRecord(policyId: 'p1', clusterId: 'c1', signature: 's1')],
        policy: policy,
      );
      expect(ok, isFalse);
    });
    test('activatePolicy returns true when all required approvals present', () {
      final policy = GovernancePolicyFactory.createPolicy(
        policyId: 'p1',
        version: 1,
        scopeDomains: [],
        scopeClusters: [],
        scopeEventTypes: [],
        requiredApprovalClusterIds: ['c1', 'c2'],
      );
      final reg = GovernanceRegistry();
      final ok = PolicyActivationManager.activatePolicy(
        policyId: 'p1',
        registry: reg,
        approvals: [
          const PolicyApprovalRecord(policyId: 'p1', clusterId: 'c1', signature: 's1'),
          const PolicyApprovalRecord(policyId: 'p1', clusterId: 'c2', signature: 's2'),
        ],
        policy: policy,
      );
      expect(ok, isTrue);
    });
  });

  group('ODA-6 Policy version history reconstruction', () {
    test('getPolicyVersionHistory returns entries in version order', () {
      final ledger = PolicyVersionLedger();
      ledger.registerPolicyVersion(const PolicyVersionEntry(
        policyId: 'p1',
        version: 1,
        versionHash: 'h1',
        previousVersionHash: '',
      ));
      ledger.registerPolicyVersion(const PolicyVersionEntry(
        policyId: 'p1',
        version: 2,
        versionHash: 'h2',
        previousVersionHash: 'h1',
      ));
      final history = ledger.getPolicyVersionHistory('p1');
      expect(history.length, 2);
      expect(history[0].version, 1);
      expect(history[1].version, 2);
    });
  });

  group('ODA-6 Governance suspension enforcement', () {
    test('evaluateInterClusterEvent returns governanceSuspended when suspended', () {
      final reg = GovernanceRegistry();
      reg.appendGovernanceEvent(GovernanceEvent(
        eventType: GovernanceEventType.governanceSuspended,
        policyId: '',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      final result = InterClusterPolicyEvaluator.evaluateInterClusterEvent(
        eventContext: const InterClusterEventContext(
          originClusterId: 'c1',
          targetClusterId: 'c2',
          domainId: 'd1',
          eventType: 'T1',
        ),
        registry: reg,
        activePolicies: [],
      );
      expect(result.allowed, isFalse);
      expect(result.governanceSuspended, isTrue);
    });
  });

  group('ODA-6 Governance hash identical across clusters', () {
    test('computeGovernanceHash produces same hash for same inputs', () {
      final h1 = GovernanceHashEngine.computeGovernanceHash(
        governanceRegistryHash: 'rh',
        activePolicyHashes: ['ph1', 'ph2'],
        policyVersionLedgerHash: 'vlh',
        governanceIdentityHash: 'gih',
      );
      final h2 = GovernanceHashEngine.computeGovernanceHash(
        governanceRegistryHash: 'rh',
        activePolicyHashes: ['ph1', 'ph2'],
        policyVersionLedgerHash: 'vlh',
        governanceIdentityHash: 'gih',
      );
      expect(h1, h2);
    });
  });

  group('ODA-6 Policy evaluation determinism', () {
    test('evaluatePolicy returns same result for same context', () {
      final policy = GovernancePolicyFactory.createPolicy(
        policyId: 'p1',
        version: 1,
        scopeDomains: ['d1'],
        scopeClusters: ['c1'],
        scopeEventTypes: ['T1'],
        requiredApprovalClusterIds: [],
      );
      final ctx = <String, dynamic>{'domainId': 'd1', 'clusterId': 'c1', 'eventType': 'T1'};
      expect(GovernancePolicyFactory.evaluatePolicy(policy, ctx), GovernancePolicyFactory.evaluatePolicy(policy, ctx));
    });
    test('evaluatePolicy returns false when domain not in scope', () {
      final policy = GovernancePolicyFactory.createPolicy(
        policyId: 'p1',
        version: 1,
        scopeDomains: ['d1'],
        scopeClusters: [],
        scopeEventTypes: [],
        requiredApprovalClusterIds: [],
      );
      final ctx = <String, dynamic>{'domainId': 'd2', 'clusterId': 'c1', 'eventType': 'T1'};
      expect(GovernancePolicyFactory.evaluatePolicy(policy, ctx), isFalse);
    });
  });

  group('ODA-6 Replay producing identical governance state', () {
    test('same events produce same activePolicies', () {
      final events = [
        GovernanceEvent(
          eventType: GovernanceEventType.policyProposed,
          policyId: 'pol1',
          eventIndex: 0,
          payload: {},
          signature: 's0',
        ),
        GovernanceEvent(
          eventType: GovernanceEventType.policyActivated,
          policyId: 'pol1',
          eventIndex: 1,
          payload: {},
          signature: 's1',
        ),
      ];
      final reg1 = GovernanceRegistry();
      for (final e in events) reg1.appendGovernanceEvent(e);
      final reg2 = GovernanceRegistry();
      for (final e in events) reg2.appendGovernanceEvent(e);
      expect(reg1.rebuildState().activePolicies, reg2.rebuildState().activePolicies);
    });
  });

  group('ODA-6 Governance divergence detection', () {
    test('different registry hashes produce different computeGovernanceHash', () {
      final h1 = GovernanceHashEngine.computeGovernanceHash(
        governanceRegistryHash: 'rh1',
        activePolicyHashes: [],
        policyVersionLedgerHash: 'vlh',
        governanceIdentityHash: 'gih',
      );
      final h2 = GovernanceHashEngine.computeGovernanceHash(
        governanceRegistryHash: 'rh2',
        activePolicyHashes: [],
        policyVersionLedgerHash: 'vlh',
        governanceIdentityHash: 'gih',
      );
      expect(h1, isNot(h2));
    });
  });

  group('ODA-6 Cross-cluster event blocked by policy', () {
    test('evaluateInterClusterEvent returns policyNotApplicable when no matching policy', () {
      final reg = GovernanceRegistry();
      final policy = GovernancePolicyFactory.createPolicy(
        policyId: 'p1',
        version: 1,
        scopeDomains: ['d1'],
        scopeClusters: ['c1'],
        scopeEventTypes: ['T1'],
        requiredApprovalClusterIds: [],
      );
      reg.appendGovernanceEvent(GovernanceEvent(
        eventType: GovernanceEventType.policyActivated,
        policyId: 'p1',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      final result = InterClusterPolicyEvaluator.evaluateInterClusterEvent(
        eventContext: const InterClusterEventContext(
          originClusterId: 'c1',
          targetClusterId: 'c2',
          domainId: 'd_other',
          eventType: 'T1',
        ),
        registry: reg,
        activePolicies: [policy],
      );
      expect(result.allowed, isFalse);
      expect(result.policyNotApplicable, isTrue);
    });
  });

  group('ODA-6 Governance audit determinism', () {
    test('generateGovernanceAudit produces same report for same registry', () {
      final reg = GovernanceRegistry();
      reg.appendGovernanceEvent(GovernanceEvent(
        eventType: GovernanceEventType.policyActivated,
        policyId: 'pol1',
        eventIndex: 0,
        payload: {},
        signature: 's',
      ));
      final r1 = GovernanceAuditReportGenerator.generateGovernanceAudit(
        registry: reg,
        governanceHash: 'gh',
      );
      final r2 = GovernanceAuditReportGenerator.generateGovernanceAudit(
        registry: reg,
        governanceHash: 'gh',
      );
      expect(r1.activePolicies, r2.activePolicies);
      expect(r1.governanceHash, r2.governanceHash);
    });
  });
}
