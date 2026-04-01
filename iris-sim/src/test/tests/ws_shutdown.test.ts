/**
 * Microstep 16D — Deterministic WebSocket shutdown (server/client/tracker).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { setTimeout as sleep } from 'node:timers/promises';
import WebSocket from 'ws';

import { connectWsPeer } from '../../network/transport_ws/transport_ws_client.js';
import { startWsServer } from '../../network/transport_ws/transport_ws_server.js';
import type { WsWireMessage } from '../../network/transport_ws/transport_ws_types.js';

import '../setup/open_handle_patch.js';
import { cleanupOpenHandles, getOpenHandles } from '../utils/open_handle_tracker.js';

function noopWire(_w: WsWireMessage): void {}

describe('WebSocket deterministic shutdown (16D)', () => {
  it('server shutdown clears all clients', async () => {
    const port = 36000 + Math.floor(Math.random() * 1500);
    const handle = await startWsServer({
      config: { node_id: 'S', port, host: '127.0.0.1' },
      onConnection: () => {},
      onDisconnect: () => {},
      onWireMessage: () => {},
    });

    const c1 = new WebSocket(`ws://127.0.0.1:${port}`);
    const c2 = new WebSocket(`ws://127.0.0.1:${port}`);
    await new Promise<void>((resolve, reject) => {
      let opened = 0;
      const check = (): void => {
        opened += 1;
        if (opened === 2) resolve();
      };
      c1.on('open', check);
      c2.on('open', check);
      c1.on('error', reject);
      c2.on('error', reject);
    });

    assert.strictEqual(handle.server.clients.size, 2);
    await handle.stop();
    await sleep(20);
    assert.strictEqual(handle.server.clients.size, 0);
  });

  it('client shutdown leaves socket undefined', async () => {
    const port = 36000 + Math.floor(Math.random() * 1500);
    const handle = await startWsServer({
      config: { node_id: 'S', port, host: '127.0.0.1' },
      onConnection: () => {},
      onDisconnect: () => {},
      onWireMessage: () => {},
    });

    const client = connectWsPeer({
      local_node_id: 'A',
      peer: { node_id: 'S', url: `ws://127.0.0.1:${port}` },
      onWireMessage: noopWire,
      onOpen: () => {},
      onClose: () => {},
      reconnect: false,
    });

    await new Promise<void>((resolve) => {
      const s = client.socket;
      if (s && s.readyState === WebSocket.OPEN) resolve();
      else client.socket?.once('open', () => resolve());
    });

    await client.shutdown();
    assert.strictEqual(client.socket, undefined);
    await handle.stop();
  });

  it('no tracked open handles after full cleanup', async () => {
    const port = 36000 + Math.floor(Math.random() * 1500);
    const handle = await startWsServer({
      config: { node_id: 'S', port, host: '127.0.0.1' },
      onConnection: () => {},
      onDisconnect: () => {},
      onWireMessage: () => {},
    });

    const client = connectWsPeer({
      local_node_id: 'A',
      peer: { node_id: 'S', url: `ws://127.0.0.1:${port}` },
      onWireMessage: noopWire,
      onOpen: () => {},
      onClose: () => {},
      reconnect: false,
    });

    await new Promise<void>((resolve) => {
      const s = client.socket;
      if (s && s.readyState === WebSocket.OPEN) resolve();
      else client.socket?.once('open', () => resolve());
    });

    await client.shutdown();
    await handle.stop();
    await cleanupOpenHandles();
    await sleep(15);

    const handles = getOpenHandles();
    assert.strictEqual(handles.length, 0);
  });

  it('stress connect/disconnect does not leak (20 cycles)', async () => {
    const port = 36000 + Math.floor(Math.random() * 1500);
    const handle = await startWsServer({
      config: { node_id: 'S', port, host: '127.0.0.1' },
      onConnection: () => {},
      onDisconnect: () => {},
      onWireMessage: () => {},
    });

    for (let i = 0; i < 20; i++) {
      const client = connectWsPeer({
        local_node_id: 'A',
        peer: { node_id: 'S', url: `ws://127.0.0.1:${port}` },
        onWireMessage: noopWire,
        onOpen: () => {},
        onClose: () => {},
        reconnect: false,
      });
      await new Promise<void>((resolve) => {
        const s = client.socket;
        if (s && s.readyState === WebSocket.OPEN) resolve();
        else client.socket?.once('open', () => resolve());
      });
      await client.shutdown();
      assert.strictEqual(client.socket, undefined);
    }

    await handle.stop();
    await cleanupOpenHandles();
    await sleep(15);
    assert.strictEqual(getOpenHandles().length, 0);
  });
});
