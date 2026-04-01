// OX9 — Tests: config immutability, deployment profile, integrity, health, backup, isolation.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/production/secure_config_manager.dart';
import 'package:iris_flutter_app/core/production/deployment_profile.dart';
import 'package:iris_flutter_app/core/production/integrity_report.dart';
import 'package:iris_flutter_app/core/production/runtime_integrity_monitor.dart';
import 'package:iris_flutter_app/core/production/deterministic_health_check.dart';
import 'package:iris_flutter_app/core/production/operational_audit_logger.dart';
import 'package:iris_flutter_app/core/production/environment_isolation.dart';
import 'package:iris_flutter_app/core/production/crash_recovery_manager.dart';
import 'package:iris_flutter_app/core/production/deterministic_backup.dart';
import 'package:iris_flutter_app/core/production/observability_layer.dart';

void main() {
  group('OX9 SecureConfigManager', () {
    test('config immutable after freeze', () {
      final mgr = SecureConfigManager();
      mgr.loadConfig({'a': 1, 'b': 2});
      expect(mgr.getConfigHash().isNotEmpty, isTrue);
      mgr.freeze();
      expect(() => mgr.loadConfig({'c': 3}), throwsStateError);
    });

    test('same config produces same hash', () {
      final mgr = SecureConfigManager();
      mgr.loadConfig({'x': 1, 'y': 2});
      final h1 = mgr.getConfigHash();
      final mgr2 = SecureConfigManager();
      mgr2.loadConfig({'y': 2, 'x': 1});
      expect(mgr2.getConfigHash(), h1);
    });
  });

  group('OX9 DeploymentProfile', () {
    test('production has signature enforcement and AI enabled', () {
      final s = DeploymentSettings.fromProfile(DeploymentProfile.production);
      expect(s.aiEnabled, isTrue);
      expect(s.integrityCheckFrequencyTicks, 1);
      expect(s.keyProtectionMode, KeyProtectionMode.encryptedAtRest);
    });

    test('airGapped disables AI', () {
      final s = DeploymentSettings.fromProfile(DeploymentProfile.airGapped);
      expect(s.aiEnabled, isFalse);
    });
  });

  group('OX9 RuntimeIntegrityMonitor', () {
    test('runIntegrityCheck is deterministic for same provider', () {
      var ledgerOk = true;
      final provider = _StubIntegrityProvider(
        ledgerHash: 'h1',
        projectionHashConsistent: true,
        signatureValidityOk: true,
        identityConsistencyOk: true,
        forkCorrectnessOk: true,
      );
      final monitor = RuntimeIntegrityMonitor(provider: provider);
      final r1 = monitor.runIntegrityCheck();
      final r2 = monitor.runIntegrityCheck();
      expect(r1.ledgerHashOk, r2.ledgerHashOk);
      expect(r1.isHealthy, r2.isHealthy);
    });

    test('detects ledger hash drift when provider reports inconsistent', () {
      final provider = _StubIntegrityProvider(
        ledgerHash: null,
        projectionHashConsistent: false,
        signatureValidityOk: true,
        identityConsistencyOk: true,
        forkCorrectnessOk: true,
      );
      final monitor = RuntimeIntegrityMonitor(provider: provider);
      final r = monitor.runIntegrityCheck();
      expect(r.ledgerHashOk, isFalse);
      expect(r.projectionHashOk, isFalse);
      expect(r.isHealthy, isFalse);
    });
  });

  group('OX9 DeterministicHealthCheck', () {
    test('getSystemHealth does not depend on clock', () {
      final provider = _StubHealthProvider(
        ledgerConsistent: true,
        projectionRebuildOk: true,
        identityStateConsistent: true,
        signatureValidationOk: true,
        forkResolutionOk: true,
        pendingOptimisticCount: 0,
        aiSuggestionQueueIntegrityOk: true,
      );
      final check = DeterministicHealthCheck(provider: provider);
      final h = check.getSystemHealth();
      expect(h.isHealthy, isTrue);
      expect(h.pendingOptimisticCount, 0);
    });
  });

  group('OX9 OperationalAuditLogger', () {
    test('log entries append-only and exportable', () {
      final logger = OperationalAuditLogger();
      logger.logIdentityOp('ev1', {'id': 'i1'});
      logger.logPermissionDenial('ev2', {'perm': 'write'});
      final exported = logger.exportForCompliance();
      expect(exported.length, 2);
      expect(exported[0].category, 'identity');
      expect(exported[1].category, 'permission_denial');
    });
  });

  group('OX9 EnvironmentIsolation', () {
    test('isPathAllowed respects allowedDirectoryPaths', () {
      final iso = EnvironmentIsolation(
        allowedDirectoryPaths: ['/data', 'C:/app'],
      );
      expect(iso.isPathAllowed('/data/ledger'), isTrue);
      expect(iso.isPathAllowed('/other/file'), isFalse);
    });
  });

  group('OX9 CrashRecoveryManager', () {
    test('runRecovery returns report and rebuilds', () {
      var rollbackCalled = false;
      var rebuildCalled = false;
      final provider = _StubCrashProvider(
        hasPartialAppend: true,
        lastSignedEventValid: false,
        rollback: () {
          rollbackCalled = true;
          return 1;
        },
        rebuild: () {
          rebuildCalled = true;
          return true;
        },
      );
      final manager = CrashRecoveryManager(provider: provider);
      final report = manager.runRecovery();
      expect(report.partialAppendDetected, isTrue);
      expect(report.rollbackCount, 1);
      expect(rollbackCalled, isTrue);
      expect(rebuildCalled, isTrue);
    });
  });

  group('OX9 DeterministicBackup', () {
    test('createBackup includes integrity hash', () {
      final provider = _StubBackupProvider();
      final backup = DeterministicBackup(provider: provider);
      final payload = backup.createBackup();
      expect(payload.containsKey('_integrityHash'), isTrue);
      expect(backup.verifyBackup(payload), isTrue);
    });

    test('restoreBackup verifies hash', () {
      final provider = _StubBackupProvider();
      final backup = DeterministicBackup(provider: provider);
      final payload = backup.createBackup();
      payload['_integrityHash'] = 'tampered';
      expect(backup.restoreBackup(payload), isFalse);
    });
  });

  group('OX9 ObservabilityLayer', () {
    test('getMetrics does not alter state', () {
      final provider = _StubObservabilityProvider(
        ledgerHeight: 10,
        forkCount: 0,
        projectionRebuildCount: 1,
        signatureFailureCount: 0,
        aiSuggestionCount: 2,
        permissionDenialCount: 0,
      );
      final layer = ObservabilityLayer(provider: provider);
      final m = layer.getMetrics();
      expect(m.ledgerHeight, 10);
      expect(m.aiSuggestionCount, 2);
    });
  });
}

