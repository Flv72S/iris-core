// H8 - Build provenance chain from governance artifacts. Pure; no side effects.

import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_descriptor.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

import 'governance_provenance_chain.dart';
import 'governance_provenance_node.dart';

class GovernanceProvenanceBuilder {
  GovernanceProvenanceBuilder._();

  static const _refPrefix = 'gcp';

  /// Builds an immutable provenance chain for the given version and artifacts.
  /// Sequence: GCP → impact → decision → ratification → activation → snapshot.
  static GovernanceProvenanceChain build({
    required GovernanceVersion version,
    required GCPDescriptor gcp,
    required GovernanceImpactReport impact,
    required GovernanceDecision decision,
    required GovernanceRatificationRecord ratification,
    required GovernanceActivationSnapshot activation,
    required GovernanceSnapshot snapshot,
  }) {
    final ref = gcp.id.value;
    final v = version.toString();

    final gcpNode = GovernanceProvenanceNode(
      id: '${v}_${_refPrefix}_${ref}_gcp',
      type: GovernanceProvenanceNodeType.gcp,
      referenceId: ref,
      timestamp: decision.decidedAt,
      parentId: null,
    );
    final impactNode = GovernanceProvenanceNode(
      id: '${v}_${_refPrefix}_${ref}_impact',
      type: GovernanceProvenanceNodeType.impact,
      referenceId: ref,
      timestamp: decision.decidedAt,
      parentId: gcpNode.id,
    );
    final decisionNode = GovernanceProvenanceNode(
      id: '${v}_${_refPrefix}_${ref}_decision',
      type: GovernanceProvenanceNodeType.decision,
      referenceId: ref,
      timestamp: decision.decidedAt,
      parentId: impactNode.id,
    );
    final ratificationNode = GovernanceProvenanceNode(
      id: '${v}_${_refPrefix}_${ref}_ratification',
      type: GovernanceProvenanceNodeType.ratification,
      referenceId: ref,
      timestamp: ratification.ratifiedAt,
      parentId: decisionNode.id,
    );
    final activationNode = GovernanceProvenanceNode(
      id: '${v}_${_refPrefix}_${ref}_activation',
      type: GovernanceProvenanceNodeType.activation,
      referenceId: ref,
      timestamp: activation.activatedAt,
      parentId: ratificationNode.id,
    );
    final snapshotNode = GovernanceProvenanceNode(
      id: '${v}_${_refPrefix}_${ref}_snapshot',
      type: GovernanceProvenanceNodeType.snapshot,
      referenceId: ref,
      timestamp: snapshot.capturedAt,
      parentId: activationNode.id,
    );

    final nodes = [
      gcpNode,
      impactNode,
      decisionNode,
      ratificationNode,
      activationNode,
      snapshotNode,
    ];
    return GovernanceProvenanceChain(version: version, nodes: nodes);
  }
}
