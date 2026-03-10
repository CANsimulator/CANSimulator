import { dlcToLength } from '../../types/can';
import type { CANFDFrame } from '../../types/can';
import { canSimulator } from './can-simulator';

/**
 * CAN FD Helper — validates payload, pads to DLC length, and broadcasts.
 */
export class CANFDHandler {
    static async sendFD(id: number, data: Uint8Array, brs = true): Promise<void> {
        const dlc = this.lengthToDlc(data.length);
        const length = dlcToLength(dlc);

        let finalData = data;
        if (data.length < length) {
            finalData = new Uint8Array(length);
            finalData.set(data);
        }

        const frame: CANFDFrame = {
            id,
            dlc,
            data: finalData,
            type: 'FD',
            brs,
            esi: false,
            timestamp: Date.now(),
        };

        await canSimulator.broadcast(frame);
    }

    private static lengthToDlc(len: number): number {
        if (len <= 8) return len;
        if (len <= 12) return 9;
        if (len <= 16) return 10;
        if (len <= 20) return 11;
        if (len <= 24) return 12;
        if (len <= 32) return 13;
        if (len <= 48) return 14;
        return 15;
    }
}
