import { after } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';

import {
  assertNoActiveWebSocketHandles,
  assertNoOpenHandles,
  cleanupOpenHandles,
  describeHandle,
  getOpenHandles,
} from '../utils/open_handle_tracker.js';

after(async () => {
  await cleanupOpenHandles();
  await sleep(10);
  assertNoActiveWebSocketHandles();
  assertNoOpenHandles();
  const remaining = getOpenHandles();
  if (remaining.length > 0) {
    console.error('[IRIS TEST] Open handles detected:', remaining.map(describeHandle));
    throw new Error(`Open handles: ${remaining.length}`);
  }
});
