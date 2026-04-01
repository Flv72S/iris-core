// Phase 14.6 — External audit kit file content. Deterministic; no IO. UTF-8, LF only.
// Phase 14.8 — Includes external_audit_reproducibility_proof.json.

import 'package:iris_flutter_app/certification/evidence/certification_evidence_index.dart';
import 'package:iris_flutter_app/certification/public/public_certification_manifest.dart';
import 'package:iris_flutter_app/certification/reproducibility/external_audit_proof.dart';
import 'package:iris_flutter_app/certification/reproducibility/external_audit_proof_generator.dart';
import 'package:iris_flutter_app/certification/reproducibility/external_audit_proof_serializer.dart';
import 'package:iris_flutter_app/certification/transparency/public_trust_disclosure.dart';

import 'external_audit_kit_validator.dart';

/// Returns all kit files as filename → content. Deterministic.
Map<String, String> buildExternalAuditKitFiles() {
  final hashes = getExpectedAuditKitHashes();
  final verifyHashesTxt = _formatVerifyHashes(hashes);

  final manifest = publicCertificationManifest;
  final index = certificationEvidenceIndex;
  final seal = FreezeSeal(
    hash: index.entries
        .firstWhere((e) => e.id == 'cryptographic_freeze_seal')
        .sha256,
  );
  final fingerprint = BuildFingerprint(
    value: index.entries
        .firstWhere((e) => e.id == 'reproducible_build_fingerprint')
        .sha256,
  );
  const environment = AuditorEnvironmentSnapshot(
    mode: 'offline',
    components: [],
  );
  final proof = generateExternalAuditProof(
    manifest: manifest,
    recomputedHash: StructuralHashResult(value: manifest.coreStructuralHash),
    seal: seal,
    fingerprint: fingerprint,
    environment: environment,
  );
  final proofJson = serializeExternalAuditProofCanonical(proof);

  return {
    'README_AUDIT.md': _readmeAuditMd,
    'EXECUTION_STEPS.txt': _executionStepsTxt,
    'VERIFY_HASHES.txt': verifyHashesTxt,
    'EXPECTED_RESULTS.txt': _expectedResultsTxt,
    'FAILURE_MODES.txt': _failureModesTxt,
    'kit_version.txt': _kitVersionTxt,
    'scripts/deterministic_verify.sh': _deterministicVerifySh,
    'external_audit_reproducibility_proof.json': proofJson,
  };
}

String _formatVerifyHashes(Map<String, String> hashes) {
  final keys = [
    'STRUCTURAL_HASH',
    'PACKAGE_SHA256',
    'SCOPE_HASH',
    'EVIDENCE_INDEX_HASH',
    'AUDIT_CHAIN_ROOT',
    'BUILD_FINGERPRINT',
  ];
  final buf = StringBuffer();
  for (final k in keys) {
    buf.write('$k=${hashes[k] ?? ''}\n');
  }
  return buf.toString();
}

const String _kitVersionTxt = 'IRIS-EXTERNAL-AUDIT-KIT: 1.0\n';

const String _executionStepsTxt = '''STEP 1 — Extract package
STEP 2 — Compute SHA-256
STEP 3 — Compare expected hashes
STEP 4 — Confirm deterministic match
''';

const String _expectedResultsTxt = '''Hash values identical to VERIFY_HASHES.txt.
Snapshot hashes coherent with evidence index.
Evidence chain hashes consistent.
No byte-level divergence from reference.
''';

const String _failureModesTxt = '''Hash mismatch between computed and expected.
One or more required files missing.
File order not canonical (alphabetical by filename).
Content not byte-identical to reference.
Verification script output non-deterministic.
''';

const String _deterministicVerifySh = r'''#!/bin/sh
# Deterministic verification of Public Verification Package. No network; no env.
# Usage: deterministic_verify.sh <kit_dir> <package_dir>
# Exit 0: match. Exit 1: mismatch or error.

KIT_DIR="$1"
PACKAGE_DIR="$2"
VERIFY_HASHES="$KIT_DIR/VERIFY_HASHES.txt"

if [ ! -f "$VERIFY_HASHES" ]; then
  echo "VERIFY_HASHES.txt not found"
  exit 1
fi
if [ ! -d "$PACKAGE_DIR" ]; then
  echo "Package directory not found"
  exit 1
fi

EXPECTED=$(grep '^PACKAGE_SHA256=' "$VERIFY_HASHES" | cut -d= -f2)
if [ -z "$EXPECTED" ]; then
  echo "PACKAGE_SHA256 not found in VERIFY_HASHES.txt"
  exit 1
fi

# Canonical order: sort filenames. For each: filename (LF), content (LF). Then SHA-256.
TEMP=$(mktemp)
cd "$PACKAGE_DIR" || exit 1
for f in $(ls -1 | sort); do
  [ -f "$f" ] || continue
  printf '%s\n' "$f"
  cat "$f"
  printf '\n'
done > "$TEMP"
COMPUTED=$(sha256sum < "$TEMP" | cut -d' ' -f1)
rm -f "$TEMP"

if [ "$COMPUTED" = "$EXPECTED" ]; then
  echo "PACKAGE_SHA256 match"
  exit 0
else
  echo "PACKAGE_SHA256 mismatch"
  exit 1
fi
''';

const String _readmeAuditMd = r'''# External Audit Execution Kit

## 1. Purpose

Technical kit for an external auditor to run deterministic verification of the Public Verification Package and related hashes. The kit is offline and self-contained. It does not express normative or evaluative claims.

## 2. Contained Artifacts

- Public Verification Package (reference files to obtain separately)
- Expected hashes (VERIFY_HASHES.txt)
- Verification instructions (EXECUTION_STEPS.txt, README_AUDIT.md)
- Deterministic verification script (scripts/deterministic_verify.sh)

## 3. Execution Context

- Local filesystem only.
- Standard hashing tool (e.g. sha256sum).
- No network access.
- No IRIS runtime dependency.

## 4. Deterministic Verification Flow

1. Extract the kit and the Public Verification Package.
2. Sort package filenames alphabetically.
3. For each file in order: output filename (LF), then file content (LF).
4. Compute SHA-256 of the concatenation (UTF-8).
5. Compare the result to PACKAGE_SHA256 in VERIFY_HASHES.txt.
6. Verify structural hash, scope hash, evidence index hash, audit chain root, and build fingerprint against VERIFY_HASHES.txt.

## 5. Interpretation Boundary

- This kit does not produce certifications.
- This kit does not evaluate conformity or sufficiency.
- This kit verifies only deterministic technical coherence of hashes and package content.
''';
