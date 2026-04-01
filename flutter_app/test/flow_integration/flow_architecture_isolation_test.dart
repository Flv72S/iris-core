// FT — Architecture isolation: no forbidden imports, no circular deps.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

final _flowRuntimeDir = Directory('lib/flow_runtime');
final _flowStepsDir = Directory('lib/flow_steps');
final _flowOrchestrationDir = Directory('lib/flow_orchestration');
final _flowCoreConsumptionDir = Directory('lib/flow_core_consumption');

List<File> _dartFiles(Directory dir) {
  if (!dir.existsSync()) return [];
  return dir
      .listSync(recursive: true)
      .whereType<File>()
      .where((f) => f.path.endsWith('.dart'))
      .toList();
}

void main() {
  group('Architecture isolation', () {
    test('flow_runtime does NOT import flow_core_consumption or core_consumption', () {
      for (final file in _dartFiles(_flowRuntimeDir)) {
        final content = file.readAsStringSync();
        expect(
          content.contains('flow_core_consumption') ||
              content.contains('core_consumption'),
          isFalse,
          reason: '${file.path} must not import core consumption',
        );
      }
    });

    test('flow_steps does NOT import flow_runtime', () {
      for (final file in _dartFiles(_flowStepsDir)) {
        final content = file.readAsStringSync();
        expect(
          content.contains('flow_runtime'),
          isFalse,
          reason: '${file.path} must not import flow_runtime',
        );
      }
    });

    test('flow_orchestration does NOT import flow_core_consumption or core', () {
      for (final file in _dartFiles(_flowOrchestrationDir)) {
        final content = file.readAsStringSync();
        expect(
          content.contains('flow_core_consumption') ||
              content.contains('core_consumption'),
          isFalse,
          reason: '${file.path} must not import core',
        );
      }
    });

    test('no circular dependency: flow_runtime -> flow_steps', () {
      for (final file in _dartFiles(_flowRuntimeDir)) {
        final content = file.readAsStringSync();
        expect(
          content.contains('flow_steps'),
          isFalse,
          reason: 'flow_runtime must not import flow_steps',
        );
      }
    });

    test('flow_steps does not import flow_orchestration', () {
      for (final file in _dartFiles(_flowStepsDir)) {
        final content = file.readAsStringSync();
        expect(
          content.contains('flow_orchestration'),
          isFalse,
          reason: '${file.path} must not import flow_orchestration',
        );
      }
    });
  });
}
