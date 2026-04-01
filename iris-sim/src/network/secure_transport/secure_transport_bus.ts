import type { SecureTransportServer } from './secure_server.js';

const endpoints = new Map<string, SecureTransportServer>();

export function registerEndpoint(endpoint: string, server: SecureTransportServer): void {
  endpoints.set(endpoint, server);
}

export function unregisterEndpoint(endpoint: string, server: SecureTransportServer): void {
  const cur = endpoints.get(endpoint);
  if (cur === server) endpoints.delete(endpoint);
}

export function getEndpointServer(endpoint: string): SecureTransportServer | null {
  return endpoints.get(endpoint) ?? null;
}

