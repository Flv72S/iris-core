// OX9 — Immutable config after bootstrap. Config hashed.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class SecureConfig {
  const SecureConfig({required this.data, required this.configHash});
  final Map<String, dynamic> data;
  final String configHash;
}

class SecureConfigManager {
  SecureConfigManager({Map<String, dynamic>? initialConfig})
      : _config = initialConfig != null ? _load(initialConfig) : null;

  SecureConfig? _config;
  bool _frozen = false;

  static SecureConfig _load(Map<String, dynamic> data) {
    final keys = data.keys.toList()..sort();
    final canonical = Map.fromEntries(keys.map((k) => MapEntry(k, data[k])));
    return SecureConfig(data: canonical, configHash: CanonicalPayload.hash(canonical));
  }

  void loadConfig(Map<String, dynamic> data) {
    if (_frozen) throw StateError('Config immutable after bootstrap');
    _config = _load(data);
  }

  bool validateConfig(bool Function(Map<String, dynamic>) validator) {
    return _config != null && validator(_config!.data);
  }

  void freeze() {
    _frozen = true;
  }

  String getConfigHash() => _config?.configHash ?? '';
  SecureConfig? get config => _config;
  bool get isFrozen => _frozen;
}
