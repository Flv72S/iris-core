// OX8 — Tests: deterministic hashing, suggestion ID, sandbox, intent mapping, no auto-commit, fork invalidation.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/ai/ai_audit.dart';
import 'package:iris_flutter_app/core/ai/ai_co_pilot_engine.dart';
import 'package:iris_flutter_app/core/ai/ai_projection_context.dart';
import 'package:iris_flutter_app/core/ai/ai_sandbox.dart';
import 'package:iris_flutter_app/core/ai/ai_serializer.dart';
import 'package:iris_flutter_app/core/ai/ai_suggestion.dart';
import 'package:iris_flutter_app/core/ai/ai_suggestion_envelope.dart';
import 'package:iris_flutter_app/core/ai/ai_intent_mapper.dart';
import 'package:iris_flutter_app/core/ui/ui_intent.dart';

void main() {
  group('OX8 Deterministic input hashing', () {
    test('same snapshot produces same input hash', () {
      final ctx = {'tasks': {'count': 3}, 'decisions': {'count': 1}};
      final h1 = AISerializer.hashInput(ctx);
      final h2 = AISerializer.hashInput(ctx);
      expect(h1, h2);
    });

    test('key order does not affect hash (canonical)', () {
      final a = {'z': 1, 'a': 2};
      final b = {'a': 2, 'z': 1};
      expect(AISerializer.hashInput(a), AISerializer.hashInput(b));
    });

    test('different snapshot produces different hash', () {
      final h1 = AISerializer.hashInput({'x': 1});
      final h2 = AISerializer.hashInput({'x': 2});
      expect(h1, isNot(h2));
    });
  });

  group('OX8 Suggestion ID determinism', () {
    test('same inputHash + modelIdentifier produce same suggestionId', () {
      final sandbox = AISandbox(modelIdentifier: 'm1');
      final ctx = DeterministicContext(snapshot: {'k': 'v'}, inputHash: AISerializer.hashInput({'k': 'v'}));
      final s1 = sandbox.executeSuggestion('add task', ctx);
      final s2 = sandbox.executeSuggestion('add task', ctx);
      expect(s1.suggestionId, s2.suggestionId);
    });

    test('different context produces different suggestionId', () {
      final sandbox = AISandbox(modelIdentifier: 'm1');
      final ctx1 = DeterministicContext(snapshot: {'a': 1}, inputHash: AISerializer.hashInput({'a': 1}));
      final ctx2 = DeterministicContext(snapshot: {'a': 2}, inputHash: AISerializer.hashInput({'a': 2}));
      final s1 = sandbox.executeSuggestion('task', ctx1);
      final s2 = sandbox.executeSuggestion('task', ctx2);
      expect(s1.suggestionId, isNot(s2.suggestionId));
    });
  });

  group('OX8 Sandbox isolation', () {
    test('executeSuggestion returns pure suggestion without mutating context', () {
      final sandbox = AISandbox();
      final snapshot = {'tasks': 1};
      final ctx = DeterministicContext(snapshot: Map.from(snapshot), inputHash: AISerializer.hashInput(snapshot));
      final suggestion = sandbox.executeSuggestion('hint', ctx);
      expect(suggestion.output, isA<Map<String, dynamic>>());
      expect(suggestion.createdAtHeight, isNull);
      expect(ctx.snapshot['tasks'], 1);
    });

    test('stub produces deterministic output for same inputs', () {
      final sandbox = AISandbox();
      final ctx = DeterministicContext(snapshot: {'x': 1}, inputHash: 'h1');
      final s1 = sandbox.executeSuggestion('prompt', ctx);
      final s2 = sandbox.executeSuggestion('prompt', ctx);
      expect(s1.output, s2.output);
      expect(s1.suggestionId, s2.suggestionId);
    });
  });

  group('OX8 Intent mapping', () {
    test('suggestionToIntent maps create_task to UIIntent with targetProjectionId', () {
      final suggestion = AISuggestion(
        suggestionId: 's1',
        type: 'create_task',
        inputHash: 'h',
        output: {'title': 'T'},
        modelIdentifier: 'm1',
        createdAtHeight: null,
      );
      final intent = AIIntentMapper.suggestionToIntent(suggestion);
      expect(intent, isNotNull);
      expect(intent!.type, 'create_task');
      expect(intent.targetProjectionId, 'tasks');
      expect(intent.payload['title'], 'T');
      expect(intent.intentId, 's1');
    });

    test('suggestionToIntent does not commit: returns intent for user to confirm and sign', () {
      final suggestion = AISuggestion(suggestionId: 's2', type: 'resolve_decision', inputHash: 'h', output: {'option': 'A'}, modelIdentifier: 'm1', createdAtHeight: null);
      final intent = AIIntentMapper.suggestionToIntent(suggestion);
      expect(intent, isNotNull);
      expect(intent!.type, 'resolve_decision');
      expect(intent.targetProjectionId, 'decisions');
    });
  });

  group('OX8 Rejection of auto-commit', () {
    test('AICoPilotEngine.generateSuggestion does not append to ledger', () {
      final engine = AICoPilotEngine(sandbox: AISandbox());
      final ctx = engine.buildContext({'p': 1});
      final envelope = engine.generateSuggestion('task', ctx);
      expect(envelope.suggestion.createdAtHeight, isNull);
      expect(envelope.suggestionId, isNotEmpty);
    });

    test('suggestionToIntent returns intent; caller must validate and sign before append', () {
      final engine = AICoPilotEngine(sandbox: AISandbox());
      final ctx = engine.buildContext({'k': 'v'});
      final envelope = engine.generateSuggestion('create task', ctx);
      final intent = engine.suggestionToIntent(envelope);
      expect(intent, isNotNull);
      expect(intent!.type, isNotEmpty);
    });
  });

  group('OX8 Fork invalidation', () {
    test('onInvalidatedByFork logs and does not affect envelope', () {
      var logged = false;
      final audit = AIAudit(onEvent: (e, [d]) {
        if (e == AIAuditEvent.suggestionInvalidatedByFork) logged = true;
      });
      final engine = AICoPilotEngine(sandbox: AISandbox(), audit: audit);
      final ctx = engine.buildContext({'x': 1});
      final envelope = engine.generateSuggestion('task', ctx);
      engine.onInvalidatedByFork(envelope);
      expect(logged, isTrue);
    });
  });

  group('OX8 Audit', () {
    test('suggestionGenerated and suggestionConfirmed are logged', () {
      final events = <String>[];
      final audit = AIAudit(onEvent: (e, [d]) => events.add(e));
      final engine = AICoPilotEngine(sandbox: AISandbox(), audit: audit);
      final ctx = engine.buildContext({'a': 1});
      final envelope = engine.generateSuggestion('task', ctx);
      expect(events, contains(AIAuditEvent.suggestionGenerated));
      engine.onConfirmed(envelope);
      expect(events, contains(AIAuditEvent.suggestionConfirmed));
      engine.onRejected(envelope);
      expect(events, contains(AIAuditEvent.suggestionRejected));
    });
  });

  group('OX8 Deterministic envelope', () {
    test('same prompt + context produce same envelope hash', () {
      final engine = AICoPilotEngine(sandbox: AISandbox());
      final snapshot = {'tasks': 2};
      final ctx1 = engine.buildContext(snapshot);
      final ctx2 = engine.buildContext(Map.from(snapshot));
      final env1 = engine.generateSuggestion('add task', ctx1);
      final env2 = engine.generateSuggestion('add task', ctx2);
      expect(env1.suggestionId, env2.suggestionId);
      expect(env1.envelopeHash, env2.envelopeHash);
    });
  });
}
