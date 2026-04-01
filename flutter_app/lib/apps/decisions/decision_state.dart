// OX5 — Decision center state. Open vs resolved.

import 'package:iris_flutter_app/core/domain/primitives/decision_primitive.dart';

class DecisionState {
  const DecisionState({this.decisions = const []});

  final List<DecisionPrimitive> decisions;

  List<DecisionPrimitive> get open =>
      decisions.where((d) => d.resolvedAtHeight == null).toList();
  List<DecisionPrimitive> get resolved =>
      decisions.where((d) => d.resolvedAtHeight != null).toList();
}
