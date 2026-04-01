// H2 - GCP registry. Unique GCPId; read-only list.

import 'gcp_descriptor.dart';
import 'gcp_id.dart';

class GCPRegistryException implements Exception {
  GCPRegistryException(this.message);
  final String message;
  @override
  String toString() => 'GCPRegistryException: $message';
}

class GCPRegistry {
  GCPRegistry([List<GCPDescriptor>? initial])
      : _list = List.from(_validate(initial ?? []));

  static List<GCPDescriptor> _validate(List<GCPDescriptor> list) {
    final seen = <String>{};
    for (final g in list) {
      final key = g.id.value;
      if (seen.contains(key)) {
        throw GCPRegistryException('Duplicate GCPId: $key');
      }
      seen.add(key);
    }
    return list;
  }

  final List<GCPDescriptor> _list;

  void register(GCPDescriptor gcp) {
    for (final g in _list) {
      if (g.id == gcp.id) {
        throw GCPRegistryException('Duplicate GCPId: ${gcp.id.value}');
      }
    }
    _list.add(gcp);
  }

  GCPDescriptor? getById(GCPId id) {
    for (final g in _list) {
      if (g.id == id) return g;
    }
    return null;
  }

  List<GCPDescriptor> listAll() => List.unmodifiable(_list);
}
