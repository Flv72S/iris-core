// Phase 11.6.1 — Build bundle from store. Read-only; full validation; deterministic hash.

import 'package:iris_flutter_app/bridge/mappers/hash_utils.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_rehydrator.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_store.dart';
import 'package:iris_flutter_app/ui/time_model/logical_time.dart';

import 'forensic_bundle.dart';

const String _defaultBundleVersion = '1.0.0';

/// Builds a ForensicBundle from a PersistenceStore. Does not mutate the store.
class ForensicBundleBuilder {
  ForensicBundleBuilder({
    required this.appVersion,
    PersistenceRehydrator? rehydrator,
  })  : _rehydrator = rehydrator;

  final String appVersion;
  final PersistenceRehydrator? _rehydrator;

  /// Loads all records, validates, computes hash, returns immutable bundle. Throws on invalid record.
  Future<ForensicBundle> build(PersistenceStore store) async {
    final records = await store.loadAll();
    final rehydrator = _rehydrator ?? PersistenceRehydrator(store: store);
    final result = rehydrator.rehydrateFromRecords(records);
    final contentForHash = <String, dynamic>{
      'bundleVersion': _defaultBundleVersion,
      'appVersion': appVersion,
      'exportedAtLogicalTime': <String, dynamic>{
        'tick': result.timeContext.currentTime.tick,
        'origin': result.timeContext.currentTime.origin,
      },
      'sessionId': result.timeContext.sessionId.value,
      'records': records.map((r) => r.toJson()).toList(),
    };
    final bundleHash = computeDeterministicHash(contentForHash);
    return ForensicBundle(
      bundleVersion: _defaultBundleVersion,
      appVersion: appVersion,
      exportedAtLogicalTime: result.timeContext.currentTime,
      sessionId: result.timeContext.sessionId.value,
      records: records,
      bundleHash: bundleHash,
    );
  }
}
