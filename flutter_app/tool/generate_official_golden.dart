// One-time generator for lib/core_freeze/official_golden_freeze.dart.
// Run from package root: dart run tool/generate_official_golden.dart

import 'dart:io';

import 'package:iris_flutter_app/core_freeze/core_freeze_artifact.dart';
import 'package:iris_flutter_app/core_freeze/default_core_surface_manifest.dart';

void main() {
  final artifact = buildCoreFreezeArtifact(defaultCoreSurfaceManifest);
  final s = serializeFreezeArtifactCanonically(artifact);
  const prefix = '// Phase 13.5 — Official golden freeze JSON. Hardcoded for CLI/CI; do not edit by hand.\n'
      '// Regenerate: dart run tool/generate_official_golden.dart\n\n'
      "const String kOfficialGoldenFreezeJson = r'''";
  const suffix = "''';\n";
  final path = 'lib/core_freeze/official_golden_freeze.dart';
  File(path).writeAsStringSync(prefix + s + suffix);
}
