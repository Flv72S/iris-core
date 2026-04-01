// H9 - Analyze diff for meta-governance changes. Deterministic; no heuristics.

class MetaGovernanceDiffResult {
  const MetaGovernanceDiffResult({
    required this.changedPaths,
    required this.hasMetaGovernanceLibChanges,
    required this.hasMetaGovernanceDocsChanges,
  });

  final List<String> changedPaths;
  final bool hasMetaGovernanceLibChanges;
  final bool hasMetaGovernanceDocsChanges;

  bool get hasRelevantChanges =>
      hasMetaGovernanceLibChanges || hasMetaGovernanceDocsChanges;
}

class MetaGovernanceDiffAnalyzer {
  MetaGovernanceDiffAnalyzer._();

  static const _libPrefix = 'lib/meta_governance/';
  static const _docsPrefix = 'docs/meta-governance/';

  /// Analyzes a list of changed file paths (e.g. from git diff --name-only).
  /// Deterministic; no network.
  static MetaGovernanceDiffResult analyze(List<String> changedPaths) {
    final normalized =
        changedPaths.map((p) => p.replaceAll('\\', '/')).toList();
    final hasLib = normalized.any((p) => p.startsWith(_libPrefix));
    final hasDocs = normalized.any((p) => p.startsWith(_docsPrefix));
    return MetaGovernanceDiffResult(
      changedPaths: List.unmodifiable(normalized),
      hasMetaGovernanceLibChanges: hasLib,
      hasMetaGovernanceDocsChanges: hasDocs,
    );
  }
}
