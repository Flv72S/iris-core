// H8 - Verify provenance chain integrity. No modifications.

import 'governance_provenance_chain.dart';
import 'governance_provenance_node.dart';

class GovernanceProvenanceVerifier {
  GovernanceProvenanceVerifier._();

  static const _expectedOrder = [
    GovernanceProvenanceNodeType.gcp,
    GovernanceProvenanceNodeType.impact,
    GovernanceProvenanceNodeType.decision,
    GovernanceProvenanceNodeType.ratification,
    GovernanceProvenanceNodeType.activation,
    GovernanceProvenanceNodeType.snapshot,
  ];

  /// Returns true only if the chain is structurally valid: single root, no cycles,
  /// parent links consistent, chronological order, type sequence correct.
  static bool verifyIntegrity(GovernanceProvenanceChain chain) {
    final nodes = chain.nodes;
    if (nodes.isEmpty) return false;

    final byId = {for (final n in nodes) n.id: n};

    final roots = nodes.where((n) => n.parentId == null).toList();
    if (roots.length != 1) return false;
    if (roots.single.type != GovernanceProvenanceNodeType.gcp) return false;

    for (final n in nodes) {
      if (n.parentId != null && !byId.containsKey(n.parentId)) return false;
    }

    final visited = <String>{roots.single.id};
    var cur = roots.single.id;
    while (true) {
      final children = nodes.where((n) => n.parentId == cur).toList();
      if (children.isEmpty) break;
      if (children.length > 1) return false;
      final next = children.single;
      if (visited.contains(next.id)) return false;
      visited.add(next.id);
      cur = next.id;
    }
    if (visited.length != nodes.length) return false;

    for (var i = 1; i < nodes.length; i++) {
      if (nodes[i].timestamp.isBefore(nodes[i - 1].timestamp)) return false;
    }

    for (var i = 0; i < nodes.length && i < _expectedOrder.length; i++) {
      if (nodes[i].type != _expectedOrder[i]) return false;
    }
    return nodes.length == _expectedOrder.length;
  }
}
