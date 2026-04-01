// H8 - Provenance node. Immutable; single step in the chain.

enum GovernanceProvenanceNodeType {
  gcp,
  impact,
  decision,
  ratification,
  activation,
  snapshot,
}

class GovernanceProvenanceNode {
  const GovernanceProvenanceNode({
    required this.id,
    required this.type,
    required this.referenceId,
    required this.timestamp,
    this.parentId,
  });

  final String id;
  final GovernanceProvenanceNodeType type;
  final String referenceId;
  final DateTime timestamp;
  final String? parentId;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GovernanceProvenanceNode &&
          id == other.id &&
          type == other.type &&
          referenceId == other.referenceId &&
          timestamp == other.timestamp &&
          parentId == other.parentId);

  @override
  int get hashCode => Object.hash(id, type, referenceId, timestamp, parentId);

  Map<String, Object?> toJson() => {
        'id': id,
        'type': type.name,
        'referenceId': referenceId,
        'timestamp': timestamp.toUtc().toIso8601String(),
        'parentId': parentId,
      };
}
