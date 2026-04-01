// Microstep 12.5 — Certification Status Widget: neutral UI tests.

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/certification_status/certification_status.dart';
import 'package:iris_flutter_app/ui/certification_status/certification_status_view_model.dart';
import 'package:iris_flutter_app/ui/certification_status/certification_status_widget.dart';

const _forbiddenTerms = [
  'compliant',
  'certified',
  'approved',
  'regulation',
  'legal',
  'meets',
];

void main() {
  late CertificationStatusViewModel viewModel;

  setUp(() {
    viewModel = CertificationStatusViewModel.fromStatus(
      CertificationStatus.defaultStatus,
    );
  });

  Future<void> pumpWidget(WidgetTester tester) {
    return tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: CertificationStatusWidget(viewModel: viewModel),
          ),
        ),
      ),
    );
  }

  group('4.1 Rendering smoke test', () {
    testWidgets('widget builds without error with defaultStatus ViewModel',
        (WidgetTester tester) async {
      await pumpWidget(tester);
      expect(find.byType(CertificationStatusWidget), findsOneWidget);
    });
  });

  group('4.2 Content presence', () {
    testWidgets('title is visible', (WidgetTester tester) async {
      await pumpWidget(tester);
      expect(find.text(viewModel.title), findsOneWidget);
    });

    testWidgets('all capability labels and descriptions are rendered once',
        (WidgetTester tester) async {
      await pumpWidget(tester);
      for (final cap in viewModel.capabilities) {
        expect(find.text(cap.label), findsOneWidget);
        expect(find.text(cap.description), findsOneWidget);
      }
    });
  });

  group('4.3 Order stability', () {
    testWidgets('displayed capability order matches ViewModel order',
        (WidgetTester tester) async {
      await pumpWidget(tester);
      final labels = viewModel.capabilities.map((c) => c.label).toList();
      if (labels.length < 2) return;
      for (var i = 0; i < labels.length - 1; i++) {
        final topFirst = tester.getTopLeft(find.text(labels[i]));
        final topSecond = tester.getTopLeft(find.text(labels[i + 1]));
        expect(topFirst.dy, lessThan(topSecond.dy),
            reason: '${labels[i]} should appear before ${labels[i + 1]}');
      }
    });
  });

  group('4.4 Forbidden terms guard', () {
    test('no hardcoded string in widget file contains forbidden terms', () {
      final file = File('lib/ui/certification_status/certification_status_widget.dart');
      final content = file.readAsStringSync();
      for (final term in _forbiddenTerms) {
        expect(content.toLowerCase().contains(term), isFalse,
            reason: 'widget must not contain: $term');
      }
    });
  });

  group('4.5 No semantic UI', () {
    test('widget file does not contain Icon, Color, isOk, isValid, isStatus, isCertified', () {
      final file = File('lib/ui/certification_status/certification_status_widget.dart');
      final content = file.readAsStringSync();
      expect(content.contains('Icon'), isFalse);
      expect(content.contains('Color('), isFalse);
      expect(content.contains('isOk'), isFalse);
      expect(content.contains('isValid'), isFalse);
      expect(content.contains('isStatus'), isFalse);
      expect(content.contains('isCertified'), isFalse);
    });

    test('widget file has no if/switch based on capability', () {
      final file = File('lib/ui/certification_status/certification_status_widget.dart');
      final content = file.readAsStringSync();
      expect(content.contains('cap.code'), isFalse);
      expect(content.contains('cap =='), isFalse);
      expect(content.contains('switch (cap'), isFalse);
    });
  });
}
