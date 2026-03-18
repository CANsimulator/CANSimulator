/**
 * Trigger Logic for CAN-SCOPE
 * Pure functions for detecting specific patterns in CAN sample streams.
 */

export interface Sample {
    canh: number;
    canl: number;
    isDominant: boolean;
    bitIndex: number;
    t: number;
}

/**
 * Detects a Start-of-Frame (SOF) transition: Recessive -> Dominant
 */
export function isSOFTransition(prev: Sample | null, current: Sample): boolean {
    if (!prev) return false;
    // SOF is a dominant bit (0/true) after a recessive period (1/false)
    return !prev.isDominant && current.isDominant;
}

/**
 * Detects an error frame pattern: 6 or more consecutive dominant bits
 */
export function isErrorFrame(samples: Sample[]): boolean {
    if (samples.length < 6) return false;
    
    let consecutiveDominant = 0;
    for (let i = samples.length - 1; i >= 0; i--) {
        if (samples[i].isDominant) {
            consecutiveDominant++;
            if (consecutiveDominant >= 6) return true;
        } else {
            // Once we hit a recessive bit, we stop counting the trailing sequence
            break;
        }
    }
    return false;
}

/**
 * Detects a match with a specific Arbitration ID.
 * Evaluates when the arbitration field just finishes (transition from bitIndex 11 to 12).
 * CAN ID is transmitted MSB first. Dominant = logic 0, Recessive = logic 1.
 */
export function isIDMatch(samples: Sample[], targetID: number): boolean {
    if (samples.length < 12) return false;

    const current = samples[samples.length - 1];
    const prev = samples[samples.length - 2];
    
    // Only evaluate exactly at the end of the arbitration ID (transition from bit 11 to bit 12)
    if (!prev || prev.bitIndex !== 11 || current.bitIndex !== 12) return false;

    let extractedID = 0;
    let expectedBitIndex = 11;
    let bitsFound = 0;
    
    for (let i = samples.length - 2; i >= 0; i--) {
        const s = samples[i];
        if (s.bitIndex === expectedBitIndex) {
            const bitValue = s.isDominant ? 0 : 1;
            // ID bits: index 1 -> bit 10, ..., index 11 -> bit 0
            extractedID |= (bitValue << (11 - expectedBitIndex));
            expectedBitIndex--;
            bitsFound++;
        }
        if (bitsFound === 11) break;
    }

    return bitsFound === 11 && extractedID === targetID;
}
