/**
 * HTTP Server
 * 
 * Setup minimale per HTTP Transport Layer.
 * 
 * Responsabilità ESCLUSIVE:
 * - Setup Fastify
 * - Middleware base (JSON parsing, requestId, logging minimale)
 * - Registrazione route
 * 
 * Vincoli:
 * - Nessuna logica applicativa
 * - Nessuna semantica
 * - Nessun accesso diretto al Core
 * 
 * Middleware ammessi:
 * - JSON parsing
 * - requestId
 * - logging minimale
 * 
 * Middleware vietati:
 * - auth
 * - rate limiting
 * - caching
 * - websocket / SSE
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.6_HTTP_Adapter_Map.md
 */

import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import { createRequire } from 'module';
import type { MessagingBoundary } from '../boundary/MessagingBoundary';

/**
 * Genera requestId univoco (deprecato, usare correlation ID)
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Crea e configura server HTTP
 * 
 * @param boundary MessagingBoundary instance
 * @returns FastifyInstance configurato
 */
export function createHttpServer(boundary: MessagingBoundary): FastifyInstance {
  const require = createRequire(import.meta.url);

  const { initializeLogger, getLogger } = require('../../observability/logger') as typeof import('../../observability/logger');
  const { addCorrelationIdMiddleware, getCorrelationId } = require('./middleware/correlation') as typeof import('./middleware/correlation');
  const { handleHttpError } = require('../../observability/errorHandler') as typeof import('../../observability/errorHandler');
  const { addPreviewGuard } = require('./middleware/previewGuard') as typeof import('./middleware/previewGuard');
  const { loadFeatureFlagsFromEnv, getFeatureFlagAudit } =
    require('../../runtime/featureFlags/loadFeatureFlags') as typeof import('../../runtime/featureFlags/loadFeatureFlags');
  const { addFeatureGuard } = require('./middleware/featureGuard') as typeof import('./middleware/featureGuard');

  const { registerMessageRoutes } = require('./routes/messages') as typeof import('./routes/messages');
  const { registerThreadRoutes } = require('./routes/threads') as typeof import('./routes/threads');
  const { registerThreadCreateRoutes } = require('./routes/threads.post') as typeof import('./routes/threads.post');
  const { registerThreadListRoutes } = require('./routes/threads.get') as typeof import('./routes/threads.get');
  const { registerThreadGetByIdRoutes } = require('./routes/threads.getById') as typeof import('./routes/threads.getById');
  const { registerThreadMessageCreateRoutes } = require('./routes/threads.messages.post') as typeof import('./routes/threads.messages.post');
  const { registerMessagesGetByThreadRoutes } = require('./routes/messages.getByThread') as typeof import('./routes/messages.getByThread');
  const { registerMessagesGetByIdRoutes } = require('./routes/messages.getById') as typeof import('./routes/messages.getById');
  const { registerSyncRoutes } = require('./routes/sync') as typeof import('./routes/sync');
  const { registerHealthRoutes } = require('./routes/health') as typeof import('./routes/health');

  const { createMessageRepository } = require('./wiring/createMessageRepository') as typeof import('./wiring/createMessageRepository');

  // Inizializza logger strutturato
  initializeLogger('info');
  const logger = getLogger();

  const server = Fastify({
    logger: false, // Disabilita Fastify logger, usiamo structured logger
  });

  // Middleware: JSON parsing (built-in Fastify)
  // Fastify gestisce automaticamente JSON parsing per Content-Type: application/json

  // Middleware: Correlation ID
  addCorrelationIdMiddleware(server);

  // Middleware: API Version (Microstep 5.1.1) — risoluzione prima del controller
  const { apiVersionMiddleware } = require('./versioning/apiVersionMiddleware') as typeof import('./versioning/apiVersionMiddleware');
  server.addHook('onRequest', apiVersionMiddleware);

  // Middleware: Preview Guard (STEP 6B) - solo se PREVIEW_MODE=true
  addPreviewGuard(server);

  // Middleware: Feature Guard (STEP 6C) - fail-closed per-endpoint
  const featureFlags = loadFeatureFlagsFromEnv();
  logger.info('http', 'bootstrap-feature-flags', 'Feature flags loaded', {
    audit: getFeatureFlagAudit(featureFlags),
  });
  addFeatureGuard(server, featureFlags);

  // Middleware: Structured logging (onRequest)
  server.addHook('onRequest', async (request: any, reply: any) => {
    const correlationId = getCorrelationId(request);
    logger.info('http', correlationId, 'Request started', {
      method: request.method,
      url: request.url,
    });
  });

  // Middleware: Structured logging (onResponse)
  server.addHook('onResponse', async (request: any, reply: any) => {
    const correlationId = getCorrelationId(request);
    logger.info('http', correlationId, 'Request completed', {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.getResponseTime(),
    });
  });

  // Error handler centralizzato
  server.setErrorHandler(async (error: unknown, request: FastifyRequest, reply: FastifyReply) => {
    const correlationId = getCorrelationId(request);
    const { statusCode, response } = handleHttpError(
      error,
      correlationId,
      'http',
      'http',
      {
        method: request.method,
        url: request.url,
      }
    );
    return reply.code(statusCode).send(response);
  });

  // Registrazione route
  registerMessageRoutes(server, boundary);
  registerThreadRoutes(server, boundary);
  // Core Threads wiring: repository fornito dal composition root (nessuna decisione nel layer HTTP).
  // Lazy-load del provider per evitare costi di import nei test di enforcement che importano solo il server.
  const { getThreadRepository } = require('../../runtime/threads/threadRepositoryProvider') as {
    getThreadRepository: () => unknown;
  };
  const threadsRepository = getThreadRepository();
  const maybeClose = (threadsRepository as unknown as { close?: () => Promise<void> }).close;
  if (typeof maybeClose === 'function') {
    server.addHook('onClose', async () => {
      await maybeClose();
    });
  }
  // Read path (Projection Layer) for GET /threads
  const { InMemoryThreadQueryRepository } = require('../../persistence/queries/InMemoryThreadQueryRepository') as {
    InMemoryThreadQueryRepository: new (repo: unknown, msgRepo?: unknown) => unknown;
  };
  const { ThreadReadProjectionImpl } = require('../../core/projections/impl/ThreadReadProjectionImpl') as {
    ThreadReadProjectionImpl: new (queryRepo: unknown) => unknown;
  };
  const threadQuery = new InMemoryThreadQueryRepository(threadsRepository as any);
  const threadProjectionRaw = new ThreadReadProjectionImpl(threadQuery);
  const cacheModule = require('../../core/projections/cache') as {
    InMemoryCache: new () => { get: (k: string) => unknown; set: (k: string, v: unknown) => void; invalidateByKey: (k: string) => void };
    CachedThreadReadProjection: new (inner: unknown, cache: unknown) => unknown;
    CachedMessageReadProjection: new (inner: unknown, cache: unknown) => unknown;
  };
  const threadCache = new cacheModule.InMemoryCache();
  const threadProjection = new cacheModule.CachedThreadReadProjection(threadProjectionRaw, threadCache);
  const { InvalidatingThreadRepository } = require('./wiring/InvalidatingThreadRepository') as {
    InvalidatingThreadRepository: new (inner: unknown, threadCache: unknown) => unknown;
  };
  const threadsRepositoryForCreate = new InvalidatingThreadRepository(threadsRepository, threadCache);
  registerThreadCreateRoutes(server, { repo: threadsRepositoryForCreate as any });
  registerThreadListRoutes(server, { projection: threadProjection as any });
  registerThreadGetByIdRoutes(server, { repo: threadsRepository as any });
  // Core Messages (Fase 2.4): repository scelto via wiring centralizzato (una sola istanza condivisa)
  const messagesRepository = createMessageRepository({ threadRepository: threadsRepository as any });
  const maybeCloseMessages = (messagesRepository as unknown as { close?: () => Promise<void> }).close;
  if (typeof maybeCloseMessages === 'function') {
    server.addHook('onClose', async () => {
      await maybeCloseMessages();
    });
  }
  // Read path (Projection Layer) for GET messages
  const { InMemoryMessageQueryRepository } = require('../../persistence/queries/InMemoryMessageQueryRepository') as {
    InMemoryMessageQueryRepository: new (repo: unknown, threadRepo?: unknown) => unknown;
  };
  const { MessageReadProjectionImpl } = require('../../core/projections/impl/MessageReadProjectionImpl') as {
    MessageReadProjectionImpl: new (queryRepo: unknown) => unknown;
  };
  const messageQuery = new InMemoryMessageQueryRepository(messagesRepository as any, threadsRepository as any);
  const messageProjectionRaw = new MessageReadProjectionImpl(messageQuery);
  const messageCache = new cacheModule.InMemoryCache();
  const messageProjection = new cacheModule.CachedMessageReadProjection(messageProjectionRaw, messageCache);
  const { InvalidatingMessageRepository } = require('./wiring/InvalidatingMessageRepository') as {
    InvalidatingMessageRepository: new (inner: unknown, messageCache: unknown, threadCache: unknown) => unknown;
  };
  const messagesRepositoryForCreate = new InvalidatingMessageRepository(messagesRepository, messageCache, threadCache);
  registerThreadMessageCreateRoutes(server, { repo: messagesRepositoryForCreate as any });
  registerMessagesGetByThreadRoutes(server, { projection: messageProjection as any });
  registerMessagesGetByIdRoutes(server, { projection: messageProjection as any });
  registerSyncRoutes(server, boundary);
  registerHealthRoutes(server, boundary);

  return server;
}

