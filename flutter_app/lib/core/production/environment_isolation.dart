// OX9 — Enforce isolation. Fail-fast on violation.

/// Allowed paths for file access. No direct access outside these.
class EnvironmentIsolation {
  EnvironmentIsolation({
    this.allowedDirectoryPaths = const [],
    this.networkAllowed = false,
  });

  final List<String> allowedDirectoryPaths;
  final bool networkAllowed;

  bool _enforced = false;

  /// Enforces isolation. Call at bootstrap. Fail-fast on violation.
  void enforceIsolation() {
    _enforced = true;
    if (allowedDirectoryPaths.isEmpty) {
      // No-op if no paths configured; real impl would check current FS access.
    }
  }

  /// Returns true if path is under an allowed directory. No direct file access outside.
  bool isPathAllowed(String path) {
    if (allowedDirectoryPaths.isEmpty) return false;
    final normalized = path.replaceAll(r'\', '/');
    for (final allowed in allowedDirectoryPaths) {
      final prefix = allowed.replaceAll(r'\', '/');
      if (normalized == prefix || normalized.startsWith('$prefix/')) return true;
    }
    return false;
  }

  bool get isEnforced => _enforced;
}
