// Media Lifecycle — Snapshot. Immutable record for audit and replay.

import 'package:iris_flutter_app/flow_media/media_reference.dart';

import 'media_lifecycle_plan.dart';

/// Immutable snapshot of a media asset and its lifecycle plan.
/// Used for audit, debug, and deterministic replay.
class MediaLifecycleSnapshot {
  const MediaLifecycleSnapshot({
    required this.media,
    required this.plan,
  });

  /// The media reference.
  final MediaReference media;

  /// The lifecycle plan derived for this media.
  final MediaLifecyclePlan plan;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is MediaLifecycleSnapshot &&
          media == other.media &&
          plan == other.plan);

  @override
  int get hashCode => Object.hash(media, plan);

  Map<String, Object> toJson() => {
        'media': media.toJson(),
        'plan': plan.toJson(),
      };

  @override
  String toString() =>
      'MediaLifecycleSnapshot(media: ${media.hash}, plan: $plan)';
}
