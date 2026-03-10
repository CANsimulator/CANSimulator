// ============================================================
// CAN Handler Registry — Unit Tests (Vitest)
// Covers: register, unregister, routing by message ID,
//         getHandlers, concurrent handler execution
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { canHandlerRegistry } from '../src/services/can/can-handler';
import type { CANHandler } from '../src/services/can/can-handler';
import type { CANMessage } from '../src/services/can/can-simulator';

function makeMessage(id: number): CANMessage {
  return {
    type: 'STANDARD',
    id,
    dlc: 8,
    data: new Uint8Array(8),
    timestamp: Date.now(),
  };
}

function makeHandler(overrides: Partial<CANHandler> = {}): CANHandler {
  return {
    id: overrides.id ?? `handler-${Math.random().toString(36).slice(2, 8)}`,
    name: overrides.name ?? 'Test Handler',
    interestedMessageIds: overrides.interestedMessageIds ?? [0x100],
    onReceive: overrides.onReceive ?? (async () => {}),
  };
}

// Clean up between tests — unregister all known handlers
beforeEach(() => {
  for (const h of canHandlerRegistry.getHandlers()) {
    canHandlerRegistry.unregister(h.id);
  }
});

// ----------------------------------------------------------------
// Register & Unregister
// ----------------------------------------------------------------
describe('CANHandlerRegistry — register & unregister', () => {
  it('should register a handler and list it via getHandlers', () => {
    const handler = makeHandler({ id: 'ecu-1' });
    canHandlerRegistry.register(handler);

    const handlers = canHandlerRegistry.getHandlers();
    expect(handlers).toHaveLength(1);
    expect(handlers[0].id).toBe('ecu-1');
  });

  it('should unregister a handler by ID', () => {
    const handler = makeHandler({ id: 'ecu-2' });
    canHandlerRegistry.register(handler);
    canHandlerRegistry.unregister('ecu-2');

    expect(canHandlerRegistry.getHandlers()).toHaveLength(0);
  });

  it('should silently ignore unregistering a non-existent handler', () => {
    expect(() => canHandlerRegistry.unregister('does-not-exist')).not.toThrow();
  });

  it('should replace a handler if registered with the same ID', () => {
    const first = makeHandler({ id: 'ecu-3', name: 'First' });
    const second = makeHandler({ id: 'ecu-3', name: 'Second' });

    canHandlerRegistry.register(first);
    canHandlerRegistry.register(second);

    const handlers = canHandlerRegistry.getHandlers();
    expect(handlers).toHaveLength(1);
    expect(handlers[0].name).toBe('Second');
  });

  it('should support multiple handlers with different IDs', () => {
    canHandlerRegistry.register(makeHandler({ id: 'a' }));
    canHandlerRegistry.register(makeHandler({ id: 'b' }));
    canHandlerRegistry.register(makeHandler({ id: 'c' }));

    expect(canHandlerRegistry.getHandlers()).toHaveLength(3);
  });
});

// ----------------------------------------------------------------
// Routing
// ----------------------------------------------------------------
describe('CANHandlerRegistry — route messages by ID', () => {
  it('should deliver a message to handlers interested in that message ID', async () => {
    const received: number[] = [];
    canHandlerRegistry.register(makeHandler({
      id: 'listener',
      interestedMessageIds: [0x100],
      onReceive: async (msg) => { received.push(msg.id); },
    }));

    await canHandlerRegistry.route(makeMessage(0x100));
    expect(received).toEqual([0x100]);
  });

  it('should NOT deliver a message to handlers not interested in that ID', async () => {
    const received: number[] = [];
    canHandlerRegistry.register(makeHandler({
      id: 'listener',
      interestedMessageIds: [0x200],
      onReceive: async (msg) => { received.push(msg.id); },
    }));

    await canHandlerRegistry.route(makeMessage(0x100));
    expect(received).toHaveLength(0);
  });

  it('should deliver to multiple handlers interested in the same message ID', async () => {
    const resultsA: number[] = [];
    const resultsB: number[] = [];

    canHandlerRegistry.register(makeHandler({
      id: 'a',
      interestedMessageIds: [0x100],
      onReceive: async (msg) => { resultsA.push(msg.id); },
    }));
    canHandlerRegistry.register(makeHandler({
      id: 'b',
      interestedMessageIds: [0x100, 0x200],
      onReceive: async (msg) => { resultsB.push(msg.id); },
    }));

    await canHandlerRegistry.route(makeMessage(0x100));
    expect(resultsA).toEqual([0x100]);
    expect(resultsB).toEqual([0x100]);
  });

  it('should handle a handler that is interested in multiple message IDs', async () => {
    const received: number[] = [];
    canHandlerRegistry.register(makeHandler({
      id: 'multi',
      interestedMessageIds: [0x100, 0x200, 0x300],
      onReceive: async (msg) => { received.push(msg.id); },
    }));

    await canHandlerRegistry.route(makeMessage(0x100));
    await canHandlerRegistry.route(makeMessage(0x200));
    await canHandlerRegistry.route(makeMessage(0x300));
    await canHandlerRegistry.route(makeMessage(0x400)); // not interested

    expect(received).toEqual([0x100, 0x200, 0x300]);
  });

  it('should not throw if a handler rejects (Promise.allSettled)', async () => {
    canHandlerRegistry.register(makeHandler({
      id: 'faulty',
      interestedMessageIds: [0x100],
      onReceive: async () => { throw new Error('Handler exploded'); },
    }));

    // A second well-behaved handler
    const received: number[] = [];
    canHandlerRegistry.register(makeHandler({
      id: 'healthy',
      interestedMessageIds: [0x100],
      onReceive: async (msg) => { received.push(msg.id); },
    }));

    await expect(canHandlerRegistry.route(makeMessage(0x100))).resolves.not.toThrow();
    expect(received).toEqual([0x100]);
  });

  it('should do nothing when no handlers are registered', async () => {
    await expect(canHandlerRegistry.route(makeMessage(0x100))).resolves.not.toThrow();
  });
});

// ----------------------------------------------------------------
// getHandlers
// ----------------------------------------------------------------
describe('CANHandlerRegistry — getHandlers', () => {
  it('should return an empty array when no handlers are registered', () => {
    expect(canHandlerRegistry.getHandlers()).toEqual([]);
  });

  it('should return handlers in insertion order', () => {
    canHandlerRegistry.register(makeHandler({ id: 'first', name: 'First' }));
    canHandlerRegistry.register(makeHandler({ id: 'second', name: 'Second' }));

    const names = canHandlerRegistry.getHandlers().map(h => h.name);
    expect(names).toEqual(['First', 'Second']);
  });
});
