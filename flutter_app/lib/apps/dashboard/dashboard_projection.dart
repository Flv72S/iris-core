// OX5 — Dashboard projection. Aggregates app events; ledger-height ordering only.

import 'package:iris_flutter_app/core/domain/primitives/agreement_primitive.dart';
import 'package:iris_flutter_app/core/domain/primitives/decision_primitive.dart';
import 'package:iris_flutter_app/core/domain/primitives/primitive_events.dart';
import 'package:iris_flutter_app/core/domain/primitives/task_primitive.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_definition.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/apps/dashboard/dashboard_state.dart';
import 'package:iris_flutter_app/apps/shared/primitive_event_applier.dart';

class DashboardProjection extends ProjectionDefinition<DashboardState> {
  DashboardProjection({this.projectionId = 'dashboard', this.version = 1});
  final String projectionId;
  final int version;

  @override
  String get id => projectionId;

  @override
  DashboardState initialState() => const DashboardState();

  @override
  DashboardState applyEvent(DashboardState state, DeterministicEvent event) {
    final data = getPrimitiveEventData(event);
    if (data == null) return state;
    final type = data.$2;
    final p = data.$1;

    if (type == PrimitiveEventType.objectCreated) {
      final t = p['type'] as String?;
      final id = p['objectId'] as String? ?? '';
      if (t == TaskPrimitive.taskType) {
        final payload = p['payload'] as Map<String, dynamic>? ?? p;
        final status = payload['status'] as String? ?? 'open';
        if (status == 'open') return DashboardState(openTaskIds: [...state.openTaskIds, id], activeDecisionIds: state.activeDecisionIds, pendingAgreementIds: state.pendingAgreementIds, recentKnowledgeIds: state.recentKnowledgeIds);
      }
      if (t == DecisionPrimitive.decisionType) return DashboardState(openTaskIds: state.openTaskIds, activeDecisionIds: [...state.activeDecisionIds, id], pendingAgreementIds: state.pendingAgreementIds, recentKnowledgeIds: state.recentKnowledgeIds);
      if (t == AgreementPrimitive.agreementType) return DashboardState(openTaskIds: state.openTaskIds, activeDecisionIds: state.activeDecisionIds, pendingAgreementIds: [...state.pendingAgreementIds, id], recentKnowledgeIds: state.recentKnowledgeIds);
      return DashboardState(openTaskIds: state.openTaskIds, activeDecisionIds: state.activeDecisionIds, pendingAgreementIds: state.pendingAgreementIds, recentKnowledgeIds: [...state.recentKnowledgeIds, id]);
    }

    if (type == PrimitiveEventType.taskStatusChanged) {
      final id = p['objectId'] as String? ?? '';
      final newStatus = p['newStatus'] as String? ?? '';
      if (newStatus == 'done' || newStatus == 'cancelled') {
        final open = state.openTaskIds.where((x) => x != id).toList();
        return DashboardState(openTaskIds: open, activeDecisionIds: state.activeDecisionIds, pendingAgreementIds: state.pendingAgreementIds, recentKnowledgeIds: state.recentKnowledgeIds);
      }
    }

    if (type == PrimitiveEventType.decisionResolved) {
      final id = p['objectId'] as String? ?? '';
      final active = state.activeDecisionIds.where((x) => x != id).toList();
      return DashboardState(openTaskIds: state.openTaskIds, activeDecisionIds: active, pendingAgreementIds: state.pendingAgreementIds, recentKnowledgeIds: state.recentKnowledgeIds);
    }

    if (type == PrimitiveEventType.agreementFinalized) {
      final id = p['objectId'] as String? ?? '';
      final pending = state.pendingAgreementIds.where((x) => x != id).toList();
      return DashboardState(openTaskIds: state.openTaskIds, activeDecisionIds: state.activeDecisionIds, pendingAgreementIds: pending, recentKnowledgeIds: state.recentKnowledgeIds);
    }

    return state;
  }

  @override
  int getVersion() => version;

  @override
  Map<String, dynamic> stateToCanonicalMap(DashboardState state) => <String, dynamic>{
        'openTaskCount': state.openTaskIds.length,
        'activeDecisionCount': state.activeDecisionIds.length,
        'pendingAgreementCount': state.pendingAgreementIds.length,
        'recentKnowledgeCount': state.recentKnowledgeIds.length,
      };
}
