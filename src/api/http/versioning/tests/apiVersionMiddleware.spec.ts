/**
 * apiVersionMiddleware — unit test
 * Verifica che la versione venga risolta e attaccata al request
 */

import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { apiVersionMiddleware } from '../apiVersionMiddleware';

describe('apiVersionMiddleware', () => {
  it('attacca apiVersion al request', async () => {
    const app = Fastify();
    app.addHook('onRequest', apiVersionMiddleware);
    app.get('/api/v2/test', async (request) => {
      expect((request as any).apiVersion).toBeDefined();
      expect((request as any).apiVersion.id).toBe('v2');
      return { ok: true };
    });

    const res = await app.inject({ method: 'GET', url: '/api/v2/test' });
    expect(res.statusCode).toBe(200);
  });

  it('default v1 quando nessuna versione specificata', async () => {
    const app = Fastify();
    app.addHook('onRequest', apiVersionMiddleware);
    app.get('/threads', async (request) => {
      expect((request as any).apiVersion.id).toBe('v1');
      return { ok: true };
    });

    const res = await app.inject({ method: 'GET', url: '/threads' });
    expect(res.statusCode).toBe(200);
  });
});
