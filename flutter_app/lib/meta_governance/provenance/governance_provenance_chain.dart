// H8 - Provenance chain. Immutable; chronological; one root, no cycles.

import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

import 'governance_provenance_node.dart';

class GovernanceProvenanceChain {
  GovernanceProvenanceChain({
    required this.version,
    required List<GovernanceProvenanceNode> nodes,
  }) : nodes = List.unmodifiable(List.from(nodes));

  final GovernanceVersion version;
  final List<GovernanceProvenanceNode> nodes;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GovernanceProvenanceChain &&
          version == other.version &&
          _listEq(nodes, other.nodes));

  static bool _listEq(
      List<GovernanceProvenanceNode> a, List<GovernanceProvenanceNode> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
    return true;
  }

  @override
  int get hashCode => Object.hash(version, Object.hashAll(nodes));

  Map<String, Object> toJson() => {
        'version': version.toString(),
        'nodes': nodes.map((n) => n.toJson()).toList(),
      };
}
