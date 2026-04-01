// Phase 11.9.3 — ComplianceMapRegistry: round-trip, determinism, order, equality, no time/random.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/ai_act_mapping/compliance_map_registry.dart';
import 'package:iris_flutter_app/ui/ai_act_mapping/compliance_normative_link.dart';
import 'package:iris_flutter_app/ui/ai_act_mapping/compliance_section_id.dart';
import 'package:iris_flutter_app/ui/ai_act_mapping/normative_reference.dart';

void main() {
  group('JSON round-trip', () {
    test('defaultRegistry toJson then fromJson yields equal instance', () {
      final registry = ComplianceMapRegistry.defaultRegistry;
      final json = registry.toJson();
      final restored = ComplianceMapRegistry.fromJson(
        Map<String, dynamic>.from(json),
      );
      expect(restored.version, registry.version);
      expect(restored.links.length, registry.links.length);
      expect(restored.description, registry.description);
      expect(restored, registry);
    });
  });

  group('Determinism', () {
    test('two accesses to defaultRegistry yield same content and hashCode', () {
      final a = ComplianceMapRegistry.defaultRegistry;
      final b = ComplianceMapRegistry.defaultRegistry;
      expect(a.version, b.version);
      expect(a.links.length, b.links.length);
      expect(a.links[0].sectionId.value, b.links[0].sectionId.value);
      expect(a, b);
      expect(a.hashCode, b.hashCode);
    });
  });

  group('Order stable', () {
    test('links order is preserved and serialization maintains order', () {
      final registry = ComplianceMapRegistry.defaultRegistry;
      expect(registry.links.length, greaterThanOrEqualTo(2));
      final firstId = registry.links[0].sectionId.value;
      final secondId = registry.links[1].sectionId.value;

      final json = registry.toJson();
      final linksJson = json['links'] as List<dynamic>;
      expect(linksJson.length, registry.links.length);
      final restored = ComplianceMapRegistry.fromJson(
        Map<String, dynamic>.from(json),
      );
      expect(restored.links[0].sectionId.value, firstId);
      expect(restored.links[1].sectionId.value, secondId);
    });
  });

  group('Equality', () {
    test('two identical registries are equal', () {
      const registry = ComplianceMapRegistry(
        version: '1.0',
        links: [
          ComplianceNormativeLink(
            sectionId: ComplianceSectionId('x'),
            normativeReferences: [
              NormativeReference(
                regulationId: 'R',
                article: 'A',
                title: 'T',
              ),
            ],
          ),
        ],
      );
      const other = ComplianceMapRegistry(
        version: '1.0',
        links: [
          ComplianceNormativeLink(
            sectionId: ComplianceSectionId('x'),
            normativeReferences: [
              NormativeReference(
                regulationId: 'R',
                article: 'A',
                title: 'T',
              ),
            ],
          ),
        ],
      );
      expect(registry, other);
    });

    test('different version implies not equal', () {
      const registry1 = ComplianceMapRegistry(
        version: '1.0',
        links: [
          ComplianceNormativeLink(
            sectionId: ComplianceSectionId('x'),
            normativeReferences: [
              NormativeReference(
                regulationId: 'R',
                article: 'A',
                title: 'T',
              ),
            ],
          ),
        ],
      );
      const registry2 = ComplianceMapRegistry(
        version: '2.0',
        links: [
          ComplianceNormativeLink(
            sectionId: ComplianceSectionId('x'),
            normativeReferences: [
              NormativeReference(
                regulationId: 'R',
                article: 'A',
                title: 'T',
              ),
            ],
          ),
        ],
      );
      expect(registry1, isNot(registry2));
    });
  });

  group('Determinism guard', () {
    test('compliance_map_registry.dart does not use DateTime, Random, Timer, Stopwatch', () {
      final file = File('lib/ui/ai_act_mapping/compliance_map_registry.dart');
      expect(file.existsSync(), true);
      final content = file.readAsStringSync();
      expect(content.contains('DateTime'), false);
      expect(content.contains('Random'), false);
      expect(content.contains('Timer'), false);
      expect(content.contains('Stopwatch'), false);
    });
  });

  group('Validation', () {
    test('fromJson throws on empty links', () {
      expect(
        () => ComplianceMapRegistry.fromJson({
          'version': '1.0',
          'links': [],
        }),
        throwsArgumentError,
      );
    });

    test('fromJson throws on empty version', () {
      expect(
        () => ComplianceMapRegistry.fromJson({
          'version': '',
          'links': [
            {
              'sectionId': {'value': 'x'},
              'normativeReferences': [
                {'article': 'A', 'regulationId': 'R', 'title': 'T'},
              ],
            },
          ],
        }),
        throwsArgumentError,
      );
    });
  });
}
