export type FeaturePolicyDecision =
  | { readonly status: 'ALLOWED' }
  | { readonly status: 'BLOCKED'; readonly reason: string };
