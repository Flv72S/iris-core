// OX5 — Knowledge graph state. Rebuildable from ledger.

import 'package:iris_flutter_app/core/domain/primitives/relationship_graph.dart';

class KnowledgeNode {
  const KnowledgeNode({
    required this.id,
    required this.type,
    required this.version,
    required this.createdAtHeight,
    required this.updatedAtHeight,
    this.isDeleted = false,
    this.schemaVersion = 1,
    this.content = const {},
  });
  final String id;
  final String type;
  final int version;
  final int createdAtHeight;
  final int updatedAtHeight;
  final bool isDeleted;
  final int schemaVersion;
  final Map<String, dynamic> content;
}

class KnowledgeState {
  const KnowledgeState({
    this.nodes = const {},
    this.edges = const [],
    this.metadataByTarget = const {},
  });

  final Map<String, KnowledgeNode> nodes;
  final List<RelationshipEdge> edges;
  final Map<String, List<MapEntry<String, String>>> metadataByTarget;

  List<RelationshipEdge> adjacency(String id) =>
      edges.where((e) => e.from == id).toList();

  List<RelationshipEdge> reverse(String id) =>
      edges.where((e) => e.to == id).toList();

  List<String> tagsFor(String targetId) {
    final list = metadataByTarget[targetId] ?? [];
    return list.where((e) => e.key == 'tag').map((e) => e.value).toList();
  }
}
