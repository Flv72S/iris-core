export interface DomainAuthority {
  domainId: string;
  canIssueCertificates: boolean;
  canRevokeDomains: boolean;
  canModifyTrustGraph: boolean;
}

export class InMemoryDomainGovernanceRegistry {
  private readonly auths = new Map<string, DomainAuthority>();

  register(authority: DomainAuthority): void {
    this.auths.set(authority.domainId, { ...authority });
  }

  getAuthority(domainId: string): DomainAuthority | null {
    return this.auths.get(domainId) ?? null;
  }
}

