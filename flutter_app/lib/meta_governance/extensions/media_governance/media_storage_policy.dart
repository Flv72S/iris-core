// G7 - Media storage policy. Immutable; versionable; no runtime; metadata only.

import 'retention_policy.dart';
import 'storage_mode.dart';

class MediaStoragePolicy {
  const MediaStoragePolicy({
    required this.id,
    required this.version,
    required this.storageMode,
    required this.maxFileSizeMB,
    required this.retentionPolicy,
    required this.compressionRequired,
    required this.multiDeviceSync,
    required this.coldArchiveEnabled,
  });

  final String id;
  final String version;
  final StorageMode storageMode;
  final int maxFileSizeMB;
  final RetentionPolicy retentionPolicy;
  final bool compressionRequired;
  final bool multiDeviceSync;
  final bool coldArchiveEnabled;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is MediaStoragePolicy &&
          id == other.id &&
          version == other.version &&
          storageMode == other.storageMode &&
          maxFileSizeMB == other.maxFileSizeMB &&
          retentionPolicy == other.retentionPolicy &&
          compressionRequired == other.compressionRequired &&
          multiDeviceSync == other.multiDeviceSync &&
          coldArchiveEnabled == other.coldArchiveEnabled);

  @override
  int get hashCode => Object.hash(
        id,
        version,
        storageMode,
        maxFileSizeMB,
        retentionPolicy,
        compressionRequired,
        multiDeviceSync,
        coldArchiveEnabled,
      );

  /// Semantic version comparison: returns -1 if this < other, 0 if equal, 1 if this > other.
  /// Compares [version] strings lexicographically; for numeric semver use consistent format.
  static int compareVersions(MediaStoragePolicy a, MediaStoragePolicy b) {
    return a.version.compareTo(b.version);
  }

  Map<String, Object> toJson() => {
        'id': id,
        'version': version,
        'storageMode': storageMode.name,
        'maxFileSizeMB': maxFileSizeMB,
        'retentionKind': retentionPolicy.kind,
        'compressionRequired': compressionRequired,
        'multiDeviceSync': multiDeviceSync,
        'coldArchiveEnabled': coldArchiveEnabled,
      };
}
