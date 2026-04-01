// F1 — Default implementation of IFlowCoreContract. Only file that imports Core.

import 'package:iris_flutter_app/certification/evidence/certification_evidence_index.dart';
import 'package:iris_flutter_app/certification/public/public_certification_manifest.dart';
import 'package:iris_flutter_app/certification/public/public_verification_package_builder.dart';
import 'package:iris_flutter_app/flow_boundary/flow_core_contract.dart';

/// Default read-only implementation of the Core contract. Deterministic; no side effects.
final class DefaultFlowCoreContract implements IFlowCoreContract {
  DefaultFlowCoreContract() : _manifest = publicCertificationManifest {
    final index = certificationEvidenceIndex;
    _freezeSealHash = index.entries
        .firstWhere((e) => e.id == 'cryptographic_freeze_seal')
        .sha256;
    final package = const PublicVerificationPackageBuilder().buildPackageFiles();
    _packageHash = package['PACKAGE_SHA256.txt']!;
  }

  final PublicCertificationManifest _manifest;
  late final String _freezeSealHash;
  late final String _packageHash;

  @override
  IStructuralHashReader get structuralHashReader => _StructuralHashReaderImpl(_manifest);

  @override
  ITrustStateReader get trustStateReader => _TrustStateReaderImpl(_manifest, _freezeSealHash);

  @override
  ICertificationContextReader get certificationContextReader =>
      _CertificationContextReaderImpl(_manifest, _packageHash);
}

class _StructuralHashReaderImpl implements IStructuralHashReader {
  _StructuralHashReaderImpl(this._manifest);
  final PublicCertificationManifest _manifest;

  @override
  StructuralHashSnapshot readStructuralHash() =>
      StructuralHashSnapshot(value: _manifest.coreStructuralHash);
}

class _TrustStateReaderImpl implements ITrustStateReader {
  _TrustStateReaderImpl(this._manifest, this._freezeSealHash);
  final PublicCertificationManifest _manifest;
  final String _freezeSealHash;

  @override
  TrustStateSnapshot readTrustState() => TrustStateSnapshot(
        structuralHash: _manifest.coreStructuralHash,
        freezeSealHash: _freezeSealHash,
        hasValidChain: true,
      );
}

class _CertificationContextReaderImpl implements ICertificationContextReader {
  _CertificationContextReaderImpl(this._manifest, this._packageHash);
  final PublicCertificationManifest _manifest;
  final String _packageHash;

  @override
  CertificationContextSnapshot readCertificationContext() =>
      CertificationContextSnapshot(
        manifestVersion: _manifest.manifestVersion,
        evidenceEntryIds: List.from(_manifest.evidenceEntryIds),
        packageHash: _packageHash,
      );
}
