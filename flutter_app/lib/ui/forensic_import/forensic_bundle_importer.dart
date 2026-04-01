// Phase 11.6.2 — Import and verify bundle. Trustless, hash-first, fail-fast.

import 'dart:convert';
import 'dart:typed_data';

import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle.dart';
import 'package:iris_flutter_app/ui/forensic_import/forensic_import_exceptions.dart';
import 'package:iris_flutter_app/ui/forensic_import/forensic_bundle_verifier.dart';
import 'package:iris_flutter_app/ui/forensic_import/verified_forensic_bundle.dart';

class ForensicBundleImporter {
  ForensicBundleImporter({ForensicBundleVerifier? verifier})
      : _verifier = verifier ?? ForensicBundleVerifier();

  final ForensicBundleVerifier _verifier;

  VerifiedForensicBundle importAndVerify(Uint8List bytes) {
    final jsonMap = _parseBytes(bytes);
    final bundle = _bundleFromMap(jsonMap);
    ForensicBundleVerifier.verifyHash(bundle);
    ForensicBundleVerifier.verifySchema(bundle);
    _verifier.verifyRecords(bundle);
    final result = _verifier.verifyReplay(bundle);
    return VerifiedForensicBundle(
      bundle: bundle,
      verifiedHash: bundle.bundleHash,
      recordCount: bundle.records.length,
      sessionId: bundle.sessionId,
      finalTimeContext: result.timeContext,
      finalStoreHash: result.store.computeStoreHash(),
    );
  }

  Map<String, dynamic> _parseBytes(List<int> bytes) {
    String raw;
    try {
      raw = utf8.decode(bytes);
    } catch (e) {
      throw InvalidBundleFormatException('invalid UTF-8: ' + e.toString());
    }
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) {
        throw InvalidBundleFormatException('root is not a JSON object');
      }
      return Map<String, dynamic>.from(decoded as Map);
    } catch (e) {
      if (e is InvalidBundleFormatException) rethrow;
      throw InvalidBundleFormatException('invalid JSON: ' + e.toString());
    }
  }

  ForensicBundle _bundleFromMap(Map<String, dynamic> json) {
    try {
      return ForensicBundle.fromJson(json);
    } catch (e) {
      throw InvalidBundleFormatException('bundle schema: ' + e.toString());
    }
  }
}
