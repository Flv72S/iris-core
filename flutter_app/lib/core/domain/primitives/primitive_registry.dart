/// OX3 — Registry of primitive types. No duplicate type; integrates with projections.

typedef PrimitiveHandler = Object? Function(String type, Map<String, dynamic> payload);

class PrimitiveRegistry {
  PrimitiveRegistry();

  final Map<String, PrimitiveHandler> _handlers = {};

  void register(String type, PrimitiveHandler handler) {
    if (_handlers.containsKey(type)) {
      throw StateError('PrimitiveRegistry: duplicate type $type');
    }
    _handlers[type] = handler;
  }

  PrimitiveHandler? get(String type) => _handlers[type];

  List<String> get registeredTypes => List<String>.from(_handlers.keys);
}
