// Phase 11.9.1 — NormativeReference: round-trip, equality, optional fields, no time/random.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/ai_act_mapping/normative_reference.dart';

void main() {
  group('JSON round-trip', () {
    test('toJson then fromJson yields equal instance', () {
      const ref = NormativeReference(
        regulationId: 'EU-AI-ACT',
        article: 'Art. 13',
        paragraph: '§2',
        title: 'Transparency obligations',
        url: 'https://eur-lex.europa.eu/legal-content/EN/',
      );
      final json = ref.toJson();
      final restored = NormativeReference.fromJson(
        Map<String, dynamic>.from(json),
      );
      expect(restored, ref);
      expect(restored.regulationId, ref.regulationId);
      expect(restored.article, ref.article);
      expect(restored.paragraph, ref.paragraph);
      expect(restored.title, ref.title);
      expect(restored.url, ref.url);
    });
  });

  group('Equality and hashCode', () {
    test('same values imply equality and same hashCode', () {
      const a = NormativeReference(
        regulationId: 'GDPR',
        article: 'Article 9',
        title: 'Processing of special categories',
      );
      const b = NormativeReference(
        regulationId: 'GDPR',
        article: 'Article 9',
        title: 'Processing of special categories',
      );
      expect(a, b);
      expect(a.hashCode, b.hashCode);
    });

    test('different optional field breaks equality', () {
      const a = NormativeReference(
        regulationId: 'X',
        article: 'Y',
        title: 'Z',
        paragraph: 'p1',
      );
      const b = NormativeReference(
        regulationId: 'X',
        article: 'Y',
        title: 'Z',
      );
      expect(a, isNot(b));
      expect(a.hashCode, isNot(b.hashCode));
    });
  });

  group('Optional fields', () {
    test('creation without paragraph and url', () {
      const ref = NormativeReference(
        regulationId: 'ISO-23894',
        article: 'Clause 5',
        title: 'Risk management',
      );
      expect(ref.paragraph, isNull);
      expect(ref.url, isNull);
    });

    test('toJson omits optional keys when null', () {
      const ref = NormativeReference(
        regulationId: 'ISO-23894',
        article: 'Clause 5',
        title: 'Risk management',
      );
      final json = ref.toJson();
      expect(json.containsKey('paragraph'), false);
      expect(json.containsKey('url'), false);
      expect(json['article'], 'Clause 5');
      expect(json['regulationId'], 'ISO-23894');
      expect(json['title'], 'Risk management');
    });

    test('fromJson with optional keys restores them', () {
      final json = <String, dynamic>{
        'article': 'Art. 13',
        'regulationId': 'EU-AI-ACT',
        'title': 'Transparency',
        'paragraph': '§2',
      };
      final ref = NormativeReference.fromJson(json);
      expect(ref.paragraph, '§2');
      expect(ref.url, isNull);
    });
  });

  group('Determinism guard', () {
    test('normative_reference.dart does not use DateTime', () {
      final file = File('lib/ui/ai_act_mapping/normative_reference.dart');
      expect(file.existsSync(), true);
      final content = file.readAsStringSync();
      expect(content.contains('DateTime'), false);
    });

    test('normative_reference.dart does not use Stopwatch', () {
      final file = File('lib/ui/ai_act_mapping/normative_reference.dart');
      final content = file.readAsStringSync();
      expect(content.contains('Stopwatch'), false);
    });

    test('normative_reference.dart does not use Timer', () {
      final file = File('lib/ui/ai_act_mapping/normative_reference.dart');
      final content = file.readAsStringSync();
      expect(content.contains('Timer'), false);
    });

    test('normative_reference.dart does not use Random', () {
      final file = File('lib/ui/ai_act_mapping/normative_reference.dart');
      final content = file.readAsStringSync();
      expect(content.contains('Random'), false);
    });
  });

  group('Validation', () {
    test('fromJson throws on empty regulationId', () {
      expect(
        () => NormativeReference.fromJson({
          'regulationId': '',
          'article': 'Art. 1',
          'title': 'Title',
        }),
        throwsArgumentError,
      );
    });

    test('fromJson throws on missing title', () {
      expect(
        () => NormativeReference.fromJson({
          'regulationId': 'X',
          'article': 'Art. 1',
        }),
        throwsA(isA<ArgumentError>()),
      );
    });
  });
}
