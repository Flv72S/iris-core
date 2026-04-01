// ODA-6 — Proposed governance change. Immutable; references governance identity.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class PolicyProposal {
  const PolicyProposal({
    required this.policyHash,
    required this.proposedByClusterId,
    required this.signature,
    required this.requiredApprovalClusterIds,
    this.governanceIdentityHash,
  });

  final String policyHash;
  final String proposedByClusterId;
  final String signature;
  final List<String> requiredApprovalClusterIds;
  final String? governanceIdentityHash;

  Map<String, dynamic> get proposalPayload => <String, dynamic>{
        'policyHash': policyHash,
        'proposedByClusterId': proposedByClusterId,
        'requiredApprovalClusterIds': (List<String>.from(requiredApprovalClusterIds)..sort()),
        if (governanceIdentityHash != null) 'governanceIdentityHash': governanceIdentityHash,
      };
}

class PolicyProposalFactory {
  PolicyProposalFactory._();

  static PolicyProposal submitPolicyProposal({
    required String policyHash,
    required String proposedByClusterId,
    required String signature,
    required List<String> requiredApprovalClusterIds,
    String? governanceIdentityHash,
  }) {
    return PolicyProposal(
      policyHash: policyHash,
      proposedByClusterId: proposedByClusterId,
      signature: signature,
      requiredApprovalClusterIds: requiredApprovalClusterIds,
      governanceIdentityHash: governanceIdentityHash,
    );
  }

  static bool verifyProposal(
    PolicyProposal proposal,
    bool Function(String clusterId, Map<String, dynamic> payload, String signature) verifySignature,
  ) {
    return verifySignature(
      proposal.proposedByClusterId,
      proposal.proposalPayload,
      proposal.signature,
    );
  }
}
