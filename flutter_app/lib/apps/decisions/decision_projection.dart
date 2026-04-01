// OX5 — Decision projection. Open vs resolved; resolution immutable.

import 'package:iris_flutter_app/core/domain/primitives/decision_primitive.dart';
import 'package:iris_flutter_app/core/domain/primitives/primitive_events.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_definition.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/apps/decisions/decision_state.dart';
import 'package:iris_flutter_app/apps/shared/primitive_event_applier.dart';

class DecisionProjection extends ProjectionDefinition<DecisionState> {
  DecisionProjection({this.projectionId = 'decisions', this.version = 1});
  final String projectionId;
  final int version;

  @override
  String get id => projectionId;

  @override
  DecisionState initialState() => const DecisionState();

  @override
  DecisionState applyEvent(DecisionState state, DeterministicEvent event) {
    final data = getPrimitiveEventData(event);
    if (data == null) return state;
    final type = data.$2;
    final p = data.$1;

    if (type == PrimitiveEventType.objectCreated) {
      final t = p['type'] as String?;
      if (t != DecisionPrimitive.decisionType) return state;
      return _applyCreated(state, p);
    }
    if (type == PrimitiveEventType.decisionResolved) {
      return _applyResolved(state, p);
    }
    return state;
  }

  DecisionState _applyCreated(DecisionState state, Map<String, dynamic> p) {
    final id = p['objectId'] as String? ?? '';
    final payload = p['payload'] as Map<String, dynamic>? ?? p;
    final decision = DecisionPrimitive(
      id: id,
      type: DecisionPrimitive.decisionType,
      version: p['version'] as int? ?? 1,
      createdAtHeight: p['createdAtHeight'] as int? ?? 0,
      updatedAtHeight: p['updatedAtHeight'] as int? ?? 0,
      isDeleted: false,
      topic: payload['topic'] as String? ?? '',
      options: List<String>.from(payload['options'] as List? ?? []),
      chosenOption: null,
      resolvedAtHeight: null,
    );
    final decisions = List<DecisionPrimitive>.from(state.decisions)..add(decision);
    return DecisionState(decisions: decisions);
  }

  DecisionState _applyResolved(DecisionState state, Map<String, dynamic> p) {
    final id = p['objectId'] as String? ?? '';
    final chosen = p['chosenOption'] as String? ?? '';
    final atHeight = p['resolvedAtHeight'] as int? ?? 0;
    final idx = state.decisions.indexWhere((d) => d.id == id);
    if (idx < 0) return state;
    final old = state.decisions[idx];
    final decision = DecisionPrimitive(
      id: old.id,
      type: old.type,
      version: p['version'] as int? ?? old.version + 1,
      createdAtHeight: old.createdAtHeight,
      updatedAtHeight: old.updatedAtHeight,
      isDeleted: old.isDeleted,
      topic: old.topic,
      options: old.options,
      chosenOption: chosen,
      resolvedAtHeight: atHeight,
    );
    final decisions = List<DecisionPrimitive>.from(state.decisions)..[idx] = decision;
    return DecisionState(decisions: decisions);
  }

  @override
  int getVersion() => version;

  @override
  Map<String, dynamic> stateToCanonicalMap(DecisionState state) => <String, dynamic>{
        'count': state.decisions.length,
        'resolved': state.resolved.length,
      };
}
