// F3 — Progression rules: structural constraints only.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_steps/flow_progression_rules.dart';
import 'package:iris_flutter_app/flow_steps/flow_step_id.dart';

void main() {
  const stepA = FlowStepId('a');
  const stepB = FlowStepId('b');
  const stepC = FlowStepId('c');

  group('FlowProgressionRules', () {
    test('mandatory steps are identified', () {
      final rules = FlowProgressionRules(mandatorySteps: {stepA, stepB});
      expect(rules.isMandatory(stepA), isTrue);
      expect(rules.isMandatory(stepC), isFalse);
    });

    test('optional steps are identified', () {
      final rules = FlowProgressionRules(optionalSteps: {stepC});
      expect(rules.isOptional(stepC), isTrue);
    });

    test('repeatable steps are identified', () {
      final rules = FlowProgressionRules(repeatableSteps: {stepB});
      expect(rules.isRepeatable(stepB), isTrue);
    });

    test('terminal steps are identified', () {
      final rules = FlowProgressionRules(terminalSteps: {stepC});
      expect(rules.isTerminal(stepC), isTrue);
      expect(rules.isTerminal(stepA), isFalse);
    });

    test('empty rules default to false', () {
      const rules = FlowProgressionRules();
      expect(rules.isMandatory(stepA), isFalse);
      expect(rules.isTerminal(stepA), isFalse);
    });
  });

  group('FlowStepId validation', () {
    test('from() throws on empty string', () {
      expect(() => FlowStepId.from(''), throwsArgumentError);
    });
    test('from() returns stepId with value', () {
      expect(FlowStepId.from('a').value, equals('a'));
    });
  });
}
