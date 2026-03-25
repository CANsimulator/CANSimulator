import type { CANFrame, CANFDFrame, CANErrorCode, CANControllerState } from '../../types/can';

export type CANMessage = CANFrame | CANFDFrame;

export interface CANObserver {
    onMessage: (message: CANMessage) => void;
    onError?: (error: { type: CANErrorCode; timestamp: number }) => void;
    onStateChange?: (state: CANErrorState) => void;
}

export interface CANErrorState {
    tec: number;
    rec: number;
    state: CANControllerState;
}

export type ErrorRole = 'transmitter' | 'receiver';

export interface ErrorLogEntry {
    id: number;
    errorCode: CANErrorCode;
    role: ErrorRole;
    timestamp: number;
    tec: number;
    rec: number;
    prevState: CANControllerState;
    newState: CANControllerState;
    stateChanged: boolean;
}

/**
 * Virtual CAN Bus (Observer pattern)
 * Broadcasts frames to all subscribers with simulated propagation delay.
 */
class CANSimulator {
    private observers: Set<CANObserver> = new Set();
    private messageLog: CANMessage[] = [];
    private isBusActive: boolean = true;

    // Error tracking (represents the "Local Node" state)
    private tec: number = 0;
    private rec: number = 0;
    private controllerState: 'ERROR_ACTIVE' | 'ERROR_PASSIVE' | 'BUS_OFF' = 'ERROR_ACTIVE';

    // Error history log
    private errorLog: ErrorLogEntry[] = [];
    private errorLogId: number = 0;
    private errorLogListeners: Set<(log: ErrorLogEntry[]) => void> = new Set();

    subscribe(observer: CANObserver): () => void {
        this.observers.add(observer);
        // Immediate update with current state
        observer.onStateChange?.(this.getErrorState());
        return () => this.observers.delete(observer);
    }

    async broadcast(message: CANMessage): Promise<void> {
        if (!this.isBusActive || this.controllerState === 'BUS_OFF') return;

        const delay = message.type === 'FD' ? 2 : 5;
        await new Promise(resolve => setTimeout(resolve, delay));

        const stamped = { ...message, timestamp: Date.now() };

        this.messageLog.push(stamped);
        if (this.messageLog.length > 1000) this.messageLog.shift();

        this.observers.forEach(obs => {
            try { obs.onMessage(stamped); } catch { /* swallow */ }
        });

        // ISO 11898-1: successful reception decrements REC by 1 (min 0)
        if (this.rec > 0) {
            this.rec -= 1;
            this.updateState();
        }
    }

    injectError(errorCode: CANErrorCode, role: ErrorRole = 'transmitter'): void {
        if (this.controllerState === 'BUS_OFF') return;

        const prevState = this.controllerState;

        // ISO 11898-1 section 12.1.4 — error counter rules:
        //   Transmitter: TEC += 8
        //   Receiver:    REC += 1  (normal receive error)
        //                REC += 8  (dominant bit after error flag — simulated for BIT0/BIT1)
        if (role === 'transmitter') {
            this.tec += 8;
        } else {
            const heavyReceiveErrors: CANErrorCode[] = ['BIT0', 'BIT1'];
            this.rec += heavyReceiveErrors.includes(errorCode) ? 8 : 1;
        }

        this.updateState();

        const entry: ErrorLogEntry = {
            id: ++this.errorLogId,
            errorCode,
            role,
            timestamp: Date.now(),
            tec: this.tec,
            rec: this.rec,
            prevState,
            newState: this.controllerState,
            stateChanged: prevState !== this.controllerState,
        };
        this.errorLog.push(entry);
        if (this.errorLog.length > 200) this.errorLog.shift();
        this.errorLogListeners.forEach(fn => fn([...this.errorLog]));

        const evt = { type: errorCode, timestamp: Date.now() };
        this.observers.forEach(obs => obs.onError?.(evt));
    }

    private updateState(): void {
        const oldState = this.controllerState;

        if (this.tec > 255) {
            this.controllerState = 'BUS_OFF';
            this.isBusActive = false;
        } else if (this.tec >= 128 || this.rec >= 128) {
            this.controllerState = 'ERROR_PASSIVE';
        } else {
            this.controllerState = 'ERROR_ACTIVE';
        }

        if (oldState !== this.controllerState || true) { // Always notify for TEC/REC changes
            const newState = this.getErrorState();
            this.observers.forEach(obs => obs.onStateChange?.(newState));
        }
    }

    getErrorState(): CANErrorState {
        return {
            tec: this.tec,
            rec: this.rec,
            state: this.controllerState
        };
    }

    resetErrors(): void {
        this.tec = 0;
        this.rec = 0;
        this.controllerState = 'ERROR_ACTIVE';
        this.isBusActive = true;
        this.errorLog = [];
        this.errorLogId = 0;
        this.errorLogListeners.forEach(fn => fn([]));
        this.updateState();
    }

    getErrorLog(): ErrorLogEntry[] {
        return [...this.errorLog];
    }

    subscribeToErrorLog(listener: (log: ErrorLogEntry[]) => void): () => void {
        this.errorLogListeners.add(listener);
        return () => this.errorLogListeners.delete(listener);
    }

    getTrace(): CANMessage[] { return [...this.messageLog]; }
    clearTrace(): void { this.messageLog = []; }
    setBusState(active: boolean): void { this.isBusActive = active; }

    // --- New Protocol Analysis Methods ---

    /** Compute CRC15 for Classical CAN */
    computeCRC15(bits: number[]): number {
        const poly = 0x4599;
        let crc = 0;
        for (const bit of bits) {
            const xorBit = ((crc >> 14) ^ bit) & 1;
            crc = ((crc << 1) & 0x7FFF) ^ (xorBit ? poly : 0);
        }
        return crc;
    }

