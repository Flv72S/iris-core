// OX5 — Dashboard aggregate state. Ledger-height ordering only.

class DashboardState {
  const DashboardState({
    this.openTaskIds = const [],
    this.activeDecisionIds = const [],
    this.pendingAgreementIds = const [],
    this.recentKnowledgeIds = const [],
  });
  final List<String> openTaskIds;
  final List<String> activeDecisionIds;
  final List<String> pendingAgreementIds;
  final List<String> recentKnowledgeIds;
}
