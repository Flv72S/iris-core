// G6 - Plugin registry. Unique pluginId; register/unregister; listByScope.

import 'package:iris_flutter_app/governance/plugin/plugin_descriptor.dart';
import 'package:iris_flutter_app/governance/plugin/plugin_scope.dart';

class PluginRegistryException implements Exception {
  PluginRegistryException(this.message);
  final String message;
  @override
  String toString() => 'PluginRegistryException: $message';
}

class PluginRegistry {
  final Map<String, PluginDescriptor> _byId = {};

  void register(PluginDescriptor descriptor) {
    if (descriptor.pluginId.trim().isEmpty) {
      throw PluginRegistryException('pluginId must be non-empty');
    }
    if (_byId.containsKey(descriptor.pluginId)) {
      throw PluginRegistryException('Duplicate pluginId: ${descriptor.pluginId}');
    }
    _byId[descriptor.pluginId] = descriptor;
  }

  void unregister(String pluginId) {
    _byId.remove(pluginId);
  }

  List<PluginDescriptor> get descriptors => List.unmodifiable(_byId.values);

  PluginDescriptor? getById(String pluginId) => _byId[pluginId];

  List<PluginDescriptor> listByScope(PluginScope scope) {
    return List.unmodifiable(_byId.values.where((d) => d.scope == scope));
  }
}
