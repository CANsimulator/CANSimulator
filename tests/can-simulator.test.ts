// ============================================================
// CAN Simulator Service — Unit Tests (Vitest)
// Covers: broadcast, error injection, state machine transitions,
//         error log tracking, observer notifications, arbitration,
//         signal extraction, bit stuffing, reset behaviour
// Reference: ISO 11898-1:2015
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { canSimulator } from '../src/services/can/can-simulator';
import type { CANObserver, CANMessage, ErrorLogEntry } from '../src/services/can/can-simulator';

// Reset the simulator before each test to ensure isolation
beforeEach(() => {
  canSimulator.resetErrors();
  canSimulator.clearTrace();
  canSimulator.setBusState(true);
});

// ----------------------------------------------------------------
// Broadcast
// ----------------------------------------------------------------
describe('CANSimulator — broadcast', () => {
  it('should deliver a Standard frame to a subscribed observer', async () => {
    const received: CANMessage[] = [];
    const unsub = canSimulator.subscribe({ onMessage: (m) => received.push(m) });

    await canSimulator.broadcast({
      type: 'STANDARD',
      id: 0x100,
      dlc: 8,
      data: new Uint8Array(8),
      timestamp: 0,
    });

    expect(received).toHaveLength(1);
    expect(received[0].id).toBe(0x100);
    unsub();
  });

  it('should deliver an FD frame to a subscribed observer', async () => {
    const received: CANMessage[] = [];
    const unsub = canSimulator.subscribe({ onMessage: (m) => received.push(m) });

    await canSimulator.broadcast({
      type: 'FD',
      id: 0x200,
      dlc: 15,
      data: new Uint8Array(64),
      timestamp: 0,
      brs: true,
      esi: false,
    });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('FD');
    unsub();
  });

  it('should stamp messages with a fresh timestamp on broadcast', async () => {
    const received: CANMessage[] = [];
    const unsub = canSimulator.subscribe({ onMessage: (m) => received.push(m) });

    await canSimulator.broadcast({
      type: 'STANDARD',
      id: 0x100,
      dlc: 1,
      data: new Uint8Array([0xAB]),
      timestamp: 0,
    });

    expect(received[0].timestamp).toBeGreaterThan(0);
    unsub();
  });

  it('should not deliver messages when bus is inactive', async () => {
    const received: CANMessage[] = [];
    const unsub = canSimulator.subscribe({ onMessage: (m) => received.push(m) });

    canSimulator.setBusState(false);
    await canSimulator.broadcast({
      type: 'STANDARD',
      id: 0x100,
      dlc: 1,
      data: new Uint8Array([0x01]),
      timestamp: 0,
    });

    expect(received).toHaveLength(0);
    unsub();
  });

  it('should not deliver messages when controller is BUS_OFF', async () => {
    // Push TEC past 255 to enter BUS_OFF
    for (let i = 0; i < 33; i++) canSimulator.injectError('STUFF');

    const received: CANMessage[] = [];
    const unsub = canSimulator.subscribe({ onMessage: (m) => received.push(m) });

    await canSimulator.broadcast({
      type: 'STANDARD',
      id: 0x100,
      dlc: 1,
      data: new Uint8Array([0x01]),
      timestamp: 0,
    });

    expect(received).toHaveLength(0);
    unsub();
  });

  it('should store messages in the trace log', async () => {
    await canSimulator.broadcast({
      type: 'STANDARD',
      id: 0x300,
      dlc: 2,
      data: new Uint8Array([0x01, 0x02]),
      timestamp: 0,
    });

    const trace = canSimulator.getTrace();
    expect(trace.length).toBeGreaterThanOrEqual(1);
    expect(trace[trace.length - 1].id).toBe(0x300);
  });

  it('should notify multiple observers independently', async () => {
    const a: CANMessage[] = [];
    const b: CANMessage[] = [];
    const unsubA = canSimulator.subscribe({ onMessage: (m) => a.push(m) });
    const unsubB = canSimulator.subscribe({ onMessage: (m) => b.push(m) });

    await canSimulator.broadcast({
      type: 'STANDARD',
      id: 0x400,
      dlc: 1,
      data: new Uint8Array([0xFF]),
      timestamp: 0,
    });

    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    unsubA();
    unsubB();
  });
});

