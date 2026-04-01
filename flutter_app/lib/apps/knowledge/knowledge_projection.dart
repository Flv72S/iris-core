// OX5 — Knowledge projection. Rebuilds graph from ledger; fork-aware.

import 'package:iris_flutter_app/core/domain/primitives/primitive_events.dart';
import 'package:iris_flutter_app/core/domain/primitives/relationship_graph.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_definition.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/apps/knowledge/knowledge_state.dart';
import 'package:iris_flutter_app/apps/shared/primitive_event_applier.dart';

class KnowledgeProjection extends ProjectionDefinition<KnowledgeState> {
  KnowledgeProjection({this.projectionId = 'knowledge', this.version = 1});
  final String projectionId;
  final int version;

  @override
  String get id => projectionId;

  @override
  KnowledgeState initialState() => const KnowledgeState();

  @override
  KnowledgeState applyEvent(KnowledgeState state, DeterministicEvent event) {
    final data = getPrimitiveEventData(event);
    if (data == null) return state;
    final type = data.$2;
    final p = data.$1;

    switch (type) {
      case PrimitiveEventType.objectCreated:
        return _applyObjectCreated(state, p);
      case PrimitiveEventType.objectUpdated:
        return _applyObjectUpdated(state, p);
      case PrimitiveEventType.objectDeleted:
        return _applyObjectDeleted(state, p);
      case PrimitiveEventType.relationshipAdded:
        return _applyRelationshipAdded(state, p);
      case PrimitiveEventType.relationshipRemoved:
        return _applyRelationshipRemoved(state, p);
      case PrimitiveEventType.metadataSet:
        return _applyMetadataSet(state, p);
      default:
        return state;
    }
  }

  KnowledgeState _applyObjectCreated(KnowledgeState state, Map<String, dynamic> p) {
    final id = p['objectId'] as String? ?? p['id'] as String?;
    if (id == null) return state;
    final payload = p['payload'] as Map<String, dynamic>? ?? p;
    final content = payload['content'] is Map ? Map<String, dynamic>.from(payload['content'] as Map) : <String, dynamic>{};
    final node = KnowledgeNode(
      id: id,
      type: p['type'] as String? ?? 'doc',
      version: p['version'] as int? ?? 1,
      createdAtHeight: p['createdAtHeight'] as int? ?? 0,
      updatedAtHeight: p['updatedAtHeight'] as int? ?? 0,
      isDeleted: false,
      schemaVersion: payload['schemaVersion'] as int? ?? 1,
      content: content,
    );
    final nodes = Map<String, KnowledgeNode>.from(state.nodes)..[id] = node;
    return KnowledgeState(nodes: nodes, edges: state.edges, metadataByTarget: state.metadataByTarget);
  }

  KnowledgeState _applyObjectUpdated(KnowledgeState state, Map<String, dynamic> p) {
    final id = p['objectId'] as String?;
    if (id == null) return state;
    final existing = state.nodes[id];
    if (existing == null) return state;
    final patch = p['patch'] as Map<String, dynamic>? ?? {};
    final content = Map<String, dynamic>.from(existing.content);
    for (final entry in patch.entries) {
      content[entry.key] = entry.value;
    }
    final node = KnowledgeNode(
      id: existing.id,
      type: existing.type,
      version: p['version'] as int? ?? existing.version + 1,
      createdAtHeight: existing.createdAtHeight,
      updatedAtHeight: p['updatedAtHeight'] as int? ?? existing.updatedAtHeight,
      isDeleted: existing.isDeleted,
      schemaVersion: existing.schemaVersion,
      content: content,
    );
    final nodes = Map<String, KnowledgeNode>.from(state.nodes)..[id] = node;
    return KnowledgeState(nodes: nodes, edges: state.edges, metadataByTarget: state.metadataByTarget);
  }

  KnowledgeState _applyObjectDeleted(KnowledgeState state, Map<String, dynamic> p) {
    final id = p['objectId'] as String?;
    if (id == null) return state;
    final existing = state.nodes[id];
    if (existing == null) return state;
    final node = KnowledgeNode(
      id: existing.id,
      type: existing.type,
      version: existing.version,
      createdAtHeight: existing.createdAtHeight,
      updatedAtHeight: p['updatedAtHeight'] as int? ?? existing.updatedAtHeight,
      isDeleted: true,
      schemaVersion: existing.schemaVersion,
      content: existing.content,
    );
    final nodes = Map<String, KnowledgeNode>.from(state.nodes)..[id] = node;
    return KnowledgeState(nodes: nodes, edges: state.edges, metadataByTarget: state.metadataByTarget);
  }

  KnowledgeState _applyRelationshipAdded(KnowledgeState state, Map<String, dynamic> p) {
    final from = p['from'] as String? ?? '';
    final to = p['to'] as String? ?? '';
    final type = p['type'] as String? ?? 'link';
    final edge = RelationshipEdge(from: from, to: to, type: type);
    if (state.edges.any((e) => e.from == from && e.to == to && e.type == type)) return state;
    final edges = List<RelationshipEdge>.from(state.edges)..add(edge);
    return KnowledgeState(nodes: state.nodes, edges: edges, metadataByTarget: state.metadataByTarget);
  }

  KnowledgeState _applyRelationshipRemoved(KnowledgeState state, Map<String, dynamic> p) {
    final from = p['from'] as String? ?? '';
    final to = p['to'] as String? ?? '';
    final type = p['type'] as String? ?? 'link';
    final edges = state.edges.where((e) => !(e.from == from && e.to == to && e.type == type)).toList();
    return KnowledgeState(nodes: state.nodes, edges: edges, metadataByTarget: state.metadataByTarget);
  }

  KnowledgeState _applyMetadataSet(KnowledgeState state, Map<String, dynamic> p) {
    final targetId = p['targetId'] as String? ?? '';
    final key = p['key'] as String? ?? '';
    final value = p['value'] as String? ?? '';
    final existing = List<MapEntry<String, String>>.from(state.metadataByTarget[targetId] ?? []);
    final without = existing.where((e) => e.key != key).toList();
    without.add(MapEntry(key, value));
    final metadataByTarget = Map<String, List<MapEntry<String, String>>>.from(state.metadataByTarget);
    metadataByTarget[targetId] = without;
    return KnowledgeState(nodes: state.nodes, edges: state.edges, metadataByTarget: metadataByTarget);
  }

  @override
  int getVersion() => version;

  @override
  Map<String, dynamic> stateToCanonicalMap(KnowledgeState state) {
    final edgeList = state.edges.map((e) => '${e.from}:${e.to}:${e.type}').toList()..sort();
    return <String, dynamic>{
      'nodeCount': state.nodes.length,
      'edgeCount': state.edges.length,
      'edges': edgeList,
    };
  }
}
