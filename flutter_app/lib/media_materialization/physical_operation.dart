// Media Materialization — Physical operation value object. Immutable; no logic.

import 'physical_operation_type.dart';

/// Represents a single physical operation to be performed on media.
/// Immutable value object; no internal logic; no side effects.
class PhysicalOperation {
  const PhysicalOperation({
    required this.mediaId,
    required this.type,
    required this.targetTier,
    required this.sequenceOrder,
  });

  /// Identifier of the media asset.
  final String mediaId;

  /// Type of physical operation.
  final PhysicalOperationType type;

  /// Target storage tier (e.g., "local", "cloud", "archive").
  final String targetTier;

  /// Order in the sequence of operations (0-based).
  final int sequenceOrder;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PhysicalOperation &&
          mediaId == other.mediaId &&
          type == other.type &&
          targetTier == other.targetTier &&
          sequenceOrder == other.sequenceOrder);

  @override
  int get hashCode => Object.hash(mediaId, type, targetTier, sequenceOrder);

  Map<String, Object> toJson() => {
        'mediaId': mediaId,
        'type': type.name,
        'targetTier': targetTier,
        'sequenceOrder': sequenceOrder,
      };

  factory PhysicalOperation.fromJson(Map<String, Object?> json) {
    return PhysicalOperation(
      mediaId: json['mediaId'] as String,
      type: PhysicalOperationType.values.firstWhere(
        (t) => t.name == json['type'],
      ),
      targetTier: json['targetTier'] as String,
      sequenceOrder: json['sequenceOrder'] as int,
    );
  }

  @override
  String toString() =>
      'PhysicalOperation($mediaId, ${type.name}, $targetTier, seq:$sequenceOrder)';
}
