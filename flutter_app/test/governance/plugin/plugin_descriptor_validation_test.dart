// G6 - Descriptor validation: empty pluginId / description / invalid range -> fail.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/compatibility/version_range.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_descriptor.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_validator.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_scope.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

void main() {
  test('empty pluginId throws', () {
    final p = PluginDescriptor(
      pluginId: '   ',
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
      description: 'Desc',
    );
    expect(() => PluginValidator.validatePlugin(p), throwsA(isA<PluginValidationException>()));
  });

  test('empty description throws', () {
    final p = PluginDescriptor(
      pluginId: 'my-plugin',
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
      description: '   ',
    );
    expect(() => PluginValidator.validatePlugin(p), throwsA(isA<PluginValidationException>()));
  });

  test('invalid compatibility range min > max throws', () {
    final p = PluginDescriptor(
      pluginId: 'p',
      pluginVersion: Version(major: 1, minor: 0, patch: 0),
      scope: PluginScope.uxExtension,
      compatibleFlowVersions: VersionRange(
        minVersion: Version(major: 2, minor: 0, patch: 0),
        maxVersion: Version(major: 1, minor: 0, patch: 0),
      ),
      compatibleCoreVersions: VersionRange(
        minVersion: Version(major: 1, minor: 0, patch: 0),
        maxVersion: Version(major: 1, minor: 0, patch: 0),
      ),
      description: 'D',
    );
    expect(() => PluginValidator.validatePlugin(p), throwsA(isA<PluginValidationException>()));
  });

  test('valid descriptor passes', () {
    final p = PluginDescriptor(
      pluginId: 'valid-plugin',
      pluginVersion: Version(major: 1, minor: 0, patch: 0),
      scope: PluginScope.telemetryExtension,
      compatibleFlowVersions: VersionRange(
        minVersion: Version(major: 1, minor: 0, patch: 0),
        maxVersion: Version(major: 1, minor: 999, patch: 999),
      ),
      compatibleCoreVersions: VersionRange(
        minVersion: Version(major: 1, minor: 0, patch: 0),
        maxVersion: Version(major: 1, minor: 0, patch: 0),
      ),
      description: 'Valid',
    );
    PluginValidator.validatePlugin(p);
  });
}
