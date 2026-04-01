// Phase 13.7 — Reproducible build fingerprint. Deterministic; no env, no timestamp.

import 'dart:convert';

import 'package:crypto/crypto.dart';

/// Target platform constant. No runtime detection.
const String kCanonicalBuildPlatform = 'iris-flutter';

/// Build mode constant. Release only.
const String kCanonicalBuildMode = 'release';

/// Payload separator. Fixed.
const String _sep = '|';

/// Immutable build fingerprint. Deterministic; equality on all fields.
final class ReproducibleBuildFingerprint {
  const ReproducibleBuildFingerprint({
    required this.freezeVersion,
    required this.structuralHash,
    required this.freezeSealHash,
    required this.buildConfigHash,
    required this.fingerprintHash,
  });

  final String freezeVersion;
  final String structuralHash;
  final String freezeSealHash;
  final String buildConfigHash;
  final String fingerprintHash;

  /// JSON keys in alphabetical order: build_config_hash, fingerprint_hash, freeze_seal_hash, freeze_version, structural_hash.
  Map<String, Object> toJson() {
    return <String, Object>{
      'build_config_hash': buildConfigHash,
      'fingerprint_hash': fingerprintHash,
      'freeze_seal_hash': freezeSealHash,
      'freeze_version': freezeVersion,
      'structural_hash': structuralHash,
    };
  }

  /// Parses and validates. Throws on missing or empty fields.
  static ReproducibleBuildFingerprint fromJson(Map<Object?, Object?> json) {
    final v = json['freeze_version'] as String?;
    final s = json['structural_hash'] as String?;
    final f = json['freeze_seal_hash'] as String?;
    final b = json['build_config_hash'] as String?;
    final h = json['fingerprint_hash'] as String?;
    if (v == null || v.isEmpty) throw ArgumentError('freeze_version required');
    if (s == null || s.isEmpty) throw ArgumentError('structural_hash required');
    if (f == null || f.isEmpty) throw ArgumentError('freeze_seal_hash required');
    if (b == null || b.isEmpty) throw ArgumentError('build_config_hash required');
    if (h == null || h.isEmpty) throw ArgumentError('fingerprint_hash required');
    return ReproducibleBuildFingerprint(
      freezeVersion: v,
      structuralHash: s,
      freezeSealHash: f,
      buildConfigHash: b,
      fingerprintHash: h,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReproducibleBuildFingerprint &&
          runtimeType == other.runtimeType &&
          freezeVersion == other.freezeVersion &&
          structuralHash == other.structuralHash &&
          freezeSealHash == other.freezeSealHash &&
          buildConfigHash == other.buildConfigHash &&
          fingerprintHash == other.fingerprintHash;

  @override
  int get hashCode =>
      Object.hash(freezeVersion, structuralHash, freezeSealHash, buildConfigHash, fingerprintHash);
}

/// Canonical build config string: platform|mode|freezeVersion. SHA-256(UTF-8(canonical)).
String computeCanonicalBuildConfigHash(String freezeVersion) {
  final canonical = kCanonicalBuildPlatform + _sep + kCanonicalBuildMode + _sep + freezeVersion;
  final bytes = utf8.encode(canonical);
  return sha256.convert(bytes).toString();
}

/// Computes the reproducible build fingerprint. Pure; no IO.
ReproducibleBuildFingerprint computeBuildFingerprint({
  required String freezeVersion,
  required String structuralHash,
  required String freezeSealHash,
}) {
  final buildConfigHash = computeCanonicalBuildConfigHash(freezeVersion);
  final payload = freezeVersion +
      _sep +
      structuralHash +
      _sep +
      freezeSealHash +
      _sep +
      buildConfigHash;
  final bytes = utf8.encode(payload);
  final fingerprintHash = sha256.convert(bytes).toString();
  return ReproducibleBuildFingerprint(
    freezeVersion: freezeVersion,
    structuralHash: structuralHash,
    freezeSealHash: freezeSealHash,
    buildConfigHash: buildConfigHash,
    fingerprintHash: fingerprintHash,
  );
}