// ----------------------------------------------------------------
// Subscribe / Unsubscribe
// ----------------------------------------------------------------
describe('CANSimulator — subscribe & unsubscribe', () => {
  it('should stop receiving messages after unsubscribing', async () => {
    const received: CANMessage[] = [];
    const unsub = canSimulator.subscribe({ onMessage: (m) => received.push(m) });

    unsub();

    await canSimulator.broadcast({
      type: 'STANDARD',
      id: 0x100,
      dlc: 1,
      data: new Uint8Array([0x01]),
      timestamp: 0,
    });

    expect(received).toHaveLength(0);
  });

  it('should send current error state immediately on subscribe', () => {
    const states: { tec: number; rec: number }[] = [];
    const unsub = canSimulator.subscribe({
      onMessage: () => {},
      onStateChange: (s) => states.push({ tec: s.tec, rec: s.rec }),
    });

    // Should have received the initial state
    expect(states.length).toBeGreaterThanOrEqual(1);
    expect(states[0].tec).toBe(0);
    expect(states[0].rec).toBe(0);
    unsub();
  });
});

// ----------------------------------------------------------------
// Error Injection & State Machine
// ----------------------------------------------------------------
describe('CANSimulator — error injection & state transitions', () => {
  it('should increment TEC by 8 per injected error', () => {
    canSimulator.injectError('CRC');
    expect(canSimulator.getErrorState().tec).toBe(8);

    canSimulator.injectError('CRC');
    expect(canSimulator.getErrorState().tec).toBe(16);
  });

  it('should start in ERROR_ACTIVE state', () => {
    expect(canSimulator.getErrorState().state).toBe('ERROR_ACTIVE');
  });

  it('should transition to ERROR_PASSIVE when TEC reaches 128', () => {
    // 16 errors * 8 = 128
    for (let i = 0; i < 16; i++) canSimulator.injectError('FORM');
    expect(canSimulator.getErrorState().state).toBe('ERROR_PASSIVE');
    expect(canSimulator.getErrorState().tec).toBe(128);
  });

  it('should transition to BUS_OFF when TEC exceeds 255', () => {
    // 32 errors * 8 = 256 > 255
    for (let i = 0; i < 32; i++) canSimulator.injectError('ACK');
    expect(canSimulator.getErrorState().state).toBe('BUS_OFF');
  });

  it('should not inject further errors once BUS_OFF', () => {
    for (let i = 0; i < 33; i++) canSimulator.injectError('BIT1');
    const tecAtBusOff = canSimulator.getErrorState().tec;

    // Try injecting more — should be ignored
    canSimulator.injectError('BIT0');
    expect(canSimulator.getErrorState().tec).toBe(tecAtBusOff);
  });

  it('should notify observers on error injection', () => {
    const errors: { type: string }[] = [];
    const unsub = canSimulator.subscribe({
      onMessage: () => {},
      onError: (e) => errors.push({ type: e.type }),
    });

    canSimulator.injectError('STUFF');
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('STUFF');
    unsub();
  });

  it('should notify observers of state changes', () => {
    const states: string[] = [];
    const unsub = canSimulator.subscribe({
      onMessage: () => {},
      onStateChange: (s) => states.push(s.state),
    });

    // Initial state notification on subscribe
    expect(states[states.length - 1]).toBe('ERROR_ACTIVE');

    // Push to ERROR_PASSIVE (16 * 8 = 128)
    for (let i = 0; i < 16; i++) canSimulator.injectError('CRC');
    expect(states[states.length - 1]).toBe('ERROR_PASSIVE');
    unsub();
  });
});

