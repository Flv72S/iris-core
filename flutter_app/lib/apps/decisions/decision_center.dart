// OX5 — Decision center app.

import 'package:iris_flutter_app/apps/decisions/decision_projection.dart';
import 'package:iris_flutter_app/apps/decisions/decision_view_model.dart';

class DecisionCenter {
  DecisionCenter({DecisionProjection? projection}) : projection = projection ?? DecisionProjection();

  final DecisionProjection projection;

  DecisionViewModelAdapter get viewModelAdapter => DecisionViewModelAdapter();
}
