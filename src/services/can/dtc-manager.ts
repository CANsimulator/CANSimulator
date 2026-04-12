import { canSimulator } from './can-simulator';
import type { ErrorLogEntry, FreezeFrame } from './can-simulator';

export interface DTC {
    code: string;
    description: string;
    status: 'active' | 'stored' | 'pending';
    occurrenceCount: number;
    timestamp: number;
    freezeFrame?: FreezeFrame;
}

class DTCManager {
    private dtcs: DTC[] = [];
    private listeners: Set<(dtcs: DTC[]) => void> = new Set();

    constructor() {
        canSimulator.subscribeToErrorLog((log) => {
            this.processErrorLog(log);
        });
    }

    private processErrorLog(log: ErrorLogEntry[]) {
        if (log.length === 0) {
            this.dtcs = [];
            this.notify();
            return;
        }

        const lastEntry = log[log.length - 1];
        
        // Simple logic: Certain error types trigger specific DTCs
        if (lastEntry.errorCode === 'CRC') {
            this.updateDTC('P0001', 'CAN CRC Error Detected', lastEntry.freezeFrame);
        } else if (lastEntry.errorCode === 'STUFF') {
            this.updateDTC('P0002', 'CAN Bit Stuffing Error', lastEntry.freezeFrame);
        } else if (lastEntry.newState === 'BUS_OFF') {
            this.updateDTC('U0100', 'Lost Communication with ECU (Bus Off)', lastEntry.freezeFrame);
        }
    }

    private updateDTC(code: string, description: string, freezeFrame?: FreezeFrame) {
        const existing = this.dtcs.find(d => d.code === code);
        if (existing) {
            existing.occurrenceCount++;
            existing.timestamp = Date.now();
            existing.status = 'active';
            // We usually keep the FIRST freeze frame, but for the simulator we'll update it
            if (freezeFrame) existing.freezeFrame = freezeFrame;
        } else {
            this.dtcs.push({
                code,
                description,
                status: 'active',
                occurrenceCount: 1,
                timestamp: Date.now(),
                freezeFrame
            });
        }
        this.notify();
    }

    getDTCs() {
        return [...this.dtcs];
    }

    clearDTCs() {
        this.dtcs = [];
        this.notify();
    }

    subscribe(fn: (dtcs: DTC[]) => void) {
        this.listeners.add(fn);
        fn(this.getDTCs());
        return () => this.listeners.delete(fn);
    }

    private notify() {
        const data = this.getDTCs();
        this.listeners.forEach(fn => fn(data));
    }
}

export const dtcManager = new DTCManager();
