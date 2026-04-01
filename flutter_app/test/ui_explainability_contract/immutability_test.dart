import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/explainability_contract/explainability_view_model.dart';

void main() {
  test('ViewModel equality and hashCode', () {
    const vm = ExplainabilityViewModel(
      traceId: 'id',
      state: '{}',
      resolution: 'r',
      outcomeStatus: 's',
      outcomeEffects: <String>['e'],
      explanationTitle: 'T',
      explanationSummary: 'S',
      explanationDetails: 'D',
      safetyLevel: 'n',
      timestamp: 'ts',
    );
    const vm2 = ExplainabilityViewModel(
      traceId: 'id',
      state: '{}',
      resolution: 'r',
      outcomeStatus: 's',
      outcomeEffects: <String>['e'],
      explanationTitle: 'T',
      explanationSummary: 'S',
      explanationDetails: 'D',
      safetyLevel: 'n',
      timestamp: 'ts',
    );
    expect(vm, vm2);
    expect(vm.hashCode, vm2.hashCode);
  });
}
