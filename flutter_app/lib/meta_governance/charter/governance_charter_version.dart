// H10 - Charter version binding. Immutable; deterministic.

import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

class GovernanceCharterVersion {
  const GovernanceCharterVersion({
    required this.governanceVersion,
    required this.charterHash,
    required this.declaredAt,
  });

  final GovernanceVersion governanceVersion;
  final String charterHash;
  final DateTime declaredAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GovernanceCharterVersion &&
          governanceVersion == other.governanceVersion &&
          charterHash == other.charterHash &&
          declaredAt == other.declaredAt);

  @override
  int get hashCode =>
      Object.hash(governanceVersion, charterHash, declaredAt);
}
