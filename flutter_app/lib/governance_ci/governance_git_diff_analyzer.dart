// G7 - Diff analyzer. Deterministic; categorizes changed files.

/// Category of a changed file for governance.
enum ChangedFileCategory {
  versionFile,
  pluginDescriptor,
  governanceLib,
  other,
}

/// A single changed file from diff.
class ChangedFile {
  const ChangedFile({required this.path, required this.category});
  final String path;
  final ChangedFileCategory category;
}

/// Result of diff analysis.
class GovernanceDiffResult {
  const GovernanceDiffResult({required this.changedFiles});
  final List<ChangedFile> changedFiles;
}

/// Analyzes diff: categorizes paths. Deterministic; no fragile parsing.
class GovernanceGitDiffAnalyzer {
  GovernanceGitDiffAnalyzer._();

  static ChangedFileCategory categorizePath(String path) {
    final p = path.replaceAll('\\', '/').toLowerCase();
    if (p.contains('pubspec') || p.contains('version') && (p.endsWith('.yaml') || p.endsWith('.dart'))) {
      return ChangedFileCategory.versionFile;
    }
    if (p.contains('plugin') && p.contains('descriptor')) {
      return ChangedFileCategory.pluginDescriptor;
    }
    if (p.contains('governance')) {
      return ChangedFileCategory.governanceLib;
    }
    return ChangedFileCategory.other;
  }

  /// Build result from list of paths (e.g. from git diff --name-only). Deterministic.
  static GovernanceDiffResult fromPaths(List<String> paths) {
    final files = paths
        .map((path) => ChangedFile(path: path, category: categorizePath(path)))
        .toList();
    return GovernanceDiffResult(changedFiles: List.unmodifiable(files));
  }
}
