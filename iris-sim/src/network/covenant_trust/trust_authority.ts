/**
 * Microstep 14T — Advanced Trust & Federation. Authority model.
 */

export interface Authority {
  readonly authority_id: string;
  readonly public_key: string;
  readonly level: 'ROOT' | 'INTERMEDIATE' | 'NODE';
}

export class AuthorityRegistry {
  private readonly authorities = new Map<string, Authority>();

  registerAuthority(authority: Authority): void {
    this.authorities.set(authority.authority_id, authority);
  }

  getAuthority(authority_id: string): Authority | undefined {
    return this.authorities.get(authority_id);
  }

  isTrustedAuthority(authority_id: string): boolean {
    return this.authorities.has(authority_id);
  }
}