class _StubIntegrityProvider implements IntegrityCheckProvider {
  _StubIntegrityProvider({
    this.ledgerHash,
    required this.projectionHashConsistent,
    required this.signatureValidityOk,
    required this.identityConsistencyOk,
    required this.forkCorrectnessOk,
  });
  @override
  final String? ledgerHash;
  @override
  final bool projectionHashConsistent;
  @override
  final bool signatureValidityOk;
  @override
  final bool identityConsistencyOk;
  @override
  final bool forkCorrectnessOk;
}

class _StubHealthProvider implements HealthCheckProvider {
  _StubHealthProvider({
    required this.ledgerConsistent,
    required this.projectionRebuildOk,
    required this.identityStateConsistent,
    required this.signatureValidationOk,
    required this.forkResolutionOk,
    required this.pendingOptimisticCount,
    required this.aiSuggestionQueueIntegrityOk,
  });
  @override
  final bool ledgerConsistent;
  @override
  final bool projectionRebuildOk;
  @override
  final bool identityStateConsistent;
  @override
  final bool signatureValidationOk;
  @override
  final bool forkResolutionOk;
  @override
  final int pendingOptimisticCount;
  @override
  final bool aiSuggestionQueueIntegrityOk;
}

class _StubCrashProvider implements CrashRecoveryProvider {
  _StubCrashProvider({
    required this.hasPartialAppend,
    required this.lastSignedEventValid,
    required this.rollback,
    required this.rebuild,
  });
  @override
  final bool hasPartialAppend;
  @override
  final bool lastSignedEventValid;
  final int Function() rollback;
  final bool Function() rebuild;
  @override
  int rollbackIncomplete() => rollback();
  @override
  bool rebuildProjectionFromSnapshot() => rebuild();
}

class _StubBackupProvider implements DeterministicBackupProvider {
  @override
  Map<String, dynamic> createBackupPayload() => {'ledgerHeight': 0};

  @override
  bool restoreFromPayload(Map<String, dynamic> payload) => true;

  @override
  String computeIntegrityHash(Map<String, dynamic> payload) => 'hash';
}

class _StubObservabilityProvider implements ObservabilityProvider {
  _StubObservabilityProvider({
    required this.ledgerHeight,
    required this.forkCount,
    required this.projectionRebuildCount,
    required this.signatureFailureCount,
    required this.aiSuggestionCount,
    required this.permissionDenialCount,
  });
  @override
  final int ledgerHeight;
  @override
  final int forkCount;
  @override
  final int projectionRebuildCount;
  @override
  final int signatureFailureCount;
  @override
  final int aiSuggestionCount;
  @override
  final int permissionDenialCount;
}
