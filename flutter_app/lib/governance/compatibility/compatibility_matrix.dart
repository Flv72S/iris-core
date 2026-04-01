// G2 - Compatibility matrix. Read-only; no overlap; no inference.

import 'compatibility_entry.dart';
import 'compatibility_scope.dart';

/// Thrown when matrix validation fails (overlap or missing scope).
class CompatibilityMatrixException implements Exception {
  CompatibilityMatrixException(this.message);
  final String message;
  @override
  String toString() => 'CompatibilityMatrixException: $message';
}

/// Immutable list of compatibility entries. Validates no ambiguous overlap per scope.
class CompatibilityMatrix {
  CompatibilityMatrix(List<CompatibilityEntry> entries)
      : _entries = List.unmodifiable(entries) {
    _validate();
  }

  final List<CompatibilityEntry> _entries;

  List<CompatibilityEntry> get entries => _entries;

  void _validate() {
    for (final scope in CompatibilityScope.values) {
      final scopeEntries = _entries.where((e) => e.scope == scope).toList();
      if (scopeEntries.isEmpty) {
        throw CompatibilityMatrixException('Scope ${scope.name} has no entry');
      }
      for (var i = 0; i < scopeEntries.length; i++) {
        for (var j = i + 1; j < scopeEntries.length; j++) {
          final a = scopeEntries[i];
          final b = scopeEntries[j];
          if (a.source.overlaps(b.source) && a.target.overlaps(b.target)) {
            throw CompatibilityMatrixException(
                'Ambiguous overlap in ${scope.name}: two entries overlap');
          }
        }
      }
    }
  }
}
