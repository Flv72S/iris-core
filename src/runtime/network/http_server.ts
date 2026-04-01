import Fastify, { type FastifyInstance } from 'fastify';

import type { ClusterState } from '../../distributed/cluster_lifecycle_engine';
import {
  decodeAndValidateRuntimeDecision,
  decodeAndValidateStateSync,
  MessageCodecError,
} from './message_codec';
import type { RuntimeDecision } from '../execution/decision_types';
import type { AuditProof } from '../ops/audit_proof';
import {
  recordCorruptedMessageHandled,
  recordInvalidDecisionRejected,
  recordStateSyncRejected,
  snapshotByzantineMetrics,
} from '../ops/byzantine_metrics';

export interface RuntimeHttpServerHandlers {
  onDecision: (decision: RuntimeDecision) => Promise<void>;
  onStateSync: (state: ClusterState) => Promise<void>;
  getHealth: () => Readonly<Record<string, unknown>>;
  getStateSnapshot: () => Readonly<Record<string, unknown>>;
  getCanonicalOrder: () => Readonly<{ orderedEvents: readonly unknown[]; hash: string }>;
  verifyReplay: (eventLog: readonly unknown[]) => Readonly<{ match: boolean; stateHash: string; proof: AuditProof }>;
  getAuditProof: () => Readonly<AuditProof>;
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export class RuntimeHttpServer {
  private readonly app: FastifyInstance;

  constructor(
    private readonly port: number,
    private readonly handlers: RuntimeHttpServerHandlers,
  ) {
    this.app = Fastify({ logger: false });
    this.registerRoutes();
  }

  private registerRoutes(): void {
    const byzantineSnapshot = (): Readonly<ReturnType<typeof snapshotByzantineMetrics>> => snapshotByzantineMetrics();

    this.app.get('/health', async () => ({
      ok: true,
      ...this.handlers.getHealth(),
      byzantine: byzantineSnapshot(),
    }));
    this.app.get('/state_snapshot', async () => ({
      ...this.handlers.getStateSnapshot(),
      byzantine: byzantineSnapshot(),
    }));
    this.app.get('/cluster/canonical-order', async () => this.handlers.getCanonicalOrder());
    this.app.get('/cluster/audit/proof', async () => this.handlers.getAuditProof());
    this.app.post('/cluster/replay/verify', async (request, reply) => {
      try {
        const body = request.body as { eventLog?: readonly unknown[] };
        const eventLog = Array.isArray(body?.eventLog) ? body.eventLog : [];
        reply.status(200).send(this.handlers.verifyReplay(eventLog));
      } catch (error) {
        reply.status(400).send({ error: (error as Error).message });
      }
    });

    this.app.post('/decision', async (request, reply) => {
      try {
        const decision = decodeAndValidateRuntimeDecision(request.body);
        await this.handlers.onDecision(deepClone(decision));
        reply.status(202).send({ accepted: true });
      } catch (error) {
        if (error instanceof MessageCodecError && error.kind === 'corrupt') {
          recordCorruptedMessageHandled();
          // eslint-disable-next-line no-console
          console.error('[iris-http] decision corrupt:', error.message);
        } else {
          recordInvalidDecisionRejected();
          // eslint-disable-next-line no-console
          console.error('[iris-http] decision invalid:', (error as Error).message);
        }
        reply.status(400).send({ error: (error as Error).message });
      }
    });

    this.app.post('/state_sync', async (request, reply) => {
      try {
        const state = decodeAndValidateStateSync(request.body);
        await this.handlers.onStateSync(deepClone(state));
        reply.status(202).send({ accepted: true });
      } catch (error) {
        if (error instanceof MessageCodecError && error.kind === 'corrupt') {
          recordCorruptedMessageHandled();
          // eslint-disable-next-line no-console
          console.error('[iris-http] state_sync corrupt:', error.message);
        } else {
          recordStateSyncRejected();
          // eslint-disable-next-line no-console
          console.error('[iris-http] state_sync invalid:', (error as Error).message);
        }
        reply.status(400).send({ error: (error as Error).message });
      }
    });
  }

  async start(): Promise<void> {
    await this.app.listen({ port: this.port, host: '0.0.0.0' });
  }

  async stop(): Promise<void> {
    await this.app.close();
  }
}
