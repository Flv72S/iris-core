/**
 * HTTP Server Factory
 * 
 * Factory per creare server HTTP.
 * 
 * Responsabilità ESCLUSIVE:
 * - Ricevere il Boundary
 * - Creare il server HTTP
 * - NON accedere a repository o Core
 * 
 * Vincoli:
 * - Nessuna logica applicativa
 * - Nessuna semantica
 * - Solo creazione server
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.8_Bootstrap_Map.md
 */

import type { MessagingBoundary } from '../../api/boundary/MessagingBoundary';
import { createHttpServer, startHttpServer, stopHttpServer } from '../../api/http/server';
import type { FastifyInstance } from 'fastify';

/**
 * HTTP Server bundle
 * 
 * Contiene il server HTTP e funzioni di controllo.
 */
export interface HttpServerBundle {
  readonly server: FastifyInstance;
  readonly start: (port: number) => Promise<void>;
  readonly stop: () => Promise<void>;
}

/**
 * Crea server HTTP bundle
 * 
 * @param boundary MessagingBoundary instance
 * @returns HttpServerBundle
 */
export function createHttpServerBundle(boundary: MessagingBoundary): HttpServerBundle {
  const server = createHttpServer(boundary);
  
  return {
    server,
    start: async (port: number) => {
      await startHttpServer(server, port);
    },
    stop: async () => {
      await stopHttpServer(server);
    },
  };
}
