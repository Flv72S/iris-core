// H4 - Vote model. Immutable; timestamp required.

enum GovernanceVoteType {
  approve,
  reject,
  abstain,
}

class GovernanceAuthorityId {
  const GovernanceAuthorityId(this.value);
  final String value;
  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is GovernanceAuthorityId && value == other.value);
  @override
  int get hashCode => value.hashCode;
}

class GovernanceVote {
  const GovernanceVote({
    required this.authorityId,
    required this.vote,
    required this.timestamp,
  });

  final GovernanceAuthorityId authorityId;
  final GovernanceVoteType vote;
  final DateTime timestamp;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GovernanceVote &&
          authorityId == other.authorityId &&
          vote == other.vote &&
          timestamp == other.timestamp);

  @override
  int get hashCode => Object.hash(authorityId, vote, timestamp);
}
