// K1 — Infrastructure port tests. Architecture and contract existence only.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/cloud_storage_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/distributed_lock_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/infrastructure_exception.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/node_identity_provider.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/retry_policy_port.dart';

void main() {
  group('K1 — Interfaces exist', () {
    test('CloudStoragePort is a type', () {
      expect(CloudStoragePort, isNotNull);
    });
    test('DistributedLockPort is a type', () {
      expect(DistributedLockPort, isNotNull);
    });
    test('RetryPolicyPort is a type', () {
      expect(RetryPolicyPort, isNotNull);
    });
    test('NodeIdentityProvider is a type', () {
      expect(NodeIdentityProvider, isNotNull);
    });
    test('InfrastructureException and subtypes exist', () {
      expect(InfrastructureException, isNotNull);
      expect(StorageException, isNotNull);
      expect(LockException, isNotNull);
      expect(RetryException, isNotNull);
      expect(NodeIdentityException, isNotNull);
    });
  });

  group('K1 — No dependency on Core', () {
    test('port library does not import iris core', () {
      final portDir = Directory('lib/flow/infrastructure/port');
      if (!portDir.existsSync()) {
        fail('lib/flow/infrastructure/port not found');
      }
      for (final entity in portDir.listSync()) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final content = entity.readAsStringSync();
        expect(
          content.contains('package:iris_flutter_app/core'),
          isFalse,
          reason: '${entity.path} must not depend on iris.core',
        );
      }
    });
  });

  group('K1 — No concrete implementation in module', () {
    test('port library contains only interface and exception definitions', () {
      final portDir = Directory('lib/flow/infrastructure/port');
      for (final entity in portDir.listSync()) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final content = entity.readAsStringSync();
        expect(
          content.contains('implements CloudStoragePort') ||
              content.contains('implements DistributedLockPort') ||
              content.contains('implements RetryPolicyPort') ||
              content.contains('implements NodeIdentityProvider'),
          isFalse,
          reason: 'Port module must not contain adapter implementations',
        );
      }
    });
  });

  group('K1 — No cloud import', () {
    test('port library does not import cloud SDKs', () {
      final portDir = Directory('lib/flow/infrastructure/port');
      final forbidden = [
        'aws_',
        'amazon',
        's3',
        'azure',
        'gcs',
        'google.cloud',
        'firebase_storage',
      ];
      for (final entity in portDir.listSync()) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final content = entity.readAsStringSync();
        for (final pattern in forbidden) {
          expect(
            content.toLowerCase().contains(pattern.toLowerCase()),
            isFalse,
            reason: '${entity.path} must not import cloud: $pattern',
          );
        }
      }
    });
  });

  group('K1 — No external infrastructure library', () {
    test('port library uses only dart/core or package iris_flutter_app', () {
      final portDir = Directory('lib/flow/infrastructure/port');
      final allowedPrefixes = ['dart:', 'package:iris_flutter_app/'];
      for (final entity in portDir.listSync()) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final content = entity.readAsStringSync();
        final lines = content.split('\n');
        for (final line in lines) {
          final trimmed = line.trim();
          if (!trimmed.startsWith('import ')) continue;
          final match = RegExp(r"import\s+'([^']+)'").firstMatch(trimmed);
          if (match == null) continue;
          final import = match.group(1)!;
          final ok = allowedPrefixes.any((p) => import.startsWith(p));
          expect(ok, isTrue, reason: '${entity.path} has forbidden import: $import');
        }
      }
    });
    test('port library does not depend on crypto or cloud libs', () {
      final portDir = Directory('lib/flow/infrastructure/port');
      final forbidden = ['package:crypto', 'package:aws_', 'package:azure', 'package:google'];
      for (final entity in portDir.listSync()) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final content = entity.readAsStringSync();
        for (final pattern in forbidden) {
          expect(
            content.contains(pattern),
            isFalse,
            reason: '${entity.path} must not depend on: $pattern',
          );
        }
      }
    });
  });

  group('K1 — Exception hierarchy', () {
    test('subtypes are catchable as InfrastructureException', () {
      expect(StorageException() is InfrastructureException, isTrue);
      expect(LockException() is InfrastructureException, isTrue);
      expect(RetryException() is InfrastructureException, isTrue);
      expect(NodeIdentityException() is InfrastructureException, isTrue);
    });
    test('InfrastructureException implements Exception', () {
      expect(InfrastructureException() is Exception, isTrue);
    });
  });
}
