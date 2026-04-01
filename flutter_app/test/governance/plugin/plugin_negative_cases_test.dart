// G6 - Scope enforcement; determinism. (CORE not in enum so no CORE scope test.)

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/compatibility/version_range.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_contract.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_descriptor.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_validator.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_scope.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

void main() {
  test('all allowed scopes pass validation', () {
    final ranges = VersionRange(
      minVersion: Version(major: 1, minor: 0, patch: 0),
      maxVersion: Version(major: 1, minor: 999, patch: 999),
    );
    final coreRange = VersionRange(
      minVersion: Version(major: 1, minor: 0, patch: 0),
      maxVersion: Version(major: 1, minor: 0, patch: 0),
    );
    for (final scope in PluginContract.allowedScopes) {
      final p = PluginDescriptor(
        pluginId: 'p-${scope.name}',
        pluginVersion: Version(major: 1, minor: 0, patch: 0),
        scope: scope,
        compatibleFlowVersions: ranges,
        compatibleCoreVersions: coreRange,
        description: 'D',
      );
      PluginValidator.validatePlugin(p);
    }
  });

  test('determinism: 100 validations same input same result', () {
    final p = PluginDescriptor(
      pluginId: 'det',
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
      description: 'D',
    );
    for (var i = 0; i < 100; i++) {
      PluginValidator.validatePlugin(p);
    }
  });
}
