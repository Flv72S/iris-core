// Microstep 12.4 — UI-safe projection. Descriptive only; no interpretation, no normative claim.

import 'certification_capability.dart';
import 'certification_status.dart';

/// View model per una singola capability. Puramente descrittivo.
class CertificationCapabilityViewModel {
  const CertificationCapabilityViewModel({
    required this.code,
    required this.label,
    required this.description,
  });

  final String code;
  final String label;
  final String description;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CertificationCapabilityViewModel &&
          runtimeType == other.runtimeType &&
          code == other.code &&
          label == other.label &&
          description == other.description;

  @override
  int get hashCode => Object.hash(code, label, description);
}

/// Proiezione read-only dello status per la UI. Nessuna logica, nessun punteggio.
class CertificationStatusViewModel {
  const CertificationStatusViewModel({
    required this.title,
    required this.subtitle,
    required this.capabilities,
  });

  final String title;
  final String subtitle;
  final List<CertificationCapabilityViewModel> capabilities;

  /// Proiezione 1:1 da status. Ordine invariato; nessun filtraggio.
  factory CertificationStatusViewModel.fromStatus(CertificationStatus status) {
    final caps = status.capabilities
        .map((c) => CertificationCapabilityViewModel(
              code: c.code,
              label: _labelFor(c),
              description: _descriptionFor(c),
            ))
        .toList();
    return CertificationStatusViewModel(
      title: status.generatedBy,
      subtitle: status.description ?? '',
      capabilities: caps,
    );
  }

  static String _labelFor(CertificationCapability c) {
    switch (c) {
      case CertificationCapability.deterministicReplay:
        return 'Deterministic replay';
      case CertificationCapability.immutablePersistence:
        return 'Immutable persistence';
      case CertificationCapability.offlineReplay:
        return 'Offline replay';
      case CertificationCapability.forensicExport:
        return 'Forensic export';
      case CertificationCapability.forensicImportVerification:
        return 'Forensic import verification';
      case CertificationCapability.complianceMappingPresent:
        return 'Capability mapping present';
    }
  }

  static String _descriptionFor(CertificationCapability c) {
    switch (c) {
      case CertificationCapability.deterministicReplay:
        return 'System supports deterministic replay of events';
      case CertificationCapability.immutablePersistence:
        return 'Append-only immutable persistence';
      case CertificationCapability.offlineReplay:
        return 'Replay possible without active runtime';
      case CertificationCapability.forensicExport:
        return 'Export of data for forensic use';
      case CertificationCapability.forensicImportVerification:
        return 'Integrity verification of forensic import';
      case CertificationCapability.complianceMappingPresent:
        return 'Static mapping of technical capabilities is present';
    }
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CertificationStatusViewModel &&
          runtimeType == other.runtimeType &&
          title == other.title &&
          subtitle == other.subtitle &&
          _listEqual(capabilities, other.capabilities);

  static bool _listEqual(
      List<CertificationCapabilityViewModel> a,
      List<CertificationCapabilityViewModel> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i].code != b[i].code ||
          a[i].label != b[i].label ||
          a[i].description != b[i].description) {
        return false;
      }
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(
        title,
        subtitle,
        Object.hashAll(capabilities.map((e) => Object.hash(e.code, e.label, e.description))),
      );
}
