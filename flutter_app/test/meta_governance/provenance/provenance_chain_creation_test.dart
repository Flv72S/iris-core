// H8 - Valid chain creation; nodes linked; chronological; verifyIntegrity true.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision_registry.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_descriptor.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_registry.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_scope.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/meta_governance_role.dart';
import 'package:iris_flutter_app/meta_governance/provenance/governance_provenance_builder.dart';
import 'package:iris_flutter_app/meta_governance/provenance/governance_provenance_node.dart';
import 'package:iris_flutter_app/meta_governance/provenance/governance_provenance_verifier.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot_builder.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('build full chain then verifyIntegrity is true', () {
    const v100 = GovernanceVersion(major: 1, minor: 0, patch: 0);
    const v110 = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final gcp = GCPDescriptor(
      id: const GCPId('GCP-P8'),
      title: 'P8',
      proposerRole: MetaGovernanceRole.governanceMaintainer,
      fromVersion: v100,
      toVersion: v110,
      scope: GCPScope.versioningRules,
      rationale: 'R',
      riskAssessment: 'L',
      rollbackStrategy: 'R',
    );
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-P8'),
      fromVersion: v100,
      toVersion: v110,
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-P8'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact,
      decidedAt: DateTime.utc(2025, 11, 1, 10, 0),
    );
    final ratification = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: v100,
      newVersion: v110,
      ratifiedAt: DateTime.utc(2025, 11, 1, 10, 0),
    );
    final activation = GovernanceActivationSnapshot(
      activeVersion: v110,
      activatedAt: DateTime.utc(2025, 11, 1, 10, 0),
      source: ratification,
    );
    final snapshot = GovernanceSnapshotBuilder.build(
      activation: activation,
      gcpRegistry: GCPRegistry(),
      decisionRegistry: GovernanceDecisionRegistry([decision]),
      activePolicies: const {},
    );

    final chain = GovernanceProvenanceBuilder.build(
      version: v110,
      gcp: gcp,
      impact: impact,
      decision: decision,
      ratification: ratification,
      activation: activation,
      snapshot: snapshot,
    );

    expect(chain.version, v110);
    expect(chain.nodes.length, 6);
    expect(chain.nodes[0].type, GovernanceProvenanceNodeType.gcp);
    expect(chain.nodes[0].parentId, isNull);
    expect(chain.nodes[1].parentId, chain.nodes[0].id);
    expect(chain.nodes[2].parentId, chain.nodes[1].id);
    expect(chain.nodes[3].parentId, chain.nodes[2].id);
    expect(chain.nodes[4].parentId, chain.nodes[3].id);
    expect(chain.nodes[5].parentId, chain.nodes[4].id);
    expect(GovernanceProvenanceVerifier.verifyIntegrity(chain), isTrue);
  });
}
