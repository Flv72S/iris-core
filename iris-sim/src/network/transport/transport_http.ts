/**
 * Microstep 15E — Transport Abstraction Layer. HTTP transport (native).
 */

import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { TransportError, TransportErrorCode } from './transport_errors.js';
import type { Transport } from './transport_interface.js';
import type { HttpTransportConfig, TransportMessage } from './transport_types.js';

function isTransportMessage(value: unknown): value is TransportMessage {
  if (value == null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  const meta = v.metadata as Record<string, unknown> | undefined;
  return (
    'raw' in v &&
    meta != null &&
    typeof meta.sender_node_id === 'string' &&
    (meta.recipient_node_id == null || typeof meta.recipient_node_id === 'string') &&
    typeof meta.timestamp === 'number'
  );
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks).toString('utf8');
  if (body.trim().length === 0) return null;
  return JSON.parse(body) as unknown;
}

export class HttpTransport implements Transport {
  private handler: ((message: TransportMessage) => void) | null = null;
  private server: http.Server | null = null;

  constructor(private readonly config: HttpTransportConfig) {}

  onReceive(handler: (message: TransportMessage) => void): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    if (this.server) return;
    this.server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
      try {
        if (req.method !== 'POST' || req.url !== '/iris/message') {
          res.statusCode = 404;
          res.end();
          return;
        }

        const raw = await readJson(req);
        if (!isTransportMessage(raw)) {
          res.statusCode = 400;
          res.end('INVALID_MESSAGE');
          return;
        }

        if (this.handler) this.handler(raw);
        res.statusCode = 200;
        res.end('OK');
      } catch {
        res.statusCode = 500;
        res.end('RECEIVE_FAILED');
      }
    });

    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', (err) => reject(err));
      this.server!.listen(this.config.port, this.config.host, () => resolve());
    });
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    const s = this.server;
    this.server = null;
    await new Promise<void>((resolve, reject) => {
      s.close((err) => (err ? reject(err) : resolve()));
    });
  }

  async send(message: TransportMessage): Promise<void> {
    const host = this.config.host ?? '127.0.0.1';
    const port = this.config.port;

    const payload = JSON.stringify(message);
    await new Promise<void>((resolve, reject) => {
      const req = http.request(
        {
          host,
          port,
          path: '/iris/message',
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          const code = res.statusCode ?? 0;
          if (code >= 200 && code < 300) {
            res.resume();
            resolve();
            return;
          }
          res.resume();
          reject(new TransportError(TransportErrorCode.SEND_FAILED, `HTTP send failed (${code})`));
        },
      );
      req.on('error', () => reject(new TransportError(TransportErrorCode.SEND_FAILED, 'HTTP send failed')));
      req.write(payload);
      req.end();
    });
  }
}

