// G3 - Change classifier. Validates type+scope; no inference.

import 'change_descriptor.dart';
import 'change_scope.dart';
import 'change_type.dart';

/// Thrown when (ChangeType, ChangeScope) is not allowed.
class ChangeClassificationException implements Exception {
  ChangeClassificationException(this.message);
  final String message;
  @override
  String toString() => 'ChangeClassificationException: $message';
}

/// Validates that ChangeType is allowed for ChangeScope. Does not infer or change type.
class ChangeClassifier {
  ChangeClassifier._();

  static bool _allowed(ChangeType type, ChangeScope scope) {
    switch (scope) {
      case ChangeScope.core:
        return type == ChangeType.coreBreak;
      case ChangeScope.flow:
      case ChangeScope.plugin:
        return type != ChangeType.coreBreak;
    }
  }

  /// Validates descriptor. No-op if valid; throws if descriptor invalid or combination illegal.
  static void validateChange(ChangeDescriptor descriptor) {
    if (descriptor.description.trim().isEmpty) {
      throw ChangeClassificationException('description must be non-empty');
    }
    if (descriptor.affectedComponents.isEmpty) {
      throw ChangeClassificationException('affectedComponents must be non-empty');
    }
    if (!_allowed(descriptor.type, descriptor.scope)) {
      throw ChangeClassificationException(
        'ChangeType ${descriptor.type.name} is not allowed for ChangeScope ${descriptor.scope.name}',
      );
    }
  }
}
