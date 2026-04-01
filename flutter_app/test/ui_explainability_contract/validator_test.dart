import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/explainability_contract/explainability_contract_validator.dart';
import 'package:iris_flutter_app/ui/explainability_contract/explainability_view_model.dart';

void main() {
  test('valid ViewModel PASS', () {
    const vm = ExplainabilityViewModel(
      traceId: 'id',
      state: 's',
      resolution: 'r',
      outcomeStatus: 'o',
      outcomeEffects: <String>[],
      explanationTitle: 't',
      explanationSummary: 's',
      explanationDetails: 'd',
      safetyLevel: 'l',
      timestamp: 'ts',
    );
    final r = validateExplainabilityViewModel(vm);
    expect(r.isValid, isTrue);
  });
  test('empty traceId FAIL', () {
    const vm = ExplainabilityViewModel(
      traceId: '',
      state: 's',
      resolution: 'r',
      outcomeStatus: 'o',
      outcomeEffects: <String>[],
      explanationTitle: 't',
      explanationSummary: 's',
      explanationDetails: 'd',
      safetyLevel: 'l',
      timestamp: 'ts',
    );
    final r = validateExplainabilityViewModel(vm);
    expect(r.isValid, isFalse);
    expect(r.errors.any((e) => e.contains('traceId')), isTrue);
  });
  test('empty explanationTitle FAIL', () {
    const vm = ExplainabilityViewModel(
      traceId: 'id',
      state: 's',
      resolution: 'r',
      outcomeStatus: 'o',
      outcomeEffects: <String>[],
      explanationTitle: '',
      explanationSummary: 's',
      explanationDetails: 'd',
      safetyLevel: 'l',
      timestamp: 'ts',
    );
    final r = validateExplainabilityViewModel(vm);
    expect(r.isValid, isFalse);
  });
}
