// OX9 — Deployment profile. Read-only after startup; determines AI, logging, integrity, key policy.

/// Deployment profile. Must be read-only after startup.
enum DeploymentProfile {
  development,
  staging,
  production,
  airGapped,
}

/// Profile-derived settings. Immutable.
class DeploymentSettings {
  const DeploymentSettings({
    required this.profile,
    required this.aiEnabled,
    required this.debugLogLevel,
    required this.integrityCheckFrequencyTicks,
    required this.keyProtectionMode,
    required this.auditVerbosity,
  });

  final DeploymentProfile profile;
  final bool aiEnabled;
  final int debugLogLevel; // 0=off, 1=error, 2=warn, 3=info
  final int integrityCheckFrequencyTicks; // run every N ticks; 0=every time
  final KeyProtectionMode keyProtectionMode;
  final int auditVerbosity; // 0=minimal, 1=normal, 2=verbose

  static DeploymentSettings fromProfile(DeploymentProfile profile) {
    switch (profile) {
      case DeploymentProfile.development:
        return const DeploymentSettings(
          profile: DeploymentProfile.development,
          aiEnabled: true,
          debugLogLevel: 3,
          integrityCheckFrequencyTicks: 10,
          keyProtectionMode: KeyProtectionMode.localPlaintext,
          auditVerbosity: 2,
        );
      case DeploymentProfile.staging:
        return const DeploymentSettings(
          profile: DeploymentProfile.staging,
          aiEnabled: true,
          debugLogLevel: 2,
          integrityCheckFrequencyTicks: 5,
          keyProtectionMode: KeyProtectionMode.encryptedAtRest,
          auditVerbosity: 1,
        );
      case DeploymentProfile.production:
        return const DeploymentSettings(
          profile: DeploymentProfile.production,
          aiEnabled: true,
          debugLogLevel: 1,
          integrityCheckFrequencyTicks: 1,
          keyProtectionMode: KeyProtectionMode.encryptedAtRest,
          auditVerbosity: 1,
        );
      case DeploymentProfile.airGapped:
        return const DeploymentSettings(
          profile: DeploymentProfile.airGapped,
          aiEnabled: false,
          debugLogLevel: 2,
          integrityCheckFrequencyTicks: 1,
          keyProtectionMode: KeyProtectionMode.airGappedMode,
          auditVerbosity: 1,
        );
    }
  }
}

enum KeyProtectionMode {
  localPlaintext, // dev only
  encryptedAtRest,
  hardwareBacked, // stub
  airGappedMode,
}
