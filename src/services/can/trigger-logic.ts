/**
 * Trigger Logic for CAN-SCOPE
 * Pure functions for detecting specific patterns in CAN sample streams.
 */

import type { Sample } from '../../types/can';

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

/**
 * Detects a match with a specific payload pattern within the data field.
 * Evaluates when enough data bits have been processed.
 */
export function isPayloadMatch(samples: Sample[], patternBytes: number[]): boolean {
    if (patternBytes.length === 0) return false;
    
    // In a standard CAN frame (as simulated), data field starts at bit index 19.
    // It takes 8 bits per byte.
    const requiredBits = 19 + patternBytes.length * 8;
    if (samples.length < requiredBits) return false;

    const current = samples[samples.length - 1];
    const prev = samples[samples.length - 2];
    
    // Only evaluate exactly at the end of the required data payload
    if (!prev || prev.bitIndex !== requiredBits - 2 || current.bitIndex !== requiredBits - 1) return false;

    let match = true;
    let currentByte = 0;
    let bitCount = 0;
    let byteIdx = 0;

    // Scan forward from the start of the data field
    for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        if (s.bitIndex >= 19 && s.bitIndex < requiredBits) {
            const bitValue = s.isDominant ? 0 : 1;
            currentByte = (currentByte << 1) | bitValue;
            bitCount++;
            
            if (bitCount === 8) {
                if (currentByte !== patternBytes[byteIdx]) {
                    match = false;
                    break;
                }
                byteIdx++;
                currentByte = 0;
                bitCount = 0;
            }
        }
    }

    return match && byteIdx === patternBytes.length;
}

import { CAN_LOGICAL_BITS, CAN_BIT_FIELD_MAP } from '../../components/can/scope/protocolUtils';
import type { OscState } from '../../components/can/scope/types';

/**
 * Evaluates the CAN Protocol Trigger against the static CAN frame pattern.
 * Returns the bit index where the trigger occurs, or null if no trigger is found.
 */
export function evaluateCanTrigger(triggerCfg: OscState['trig']['canTrigger']): number | null {
    if (!triggerCfg) return null;
    
    if (triggerCfg.type === 'ID') {
        const target = parseInt(triggerCfg.targetID, 16);
        if (isNaN(target)) return null;
        
        let id = 0;
        // ID bits are stored at indices 1 to 11 in CAN_LOGICAL_BITS
        for (let i = 1; i <= 11; i++) {
            id = (id << 1) | CAN_LOGICAL_BITS[i];
        }
        
        // Trigger at the end of the ID field
        if (id === target) return 11;
    }
    
    if (triggerCfg.type === 'Payload') {
        const patternStr = triggerCfg.payloadPattern.replace(/\s+/g, '');
        if (!patternStr) return null;
        
        // Parse hex string into bytes
        const patternBytes: number[] = [];
        for (let i = 0; i < patternStr.length; i += 2) {
            patternBytes.push(parseInt(patternStr.substring(i, i + 2), 16));
        }
        if (patternBytes.length === 0) return null;
        
        // Extract data bits from the logical bit array
        const dataBits = CAN_BIT_FIELD_MAP.filter(m => m.fieldCls === 'data');
        const dataBytes: number[] = [];
        for (let i = 0; i < dataBits.length; i += 8) {
            let byte = 0;
            for (let j = 0; j < 8; j++) {
                if (i + j < dataBits.length) {
                    byte = (byte << 1) | dataBits[i + j].logicalBit;
                }
            }
            dataBytes.push(byte);
        }
        
        // Match prefix
        let match = true;
        let lastBitMatched = -1;
        for (let i = 0; i < patternBytes.length; i++) {
            if (i >= dataBytes.length || patternBytes[i] !== dataBytes[i]) {
                match = false;
                break;
            }
            lastBitMatched = dataBits[i * 8 + 7]?.bitIndex ?? -1;
        }
        
        if (match) return lastBitMatched;
    }
    
    if (triggerCfg.type === 'Error') {
        // Our perfect simulated frame has no errors natively.
        // So this will simply return null and won't trigger, correctly simulating reality.
        return null;
    }
    
    return null;
}
