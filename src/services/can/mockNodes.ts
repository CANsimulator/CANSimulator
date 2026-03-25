import { canHandlerRegistry } from './can-handler';
import type { CANHandler } from './can-handler';
import { canSimulator } from './can-simulator';
import type { CANMessage } from './can-simulator';
import { lengthToDlc } from '../../types/can';

import { UDSServer } from './uds-server';

// Initialize UDS Server for Engine ECU
const engineUdsServer = new UDSServer(0x7E0, 0x7E8);

/**
 * Engine ECU — responds to functional diagnostic requests (0x7DF) and
 * physical requests (0x7E0), emits heartbeat RPM frames.
 */
export const EngineECU: CANHandler = {
    id: 'engine-ecu',
    name: 'Engine Control Unit (ECM)',
    interestedMessageIds: [0x7DF, 0x7E0],
    onReceive: async (message: CANMessage) => {
        // Log UDS request receipt and delegate to UDS Server
        if (message.id === 0x7DF || message.id === 0x7E0) {
            await engineUdsServer.handleMessage(message);
        }
    },
};

/**
 * ABS ECU — responds to 0x7DF / 0x7E1.
 */
export const BrakeECU: CANHandler = {
    id: 'brake-ecu',
    name: 'Anti-lock Braking System (ABS)',
    interestedMessageIds: [0x7DF, 0x7E1],
    onReceive: async (_message: CANMessage) => {
        // Acknowledge but no response payload for now
    },
};

let networkStarted = false;

/**
 * Boot the virtual CAN network — safe to call multiple times (idempotent).
 */
export function initVirtualNetwork(): void {
    if (networkStarted) return;
    networkStarted = true;

    canHandlerRegistry.register(EngineECU);
    canHandlerRegistry.register(BrakeECU);

    // Engine RPM heartbeat (1 Hz)
    setInterval(() => {
        void canSimulator.broadcast({
            id: 0x1A0,
            dlc: 8,
            data: new Uint8Array([0x00, 0x00, 0x0A, 0xBC, 0x00, 0x00, 0x00, 0x00]),
            type: 'STANDARD',
            timestamp: Date.now(),
        });
    }, 1000);

    // Brake pedal position (0.5 Hz)
    setInterval(() => {
        void canSimulator.broadcast({
            id: 0x2B0,
            dlc: lengthToDlc(4),
            data: new Uint8Array([0x00, 0x50, 0x00, 0x00]),
            type: 'STANDARD',
            timestamp: Date.now(),
        });
    }, 2000);
}
