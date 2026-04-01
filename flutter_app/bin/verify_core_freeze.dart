// Phase 13.5 — Core Freeze Verification CLI. Deterministic; no args; exit 0/1 only.

import 'dart:io' show exit;

import 'package:iris_flutter_app/core_freeze/core_freeze_verifier.dart';
import 'package:iris_flutter_app/core_freeze/default_core_surface_manifest.dart';
import 'package:iris_flutter_app/core_freeze/official_golden_freeze.dart';

void main() {
  final valid = verifyCoreFreezeIntegrity(
    manifest: defaultCoreSurfaceManifest,
    expectedFreezeJson: kOfficialGoldenFreezeJson,
  );
  if (valid) {
    // ignore: avoid_print
    print('CORE_FREEZE_VALID');
    exit(0);
  } else {
    // ignore: avoid_print
    print('CORE_FREEZE_MISMATCH');
    exit(1);
  }
}
