// Phase 14.8 — Deterministic proof generator. No clock; no IO; no network.

import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'package:iris_flutter_app/certification/public/public_certification_manifest.dart';
import 'package:iris_flutter_app/certification/transparency/public_trust_disclosure.dart';

import 'external_audit_proof.dart';

/// Deterministic UTC instant. No system clock.
const String _reproducedAtUtcFixed = '2020-01-01T00:00:00.000Z';

/// Generates the external audit reproducibility proof from deterministic inputs.
ExternalAuditReproducibilityProof generateExternalAuditProof({
  required PublicCertificationManifest manifest,
  required StructuralHashResult recomputedHash,
  required FreezeSeal seal,
  required BuildFingerprint fingerprint,
  required AuditorEnvironmentSnapshot environment,
}) {
  final hashesMatch = recomputedHash.value == manifest.coreStructuralHash;
  final envHash = _canonicalEnvironmentHash(environment);

  return ExternalAuditReproducibilityProof(
    irisCoreVersion: manifest.manifestVersion,
    structuralHash: manifest.coreStructuralHash,
    freezeSealHash: seal.hash,
    buildFingerprint: fingerprint.value,
    reproducedAtUtc: _reproducedAtUtcFixed,
    auditorEnvironmentHash: envHash,
    hashesMatch: hashesMatch,
  );
}

String _canonicalEnvironmentHash(AuditorEnvironmentSnapshot environment) {
  final json = _serializeEnvironmentCanonical(environment);
  final bytes = utf8.encode(json);
  return sha256.convert(bytes).toString();
}

String _serializeEnvironmentCanonical(AuditorEnvironmentSnapshot e) {
  final buffer = StringBuffer();
  buffer.write('{');
  _array(buffer, 'components', e.components);
  buffer.write(',');
  _pair(buffer, 'mode', e.mode);
  buffer.write('}');
  return buffer.toString();
}

void _array(StringBuffer out, String key, List<String> items) {
  _escape(out, key);
  out.write(':[');
  for (var i = 0; i < items.length; i++) {
    if (i > 0) out.write(',');
    _escape(out, items[i]);
  }
  out.write(']');
}

void _pair(StringBuffer out, String key, String value) {
  _escape(out, key);
  out.write(':');
  _escape(out, value);
}

void _escape(StringBuffer out, String s) {
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
