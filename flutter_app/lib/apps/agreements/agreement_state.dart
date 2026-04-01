// OX5 — Agreement tracker state.

import 'package:iris_flutter_app/core/domain/primitives/agreement_primitive.dart';

class AgreementState {
  const AgreementState({this.agreements = const []});

  final List<AgreementPrimitive> agreements;

  List<AgreementPrimitive> get pending =>
      agreements.where((a) => !a.isFinalized).toList();
  List<AgreementPrimitive> get finalized =>
      agreements.where((a) => a.isFinalized).toList();
}
