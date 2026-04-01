/**
 * Phase 16E.X1 / 16E.X1.FIX — Minimal HTTP /metrics server (Node `http` only).
 */

import http from 'node:http';

const DEFAULT_PORT = 9464;

export type MetricsServerHandle = {
  readonly port: number;
  close(): Promise<void>;
};

function send500(res: http.ServerResponse, message: string): void {
  const body = message.endsWith('\n') ? message : `${message}\n`;
  res.writeHead(500, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body, 'utf8'),
  });
  res.end(body, 'utf8');
}

/**
 * Listen for GET /metrics and return Prometheus text from `getMetrics`.
 * Errors from `getMetrics` yield HTTP 500. Response is always completed.
 * @param port - defaults to 9464
 */
export function startMetricsServer(getMetrics: () => string, port: number = DEFAULT_PORT): MetricsServerHandle {
  const server = http.createServer((req, res) => {
    const url = req.url ?? '/';
    if (req.method === 'GET' && (url === '/metrics' || url.startsWith('/metrics?'))) {
      let body: string;
      try {
        body = getMetrics();
        if (typeof body !== 'string') {
          send500(res, 'metrics exporter returned non-string');
          return;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        send500(res, `metrics export failed: ${msg}`);
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Content-Length': Buffer.byteLength(body, 'utf8'),
      });
      res.end(body, 'utf8');
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found\n', 'utf8');
  });

  server.listen(port);

  return {
    port,
    close(): Promise<void> {
      return new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
