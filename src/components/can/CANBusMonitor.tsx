import React, { useEffect, useState, useRef } from 'react';
import { canSimulator } from '../../services/can/can-simulator';
import type { CANMessage } from '../../services/can/can-simulator';
import { cn } from '../../utils/cn';

export const CANBusMonitor: React.FC = () => {
    const [messages, setMessages] = useState<CANMessage[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribe = canSimulator.subscribe({
            onMessage: (msg) => setMessages(prev => [...prev.slice(-49), msg]),
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="glass-panel flex flex-col h-[400px] border-white/5 bg-dark-950/20">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-dark-950/40">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse" />
                    Live CAN Trace
                </h3>
                <button
                    onClick={() => setMessages([])}
                    className="text-[10px] text-gray-500 hover:text-cyber-pink transition-colors uppercase font-mono"
                >
                    Clear
                </button>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-2 font-mono text-[11px] space-y-1 scroll-smooth"
            >
                {/* Header row */}
                <div className="grid grid-cols-12 gap-2 text-dark-500 uppercase pb-2 border-b border-white/5 mb-2 sticky top-0 bg-dark-900/80 backdrop-blur-sm z-10">
                    <div className="col-span-2">Time</div>
                    <div className="col-span-2">ID</div>
                    <div className="col-span-1">Type</div>
                    <div className="col-span-1">DLC</div>
                    <div className="col-span-6">Data</div>
                </div>

                {messages.length === 0 && (
                    <div className="text-center py-20 text-dark-600 italic">Waiting for frames…</div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={`${msg.timestamp}-${idx}`}
                        className={cn(
                            'grid grid-cols-12 gap-2 py-1 border-b border-white/5 hover:bg-white/5 transition-colors',
                            msg.type === 'FD' ? 'text-cyber-purple' : 'text-cyber-blue'
                        )}
                    >
                        <div className="col-span-2 text-gray-600">
                            {((msg.timestamp % 100000) / 1000).toFixed(3)}
                        </div>
                        <div className="col-span-2 font-bold">
                            0x{msg.id.toString(16).toUpperCase().padStart(3, '0')}
                        </div>
                        <div className="col-span-1 text-[9px] uppercase">{msg.type}</div>
                        <div className="col-span-1 text-center">{msg.dlc}</div>
                        <div className="col-span-6 flex flex-wrap gap-1">
                            {Array.from(msg.data).map((byte, i) => (
                                <span key={i}>{byte.toString(16).toUpperCase().padStart(2, '0')}</span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
