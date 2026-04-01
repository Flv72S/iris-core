// Phase 13.7 — Binary provenance record. Immutable; deterministic JSON; no IO.

import 'reproducible_build_fingerprint.dart';

/// Immutable record linking a binary artifact to a reproducible build fingerprint.
/// artifactHash is SHA-256 of the final binary (supplied externally; not computed here).
final class BinaryProvenanceRecord {
  const BinaryProvenanceRecord({
    required this.fingerprint,
    required this.artifactName,
    required this.artifactHash,
  });

  final ReproducibleBuildFingerprint fingerprint;
  final String artifactName;
  final String artifactHash;

  /// JSON keys alphabetical: artifact_hash, artifact_name, fingerprint (nested).
  Map<String, Object> toJson() {
    return <String, Object>{
      'artifact_hash': artifactHash,
      'artifact_name': artifactName,
      'fingerprint': fingerprint.toJson(),
    };
  }

  /// Parses and validates. Throws on invalid or missing fields.
  static BinaryProvenanceRecord fromJson(Map<Object?, Object?> json) {
    final fp = json['fingerprint'];
    final name = json['artifact_name'] as String?;
    final hash = json['artifact_hash'] as String?;
    if (fp == null || fp is! Map<Object?, Object?>) {
      throw ArgumentError('fingerprint required');
    }
    if (name == null || name.isEmpty) throw ArgumentError('artifact_name required');
    if (hash == null || hash.isEmpty) throw ArgumentError('artifact_hash required');
    return BinaryProvenanceRecord(
      fingerprint: ReproducibleBuildFingerprint.fromJson(fp),
      artifactName: name,
      artifactHash: hash,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BinaryProvenanceRecord &&
          runtimeType == other.runtimeType &&
          fingerprint == other.fingerprint &&
          artifactName == other.artifactName &&
          artifactHash == other.artifactHash;

  @override
  int get hashCode => Object.hash(fingerprint, artifactName, artifactHash);
}
