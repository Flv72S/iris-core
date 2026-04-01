// OX5 — Dashboard view model. Pure mapping.

import 'package:iris_flutter_app/core/ui/ui_projection_adapter.dart';
import 'package:iris_flutter_app/apps/dashboard/dashboard_state.dart';

class DashboardViewModel {
  const DashboardViewModel({
    this.openTaskCount = 0,
    this.activeDecisionCount = 0,
    this.pendingAgreementCount = 0,
    this.recentKnowledgeCount = 0,
  });
  final int openTaskCount;
  final int activeDecisionCount;
  final int pendingAgreementCount;
  final int recentKnowledgeCount;
}

class DashboardViewModelAdapter extends UIProjectionAdapter<DashboardState, DashboardViewModel> {
  @override
  DashboardViewModel toViewModel(DashboardState state) {
    return DashboardViewModel(
      openTaskCount: state.openTaskIds.length,
      activeDecisionCount: state.activeDecisionIds.length,
      pendingAgreementCount: state.pendingAgreementIds.length,
      recentKnowledgeCount: state.recentKnowledgeIds.length,
    );
  }
}