/**
 * Avvia server HTTP
 * 
 * @param server FastifyInstance
 * @param port Porta di ascolto (default: 3000)
 */
export async function startHttpServer(
  server: FastifyInstance,
  port: number = 3000
): Promise<void> {
  const require = createRequire(import.meta.url);
  const { getLogger } = require('../../observability/logger') as typeof import('../../observability/logger');
  const logger = getLogger();
  const correlationId = 'bootstrap-startup';
  
  try {
    await server.listen({ port, host: '0.0.0.0' });
    logger.info('http', correlationId, 'HTTP server started', { port });
  } catch (err) {
    logger.error('http', correlationId, 'Failed to start HTTP server', { port, error: err });
    throw err;
  }
}

/**
 * Ferma server HTTP
 * 
 * @param server FastifyInstance
 */
export async function stopHttpServer(server: FastifyInstance): Promise<void> {
  const require = createRequire(import.meta.url);
  const { getLogger } = require('../../observability/logger') as typeof import('../../observability/logger');
  const logger = getLogger();
  const correlationId = 'bootstrap-shutdown';
  
  try {
    await server.close();
    logger.info('http', correlationId, 'HTTP server stopped');
  } catch (err) {
    logger.error('http', correlationId, 'Failed to stop HTTP server', { error: err });
    throw err;
  }
}
