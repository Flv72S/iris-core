/**
 * Step 10A — IRIS Node Identity Engine. Types.
 */

export interface IRISNodeMetadata {
  readonly node_name: string;
  readonly organization: string;
  readonly deployment_environment: string;
  readonly geographic_region?: string;
}

export interface IRISNodeIdentityInput {
  readonly metadata: IRISNodeMetadata;
  readonly public_key: string;
}

export interface IRISNodeIdentity {
  readonly node_id: string;
  readonly public_key: string;
  readonly metadata: IRISNodeMetadata;
  readonly identity_hash: string;
}
