// H6 - Registry of temporal snapshots. One per version; no overwrite.

import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

import 'governance_snapshot.dart';

class GovernanceSnapshotRegistryException implements Exception {
  GovernanceSnapshotRegistryException(this.message);
  final String message;
  @override
  String toString() => 'GovernanceSnapshotRegistryException: $message';
}

class GovernanceSnapshotRegistry {
  GovernanceSnapshotRegistry() : _list = [];

  final List<GovernanceSnapshot> _list;

  void register(GovernanceSnapshot snapshot) {
    for (final s in _list) {
      if (s.version == snapshot.version) {
        throw GovernanceSnapshotRegistryException(
          'Snapshot for version ${snapshot.version} already registered',
        );
      }
    }
    _list.add(snapshot);
    _list.sort((a, b) => GovernanceVersion.compare(a.version, b.version));
  }

  GovernanceSnapshot? getByVersion(GovernanceVersion version) {
    for (final s in _list) {
      if (s.version == version) return s;
    }
    return null;
  }

  List<GovernanceSnapshot> listAll() => List.unmodifiable(_list);

  GovernanceSnapshot? latest() {
    if (_list.isEmpty) return null;
    return _list.last;
  }
}
