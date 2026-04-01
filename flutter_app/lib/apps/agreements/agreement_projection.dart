// OX5 — Agreement projection. Signatures + finalization; fork-aware.

import 'package:iris_flutter_app/core/domain/primitives/agreement_primitive.dart';
import 'package:iris_flutter_app/core/domain/primitives/primitive_events.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_definition.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/apps/agreements/agreement_state.dart';
import 'package:iris_flutter_app/apps/shared/primitive_event_applier.dart';

class AgreementProjection extends ProjectionDefinition<AgreementState> {
  AgreementProjection({this.projectionId = 'agreements', this.version = 1});
  final String projectionId;
  final int version;

  @override
  String get id => projectionId;

  @override
  AgreementState initialState() => const AgreementState();

  @override
  AgreementState applyEvent(AgreementState state, DeterministicEvent event) {
    final data = getPrimitiveEventData(event);
    if (data == null) return state;
    final type = data.$2;
    final p = data.$1;
    if (type == PrimitiveEventType.objectCreated) return _applyCreated(state, p);
    if (type == PrimitiveEventType.agreementSigned) return _applySigned(state, p);
    if (type == PrimitiveEventType.agreementFinalized) return _applyFinalized(state, p);
    return state;
  }

  AgreementState _applyCreated(AgreementState state, Map<String, dynamic> p) {
    if (p['type'] != AgreementPrimitive.agreementType) return state;
    final id = p['objectId'] as String? ?? '';
    final payload = p['payload'] as Map<String, dynamic>? ?? p;
    final participants = List<String>.from(payload['participants'] as List? ?? []);
    final sigs = payload['signatures'] as Map?;
    final signatures = sigs != null ? Map<String, String>.from(sigs.map((k, v) => MapEntry(k.toString(), v.toString()))) : <String, String>{};
    final a = AgreementPrimitive(
      id: id,
      type: AgreementPrimitive.agreementType,
      version: p['version'] as int? ?? 1,
      createdAtHeight: p['createdAtHeight'] as int? ?? 0,
      updatedAtHeight: p['updatedAtHeight'] as int? ?? 0,
      isDeleted: false,
      participants: participants,
      signatures: signatures,
      isFinalized: false,
    );
    return AgreementState(agreements: [...state.agreements, a]);
  }

  AgreementState _applySigned(AgreementState state, Map<String, dynamic> p) {
    final id = p['objectId'] as String? ?? '';
    final nodeId = p['nodeId'] as String? ?? '';
    final signature = p['signature'] as String? ?? '';
    final idx = state.agreements.indexWhere((a) => a.id == id);
    if (idx < 0) return state;
    final a = state.agreements[idx];
    final sigs = Map<String, String>.from(a.signatures)..[nodeId] = signature;
    final updated = AgreementPrimitive(
      id: a.id, type: a.type, version: p['version'] as int? ?? a.version + 1,
      createdAtHeight: a.createdAtHeight, updatedAtHeight: p['updatedAtHeight'] as int? ?? a.updatedAtHeight,
      isDeleted: a.isDeleted, participants: a.participants, signatures: sigs, isFinalized: a.isFinalized,
    );
    final list = List<AgreementPrimitive>.from(state.agreements)..[idx] = updated;
    return AgreementState(agreements: list);
  }

  AgreementState _applyFinalized(AgreementState state, Map<String, dynamic> p) {
    final id = p['objectId'] as String? ?? '';
    final idx = state.agreements.indexWhere((a) => a.id == id);
    if (idx < 0) return state;
    final a = state.agreements[idx];
    final updated = AgreementPrimitive(
      id: a.id, type: a.type, version: p['version'] as int? ?? a.version + 1,
      createdAtHeight: a.createdAtHeight, updatedAtHeight: p['updatedAtHeight'] as int? ?? a.updatedAtHeight,
      isDeleted: a.isDeleted, participants: a.participants, signatures: a.signatures, isFinalized: true,
    );
    final list = List<AgreementPrimitive>.from(state.agreements)..[idx] = updated;
    return AgreementState(agreements: list);
  }

  @override
  int getVersion() => version;

  @override
  Map<String, dynamic> stateToCanonicalMap(AgreementState state) => <String, dynamic>{
        'count': state.agreements.length,
        'pendingCount': state.pending.length,
      };
}