// ----------------------------------------------------------------
// Receive Error Counter (REC) — ISO 11898-1 section 12.1.4
// ----------------------------------------------------------------
describe('CANSimulator — Receive Error Counter (REC)', () => {
  it('should increment REC by 1 for a normal receiver error (CRC, STUFF, FORM, ACK)', () => {
    canSimulator.injectError('CRC', 'receiver');
    expect(canSimulator.getErrorState().rec).toBe(1);
    expect(canSimulator.getErrorState().tec).toBe(0); // TEC untouched
  });

  it('should increment REC by 8 for BIT0 receiver error (dominant bit after error flag)', () => {
    canSimulator.injectError('BIT0', 'receiver');
    expect(canSimulator.getErrorState().rec).toBe(8);
  });

  it('should increment REC by 8 for BIT1 receiver error', () => {
    canSimulator.injectError('BIT1', 'receiver');
    expect(canSimulator.getErrorState().rec).toBe(8);
  });

  it('should transition to ERROR_PASSIVE when REC reaches 128', () => {
    // 128 normal receive errors (CRC +1 each)
    for (let i = 0; i < 128; i++) canSimulator.injectError('CRC', 'receiver');
    expect(canSimulator.getErrorState().rec).toBe(128);
    expect(canSimulator.getErrorState().state).toBe('ERROR_PASSIVE');
  });

  it('should transition to ERROR_PASSIVE via REC with BIT0 heavy errors (16 * 8 = 128)', () => {
    for (let i = 0; i < 16; i++) canSimulator.injectError('BIT0', 'receiver');
    expect(canSimulator.getErrorState().rec).toBe(128);
    expect(canSimulator.getErrorState().state).toBe('ERROR_PASSIVE');
  });

  it('should NOT transition to BUS_OFF from REC alone (only TEC > 255 causes BUS_OFF)', () => {
    // 300 receiver errors — REC = 300, but BUS_OFF requires TEC > 255
    for (let i = 0; i < 300; i++) canSimulator.injectError('STUFF', 'receiver');
    expect(canSimulator.getErrorState().rec).toBe(300);
    expect(canSimulator.getErrorState().state).toBe('ERROR_PASSIVE'); // NOT BUS_OFF
  });

  it('should decrement REC by 1 on each successful broadcast', async () => {
    // Build up some REC
    for (let i = 0; i < 5; i++) canSimulator.injectError('CRC', 'receiver');
    expect(canSimulator.getErrorState().rec).toBe(5);

    await canSimulator.broadcast({
      type: 'STANDARD',
      id: 0x100,
      dlc: 1,
      data: new Uint8Array([0x01]),
      timestamp: 0,
    });

    expect(canSimulator.getErrorState().rec).toBe(4);
  });

  it('should not decrement REC below 0', async () => {
    // REC starts at 0
    await canSimulator.broadcast({
      type: 'STANDARD',
      id: 0x100,
      dlc: 1,
      data: new Uint8Array([0x01]),
      timestamp: 0,
    });

    expect(canSimulator.getErrorState().rec).toBe(0);
  });

  it('should recover from ERROR_PASSIVE to ERROR_ACTIVE as REC decays via successful broadcasts', async () => {
    // Push to ERROR_PASSIVE via REC (128 receiver errors)
    for (let i = 0; i < 128; i++) canSimulator.injectError('CRC', 'receiver');
    expect(canSimulator.getErrorState().state).toBe('ERROR_PASSIVE');

    // One successful broadcast decrements REC to 127 → back to ERROR_ACTIVE
    await canSimulator.broadcast({
      type: 'STANDARD',
      id: 0x100,
      dlc: 1,
      data: new Uint8Array([0x01]),
      timestamp: 0,
    });

    expect(canSimulator.getErrorState().rec).toBe(127);
    expect(canSimulator.getErrorState().state).toBe('ERROR_ACTIVE');
  });

  it('should default to transmitter role when role is omitted', () => {
    canSimulator.injectError('CRC');
    expect(canSimulator.getErrorState().tec).toBe(8);
    expect(canSimulator.getErrorState().rec).toBe(0);
  });

  it('should record the role in the error log entry', () => {
    canSimulator.injectError('STUFF', 'transmitter');
    canSimulator.injectError('CRC', 'receiver');

    const log = canSimulator.getErrorLog();
    expect(log[0].role).toBe('transmitter');
    expect(log[1].role).toBe('receiver');
  });
});

