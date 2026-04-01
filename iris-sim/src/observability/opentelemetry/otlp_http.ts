/**
 * Phase 16E.X2 — Minimal OTLP HTTP JSON push (Node http/https only).
 */

import http from 'node:http';
import https from 'node:https';

/**
 * POST JSON body to an OTLP HTTP endpoint. Swallows network errors (no retry).
 */
export function postOtlpJson(endpointUrl: string, jsonBody: string): Promise<void> {
  return new Promise((resolve) => {
    let url: URL;
    try {
      url = new URL(endpointUrl);
    } catch {
      resolve();
      return;
    }

    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    const port = url.port ? Number(url.port) : isHttps ? 443 : 80;
    const pathWithQuery = `${url.pathname}${url.search}`;

    const req = lib.request(
      {
        hostname: url.hostname,
        port,
        path: pathWithQuery,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(jsonBody, 'utf8'),
        },
      },
      (res) => {
        res.resume();
        res.on('error', () => {});
        res.on('end', () => resolve());
      },
    );

    req.on('error', () => resolve());
    req.write(jsonBody, 'utf8');
    req.end();
  });
}
