/// OX2 — Registry of projection definitions. No duplicate IDs.

import 'package:iris_flutter_app/core/domain/projection/projection_definition.dart';

class ProjectionRegistry {
  ProjectionRegistry();

  final Map<String, ProjectionDefinition<Object?>> _definitions = {};

  void register<T>(ProjectionDefinition<T> definition) {
    if (_definitions.containsKey(definition.id)) {
      throw StateError('ProjectionRegistry: duplicate id ${definition.id}');
    }
    _definitions[definition.id] = definition as ProjectionDefinition<Object?>;
  }

  ProjectionDefinition<Object?>? get(String id) => _definitions[id];

  List<ProjectionDefinition<Object?>> getAll() =>
      List<ProjectionDefinition<Object?>>.from(_definitions.values);
}
