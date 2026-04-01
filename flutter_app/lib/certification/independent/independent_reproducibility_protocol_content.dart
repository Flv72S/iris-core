// Phase 14.5 — Protocol file content. Deterministic; no IO. UTF-8, LF only.

import 'independent_reproducibility_validator.dart';

/// Returns the six protocol files as filename → content. Deterministic.
Map<String, String> buildProtocolFiles() {
  final hashes = getExpectedReproducibilityHashes();
  final expectedHashesTxt = _formatExpectedHashes(hashes);

  return {
    'reproducibility_protocol.md': _reproducibilityProtocolMd,
    'reproducibility_steps.txt': _reproducibilityStepsTxt,
    'expected_hashes.txt': expectedHashesTxt,
    'verification_commands.txt': _verificationCommandsTxt,
    'failure_conditions.txt': _failureConditionsTxt,
    'protocol_version.txt': _protocolVersionTxt,
  };
}

String _formatExpectedHashes(Map<String, String> hashes) {
  final keys = [
    'STRUCTURAL_HASH',
    'PACKAGE_SHA256',
    'SCOPE_HASH',
    'EVIDENCE_INDEX_HASH',
    'AUDIT_CHAIN_ROOT',
  ];
  final buf = StringBuffer();
  for (final k in keys) {
    buf.write('$k=${hashes[k] ?? ''}\n');
  }
  return buf.toString();
}

const String _protocolVersionTxt =
    'IRIS-INDEPENDENT-REPRODUCIBILITY-PROTOCOL: 1.0\n';

const String _reproducibilityStepsTxt = '''1. Acquire Public Verification Package.
2. Sort filenames alphabetically.
3. For each file: append filename (LF) then content (LF).
4. Compute SHA-256 of concatenation (UTF-8).
5. Compare result to PACKAGE_SHA256.
6. Compare structural hash to STRUCTURAL_HASH.
7. Compare scope hash to SCOPE_HASH.
8. Compare evidence index hash to EVIDENCE_INDEX_HASH.
9. Compare audit chain root to AUDIT_CHAIN_ROOT.
''';

const String _verificationCommandsTxt = '''Sort files by name.
Concatenate: for each file in order, output filename, newline, file content, newline.
Compute SHA-256 of concatenation (UTF-8 bytes).
Compare computed hash to value in PACKAGE_SHA256.
Compare each artifact hash to corresponding value in expected_hashes.txt.
''';

const String _failureConditionsTxt = '''Hash mismatch between computed and expected.
One or more required files missing.
File order not canonical (alphabetical by filename).
Content not byte-identical to reference.
''';

const String _reproducibilityProtocolMd = r'''# Independent Reproducibility Verification Protocol

## 1. Purpose

Technical procedure for an independent party to verify the Public Verification Package and related artifacts. The procedure is deterministic and offline. It does not express normative or evaluative claims.

## 2. Required Inputs

- Public Certification Manifest
- Core Structural Hash
- Certification Scope Hash
- Evidence Index Hash
- Freeze Seal
- Audit Chain Root
- Reproducible Build Fingerprint
- Binary Provenance
- Core Certification Snapshot

## 3. Deterministic Reconstruction Procedure

1. Acquire the Public Verification Package (all listed files).
2. Sort filenames alphabetically.
3. For each file in that order: concatenate filename (LF), then file content (LF).
4. Compute SHA-256 of the full concatenation (UTF-8).
5. Compare the result to the expected PACKAGE_SHA256 value.
6. Verify structural hash, scope hash, evidence index hash, and audit chain root against expected_hashes.txt.

## 4. Expected Outputs

- PACKAGE_SHA256 identical to the value in expected_hashes.txt.
- Structural hash unchanged from expected.
- Evidence chain hashes match expected.
- Freeze snapshot hashes match expected.

## 5. Failure Conditions

- Hash mismatch: computed hash differs from expected.
- Missing file: a required file is absent.
- Non-canonical order: files not ordered alphabetically by filename.
- Content divergence: file content not byte-identical to reference.

## 6. Reproducibility Properties (Technical)

- Determinism: same inputs yield same hash.
- Environment-independent: no clock, network, or environment variables.
- Offline-verifiable: no external services.
- Artifact immutability: inputs are fixed references.
''';
