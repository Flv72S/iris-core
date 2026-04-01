// Phase 13.5 — Core Freeze Verification. Pure comparison; no IO, no logging.

import 'core_freeze_artifact.dart';
import 'core_surface_manifest.dart';

/// Verifies that the current manifest produces the exact expected freeze JSON.
/// Byte-per-byte string comparison; no JSON parsing.
/// Returns true iff [serializeFreezeArtifactCanonically(buildCoreFreezeArtifact(manifest))] equals [expectedFreezeJson].
bool verifyCoreFreezeIntegrity({
  required CoreSurfaceManifest manifest,
  required String expectedFreezeJson,
}) {
  final artifact = buildCoreFreezeArtifact(manifest);
  final actual = serializeFreezeArtifactCanonically(artifact);
  return actual == expectedFreezeJson;
}
