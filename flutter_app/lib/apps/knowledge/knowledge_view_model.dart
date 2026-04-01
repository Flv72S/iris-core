// OX5 — Pure projection → view model for Knowledge.

import 'package:iris_flutter_app/core/ui/ui_projection_adapter.dart';
import 'package:iris_flutter_app/apps/knowledge/knowledge_state.dart';

class KnowledgeNodeViewModel {
  const KnowledgeNodeViewModel({
    required this.id,
    required this.type,
    required this.version,
    required this.tags,
    required this.outgoingCount,
    required this.incomingCount,
  });
  final String id;
  final String type;
  final int version;
  final List<String> tags;
  final int outgoingCount;
  final int incomingCount;
}

class KnowledgeViewModel {
  const KnowledgeViewModel({
    this.nodes = const [],
    this.edgeCount = 0,
  });
  final List<KnowledgeNodeViewModel> nodes;
  final int edgeCount;
}

class KnowledgeViewModelAdapter extends UIProjectionAdapter<KnowledgeState, KnowledgeViewModel> {
  @override
  KnowledgeViewModel toViewModel(KnowledgeState state) {
    final nodeList = state.nodes.values
        .where((n) => !n.isDeleted)
        .map((n) => KnowledgeNodeViewModel(
              id: n.id,
              type: n.type,
              version: n.version,
              tags: state.tagsFor(n.id),
              outgoingCount: state.adjacency(n.id).length,
              incomingCount: state.reverse(n.id).length,
            ))
        .toList();
    return KnowledgeViewModel(nodes: nodeList, edgeCount: state.edges.length);
  }
}
