// Phase 13.4 — Core Freeze Artifact. Immutable stamp; pure functions; no IO.

import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'core_structural_hash.dart';
import 'core_surface_manifest.dart';
import 'deterministic_core_serializer.dart';

/// Freeze version constant. Static, no runtime.
const String kFreezeVersion = '13.4';

/// Immutable Core Freeze Artifact: structural hash + version + canonical core JSON.
final class CoreFreezeArtifact {
  const CoreFreezeArtifact({
    required this.freezeVersion,
    required this.structuralHash,
    required this.canonicalCoreJson,
  });

  final String freezeVersion;
  final String structuralHash;
  final String canonicalCoreJson;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CoreFreezeArtifact &&
          runtimeType == other.runtimeType &&
          freezeVersion == other.freezeVersion &&
          structuralHash == other.structuralHash &&
          canonicalCoreJson == other.canonicalCoreJson;

  @override
  int get hashCode => Object.hash(freezeVersion, structuralHash, canonicalCoreJson);
}

/// Builds the freeze artifact from a manifest. Pure; no IO, no timestamp.
CoreFreezeArtifact buildCoreFreezeArtifact(CoreSurfaceManifest manifest) {
  final canonicalCoreJson = serializeCoreCanonically(manifest);
  final structuralHash = computeCoreStructuralHash(manifest);
  return CoreFreezeArtifact(
    freezeVersion: kFreezeVersion,
    structuralHash: structuralHash,
    canonicalCoreJson: canonicalCoreJson,
  );
}

/// Serializes the artifact to canonical JSON. Keys: canonical_core, freeze_version, structural_hash. Single trailing newline.
String serializeFreezeArtifactCanonically(CoreFreezeArtifact artifact) {
  final buffer = StringBuffer();
  buffer.write('{"canonical_core":');
  _escapeJson(buffer, artifact.canonicalCoreJson);
  buffer.write(',"freeze_version":');
  _escapeJson(buffer, artifact.freezeVersion);
  buffer.write(',"structural_hash":');
  _escapeJson(buffer, artifact.structuralHash);
  buffer.write('}\n');
  return buffer.toString();
}

void _escapeJson(StringBuffer out, String s) {
  out.write('"');
  for (var i = 0; i < s.length; i++) {
    final c = s[i];
    switch (c) {
      case '\\':
        out.write(r'\\');
        break;
      case '"':
        out.write(r'\"');
        break;
      case '\n':
        out.write(r'\n');
        break;
      case '\r':
        out.write(r'\r');
        break;
      case '\t':
        out.write(r'\t');
        break;
      default:
        if (c.codeUnitAt(0) < 32) {
          out.write('\\u');
          out.write(c.codeUnitAt(0).toRadixString(16).padLeft(4, '0'));
        } else {
          out.write(c);
        }
    }
  }
  out.write('"');
}

/// Returns true iff the artifact is valid: non-empty fields, valid hash format, hash matches SHA-256(canonicalCoreJson).
bool isValidFreezeArtifact(CoreFreezeArtifact artifact) {
  if (artifact.freezeVersion.isEmpty) return false;
  if (artifact.structuralHash.isEmpty) return false;
  if (artifact.canonicalCoreJson.isEmpty) return false;
  if (!isValidStructuralHash(artifact.structuralHash)) return false;
  final computed = sha256.convert(utf8.encode(artifact.canonicalCoreJson)).toString();
  return computed == artifact.structuralHash;
}
