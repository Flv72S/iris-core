// G6 - Compatibility: Flow 1.x plugin vs current Flow 2.0.0 -> fail.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/compatibility/version_range.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_descriptor.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_validator.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_scope.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

void main() {
  test('plugin Flow 1.x only, current Flow 2.0.0 fails', () {
    final plugin = PluginDescriptor(
      pluginId: 'flow-1x',
      pluginVersion: Version(major: 1, minor: 0, patch: 0),
      scope: PluginScope.flowExtension,
      compatibleFlowVersions: VersionRange(
        minVersion: Version(major: 1, minor: 0, patch: 0),
        maxVersion: Version(major: 1, minor: 999, patch: 999),
      ),
      compatibleCoreVersions: VersionRange(
        minVersion: Version(major: 1, minor: 0, patch: 0),
        maxVersion: Version(major: 1, minor: 0, patch: 0),
      ),
      description: 'Flow 1.x only',
    );
    expect(
      () => PluginValidator.validatePluginCompatibility(
        plugin,
        currentFlowVersion: Version(major: 2, minor: 0, patch: 0),
        currentCoreVersion: Version(major: 1, minor: 0, patch: 0),
      ),
      throwsA(isA<PluginValidationException>()),
    );
  });

  test('plugin Flow 1.x, current 1.5.0 passes', () {
    final plugin = PluginDescriptor(
      pluginId: 'flow-1x',
      pluginVersion: Version(major: 1, minor: 0, patch: 0),
      scope: PluginScope.flowExtension,
      compatibleFlowVersions: VersionRange(
        minVersion: Version(major: 1, minor: 0, patch: 0),
        maxVersion: Version(major: 1, minor: 999, patch: 999),
      ),
      compatibleCoreVersions: VersionRange(
        minVersion: Version(major: 1, minor: 0, patch: 0),
        maxVersion: Version(major: 1, minor: 0, patch: 0),
      ),
      description: 'Flow 1.x',
    );
    PluginValidator.validatePluginCompatibility(
      plugin,
      currentFlowVersion: Version(major: 1, minor: 5, patch: 0),
      currentCoreVersion: Version(major: 1, minor: 0, patch: 0),
    );
  });
}
