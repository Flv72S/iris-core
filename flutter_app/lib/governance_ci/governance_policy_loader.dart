// G7 - Policy loader. In-memory only; no runtime access.

import 'package:iris_flutter_app/governance/breaking/breaking_change_manifest.dart';
import 'package:iris_flutter_app/governance/compatibility/compatibility_matrix.dart';
import 'package:iris_flutter_app/governance/deprecation/deprecation_registry.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_descriptor.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

class GovernancePolicy {
  GovernancePolicy({
    required this.currentCoreVersion,
    required this.currentFlowVersion,
    required this.compatibilityMatrix,
    required this.deprecationRegistry,
    required this.breakingManifest,
    required this.registeredPlugins,
  });

  final Version currentCoreVersion;
  final Version currentFlowVersion;
  final CompatibilityMatrix compatibilityMatrix;
  final DeprecationRegistry deprecationRegistry;
  final BreakingChangeManifest breakingManifest;
  final List<PluginDescriptor> registeredPlugins;
}

class GovernancePolicyLoader {
  GovernancePolicyLoader._();

  static GovernancePolicy load({
    required Version currentCoreVersion,
    required Version currentFlowVersion,
    required CompatibilityMatrix compatibilityMatrix,
    required DeprecationRegistry deprecationRegistry,
    required BreakingChangeManifest breakingManifest,
    required List<PluginDescriptor> registeredPlugins,
  }) {
    return GovernancePolicy(
      currentCoreVersion: currentCoreVersion,
      currentFlowVersion: currentFlowVersion,
      compatibilityMatrix: compatibilityMatrix,
      deprecationRegistry: deprecationRegistry,
      breakingManifest: breakingManifest,
      registeredPlugins: List.unmodifiable(registeredPlugins),
    );
  }
}
