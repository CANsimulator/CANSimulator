import { 
    type BitTiming 
} from '../../types/testbench';

/**
 * BTR Register Encoding (MCP2515-style)
 * Encodes BitTiming parameters into hardware-specific register values.
 */
export function encodeRegisters(t: BitTiming) {
    // BTR0: [SJW1 SJW0 BRP5 BRP4 BRP3 BRP2 BRP1 BRP0]
    // BTR1: [SAM TSEG22 TSEG21 TSEG20 TSEG12 TSEG11 TSEG10 TSEG0]
    const sjwBits = ((t.sjw - 1) & 0x03) << 6;
    const brpBits = (t.brp - 1) & 0x3F;
    const btr0 = sjwBits | brpBits;

    const tseg1 = (t.prop + t.phase1 - 1) & 0x0F;
    const tseg2 = ((t.phase2 - 1) & 0x07) << 4;
    const samBit = (t.sam & 0x01) << 7;
    const btr1 = samBit | tseg2 | tseg1;

    return { btr0, btr1 };
}

/**
 * BTR Register Decoding
 * Decodes hardware-specific register values back into BitTiming parameters.
 */
export function decodeRegisters(btr0: number, btr1: number, oscillatorResource: number): BitTiming {
    const sjw = ((btr0 >> 6) & 0x03) + 1;
    const brp = (btr0 & 0x3F) + 1;
    const tseg2 = ((btr1 >> 4) & 0x07) + 1;
    const tseg1 = (btr1 & 0x0F) + 1;
    const sam = (btr1 >> 7) & 0x01;

    // Split tseg1 into prop and phase1. 
    const prop = Math.max(1, Math.floor(tseg1 / 2));
    const phase1 = Math.max(1, tseg1 - prop);

    return {
        sync: 1,
        prop,
        phase1,
        phase2: tseg2,
        sjw,
        brp,
        oscillator: oscillatorResource,
        sam
    };
}

/**
 * Brute-force search for optimal CAN bit timing (Issue #279)
 * Tries all valid BRP, TSEG1, and TSEG2 combinations to find the closest match.
 * Aiming for ~80% sample point as per ISO recommendations.
 */
export function findOptimalTiming(targetBaud: number, oscHz: number): BitTiming | null {
    const fosc = oscHz / 2;
    let best: BitTiming | null = null;
    let bestScore = Infinity;

    for (let brp = 1; brp <= 64; brp++) {
        const ftq = fosc / brp;
        const totalTqFloat = ftq / targetBaud;
        const totalTq = Math.round(totalTqFloat);

        // Standard CAN total TQ range: 8 to 25
        if (totalTq < 8 || totalTq > 25) continue;

        const actualBaud = ftq / totalTq;
        const baudError = Math.abs(actualBaud - targetBaud) / targetBaud;

        // Allow max 1.5% baud rate tolerance
        if (baudError > 0.015) continue;

        for (let tseg2 = 2; tseg2 <= 8; tseg2++) {
            const tseg1 = totalTq - 1 - tseg2;
            if (tseg1 >= 3 && tseg1 <= 16) {
                const samplePoint = (1 + tseg1) / totalTq;
                const spError = Math.abs(samplePoint - 0.80);
                const score = baudError * 1000 + spError;

                if (score < bestScore) {
                    bestScore = score;
                    const prop = Math.max(1, Math.floor(tseg1 / 2));
                    best = { 
                        sync: 1, 
                        prop, 
                        phase1: tseg1 - prop, 
                        phase2: tseg2, 
                        sjw: 1, 
                        brp, 
                        oscillator: oscHz, 
                        sam: 0 
                    };
                }
            }
        }
    }
    return best;
}
