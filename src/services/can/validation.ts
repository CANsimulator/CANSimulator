/**
 * CAN Protocol Validation Service
 * Follows ISO 11898 and ISO 14229 standards for CAN and CAN FD frame validation.
 */
export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export const CANValidation = {
    /**
     * Validates a CAN Message ID (Hex string)
     * @param id Hex string representation of the ID
     * @param isExtended Whether to use extended 29-bit IDs (default 11-bit standard)
     */
    validateMsgId(id: string, isExtended: boolean = false): ValidationResult {
        const val = id.toUpperCase();
        
        if (!val) {
            return { isValid: false, error: 'Message ID is required' };
        }

        if (!/^[0-9A-F]*$/.test(val)) {
            return { isValid: false, error: 'Only hex characters (0-9, A-F) allowed' };
        }

        const maxLen = isExtended ? 8 : 3;
        if (val.length > maxLen) {
            return { isValid: false, error: `Max ${maxLen} hex characters for ${isExtended ? 'extended' : 'standard'} ID` };
        }

        // Additional range check:
        // Standard: 0x000 - 0x7FF
        // Extended: 0x00000000 - 0x1FFFFFFF
        const numericId = parseInt(val, 16);
        const maxVal = isExtended ? 0x1FFFFFFF : 0x7FF;
        
        if (numericId > maxVal) {
            return { 
                isValid: false, 
                error: `ID 0x${val} is out of range (Max: 0x${maxVal.toString(16).toUpperCase()})` 
            };
        }

        return { isValid: true };
    },

    /**
     * Validates a CAN Payload (Hex string with optional spaces)
     * @param payload Hex string with optional spaces
     * @param isFD Whether this is a CAN FD frame (allows up to 64 bytes)
     */
    validatePayload(payload: string, isFD: boolean = false): ValidationResult {
        const stripped = payload.replace(/\s/g, '').toUpperCase();
        
        if (stripped && !/^[0-9A-F]*$/.test(stripped)) {
            return { isValid: false, error: 'Only hex characters and spaces allowed' };
        }

        if (stripped.length % 2 !== 0) {
            return { isValid: false, error: 'Hex bytes must be complete (even number of hex chars)' };
        }

        const byteCount = stripped.length / 2;
        const maxBytes = isFD ? 64 : 8;

        if (byteCount > maxBytes) {
            return { isValid: false, error: `Payload exceeds maximum of ${maxBytes} bytes for ${isFD ? 'CAN FD' : 'Classic CAN'}` };
        }

        return { isValid: true };
    }
};
