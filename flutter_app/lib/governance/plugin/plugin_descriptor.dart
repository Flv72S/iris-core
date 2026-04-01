// G6 - Plugin descriptor. Immutable DTO.

import 'package:iris_flutter_app/governance/compatibility/version_range.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_scope.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

class PluginDescriptor {
  const PluginDescriptor({
    required this.pluginId,
    required this.pluginVersion,
    required this.scope,
    required this.compatibleFlowVersions,
    required this.compatibleCoreVersions,
    required this.description,
  });

  final String pluginId;
  final Version pluginVersion;
  final PluginScope scope;
  final VersionRange compatibleFlowVersions;
  final VersionRange compatibleCoreVersions;
  final String description;

  Map<String, Object> toJson() => {
        'pluginId': pluginId,
        'pluginVersion': pluginVersion.toString(),
        'scope': scope.name,
        'compatibleFlowVersions': _rangeToJson(compatibleFlowVersions),
        'compatibleCoreVersions': _rangeToJson(compatibleCoreVersions),
        'description': description,
      };

  static Map<String, String> _rangeToJson(VersionRange r) =>
      {'min': r.minVersion.toString(), 'max': r.maxVersion.toString()};

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PluginDescriptor &&
          pluginId == other.pluginId &&
          pluginVersion == other.pluginVersion &&
          scope == other.scope &&
          compatibleFlowVersions == other.compatibleFlowVersions &&
          compatibleCoreVersions == other.compatibleCoreVersions &&
          description == other.description);

  @override
  int get hashCode => Object.hash(pluginId, pluginVersion, scope,
      compatibleFlowVersions, compatibleCoreVersions, description);
}
