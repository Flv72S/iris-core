// F-Media — Enforcement decision. Pure applicative; no normative judgment.

/// Immutable decision produced by MediaEnforcementAdapter.
/// Represents what operations are allowed based on policy.
/// Purely mechanical; no normative or evaluative statements.
class MediaEnforcementDecision {
  const MediaEnforcementDecision({
    required this.uploadAllowed,
    required this.localOnly,
    required this.cloudAllowed,
    required this.compressionRequired,
    required this.coldArchiveAllowed,
    required this.multiDeviceSyncAllowed,
    required this.maxFileSizeBytes,
  });

  /// Whether upload is allowed for this media.
  final bool uploadAllowed;

  /// Whether media must remain local only.
  final bool localOnly;

  /// Whether cloud storage is allowed.
  final bool cloudAllowed;

  /// Whether compression is required before storage.
  final bool compressionRequired;

  /// Whether cold archive storage is allowed.
  final bool coldArchiveAllowed;

  /// Whether multi-device sync is allowed.
  final bool multiDeviceSyncAllowed;

  /// Maximum allowed file size in bytes. 0 means upload not allowed.
  final int maxFileSizeBytes;

  /// Restrictive default when policy cannot be resolved.
  static const restrictive = MediaEnforcementDecision(
    uploadAllowed: false,
    localOnly: true,
    cloudAllowed: false,
    compressionRequired: true,
    coldArchiveAllowed: false,
    multiDeviceSyncAllowed: false,
    maxFileSizeBytes: 0,
  );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is MediaEnforcementDecision &&
          uploadAllowed == other.uploadAllowed &&
          localOnly == other.localOnly &&
          cloudAllowed == other.cloudAllowed &&
          compressionRequired == other.compressionRequired &&
          coldArchiveAllowed == other.coldArchiveAllowed &&
          multiDeviceSyncAllowed == other.multiDeviceSyncAllowed &&
          maxFileSizeBytes == other.maxFileSizeBytes);

  @override
  int get hashCode => Object.hash(
        uploadAllowed,
        localOnly,
        cloudAllowed,
        compressionRequired,
        coldArchiveAllowed,
        multiDeviceSyncAllowed,
        maxFileSizeBytes,
      );

  Map<String, Object> toJson() => {
        'uploadAllowed': uploadAllowed,
        'localOnly': localOnly,
        'cloudAllowed': cloudAllowed,
        'compressionRequired': compressionRequired,
        'coldArchiveAllowed': coldArchiveAllowed,
        'multiDeviceSyncAllowed': multiDeviceSyncAllowed,
        'maxFileSizeBytes': maxFileSizeBytes,
      };
}
