// G6 - Plugin contract. Allowed surfaces; CORE excluded.

import 'package:iris_flutter_app/governance/plugin/plugin_scope.dart';

class PluginContract {
  PluginContract._();

  static const allowedScopes = [
    PluginScope.flowExtension,
    PluginScope.uxExtension,
    PluginScope.telemetryExtension,
  ];

  static bool isScopeAllowed(PluginScope scope) => allowedScopes.contains(scope);

  static const forbiddenOperations = [
    'Core modification',
    'Inverse dependency (Flow depending on Core internals)',
    'Undeclared API or reflection into Core/Flow',
    'Breaking change to the system contract',
  ];

  static const limits = [
    'Plugins are always revocable.',
    'Plugins must not own persistent Core or Flow state.',
    'Compatibility with Flow and Core must be declared.',
  ];
}
