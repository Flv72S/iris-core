// H9 - Context for gate checks. Populated by runner from H2–H8 state.

class MetaGovernanceCIContext {
  const MetaGovernanceCIContext({
    this.hasStructuralChange = false,
    this.hasValidGcp = false,
    this.hasImpactReport = false,
    this.hasValidDecisionAndRatification = false,
    this.hasActivationSnapshot = false,
    this.hasGovernanceSnapshot = false,
    this.hasZeroDrift = true,
    this.hasValidProvenanceChain = false,
    this.driftCount = 0,
    this.provenanceValid = false,
  });

  final bool hasStructuralChange;
  final bool hasValidGcp;
  final bool hasImpactReport;
  final bool hasValidDecisionAndRatification;
  final bool hasActivationSnapshot;
  final bool hasGovernanceSnapshot;
  final bool hasZeroDrift;
  final bool hasValidProvenanceChain;
  final int driftCount;
  final bool provenanceValid;

  static const MetaGovernanceCIContext empty = MetaGovernanceCIContext();
}
