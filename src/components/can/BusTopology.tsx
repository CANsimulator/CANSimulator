import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ECUNode {
    id: string;
    label: string;
    canId: string;
    x: number; // percentage position on bus
    isLocal?: boolean;
    online: boolean;
}

export const BusTopology: React.FC = () => {
    const [termLeft, setTermLeft] = useState(true);
    const [termRight, setTermRight] = useState(true);
    const [nodes, setNodes] = useState<ECUNode[]>([
        { id: 'ecu1', label: 'Engine ECU', canId: '0x7E0', x: 18, online: true },
        { id: 'ecu2', label: 'ABS/ESP', canId: '0x740', x: 38, online: true },
        { id: 'ecu3', label: 'Local Node', canId: '0x600', x: 58, isLocal: true, online: true },
        { id: 'ecu4', label: 'BCM', canId: '0x650', x: 78, online: true },
    ]);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);

    const toggleNode = (id: string) => {
        setNodes(prev => prev.map(n => n.id === id ? { ...n, online: !n.online } : n));
    };

    const hasTermIssue = !termLeft || !termRight;
    const onlineCount = nodes.filter(n => n.online).length;

    return (
        <div className="bg-[#1a1a1e] rounded-2xl border border-[#2a2a30] p-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
            {/* Equipment label */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono font-black text-gray-500 tracking-widest uppercase">CAN-BUS</span>
                    <span className="text-[8px] font-mono text-gray-700 tracking-wider">WIRING HARNESS</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[8px] font-mono text-gray-600">{onlineCount}/{nodes.length} NODES</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${hasTermIssue ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}
                        style={{ boxShadow: hasTermIssue ? '0 0 4px #ef4444' : '0 0 4px #22c55e' }}
                    />
                </div>
            </div>

            {/* Termination Warning */}
            <AnimatePresence>
                {hasTermIssue && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mb-3 p-2 rounded-md bg-[#1c0a0a] border border-red-900/40 flex items-start gap-2">
                            <span className="text-red-500 text-[10px] mt-px">&#x26A0;</span>
                            <span className="text-[8px] font-mono text-red-400/80 leading-relaxed">
                                IMPEDANCE MISMATCH — {!termLeft && !termRight ? 'Both' : !termLeft ? 'Near-end' : 'Far-end'} termination missing.
                                Signal reflections at {!termLeft && !termRight ? 'both line ends' : 'unterminated end'} will corrupt high-frequency bit edges.
                                Expect FORM and BIT errors above 250 kbit/s.
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Bus Wiring Diagram ─── */}
            <div className="relative bg-[#0c0c0e] rounded-lg border border-[#1a1a20] p-4 min-h-[200px] overflow-hidden">

                {/* CANH wire label */}
                <div className="absolute left-2 text-[6px] font-mono font-bold tracking-wider" style={{ top: 'calc(50% - 12px)', color: '#00f3ff60' }}>
                    CANH
                </div>
                {/* CANL wire label */}
                <div className="absolute left-2 text-[6px] font-mono font-bold tracking-wider" style={{ top: 'calc(50% + 6px)', color: '#bf00ff60' }}>
                    CANL
                </div>

                {/* ─── Main Bus Wires (twisted pair) ─── */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                    {/* CANH wire */}
                    <line
                        x1="8%" y1="48%" x2="92%" y2="48%"
                        stroke={hasTermIssue ? '#ef444440' : '#00f3ff25'}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    />
                    {/* CANL wire */}
                    <line
                        x1="8%" y1="52%" x2="92%" y2="52%"
                        stroke={hasTermIssue ? '#ef444840' : '#bf00ff25'}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    />

                    {/* Twist marks to indicate twisted pair */}
                    {Array.from({ length: 8 }, (_, i) => {
                        const cx = 15 + i * 10;
                        return (
                            <g key={i} opacity="0.15">
                                <line x1={`${cx}%`} y1="47%" x2={`${cx + 1}%`} y2="53%" stroke="#666" strokeWidth="0.5" />
                            </g>
                        );
                    })}

                    {/* Drop cables from nodes */}
                    {nodes.map(node => (
                        <g key={node.id}>
                            {/* Drop stub to CANH */}
                            <line
                                x1={`${node.x}%`} y1="35%"
                                x2={`${node.x}%`} y2="48%"
                                stroke={node.online ? (node.isLocal ? '#00f3ff30' : '#ffffff10') : '#ef444420'}
                                strokeWidth="1.5"
                                strokeDasharray={node.online ? 'none' : '3 2'}
                            />
                            {/* Tap dot on CANH */}
                            <circle
                                cx={`${node.x}%`} cy="48%"
                                r="2.5"
                                fill={node.online ? (node.isLocal ? '#00f3ff' : '#555') : '#333'}
                                stroke={node.online && node.isLocal ? '#00f3ff' : 'none'}
                                strokeWidth="1"
                                opacity={node.online ? 1 : 0.3}
                            />
                            {/* Tap dot on CANL */}
                            <circle
                                cx={`${node.x}%`} cy="52%"
                                r="2.5"
                                fill={node.online ? (node.isLocal ? '#bf00ff' : '#555') : '#333'}
                                opacity={node.online ? 1 : 0.3}
                            />
                        </g>
                    ))}
                </svg>

                {/* Signal pulse animation */}
                {!hasTermIssue && onlineCount > 0 && (
                    <motion.div
                        className="absolute pointer-events-none rounded-full"
                        style={{
                            top: 'calc(50% - 3px)',
                            height: '6px',
                            width: '30px',
                            left: '10%',
                            background: 'linear-gradient(90deg, transparent, #00f3ff80, transparent)',
                            filter: 'blur(1px)',
                        }}
                        animate={{ left: ['10%', '85%'] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'linear', repeatDelay: 0.5 }}
                    />
                )}

                {/* Reflection pulse when bad termination */}
                {hasTermIssue && (
                    <motion.div
                        className="absolute pointer-events-none rounded-full"
                        style={{
                            top: 'calc(50% - 4px)',
                            height: '8px',
                            width: '20px',
                            background: 'linear-gradient(90deg, transparent, #ef4444, transparent)',
                            filter: 'blur(2px)',
                        }}
                        animate={{
                            left: !termRight ? ['85%', '75%', '85%'] : ['10%', '20%', '10%'],
                            opacity: [0.8, 0.3, 0.8],
                        }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                    />
                )}

                {/* ─── Termination Resistors ─── */}
                <TermSwitch
                    side="left"
                    isOn={termLeft}
                    onToggle={() => setTermLeft(!termLeft)}
                />
                <TermSwitch
                    side="right"
                    isOn={termRight}
                    onToggle={() => setTermRight(!termRight)}
                />

                {/* ─── ECU Node Boxes ─── */}
                {nodes.map(node => (
                    <div
                        key={node.id}
                        className="absolute flex flex-col items-center"
                        style={{ left: `${node.x}%`, top: '2%', transform: 'translateX(-50%)', width: '76px' }}
                    >
                        <button
                            onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                            className={`w-full p-2 rounded-md border text-center transition-all duration-300 ${
                                node.isLocal
                                    ? 'bg-[#060d10] border-[#00f3ff40]'
                                    : node.online
                                    ? 'bg-[#0c0c0e] border-[#2a2a30]'
                                    : 'bg-[#0c0c0e] border-[#1a0a0a] opacity-40'
                            }`}
                            style={node.isLocal && node.online ? {
                                boxShadow: '0 0 10px rgba(0,243,255,0.08)',
                            } : undefined}
                        >
                            {/* Status LED */}
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <div
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{
                                        backgroundColor: node.online ? (node.isLocal ? '#00f3ff' : '#22c55e') : '#ef4444',
                                        boxShadow: node.online ? `0 0 3px ${node.isLocal ? '#00f3ff' : '#22c55e'}` : '0 0 3px #ef4444',
                                    }}
                                />
                            </div>
                            <span className={`text-[7px] font-mono font-bold uppercase tracking-tight block leading-tight ${
                                node.isLocal ? 'text-[#00f3ff]' : node.online ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                {node.label}
                            </span>
                            <span className="text-[6px] font-mono text-gray-600 block mt-0.5">{node.canId}</span>
                        </button>
                    </div>
                ))}

                {/* ─── Bus impedance indicators ─── */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-between px-[8%]">
                    <span className="text-[6px] font-mono text-gray-700">Z₀ = 120Ω</span>
                    <span className="text-[6px] font-mono text-gray-700">Twisted-pair differential bus (ISO 11898-2)</span>
                    <span className="text-[6px] font-mono text-gray-700">Z₀ = 120Ω</span>
                </div>
            </div>

            {/* ─── Node Detail / Control Strip ─── */}
            <div className="mt-3 pt-3 border-t border-[#222]">
                <AnimatePresence mode="wait">
                    {selectedNode ? (
                        <motion.div
                            key={selectedNode}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
                        >
                            {(() => {
                                const node = nodes.find(n => n.id === selectedNode)!;
                                return (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{
                                                    backgroundColor: node.online ? '#22c55e' : '#ef4444',
                                                    boxShadow: `0 0 4px ${node.online ? '#22c55e' : '#ef4444'}`,
                                                }}
                                            />
                                            <span className="text-[10px] font-mono font-bold text-white uppercase">{node.label}</span>
                                            <span className="text-[9px] font-mono text-gray-500">{node.canId}</span>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            {[
                                                { k: 'Type', v: node.isLocal ? 'LOCAL' : 'REMOTE' },
                                                { k: 'Stub', v: '< 0.3m' },
                                                { k: 'Baud', v: '500k' },
                                                { k: 'State', v: node.online ? 'ONLINE' : 'OFFLINE' },
                                            ].map(item => (
                                                <div key={item.k} className="px-2 py-1 rounded bg-[#0c0c0e] border border-[#222]">
                                                    <span className="text-[6px] font-mono text-gray-600 uppercase block">{item.k}</span>
                                                    <span className="text-[8px] font-mono font-bold text-gray-300">{item.v}</span>
                                                </div>
                                            ))}

                                            <button
                                                onClick={() => toggleNode(node.id)}
                                                className={`ml-2 px-3 py-1.5 rounded-md text-[8px] font-mono font-bold uppercase tracking-wider border transition-all active:scale-95 ${
                                                    node.online
                                                        ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                                                        : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                                                }`}
                                            >
                                                {node.online ? 'Disconnect' : 'Connect'}
                                            </button>
                                        </div>
                                    </>
                                );
                            })()}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="hint"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-[8px] font-mono text-gray-600 text-center"
                        >
                            Click a node to inspect &amp; control &middot; Toggle termination resistors to observe reflection effects
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// ─── Physical Toggle Switch for Termination ──────────────────
const TermSwitch: React.FC<{ side: 'left' | 'right'; isOn: boolean; onToggle: () => void }> = ({ side, isOn, onToggle }) => {
    const isLeft = side === 'left';

    return (
        <div
            className="absolute flex flex-col items-center cursor-pointer z-10"
            style={{
                [side]: '3%',
                top: '38%',
            }}
            onClick={onToggle}
        >
            {/* Resistor body */}
            <div
                className="relative w-6 h-10 rounded-sm border flex flex-col items-center justify-center gap-[2px] transition-all duration-300"
                style={{
                    borderColor: isOn ? (isLeft ? '#00f3ff50' : '#bf00ff50') : '#333',
                    backgroundColor: isOn ? '#0a0a0f' : '#0a0a0f',
                }}
            >
                {/* Resistor bands */}
                {[0, 1, 2, 3].map(i => (
                    <div
                        key={i}
                        className="w-4 h-[1.5px] rounded-full transition-colors duration-300"
                        style={{
                            backgroundColor: isOn
                                ? (isLeft ? '#00f3ff40' : '#bf00ff40')
                                : '#222',
                        }}
                    />
                ))}

                {/* Switch indicator */}
                <motion.div
                    className="absolute -bottom-3 w-3 h-3 rounded-full border-2"
                    animate={{
                        backgroundColor: isOn ? '#22c55e' : '#111',
                        borderColor: isOn ? '#22c55e50' : '#333',
                        boxShadow: isOn ? '0 0 6px #22c55e50' : 'none',
                    }}
                />
            </div>

            <span className="mt-3 text-[6px] font-mono font-bold uppercase tracking-wider"
                style={{ color: isOn ? (isLeft ? '#00f3ff' : '#bf00ff') : '#444' }}
            >
                R{isLeft ? '1' : '2'}
            </span>
            <span className="text-[6px] font-mono font-bold"
                style={{ color: isOn ? '#888' : '#ef444480' }}
            >
                120{'\u03A9'} {isOn ? 'ON' : 'OFF'}
            </span>
        </div>
    );
};
