// H6 - Query temporal snapshots by version or time range.

import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

import 'governance_snapshot.dart';
import 'governance_snapshot_registry.dart';

class GovernanceSnapshotQuery {
  GovernanceSnapshotQuery(this._registry);

  final GovernanceSnapshotRegistry _registry;

  /// Returns the snapshot for the given version, or null.
  GovernanceSnapshot? findByVersion(GovernanceVersion version) =>
      _registry.getByVersion(version);

  /// Returns snapshots whose [capturedAt] is in [from, to] (inclusive).
  List<GovernanceSnapshot> findByTimeRange(DateTime from, DateTime to) {
    final fromUtc = from.toUtc();
    final toUtc = to.toUtc();
    return _registry.listAll().where((s) {
      final t = s.capturedAt.toUtc();
      return (t.isAtSameMomentAs(fromUtc) || t.isAfter(fromUtc)) &&
          (t.isAtSameMomentAs(toUtc) || t.isBefore(toUtc));
    }).toList();
  }
}
