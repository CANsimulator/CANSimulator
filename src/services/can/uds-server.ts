import { canSimulator } from './can-simulator';
import type { CANMessage } from './can-simulator';

/**
 * UDS Service IDs (ISO 14229-1)
 */
export const UDSService = {
  DIAGNOSTIC_SESSION_CONTROL: 0x10,
  ECU_RESET: 0x11,
  SECURITY_ACCESS: 0x27,
  COMMUNICATION_CONTROL: 0x28,
  TESTER_PRESENT: 0x3E,
  ACCESS_TIMING_PARAMETER: 0x83,
  SECURED_DATA_TRANSMISSION: 0x84,
  CONTROLS_DTC_SETTING: 0x85,
  RESPONSE_ON_EVENT: 0x86,
  LINK_CONTROL: 0x87,
  READ_DATA_BY_IDENTIFIER: 0x22,
  READ_MEMORY_BY_ADDRESS: 0x23,
  READ_SCALING_DATA_BY_IDENTIFIER: 0x24,
  READ_DATA_BY_PERIODIC_IDENTIFIER: 0x2A,
  DYNAMICALLY_DEFINE_DATA_IDENTIFIER: 0x2C,
  WRITE_DATA_BY_IDENTIFIER: 0x2E,
  WRITE_MEMORY_BY_ADDRESS: 0x3D,
  CLEAR_DIAGNOSTIC_INFORMATION: 0x14,
  READ_DTC_INFORMATION: 0x19,
  INPUT_OUTPUT_CONTROL_BY_IDENTIFIER: 0x2F,
  ROUTINE_CONTROL: 0x31,
  REQUEST_DOWNLOAD: 0x34,
  REQUEST_UPLOAD: 0x35,
  TRANSFER_DATA: 0x36,
  REQUEST_TRANSFER_EXIT: 0x37,
} as const;

/**
 * UDS Negative Response Codes (NRC)
 */
export const UDSNRC = {
  POSITIVE_RESPONSE: 0x00,
  GENERAL_REJECT: 0x10,
  SERVICE_NOT_SUPPORTED: 0x11,
  SUBFUNCTION_NOT_SUPPORTED: 0x12,
  INCORRECT_MESSAGE_LENGTH_OR_INVALID_FORMAT: 0x13,
  RESPONSE_TOO_LONG: 0x14,
  BUSY_REPEAT_REQUEST: 0x21,
  CONDITIONS_NOT_CORRECT: 0x22,
  REQUEST_SEQUENCE_ERROR: 0x24,
  NO_RESPONSE_FROM_SUBNET_COMPONENT: 0x25,
  FAILURE_PREVENTS_EXECUTION_OF_REQUESTED_ACTION: 0x26,
  REQUEST_OUT_OF_RANGE: 0x31,
  SECURITY_ACCESS_DENIED: 0x33,
  INVALID_KEY: 0x35,
  EXCEEDED_NUMBER_OF_ATTEMPTS: 0x36,
  REQUIRED_TIME_DELAY_NOT_EXPIRED: 0x37,
  UPLOAD_DOWNLOAD_NOT_ACCEPTED: 0x70,
  TRANSFER_DATA_SUSPENDED: 0x71,
  GENERAL_PROGRAMMING_FAILURE: 0x72,
  WRONG_BLOCK_SEQUENCE_COUNTER: 0x73,
  RESPONSE_PENDING: 0x78,
} as const;

export type UDSNRCValue = typeof UDSNRC[keyof typeof UDSNRC];

export interface UDSResponse {
  serviceId: number;
  nrc?: UDSNRCValue;
  data?: Uint8Array;
  responseTimeMs: number;
}

/**
 * Simulates a UDS server (ECU) with configurable P2 timings.
 */
export class UDSServer {
  private p2Ms = 50; // Typical P2 timing
  
  constructor(public ecuId: number, public responseId: number) {}

  async handleMessage(message: CANMessage): Promise<void> {
    
    // Minimal check for PCI (Protocol Control Information) - assuming Single Frame (SF) for now
    // Byte 0: [High 4 bits: Frame Type (0=SF), Low 4 bits: Length]
    const pci = message.data[0];
    const frameType = (pci >> 4) & 0x0F;
    if (frameType !== 0) return; // Only SF supported for this simulator logic currently

    const sid = message.data[1];
    
    // Simulate processing time
    let processingDelay = this.p2Ms;
    
    // Simulate P2* (Response Pending) for certain heavy services
    if (sid === UDSService.ROUTINE_CONTROL || sid === UDSService.REQUEST_DOWNLOAD) {
      // Send 0x7F 78 first
      await this.sendNRC(sid, UDSNRC.RESPONSE_PENDING);
      processingDelay = 800; // Take some more time
    }

    await new Promise(resolve => setTimeout(resolve, processingDelay));

    // Handle service
    switch (sid) {
      case UDSService.DIAGNOSTIC_SESSION_CONTROL:
        await this.sendPositive(sid, new Uint8Array([message.data[2] || 0x01, 0x00, 0x32, 0x01, 0xF4]));
        break;
      case UDSService.TESTER_PRESENT:
        await this.sendPositive(sid, new Uint8Array([0x00]));
        break;
      case UDSService.READ_DATA_BY_IDENTIFIER:
        const did = (message.data[2] << 8) | message.data[3];
        if (did === 0xF190) { // VIN
          const vin = new TextEncoder().encode("SIMULATOR12345678");
          await this.sendPositive(sid, new Uint8Array([0xF1, 0x90, ...vin]));
        } else {
          await this.sendNRC(sid, UDSNRC.REQUEST_OUT_OF_RANGE);
        }
        break;
      default:
        await this.sendNRC(sid, UDSNRC.SERVICE_NOT_SUPPORTED);
    }
  }

  private async sendPositive(sid: number, data: Uint8Array): Promise<void> {
    const responseSid = sid + 0x40;
    const payload = new Uint8Array([data.length + 1, responseSid, ...data]);
    await canSimulator.broadcast({
      id: this.responseId,
      dlc: 8,
      data: this.padToDlc(payload, 8),
      type: 'STANDARD',
      timestamp: Date.now()
    });
  }

  private async sendNRC(sid: number, nrc: UDSNRCValue): Promise<void> {
    const payload = new Uint8Array([0x03, 0x7F, sid, nrc]);
    await canSimulator.broadcast({
      id: this.responseId,
      dlc: 8,
      data: this.padToDlc(payload, 8),
      type: 'STANDARD',
      timestamp: Date.now()
    });
  }

  private padToDlc(data: Uint8Array, dlc: number): Uint8Array {
    const padded = new Uint8Array(dlc).fill(0xAA); // 0xAA is common filler
    padded.set(data.slice(0, dlc));
    return padded;
  }
}
