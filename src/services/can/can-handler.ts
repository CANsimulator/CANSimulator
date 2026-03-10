import type { CANMessage } from './can-simulator';

export interface CANHandler {
    id: string;
    name: string;
    interestedMessageIds: number[];
    onReceive: (message: CANMessage) => Promise<void>;
}

/**
 * CAN Handler Registry — routes messages to virtual ECUs by Message ID.
 */
class CANHandlerRegistry {
    private handlers: Map<string, CANHandler> = new Map();

    register(handler: CANHandler): void {
        this.handlers.set(handler.id, handler);
    }

    unregister(handlerId: string): void {
        this.handlers.delete(handlerId);
    }

    async route(message: CANMessage): Promise<void> {
        const promises: Promise<void>[] = [];
        this.handlers.forEach(handler => {
            if (handler.interestedMessageIds.includes(message.id)) {
                promises.push(handler.onReceive(message));
            }
        });
        await Promise.allSettled(promises);
    }

    getHandlers(): CANHandler[] {
        return Array.from(this.handlers.values());
    }
}

export const canHandlerRegistry = new CANHandlerRegistry();
