// H3 - Impact analysis engine. Deterministic; no state change.

import 'package:iris_flutter_app/meta_governance/gcp/gcp_descriptor.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_scope.dart';

import 'governance_dependency_map.dart';
import 'governance_impact_report.dart';
import 'governance_impact_type.dart';

class GovernanceImpactEngine {
  GovernanceImpactEngine._();

  static GovernanceImpactReport analyze(GCPDescriptor gcp) {
    final impacts = <GovernanceImpact>[];

    impacts.add(GovernanceImpact(
      type: GovernanceImpactType.direct,
      affectedScope: gcp.scope,
      description: 'Direct impact on ${gcp.scope.name}',
    ));

    final directDeps = GovernanceDependencyMap.dependenciesOf(gcp.scope);
    final seen = {gcp.scope};

    for (final scope in directDeps) {
      if (seen.contains(scope)) continue;
      seen.add(scope);
      impacts.add(GovernanceImpact(
        type: GovernanceImpactType.indirect,
        affectedScope: scope,
        description: 'Indirect impact on ${scope.name} (dependency of ${gcp.scope.name})',
      ));
    }

    final cascadeScopes = <GCPScope>{};
    for (final scope in directDeps) {
      for (final dep in GovernanceDependencyMap.dependenciesOf(scope)) {
        if (!seen.contains(dep)) cascadeScopes.add(dep);
      }
    }
    for (final scope in cascadeScopes) {
      impacts.add(GovernanceImpact(
        type: GovernanceImpactType.cascade,
        affectedScope: scope,
        description: 'Cascade impact on ${scope.name}',
      ));
    }

    return GovernanceImpactReport(
      gcpId: gcp.id,
      fromVersion: gcp.fromVersion,
      toVersion: gcp.toVersion,
      impacts: List.unmodifiable(impacts),
    );
  }
}
