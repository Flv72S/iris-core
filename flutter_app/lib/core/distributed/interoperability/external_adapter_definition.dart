// ODA-10 — Deterministic adapter logic. Pure; no live network calls.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class ExternalAdapterDefinition {
  const ExternalAdapterDefinition({
    required this.adapterId,
    required this.version,
    required this.inputSchemaRef,
    required this.proofSchemaRef,
    required this.validationLogicRef,
    required this.adapterHash,
  });

  final String adapterId;
  final String version;
  final String inputSchemaRef;
  final String proofSchemaRef;
  final String validationLogicRef;
  final String adapterHash;
}

class ExternalAdapterDefinitionFactory {
  ExternalAdapterDefinitionFactory._();

  static ExternalAdapterDefinition createAdapter({
    required String adapterId,
    required String version,
    required String inputSchemaRef,
    required String proofSchemaRef,
    required String validationLogicRef,
  }) {
    final payload = <String, dynamic>{
      'adapterId': adapterId,
      'version': version,
      'inputSchemaRef': inputSchemaRef,
      'proofSchemaRef': proofSchemaRef,
      'validationLogicRef': validationLogicRef,
    };
    final adapterHash = CanonicalPayload.hash(payload);
    return ExternalAdapterDefinition(
      adapterId: adapterId,
      version: version,
      inputSchemaRef: inputSchemaRef,
      proofSchemaRef: proofSchemaRef,
      validationLogicRef: validationLogicRef,
      adapterHash: adapterHash,
    );
  }

  static bool verifyAdapter(ExternalAdapterDefinition adapter) {
    final payload = <String, dynamic>{
      'adapterId': adapter.adapterId,
      'version': adapter.version,
      'inputSchemaRef': adapter.inputSchemaRef,
      'proofSchemaRef': adapter.proofSchemaRef,
      'validationLogicRef': adapter.validationLogicRef,
    };
    return CanonicalPayload.hash(payload) == adapter.adapterHash;
  }

  static Map<String, dynamic> evaluateAdapter(
    ExternalAdapterDefinition adapter,
    Map<String, dynamic> inputArtifact,
    Map<String, dynamic> Function(Map<String, dynamic> artifact) pureLogic,
  ) {
    return pureLogic(inputArtifact);
  }

  static String getAdapterHash(ExternalAdapterDefinition adapter) => adapter.adapterHash;
}
