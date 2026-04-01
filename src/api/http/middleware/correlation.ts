/**
 * Correlation ID Middleware
 * 
 * Middleware per gestione correlation ID in HTTP.
 * 
 * Responsabilità ESCLUSIVE:
 * - Estrarre/generare correlation ID da header HTTP
 * - Aggiungere correlation ID a request context
 * - Propagare correlation ID in response header
 * - Nessuna logica applicativa
 * 
 * Vincoli:
 * - Correlation ID non persistente
 * - Correlation ID non semantico
 * - Solo tracciamento
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.9A_Observability_Map.md
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { extractCorrelationId, generateCorrelationId } from '../../../observability/correlation';

/**
 * Aggiunge correlation ID middleware a server Fastify
 */
export function addCorrelationIdMiddleware(server: FastifyInstance): void {
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Estrae correlation ID da header o genera nuovo
    const correlationId = extractCorrelationId(request.headers as Record<string, string | undefined>);
    
    // Aggiunge a request (per accesso in route)
    (request as any).correlationId = correlationId;
    
    // Aggiunge a response header
    reply.header('x-correlation-id', correlationId);
  });
}

/**
 * Ottiene correlation ID da request
 */
export function getCorrelationId(request: FastifyRequest): string {
  return (request as any).correlationId || generateCorrelationId();
}
