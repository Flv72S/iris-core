// H10 - Charter integrity validation. Deterministic hash; no side effects.

import 'package:crypto/crypto.dart';
import 'dart:convert';

import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

import 'governance_charter_version.dart';

class GovernanceCharterValidator {
  GovernanceCharterValidator._();

  /// Computes deterministic SHA-256 hash of [content] (UTF-8 bytes), hex-encoded.
  static String computeCharterHash(String content) {
    final bytes = utf8.encode(content);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  /// Returns true only if current content hash matches declared and version is coherent.
  /// [expectedVersion] optional: if provided, declaredVersion.governanceVersion must equal it.
  static bool validateCharterIntegrity({
    required GovernanceCharterVersion declaredVersion,
    required String currentCharterContent,
    GovernanceVersion? expectedVersion,
  }) {
    final currentHash = computeCharterHash(currentCharterContent);
    if (currentHash != declaredVersion.charterHash) return false;
    if (expectedVersion != null &&
        declaredVersion.governanceVersion != expectedVersion) {
      return false;
    }
    return true;
  }
}