// ----------------------------------------------------------------
// Error Log
// ----------------------------------------------------------------
describe('CANSimulator — error log tracking', () => {
  it('should record each injected error in the log', () => {
    canSimulator.injectError('STUFF');
    canSimulator.injectError('CRC');

    const log = canSimulator.getErrorLog();
    expect(log).toHaveLength(2);
    expect(log[0].errorCode).toBe('STUFF');
    expect(log[1].errorCode).toBe('CRC');
  });

  it('should assign sequential IDs to log entries', () => {
    canSimulator.injectError('FORM');
    canSimulator.injectError('ACK');
    canSimulator.injectError('BIT1');

    const log = canSimulator.getErrorLog();
    expect(log[0].id).toBe(1);
    expect(log[1].id).toBe(2);
    expect(log[2].id).toBe(3);
  });

  it('should capture TEC/REC at time of each error', () => {
    canSimulator.injectError('STUFF');
    canSimulator.injectError('CRC');

    const log = canSimulator.getErrorLog();
    expect(log[0].tec).toBe(8);
    expect(log[1].tec).toBe(16);
  });

  it('should flag state transitions in the log entry', () => {
    // Inject enough to cross ERROR_ACTIVE → ERROR_PASSIVE boundary
    // 15 errors = TEC 120 (ACTIVE), 16th = TEC 128 (PASSIVE)
    for (let i = 0; i < 15; i++) canSimulator.injectError('CRC');

    const logBefore = canSimulator.getErrorLog();
    const lastBeforeTransition = logBefore[logBefore.length - 1];
    expect(lastBeforeTransition.stateChanged).toBe(false);

    canSimulator.injectError('CRC'); // 16th → triggers transition
    const logAfter = canSimulator.getErrorLog();
    const transitionEntry = logAfter[logAfter.length - 1];
    expect(transitionEntry.stateChanged).toBe(true);
    expect(transitionEntry.prevState).toBe('ERROR_ACTIVE');
    expect(transitionEntry.newState).toBe('ERROR_PASSIVE');
  });

  it('should notify error log subscribers on each injection', () => {
    const snapshots: ErrorLogEntry[][] = [];
    const unsub = canSimulator.subscribeToErrorLog((log) => snapshots.push(log));

    canSimulator.injectError('STUFF');
    canSimulator.injectError('CRC');

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]).toHaveLength(1);
    expect(snapshots[1]).toHaveLength(2);
    unsub();
  });

  it('should return a copy of the log (not a mutable reference)', () => {
    canSimulator.injectError('STUFF');
    const log1 = canSimulator.getErrorLog();
    const log2 = canSimulator.getErrorLog();
    expect(log1).not.toBe(log2);
    expect(log1).toEqual(log2);
  });
});

// ----------------------------------------------------------------
// Reset
// ----------------------------------------------------------------
describe('CANSimulator — resetErrors', () => {
  it('should reset TEC and REC to 0', () => {
    canSimulator.injectError('CRC');
    canSimulator.resetErrors();
    const state = canSimulator.getErrorState();
    expect(state.tec).toBe(0);
    expect(state.rec).toBe(0);
  });

  it('should return to ERROR_ACTIVE state', () => {
    for (let i = 0; i < 20; i++) canSimulator.injectError('FORM');
    expect(canSimulator.getErrorState().state).toBe('ERROR_PASSIVE');

    canSimulator.resetErrors();
    expect(canSimulator.getErrorState().state).toBe('ERROR_ACTIVE');
  });

  it('should recover from BUS_OFF and allow broadcasting again', async () => {
    for (let i = 0; i < 33; i++) canSimulator.injectError('ACK');
    expect(canSimulator.getErrorState().state).toBe('BUS_OFF');

    canSimulator.resetErrors();

    const received: CANMessage[] = [];
    const unsub = canSimulator.subscribe({ onMessage: (m) => received.push(m) });
    await canSimulator.broadcast({
      type: 'STANDARD',
      id: 0x100,
      dlc: 1,
      data: new Uint8Array([0x01]),
      timestamp: 0,
    });

    expect(received).toHaveLength(1);
    unsub();
  });

  it('should clear the error log', () => {
    canSimulator.injectError('CRC');
    canSimulator.injectError('STUFF');
    canSimulator.resetErrors();
    expect(canSimulator.getErrorLog()).toHaveLength(0);
  });

  it('should notify error log subscribers with an empty log', () => {
    const snapshots: ErrorLogEntry[][] = [];
    const unsub = canSimulator.subscribeToErrorLog((log) => snapshots.push(log));

    canSimulator.injectError('CRC');
    canSimulator.resetErrors();

    // Last snapshot should be empty (from reset)
    expect(snapshots[snapshots.length - 1]).toHaveLength(0);
    unsub();
  });
});

// ----------------------------------------------------------------
// Trace
// ----------------------------------------------------------------
describe('CANSimulator — trace log', () => {
  it('should return an empty trace after clearTrace', async () => {
    await canSimulator.broadcast({
      type: 'STANDARD',
      id: 0x100,
      dlc: 1,
      data: new Uint8Array([0x01]),
      timestamp: 0,
    });

    canSimulator.clearTrace();
    expect(canSimulator.getTrace()).toHaveLength(0);
  });

  it('should return a copy of the trace (not a mutable reference)', async () => {
    await canSimulator.broadcast({
      type: 'STANDARD',
      id: 0x100,
      dlc: 1,
      data: new Uint8Array([0x01]),
      timestamp: 0,
    });

    const t1 = canSimulator.getTrace();
    const t2 = canSimulator.getTrace();
    expect(t1).not.toBe(t2);
  });
});

