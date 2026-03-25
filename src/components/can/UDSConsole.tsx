import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Terminal, Clock, Zap, Trash2, Activity
} from 'lucide-react';
import { canSimulator } from '../../services/can/can-simulator';
import type { CANMessage } from '../../services/can/can-simulator';
import { UDSService, UDSNRC } from '../../services/can/uds-server';
import { cn } from '../../utils/cn';

interface UDSLogEntry {
  id: string;
  timestamp: number;
  type: 'request' | 'response';
  service: string;
  data: string;
  isNrc?: boolean;
  responseTime?: number;
}

export function UDSConsole() {
  const [input, setInput] = useState('10 03');
  const [logs, setLogs] = useState<UDSLogEntry[]>([]);
  const [isSending, setIsSending] = useState(false);
  const lastRequestTime = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to CAN bus to catch responses
  useEffect(() => {
    const observer = {
      onMessage: (message: CANMessage) => {
        // 0x7E8 is the Engine ECU response ID
        if (message.id === 0x7E8) {
          const sid = message.data[1];
          const isNrc = sid === 0x7F;
          const responseTime = lastRequestTime.current ? performance.now() - lastRequestTime.current : undefined;
          
          const serviceName = isNrc 
            ? `NRC ${message.data[3].toString(16).toUpperCase().padStart(2, '0')}`
            : Object.keys(UDSService).find(key => (UDSService as any)[key] === (sid - 0x40)) || 'Unknown';

          const newLog: UDSLogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            type: 'response',
            service: serviceName,
            data: Array.from(message.data).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' '),
            isNrc,
            responseTime
          };

          // If it's a "Response Pending" (0x78), don't clear the lastRequestTime yet
          if (isNrc && message.data[3] === UDSNRC.RESPONSE_PENDING) {
            // Keep waiting for the final response
          } else {
            lastRequestTime.current = null;
          }

          setLogs(prev => [...prev, newLog]);
        }
      }
    };

    const unsubscribe = canSimulator.subscribe(observer);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const sendRequest = async () => {
    const bytes = input.split(' ').map(h => parseInt(h, 16)).filter(n => !isNaN(n));
    if (bytes.length === 0) return;

    setIsSending(true);
    lastRequestTime.current = performance.now();

    const data = new Uint8Array(8).fill(0xAA);
    data[0] = bytes.length; // PCI SF
    bytes.forEach((b, i) => data[i + 1] = b);

    const sid = bytes[0];
    const serviceName = Object.keys(UDSService).find(key => (UDSService as any)[key] === sid) || 'Unknown';

    const newLog: UDSLogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      type: 'request',
      service: serviceName,
      data: Array.from(data).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' '),
    };

    setLogs(prev => [...prev, newLog]);

    await canSimulator.broadcast({
      id: 0x7E0, // Physical Request to Engine
      dlc: 8,
      data,
      type: 'STANDARD',
      timestamp: Date.now()
    });

    setIsSending(false);
  };

  const clearLogs = () => setLogs([]);

  const quickActions = [
    { label: 'Session: Extended', cmd: '10 03' },
    { label: 'Tester Present', cmd: '3E 00' },
    { label: 'Read VIN', cmd: '22 F1 90' },
    { label: 'ECU Reset', cmd: '11 01' },
  ];

  return (
    <div className="glass-panel overflow-hidden border-cyber-blue/30 bg-dark-950/40 backdrop-blur-xl flex flex-col h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-cyber-blue" />
          <h3 className="text-xs font-black text-white uppercase tracking-tighter">UDS Diagnostic Console</h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={clearLogs}
            className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 transition-colors"
            title="Clear Terminal"
          >
            <Trash2 size={14} />
          </button>
          <div className="px-2 py-0.5 rounded bg-cyber-blue/20 border border-cyber-blue/30 text-[11px] font-bold text-cyber-blue">
            UDS-ISO-14229
          </div>
        </div>
      </div>

      {/* Terminal View */}
      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-4 font-mono text-xs space-y-3 custom-scrollbar bg-black/20"
      >
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-3 opacity-50">
            <Activity className="animate-pulse" size={32} />
            <p className="text-[11px] uppercase tracking-widest font-bold">Awaiting Connection...</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "p-2 rounded border transition-all",
                log.type === 'request' 
                  ? "bg-blue-500/5 border-blue-500/10 text-blue-300 ml-4" 
                  : "bg-emerald-500/5 border-emerald-500/10 text-emerald-300 mr-4",
                log.isNrc && "bg-red-500/10 border-red-500/20 text-red-400"
              )}
            >
              <div className="flex items-center justify-between mb-1 opacity-70">
                <span className="text-[11px] font-black uppercase flex items-center gap-1">
                  {log.type === 'request' ? <Send size={8} /> : <Zap size={8} />}
                  {log.type} // {log.service}
                </span>
                <span className="text-[11px]">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 })}
                </span>
              </div>
              <div className="grid grid-cols-[1fr,auto] gap-2 items-end">
                <div className="tracking-widest font-bold text-sm">
                  {log.data}
                </div>
                {log.responseTime && (
                  <div className="flex items-center gap-1 text-[11px] font-black text-cyber-blue bg-cyber-blue/10 px-1.5 py-0.5 rounded">
                    <Clock size={8} />
                    {log.responseTime.toFixed(1)}ms
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/5 border-t border-white/5 space-y-4">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {quickActions.map(action => (
            <button
              key={action.cmd}
              onClick={() => setInput(action.cmd)}
              className="px-2 py-1 text-[11px] font-black uppercase bg-white/5 border border-white/10 rounded hover:bg-cyber-blue/10 hover:border-cyber-blue/30 transition-all text-gray-400 hover:text-cyber-blue"
            >
              {action.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-grow">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-blue opacity-50">
              {'>'}
            </div>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendRequest()}
              className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-8 pr-4 text-cyber-blue font-mono text-sm focus:outline-none focus:border-cyber-blue/50 focus:ring-1 focus:ring-cyber-blue/30 transition-all"
              placeholder="Enter Hex Bytes (e.g. 10 01)"
            />
          </div>
          <button
            onClick={sendRequest}
            disabled={isSending}
            className={cn(
              "px-6 py-2.5 bg-cyber-blue text-black font-black uppercase text-xs rounded-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,243,255,0.3)]",
              isSending && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSending ? <Clock className="animate-spin" size={16} /> : <Send size={16} />}
            Execute
          </button>
        </div>
      </div>
    </div>
  );
}
