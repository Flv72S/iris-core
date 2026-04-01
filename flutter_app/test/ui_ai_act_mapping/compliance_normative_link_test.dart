// Phase 11.9.2 — ComplianceNormativeLink: round-trip, equality, order, optional note, no time/random.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/ai_act_mapping/compliance_normative_link.dart';
import 'package:iris_flutter_app/ui/ai_act_mapping/compliance_section_id.dart';
import 'package:iris_flutter_app/ui/ai_act_mapping/normative_reference.dart';

NormativeReference _ref(String art, {String? para}) => NormativeReference(
      regulationId: 'EU-AI-ACT',
      article: art,
      paragraph: para,
      title: 'Title $art',
    );

void main() {
  group('JSON round-trip', () {
    test('ComplianceNormativeLink toJson then fromJson yields equal instance',
        () {
      const link = ComplianceNormativeLink(
        sectionId: ComplianceSectionId('explainability-ui'),
        normativeReferences: [
          NormativeReference(
            regulationId: 'EU-AI-ACT',
            article: 'Art. 13',
            title: 'Transparency',
          ),
        ],
        note: 'Relevant for transparency obligations',
      );
      final json = link.toJson();
      final restored = ComplianceNormativeLink.fromJson(
        Map<String, dynamic>.from(json),
      );
      expect(restored.sectionId.value, link.sectionId.value);
      expect(restored.normativeReferences.length, link.normativeReferences.length);
      expect(restored.normativeReferences[0].article, 'Art. 13');
      expect(restored.note, link.note);
      expect(restored, link);
    });
  });

  group('Equality and hashCode', () {
    test('two identical links are equal and have same hashCode', () {
      const sectionId = ComplianceSectionId('replay-store');
      const link1 = ComplianceNormativeLink(
        sectionId: sectionId,
        normativeReferences: [
          NormativeReference(
            regulationId: 'EU-AI-ACT',
            article: 'Art. 9',
            title: 'T',
          ),
        ],
      );
      const link2 = ComplianceNormativeLink(
        sectionId: sectionId,
        normativeReferences: [
          NormativeReference(
            regulationId: 'EU-AI-ACT',
            article: 'Art. 9',
            title: 'T',
          ),
        ],
      );
      expect(link1, link2);
      expect(link1.hashCode, link2.hashCode);
    });
  });

  group('Section and references', () {
    test('sectionId and normativeReferences order and content preserved', () {
      const link = ComplianceNormativeLink(
        sectionId: ComplianceSectionId('deterministic-time-model'),
        normativeReferences: [
          NormativeReference(
            regulationId: 'EU-AI-ACT',
            article: 'Art. 13',
            title: 'T1',
          ),
          NormativeReference(
            regulationId: 'GDPR',
            article: 'Article 5',
            title: 'T2',
          ),
        ],
      );
      final json = link.toJson();
      final restored = ComplianceNormativeLink.fromJson(
        Map<String, dynamic>.from(json),
      );
      expect(restored.sectionId.value, 'deterministic-time-model');
      expect(restored.normativeReferences.length, 2);
      expect(restored.normativeReferences[0].article, 'Art. 13');
      expect(restored.normativeReferences[0].regulationId, 'EU-AI-ACT');
      expect(restored.normativeReferences[1].article, 'Article 5');
      expect(restored.normativeReferences[1].regulationId, 'GDPR');
    });
  });

  group('Optional note', () {
    test('creation without note', () {
      const link = ComplianceNormativeLink(
        sectionId: ComplianceSectionId('decision-loop'),
        normativeReferences: [
          NormativeReference(
            regulationId: 'X',
            article: 'Y',
            title: 'Z',
          ),
        ],
      );
      expect(link.note, isNull);
    });

    test('toJson omits note when null', () {
      const link = ComplianceNormativeLink(
        sectionId: ComplianceSectionId('x'),
        normativeReferences: [
          NormativeReference(
            regulationId: 'R',
            article: 'A',
            title: 'T',
          ),
        ],
      );
      final json = link.toJson();
      expect(json.containsKey('note'), false);
    });

    test('fromJson with note restores it', () {
      final json = <String, dynamic>{
        'normativeReferences': [
          {
            'article': 'A',
            'regulationId': 'R',
            'title': 'T',
          },
        ],
        'sectionId': {'value': 's1'},
        'note': 'Explanatory note',
      };
      final link = ComplianceNormativeLink.fromJson(json);
      expect(link.note, 'Explanatory note');
    });
  });

  group('Determinism guard', () {
    test('compliance_section_id.dart does not use DateTime, Timer, Stopwatch, Random', () {
      final file = File('lib/ui/ai_act_mapping/compliance_section_id.dart');
      expect(file.existsSync(), true);
      final content = file.readAsStringSync();
      expect(content.contains('DateTime'), false);
      expect(content.contains('Timer'), false);
      expect(content.contains('Stopwatch'), false);
      expect(content.contains('Random'), false);
    });

    test('compliance_normative_link.dart does not use DateTime, Timer, Stopwatch, Random', () {
      final file = File('lib/ui/ai_act_mapping/compliance_normative_link.dart');
      expect(file.existsSync(), true);
      final content = file.readAsStringSync();
      expect(content.contains('DateTime'), false);
      expect(content.contains('Timer'), false);
      expect(content.contains('Stopwatch'), false);
      expect(content.contains('Random'), false);
    });
  });

  group('Validation', () {
    test('fromJson throws on empty normativeReferences', () {
      expect(
        () => ComplianceNormativeLink.fromJson({
          'sectionId': {'value': 'x'},
          'normativeReferences': [],
        }),
        throwsArgumentError,
      );
    });

    test('ComplianceSectionId.fromJson throws on empty value', () {
      expect(
        () => ComplianceSectionId.fromJson({'value': '   '}),
        throwsArgumentError,
      );
    });
  });
}
