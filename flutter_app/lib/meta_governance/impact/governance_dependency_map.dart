// H3 - Static map: scope -> dependent scopes. Declarative only.

import 'package:iris_flutter_app/meta_governance/gcp/gcp_scope.dart';

class GovernanceDependencyMap {
  GovernanceDependencyMap._();

  static final Map<GCPScope, List<GCPScope>> _map = {
    GCPScope.versioningRules: [
      GCPScope.breakingEnforcementRules,
      GCPScope.compatibilityRules,
    ],
    GCPScope.compatibilityRules: [
      GCPScope.pluginGovernancePolicy,
      GCPScope.ciEnforcementRules,
    ],
    GCPScope.changeClassificationRules: [
      GCPScope.breakingEnforcementRules,
      GCPScope.ciEnforcementRules,
    ],
    GCPScope.breakingEnforcementRules: [
      GCPScope.ciEnforcementRules,
    ],
    GCPScope.deprecationPolicy: [
      GCPScope.compatibilityRules,
      GCPScope.ciEnforcementRules,
    ],
    GCPScope.pluginGovernancePolicy: [
      GCPScope.compatibilityRules,
      GCPScope.ciEnforcementRules,
    ],
    GCPScope.ciEnforcementRules: GCPScope.values,
  };

  static List<GCPScope> dependenciesOf(GCPScope scope) {
    return List.unmodifiable(_map[scope] ?? []);
  }
}
