import React, { useEffect, useState, useRef } from 'react';
import { canSimulator } from '../../services/can/can-simulator';
import type { CANMessage } from '../../services/can/can-simulator';
import { cn } from '../../utils/cn';
import { Share2, FileJson, FileSpreadsheet } from 'lucide-react';

export const CANBusMonitor: React.FC = () => {
    const [messages, setMessages] = useState<CANMessage[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load trace from URL if present
        const searchParams = new URLSearchParams(window.location.search);
        const traceSub = searchParams.get('trace');
        if (traceSub) {
            try {
                const decoded = JSON.parse(atob(traceSub));
                const loadedMessages = decoded.map((m: any) => ({
                    id: m.id,
                    data: new Uint8Array(m.d),
                    type: m.t,
                    dlc: m.d.length,
                    timestamp: Date.now()
                }));
                setMessages(loadedMessages);
            } catch (e) {
                console.error("Failed to load trace from URL", e);
            }
        }

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

    const exportToCSV = () => {
        const header = "Timestamp,ID,Type,DLC,Data\n";
        const rows = messages.map(m => 
            `${m.timestamp},0x${m.id.toString(16).toUpperCase()},${m.type},${m.dlc},${Array.from(m.data).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}`
        ).join("\n");
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `can_trace_${Date.now()}.csv`;
        a.click();
    };

    const exportToJSON = () => {
        const data = messages.map(m => ({
            ...m,
            data: Array.from(m.data)
        }));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `can_trace_${Date.now()}.json`;
        a.click();
    };

    const generateShareLink = () => {
        const data = messages.map(m => ({
            id: m.id,
            d: Array.from(m.data),
            t: m.type
        }));
        const encoded = btoa(JSON.stringify(data));
        const url = new URL(window.location.href);
        url.searchParams.set('trace', encoded);
        navigator.clipboard.writeText(url.toString());
        alert('Share link copied to clipboard!');
    };

    return (
        <div className="glass-panel flex flex-col max-h-[400px] border-gray-200 dark:border-white/5 bg-white dark:bg-dark-950/20">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-white/5 bg-slate-50 dark:bg-dark-950/40">
                <h3 className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse shadow-glow" />
                    Live CAN Trace
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={generateShareLink}
                        title="Copy Shareable Link"
                        className="p-1.5 text-gray-500 hover:text-cyber-blue transition-colors"
                    >
                        <Share2 size={14} />
                    </button>
                    <button
                        onClick={exportToJSON}
                        title="Export JSON"
                        className="p-1.5 text-gray-500 hover:text-cyber-purple transition-colors"
                    >
                        <FileJson size={14} />
                    </button>
                    <button
                        onClick={exportToCSV}
                        title="Export CSV"
                        className="p-1.5 text-gray-500 hover:text-cyber-green transition-colors"
                    >
                        <FileSpreadsheet size={14} />
                    </button>
                    <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-1" />
                    <button
                        onClick={() => setMessages([])}
                        className="px-2 py-1 text-xs font-black text-gray-400 hover:text-red-500 uppercase tracking-tighter transition-colors"
                    >
                        Clear
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-x-auto overflow-y-auto p-0 font-mono text-xs scroll-smooth"
            >
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white/95 dark:bg-dark-900/95 backdrop-blur-sm z-10 text-gray-600 dark:text-gray-400 text-xs tracking-wider uppercase border-b border-gray-200 dark:border-white/5">
                        <tr>
                            <th scope="col" className="px-4 py-2 font-black">Time</th>
                            <th scope="col" className="px-4 py-2 font-black">ID</th>
                            <th scope="col" className="px-4 py-2 font-black">Type</th>
                            <th scope="col" className="px-4 py-2 font-black">DLC</th>
                            <th scope="col" className="px-4 py-2 font-black">Data</th>
                        </tr>
                    </thead>
                    <tbody>
                        {messages.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-600 dark:text-gray-500 text-xs italic font-medium">
                                    No frames yet. Send a CAN frame using the Frame Builder above to see traffic here.
                                </td>
                            </tr>
                        )}

                        {messages.map((msg, idx) => (
                            <tr
                                key={`${msg.timestamp}-${idx}`}
                                className="border-b border-gray-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                            >
                                <td className="px-4 py-1.5 text-gray-700 dark:text-gray-400 whitespace-nowrap font-medium">
                                    {((msg.timestamp % 100000) / 1000).toFixed(3)}
                                </td>
                                <td className={cn(
                                    "px-4 py-1.5 font-bold whitespace-nowrap",
                                    msg.type === 'FD' ? 'text-cyber-purple' : 'text-cyber-blue'
                                )}>
                                    0x{msg.id.toString(16).toUpperCase().padStart(3, '0')}
                                </td>
                                <td className="px-4 py-1.5 text-xs uppercase whitespace-nowrap">
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded font-medium",
                                        msg.type === 'FD' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300' : 'bg-blue-500/20 text-blue-600 dark:text-blue-300'
                                    )}>
                                        {msg.type}
                                    </span>
                                </td>
                                <td className="px-4 py-1.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                    {msg.dlc}
                                </td>
                                <td className="px-4 py-1.5 text-gray-700 dark:text-gray-300">
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
