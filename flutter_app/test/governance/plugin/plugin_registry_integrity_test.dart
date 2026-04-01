// G6 - Registry: duplicate pluginId fail; listByScope correct.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/compatibility/version_range.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_descriptor.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_registry.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_scope.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

PluginDescriptor desc(String id, PluginScope scope) {
  return PluginDescriptor(
    pluginId: id,
    pluginVersion: Version(major: 1, minor: 0, patch: 0),
    scope: scope,
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
}

void main() {
  test('duplicate pluginId throws', () {
    final reg = PluginRegistry();
    reg.register(desc('dup', PluginScope.flowExtension));
    expect(() => reg.register(desc('dup', PluginScope.uxExtension)),
        throwsA(isA<PluginRegistryException>()));
  });

  test('getById and listByScope', () {
    final reg = PluginRegistry();
    final a = desc('a', PluginScope.flowExtension);
    final b = desc('b', PluginScope.flowExtension);
    final c = desc('c', PluginScope.uxExtension);
    reg.register(a);
    reg.register(b);
    reg.register(c);
    expect(reg.getById('a'), a);
    expect(reg.getById('x'), isNull);
    expect(reg.listByScope(PluginScope.flowExtension).length, 2);
    expect(reg.listByScope(PluginScope.uxExtension).length, 1);
    expect(reg.listByScope(PluginScope.telemetryExtension).length, 0);
  });

  test('unregister removes plugin', () {
    final reg = PluginRegistry();
    reg.register(desc('r', PluginScope.flowExtension));
    expect(reg.getById('r'), isNotNull);
    reg.unregister('r');
    expect(reg.getById('r'), isNull);
  });
}
