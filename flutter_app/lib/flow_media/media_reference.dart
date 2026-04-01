// F-Media — Logical media reference. No path; no URL; no SDK; pure metadata.

import 'physical_location.dart';

/// Immutable reference to a media asset. Contains only logical metadata.
/// No filesystem paths, cloud URLs, or provider-specific identifiers.
class MediaReference {
  const MediaReference({
    required this.hash,
    required this.sizeBytes,
    required this.mimeType,
    required this.mediaPolicyId,
    required this.location,
  });

  /// Content hash (e.g. sha256:abc123...).
  final String hash;

  /// Size in bytes.
  final int sizeBytes;

  /// MIME type (e.g. video/mp4, image/png).
  final String mimeType;

  /// ID of the governing media policy (e.g. MEDIA_FREE_V1).
  final String mediaPolicyId;

  /// Logical location descriptor.
  final PhysicalLocation location;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is MediaReference &&
          hash == other.hash &&
          sizeBytes == other.sizeBytes &&
          mimeType == other.mimeType &&
          mediaPolicyId == other.mediaPolicyId &&
          location == other.location);

  @override
  int get hashCode => Object.hash(hash, sizeBytes, mimeType, mediaPolicyId, location);

  Map<String, Object> toJson() => {
        'hash': hash,
        'sizeBytes': sizeBytes,
        'mimeType': mimeType,
        'mediaPolicyId': mediaPolicyId,
        'location': location.name,
      };

  factory MediaReference.fromJson(Map<String, Object?> json) {
    return MediaReference(
      hash: json['hash'] as String,
      sizeBytes: json['sizeBytes'] as int,
      mimeType: json['mimeType'] as String,
      mediaPolicyId: json['mediaPolicyId'] as String,
      location: PhysicalLocation.values.firstWhere(
        (l) => l.name == json['location'],
      ),
    );
  }
}
