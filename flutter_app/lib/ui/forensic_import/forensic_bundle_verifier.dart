// Phase 11.6.2 — Pure verification. Deterministic, no side effects, explicit errors.

import 'package:iris_flutter_app/bridge/mappers/hash_utils.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle.dart';
import 'package:iris_flutter_app/ui/forensic_import/forensic_import_exceptions.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_rehydrator.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_store.dart';

/// No-op store used only to construct rehydrator for verifyRecords/verifyReplay.
class _VerifierStore implements PersistenceStore {
  @override
  Future<void> append(PersistenceRecord record) async {}

  @override
  Future<List<PersistenceRecord>> loadAll() async => [];

  @override
  Future<void> clearAll() async {}
}

/// Pure verification functions. Hash-first; fail-fast.
class ForensicBundleVerifier {
  ForensicBundleVerifier({PersistenceRehydrator? rehydrator})
      : _rehydrator = rehydrator ??
            PersistenceRehydrator(store: _VerifierStore());

  final PersistenceRehydrator _rehydrator;

  /// Throws [HashMismatchException] if content hash does not match bundle.bundleHash.
  static void verifyHash(ForensicBundle bundle) {
    final contentForHash = <String, dynamic>{
      'bundleVersion': bundle.bundleVersion,
      'appVersion': bundle.appVersion,
      'exportedAtLogicalTime': <String, dynamic>{
        'tick': bundle.exportedAtLogicalTime.tick,
        'origin': bundle.exportedAtLogicalTime.origin,
      },
      'sessionId': bundle.sessionId,
      'records': bundle.records.map((r) => r.toJson()).toList(),
    };
    final computed = computeDeterministicHash(contentForHash);
    if (computed != bundle.bundleHash) {
      throw HashMismatchException(
          'hash mismatch; expected ${bundle.bundleHash}, computed $computed');
    }
  }

  /// Throws [InvalidBundleFormatException] if required schema fields are missing or wrong type.
  static void verifySchema(ForensicBundle bundle) {
    if (bundle.bundleVersion.isEmpty) {
      throw InvalidBundleFormatException('bundleVersion is empty');
    }
    if (bundle.appVersion.isEmpty) {
      throw InvalidBundleFormatException('appVersion is empty');
    }
    if (bundle.sessionId.isEmpty) {
      throw InvalidBundleFormatException('sessionId is empty');
    }
    if (bundle.bundleHash.isEmpty) {
      throw InvalidBundleFormatException('bundleHash is empty');
    }
    final lt = bundle.exportedAtLogicalTime;
    if (lt.origin.isEmpty) {
      throw InvalidBundleFormatException('exportedAtLogicalTime.origin is empty');
    }
  }

  /// Throws [InvalidRecordException] if any record fails validation.
  void verifyRecords(ForensicBundle bundle) {
    try {
      _rehydrator.rehydrateFromRecords(bundle.records);
    } on PersistenceException catch (e) {
      throw InvalidRecordException(e.message);
    }
  }

  /// Rehydrates and verifies bundle metadata matches replayed state. Returns [RehydrationResult].
  /// Throws [InvalidRecordException] if rehydration fails, [ReplayMismatchException] if session/time mismatch.
  RehydrationResult verifyReplay(ForensicBundle bundle) {
    final result = _rehydrator.rehydrateFromRecords(bundle.records);
    if (result.timeContext.sessionId.value != bundle.sessionId) {
      throw ReplayMismatchException(
          'sessionId mismatch; bundle=${bundle.sessionId}, replayed=${result.timeContext.sessionId.value}');
    }
    final bt = bundle.exportedAtLogicalTime;
    final rt = result.timeContext.currentTime;
    if (bt.tick != rt.tick || bt.origin != rt.origin) {
      throw ReplayMismatchException(
          'exportedAtLogicalTime mismatch; bundle=(${bt.tick},${bt.origin}), replayed=(${rt.tick},${rt.origin})');
    }
    return result;
  }
}
