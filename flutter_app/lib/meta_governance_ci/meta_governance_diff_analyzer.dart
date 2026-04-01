class MetaGovernanceDiffResult {
  const MetaGovernanceDiffResult({
    required this.changedPaths,
    required this.hasMetaGovernanceLibChanges,
    required this.hasMetaGovernanceDocsChanges,
    required this.hasCharterFileChanges,
  });
  final List<String> changedPaths;
  final bool hasMetaGovernanceLibChanges;
  final bool hasMetaGovernanceDocsChanges;
  final bool hasCharterFileChanges;
  bool get hasRelevantChanges =>
      hasMetaGovernanceLibChanges ||
      hasMetaGovernanceDocsChanges ||
      hasCharterFileChanges;
}

class MetaGovernanceDiffAnalyzer {
  MetaGovernanceDiffAnalyzer._();
  static const _lib = 'lib/meta_governance/';
  static const _docs = 'docs/meta-governance/';
  static const _charterFile = 'docs/meta-governance/META_GOVERNANCE_CHARTER.md';
  static MetaGovernanceDiffResult analyze(List<String> changedPaths) {
    final n = changedPaths.map((p) => p.replaceAll('\\', '/')).toList();
    return MetaGovernanceDiffResult(
      changedPaths: List.unmodifiable(n),
      hasMetaGovernanceLibChanges: n.any((p) => p.startsWith(_lib)),
      hasMetaGovernanceDocsChanges: n.any((p) => p.startsWith(_docs)),
      hasCharterFileChanges: n.any((p) => p == _charterFile),
    );
  }
}