    /** Compute CRC17 for CAN FD (payload <= 16 bytes) */
    computeCRC17(bits: number[]): number {
        const poly = 0x3685B;
        let crc = 0;
        for (const bit of bits) {
            const xorBit = ((crc >> 16) ^ bit) & 1;
            crc = ((crc << 1) & 0x1FFFF) ^ (xorBit ? poly : 0);
        }
        return crc;
    }

    /** Compute CRC21 for CAN FD (payload > 16 bytes) */
    computeCRC21(bits: number[]): number {
        const poly = 0x302899;
        let crc = 0;
        for (const bit of bits) {
            const xorBit = ((crc >> 20) ^ bit) & 1;
            crc = ((crc << 1) & 0x1FFFFF) ^ (xorBit ? poly : 0);
        }
        return crc;
    }

    /** Apply bit stuffing rules (5 identical bits -> insert complementary) */
    applyBitStuffing(bits: number[]): { stuffed: number[]; stuffIndices: number[] } {
        const stuffed: number[] = [];
        const stuffIndices: number[] = [];
        let count = 1;

        if (bits.length === 0) return { stuffed: [], stuffIndices: [] };

        stuffed.push(bits[0]);
        for (let i = 1; i < bits.length; i++) {
            if (bits[i] === bits[i - 1]) {
                count++;
            } else {
                count = 1;
            }

            stuffed.push(bits[i]);

            if (count === 5) {
                const stuffBit = bits[i] === 1 ? 0 : 1;
                stuffed.push(stuffBit);
                stuffIndices.push(stuffed.length - 1);
                count = 1; // Reset count after stuffing
            }
        }
        return { stuffed, stuffIndices };
    }

    /** Extract physical signal from payload */
    extractSignal(
        payload: Uint8Array,
        startBit: number,
        bitLength: number,
        isLittleEndian: boolean,
        scale: number,
        offset: number
    ): number {
        let raw = 0n;
        const totalBits = payload.length * 8;

        for (let i = 0; i < bitLength; i++) {
            const currentBit = isLittleEndian ? startBit + i : startBit - i;
            if (currentBit < 0 || currentBit >= totalBits) continue;

            const byteIdx = Math.floor(currentBit / 8);
            const bitInByte = currentBit % 8;

            const bitValue = (payload[byteIdx] >> bitInByte) & 1;

            if (isLittleEndian) {
                raw |= BigInt(bitValue) << BigInt(i);
            } else {
                // Motorola (BE): Assemble MSB-first
                raw |= BigInt(bitValue) << BigInt(bitLength - 1 - i);
            }
        }

        return Number(raw) * scale + offset;
    }

    /** Piecewise Linear Interpolation (Map raw to non-linear physical e.g. sensors) */
    interpolateSignal(points: { raw: number; physical: number }[], raw: number): number {
        if (points.length === 0) return raw;
        if (points.length === 1) return points[0].physical;

        // Sort by raw value
        const sorted = [...points].sort((a, b) => a.raw - b.raw);

        // Clamping or extension
        if (raw <= sorted[0].raw) return sorted[0].physical;
        if (raw >= sorted[sorted.length - 1].raw) return sorted[sorted.length - 1].physical;

        // Find segments
        for (let i = 0; i < sorted.length - 1; i++) {
            const p1 = sorted[i];
            const p2 = sorted[i + 1];

            if (raw >= p1.raw && raw <= p2.raw) {
                // Linear Formula: y = y0 + (x - x0) * (y1 - y0) / (x1 - x0)
                const fraction = (raw - p1.raw) / (p2.raw - p1.raw);
                return p1.physical + fraction * (p2.physical - p1.physical);
            }
        }
        return raw;
    }

    /** Simulate bit-by-bit arbitration between multiple nodes */
    simulateArbitration(nodes: { id: number; name: string }[]): {
        winnerIndex: number;
        activeNodes: number[];
        isTie: boolean;
        bitHistory: { [nodeIndex: number]: number[] };
        collisionBit: number;
    } {
        const bitHistory: { [nodeIdx: number]: number[] } = {};
        nodes.forEach((_, i) => (bitHistory[i] = []));

        const idsAsBits = nodes.map(n => {
            // Standard 11-bit ID
            return n.id.toString(2).padStart(11, '0').split('').map(Number);
        });

        let activeNodes = nodes.map((_, i) => i);
        let collisionBit = -1;

        for (let bitIdx = 0; bitIdx < 11; bitIdx++) {
            let busLevel = 1; // Recessive by default

            // Determine bus level (Wired-AND: any dominant (0) makes bus dominant)
            for (const nodeIdx of activeNodes) {
                const bit = idsAsBits[nodeIdx][bitIdx];
                if (bit === 0) busLevel = 0;
                bitHistory[nodeIdx].push(bit);
            }

            // Nodes that sent recessive (1) but see dominant (0) lose
            const remainingNodes: number[] = [];
            for (const nodeIdx of activeNodes) {
                if (idsAsBits[nodeIdx][bitIdx] === 1 && busLevel === 0) {
                    if (collisionBit === -1) collisionBit = bitIdx;
                    // Node loses, but we still capture the losing bit in history
                    continue;
                }
                remainingNodes.push(nodeIdx);
            }

            activeNodes = remainingNodes;
            if (activeNodes.length === 1 && collisionBit !== -1) break;
        }

        return {
            winnerIndex: activeNodes[0],
            activeNodes,
            isTie: activeNodes.length > 1,
            bitHistory,
            collisionBit
        };
    }
}

export const canSimulator = new CANSimulator();
