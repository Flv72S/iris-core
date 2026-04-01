// OX5 — Agreement view model. Pure mapping for UI.

import 'package:iris_flutter_app/core/domain/primitives/agreement_primitive.dart';
import 'package:iris_flutter_app/core/ui/ui_projection_adapter.dart';
import 'package:iris_flutter_app/apps/agreements/agreement_state.dart';

class AgreementViewModel {
  const AgreementViewModel({
    this.pending = const [],
    this.finalized = const [],
  });
  final List<AgreementItemViewModel> pending;
  final List<AgreementItemViewModel> finalized;
}

class AgreementItemViewModel {
  const AgreementItemViewModel({
    required this.id,
    required this.participantCount,
    required this.signatureCount,
    required this.isFinalized,
  });
  final String id;
  final int participantCount;
  final int signatureCount;
  final bool isFinalized;
}

class AgreementViewModelAdapter extends UIProjectionAdapter<AgreementState, AgreementViewModel> {
  @override
  AgreementViewModel toViewModel(AgreementState state) {
    return AgreementViewModel(
      pending: state.pending.map(_toItem).toList(),
      finalized: state.finalized.map(_toItem).toList(),
    );
  }

  AgreementItemViewModel _toItem(AgreementPrimitive a) => AgreementItemViewModel(
        id: a.id,
        participantCount: a.participants.length,
        signatureCount: a.signatures.length,
        isFinalized: a.isFinalized,
      );
}
