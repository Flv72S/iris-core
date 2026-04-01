// H8 - Broken parent link and cycle -> verifyIntegrity false.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/provenance/governance_provenance_chain.dart';
import 'package:iris_flutter_app/meta_governance/provenance/governance_provenance_node.dart';
import 'package:iris_flutter_app/meta_governance/provenance/governance_provenance_verifier.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('broken parentId (pointing to non-existent id) -> verifyIntegrity false', () {
    const v = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final root = GovernanceProvenanceNode(
      id: 'a',
      type: GovernanceProvenanceNodeType.gcp,
      referenceId: 'ref',
      timestamp: DateTime.utc(2025, 12, 1),
      parentId: null,
    );
    final child = GovernanceProvenanceNode(
      id: 'b',
      type: GovernanceProvenanceNodeType.impact,
      referenceId: 'ref',
      timestamp: DateTime.utc(2025, 12, 1),
      parentId: 'nonexistent',
    );
    final chain = GovernanceProvenanceChain(version: v, nodes: [root, child]);
    expect(GovernanceProvenanceVerifier.verifyIntegrity(chain), isFalse);
  });

  test('cycle (node points to itself) -> verifyIntegrity false', () {
    const v = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final root = GovernanceProvenanceNode(
      id: 'a',
      type: GovernanceProvenanceNodeType.gcp,
      referenceId: 'ref',
      timestamp: DateTime.utc(2025, 12, 1),
      parentId: null,
    );
    final mid = GovernanceProvenanceNode(
      id: 'b',
      type: GovernanceProvenanceNodeType.impact,
      referenceId: 'ref',
      timestamp: DateTime.utc(2025, 12, 1),
      parentId: 'a',
    );
    final selfLoop = GovernanceProvenanceNode(
      id: 'c',
      type: GovernanceProvenanceNodeType.decision,
      referenceId: 'ref',
      timestamp: DateTime.utc(2025, 12, 1),
      parentId: 'c',
    );
    final chainCycle = GovernanceProvenanceChain(
      version: v,
      nodes: [root, mid, selfLoop],
    );
    expect(GovernanceProvenanceVerifier.verifyIntegrity(chainCycle), isFalse);
  });
}