// ----------------------------------------------------------------
// Arbitration
// ----------------------------------------------------------------
describe('CANSimulator — simulateArbitration', () => {
  it('should select the node with the lowest ID as the winner (dominant = 0)', () => {
    const result = canSimulator.simulateArbitration([
      { id: 0x300, name: 'Node A' },
      { id: 0x100, name: 'Node B' },
      { id: 0x200, name: 'Node C' },
    ]);
    expect(result.winnerIndex).toBe(1); // Node B has lowest ID
  });

  it('should report the bit position where the first collision occurred', () => {
    const result = canSimulator.simulateArbitration([
      { id: 0b00100000000, name: 'A' }, // 0x100
      { id: 0b01000000000, name: 'B' }, // 0x200
    ]);
    // IDs differ at bit 0 and 1 (MSB-first for 11-bit), actual collision bit depends on impl
    expect(result.collisionBit).toBeGreaterThanOrEqual(0);
  });

  it('should return collisionBit of -1 when only one node participates', () => {
    const result = canSimulator.simulateArbitration([
      { id: 0x100, name: 'Solo' },
    ]);
    expect(result.winnerIndex).toBe(0);
    expect(result.collisionBit).toBe(-1);
  });

  it('should produce bit history entries for each participating node', () => {
    const result = canSimulator.simulateArbitration([
      { id: 0x7FF, name: 'A' },
      { id: 0x000, name: 'B' },
    ]);
    expect(result.bitHistory[0].length).toBeGreaterThan(0);
    expect(result.bitHistory[1].length).toBeGreaterThan(0);
  });

  it('should handle identical IDs (no collision, both active)', () => {
    const result = canSimulator.simulateArbitration([
      { id: 0x100, name: 'A' },
      { id: 0x100, name: 'B' },
    ]);
    // Both stay active, collisionBit is -1
    expect(result.collisionBit).toBe(-1);
  });
});

// ----------------------------------------------------------------
// Signal Extraction
// ----------------------------------------------------------------
describe('CANSimulator — extractSignal', () => {
  it('should extract a simple 8-bit little-endian value at bit 0', () => {
    const payload = new Uint8Array([0xAB]);
    const value = canSimulator.extractSignal(payload, 0, 8, true, 1, 0);
    expect(value).toBe(0xAB);
  });

  it('should apply scale and offset to the raw value', () => {
    const payload = new Uint8Array([100]);
    const value = canSimulator.extractSignal(payload, 0, 8, true, 0.5, -20);
    expect(value).toBe(100 * 0.5 + (-20)); // 30
  });

  it('should extract a sub-byte field', () => {
    // byte = 0b11010110 = 0xD6
    const payload = new Uint8Array([0xD6]);
    // Extract bits 1-3 (3 bits from bit 1): bits are 1,1,0 → little-endian = 0b011 = 3
    const value = canSimulator.extractSignal(payload, 1, 3, true, 1, 0);
    expect(value).toBe(3);
  });

  it('should return offset for a zero-length extraction', () => {
    const payload = new Uint8Array([0xFF]);
    const value = canSimulator.extractSignal(payload, 0, 0, true, 1, 10);
    expect(value).toBe(10); // raw is 0, so 0 * 1 + 10
  });
});

// ----------------------------------------------------------------
// Bit Stuffing (simulator method)
// ----------------------------------------------------------------
describe('CANSimulator — applyBitStuffing (instance method)', () => {
  it('should return empty result for empty input', () => {
    const result = canSimulator.applyBitStuffing([]);
    expect(result.stuffed).toEqual([]);
    expect(result.stuffIndices).toEqual([]);
  });

  it('should insert a stuff bit after five consecutive identical bits', () => {
    const result = canSimulator.applyBitStuffing([0, 0, 0, 0, 0, 1]);
    expect(result.stuffed[5]).toBe(1); // stuff bit (complement of 0)
    expect(result.stuffIndices).toHaveLength(1);
  });

  it('should track the indices of all inserted stuff bits', () => {
    const input = Array(10).fill(1); // 10 ones
    const result = canSimulator.applyBitStuffing(input);
    expect(result.stuffIndices.length).toBeGreaterThanOrEqual(1);

    // Verify every index in stuffIndices is a complement bit
    for (const idx of result.stuffIndices) {
      expect(result.stuffed[idx]).toBe(0); // complement of 1
    }
  });
});
