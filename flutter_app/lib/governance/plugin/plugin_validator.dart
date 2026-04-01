// G6 - Plugin validator. Descriptor integrity and compatibility (G2); scope allowed.

import 'package:iris_flutter_app/governance/compatibility/version_range.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_contract.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_descriptor.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_scope.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';
import 'package:iris_flutter_app/governance/versioning/version_comparator.dart';

/// Thrown when plugin descriptor or compatibility is invalid.
class PluginValidationException implements Exception {
  PluginValidationException(this.message);
  final String message;
  @override
  String toString() => 'PluginValidationException: $message';
}

/// Validates plugin descriptor and optional compatibility against current versions.
class PluginValidator {
  PluginValidator._();

  /// Validates descriptor: non-empty pluginId and description, allowed scope, valid compatibility ranges.
  static void validatePlugin(PluginDescriptor plugin) {
    if (plugin.pluginId.trim().isEmpty) {
      throw PluginValidationException('pluginId must be non-empty');
    }
    if (plugin.description.trim().isEmpty) {
      throw PluginValidationException('description must be non-empty');
    }
    if (!PluginContract.isScopeAllowed(plugin.scope)) {
      throw PluginValidationException('scope ${plugin.scope.name} is not allowed for plugins');
    }
    _validateVersionRange(plugin.compatibleFlowVersions, 'compatibleFlowVersions');
    _validateVersionRange(plugin.compatibleCoreVersions, 'compatibleCoreVersions');
  }

  static void _validateVersionRange(VersionRange range, String name) {
    if (VersionComparator.compareTo(range.minVersion, range.maxVersion) > 0) {
      throw PluginValidationException('$name: minVersion must be <= maxVersion');
    }
  }

  /// Validates that the plugin is compatible with the given Flow and Core versions.
  /// Use in CI to fail when current versions are outside plugin's declared ranges.
  static void validatePluginCompatibility(
    PluginDescriptor plugin, {
    required Version currentFlowVersion,
    required Version currentCoreVersion,
  }) {
    validatePlugin(plugin);
    if (!plugin.compatibleFlowVersions.contains(currentFlowVersion)) {
      throw PluginValidationException(
        'Plugin ${plugin.pluginId} not compatible with Flow $currentFlowVersion (declared: ${plugin.compatibleFlowVersions.minVersion}-${plugin.compatibleFlowVersions.maxVersion})',
      );
    }
    if (!plugin.compatibleCoreVersions.contains(currentCoreVersion)) {
      throw PluginValidationException(
        'Plugin ${plugin.pluginId} not compatible with Core $currentCoreVersion (declared: ${plugin.compatibleCoreVersions.minVersion}-${plugin.compatibleCoreVersions.maxVersion})',
      );
    }
  }
}
