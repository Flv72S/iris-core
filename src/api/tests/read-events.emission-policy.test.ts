/**
 * Read Events — Event Emission Policy (write-side)
 * Formalizza quando e in quali casi devono essere emessi i Read Events.
 * Solo decisione, nessuna azione: nessun publisher, nessun adapter, nessun side-effect.
 */

import { describe, it, expect } from 'vitest';

/** Policy: per ogni operazione write-side, si deve emettere un Read Event? */
const EMISSION_POLICY = {
  thread: {
    create: { emit: true, eventName: 'ThreadCreated' as const },
    update: { emit: true, eventName: 'ThreadUpdated' as const },
    archive: { emit: true, eventName: 'ThreadArchived' as const },
  },
  message: {
    add: { emit: true, eventName: 'MessageAdded' as const },
    update: { emit: true, eventName: 'MessageUpdated' as const },
    remove: { emit: true, eventName: 'MessageRemoved' as const },
  },
  noEmit: {
    readOnly: { emit: false },
    noMutation: { emit: false },
  },
} as const;

describe('Read Events — Emission Policy', () => {
  describe('Thread', () => {
    it('emits a ThreadCreated read event after thread creation', () => {
      const rule = EMISSION_POLICY.thread.create;
      expect(rule.emit).toBe(true);
      expect(rule.eventName).toBe('ThreadCreated');
    });

    it('emits a ThreadUpdated read event after thread update', () => {
      const rule = EMISSION_POLICY.thread.update;
      expect(rule.emit).toBe(true);
      expect(rule.eventName).toBe('ThreadUpdated');
    });

    it('emits a ThreadArchived read event after thread archive', () => {
      const rule = EMISSION_POLICY.thread.archive;
      expect(rule.emit).toBe(true);
      expect(rule.eventName).toBe('ThreadArchived');
    });
  });

  describe('Message', () => {
    it('emits a MessageAdded read event after message added to thread', () => {
      const rule = EMISSION_POLICY.message.add;
      expect(rule.emit).toBe(true);
      expect(rule.eventName).toBe('MessageAdded');
    });

    it('emits a MessageUpdated read event after message update', () => {
      const rule = EMISSION_POLICY.message.update;
      expect(rule.emit).toBe(true);
      expect(rule.eventName).toBe('MessageUpdated');
    });

    it('emits a MessageRemoved read event after message removal', () => {
      const rule = EMISSION_POLICY.message.remove;
      expect(rule.emit).toBe(true);
      expect(rule.eventName).toBe('MessageRemoved');
    });
  });

  describe('Non-emission', () => {
    it('does not emit on read-only operations', () => {
      expect(EMISSION_POLICY.noEmit.readOnly.emit).toBe(false);
    });

    it('does not emit when no mutation occurred', () => {
      expect(EMISSION_POLICY.noEmit.noMutation.emit).toBe(false);
    });
  });
});
