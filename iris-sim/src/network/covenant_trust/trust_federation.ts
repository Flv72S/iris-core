/**
 * Microstep 14T — Advanced Trust & Federation. Federation membership.
 */

export interface FederationMember {
  readonly node_id: string;
  readonly authority_id?: string;
}

export class FederationRegistry {
  private readonly members = new Map<string, FederationMember>();

  registerMember(member: FederationMember): void {
    this.members.set(member.node_id, member);
  }

  isMember(node_id: string): boolean {
    return this.members.has(node_id);
  }

  getMember(node_id: string): FederationMember | undefined {
    return this.members.get(node_id);
  }
}

