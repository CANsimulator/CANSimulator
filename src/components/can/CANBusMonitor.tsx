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
        <div className="glass-panel flex flex-col max-h-[400px] border-white/5 bg-dark-950/20">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-dark-950/40">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse" />
                    Live CAN Trace
                </h3>
                <button
                    onClick={() => setMessages([])}
                    className="px-3 py-1.5 text-[11px] text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-400/30 rounded transition-colors min-h-[36px]"
                >
                    Clear
                </button>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-x-auto overflow-y-auto p-0 font-mono text-[11px] scroll-smooth"
            >
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-dark-900/95 backdrop-blur-sm z-10 text-gray-400 text-[10px] tracking-wider uppercase border-b border-white/5">
                        <tr>
                            <th scope="col" className="px-4 py-2 font-medium">Time</th>
                            <th scope="col" className="px-4 py-2 font-medium">ID</th>
                            <th scope="col" className="px-4 py-2 font-medium">Type</th>
                            <th scope="col" className="px-4 py-2 font-medium">DLC</th>
                            <th scope="col" className="px-4 py-2 font-medium">Data</th>
                        </tr>
                    </thead>
                    <tbody>
                        {messages.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-[11px] italic">
                                    No frames yet. Send a CAN frame using the Frame Builder above to see traffic here.
                                </td>
                            </tr>
                        )}

                        {messages.map((msg, idx) => (
                            <tr
                                key={`${msg.timestamp}-${idx}`}
                                className="border-b border-white/5 hover:bg-white/5 transition-colors"
                            >
                                <td className="px-4 py-1.5 text-gray-600 whitespace-nowrap">
                                    {((msg.timestamp % 100000) / 1000).toFixed(3)}
                                </td>
                                <td className={cn(
                                    "px-4 py-1.5 font-bold whitespace-nowrap",
                                    msg.type === 'FD' ? 'text-cyber-purple' : 'text-cyber-blue'
                                )}>
                                    0x{msg.id.toString(16).toUpperCase().padStart(3, '0')}
                                </td>
                                <td className="px-4 py-1.5 text-[9px] uppercase whitespace-nowrap">
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded font-medium",
                                        msg.type === 'FD' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                                    )}>
                                        {msg.type}
                                    </span>
                                </td>
                                <td className="px-4 py-1.5 text-gray-300 whitespace-nowrap">
                                    {msg.dlc}
                                </td>
                                <td className="px-4 py-1.5 text-gray-300">
                                    <div className="flex flex-wrap gap-1 w-max">
                                        {Array.from(msg.data).map((byte, i) => (
                                            <span key={i}>{byte.toString(16).toUpperCase().padStart(2, '0')}</span>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
