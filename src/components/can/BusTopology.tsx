import React, { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    ArrowRight,
    ArrowLeft,
    ChevronDown,
    ChevronUp,
    Check
} from 'lucide-react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { cn } from '../../utils/cn';
import { useTestBench } from '../../context/TestBenchContext';
import { useTheme } from '../../context/ThemeContext';
import { Tooltip } from '../ui';

/* ═══════════════════════════════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════════════════════════════ */
interface ECUNode {
    id: string;
    label: string;
    description?: string;
    canId: string;
    x: number;
    online: boolean;
    isLocal?: boolean;
    domain: ECUDomain;
    txCount: number;
    rxCount: number;
    errorCount: number;
    stubLength: number;
    baudRate: string;
}

type ECUDomain = 'powertrain' | 'chassis' | 'body' | 'infotainment' | 'adas' | 'diagnostic';

type FramePhase = 'idle' | 'sof' | 'arbitration' | 'control' | 'data' | 'crc' | 'ack' | 'eof' | 'done';
type MessageType = 'data' | 'remote' | 'diagnostic';

interface TransmissionState {
    id: number;
    fromId: string;
    toId: string | 'broadcast';
    phase: FramePhase;
    progress: number;       // 0-100
    messageType: MessageType;
    dlc: number;
    dataBytes: string[];
    ackReceived: boolean;
    error: string | null;
    timestamp: number;
    controllerBaud: number;
    participantSnapshot: Array<Pick<ECUNode, 'id' | 'label' | 'online' | 'baudRate'>>;
}

interface MessageLogEntry {
    id: number;
    from: string;
    to: string;
    fromLabel: string;
    toLabel: string;
    messageType: MessageType;
    dlc: number;
    data: string[];
    success: boolean;
    error: string | null;
    timestamp: number;
}

const DOMAIN_META: Record<ECUDomain, { color: string; glow: string; label: string }> = {
    powertrain: { color: '#f59e0b', glow: '#f59e0b60', label: 'Powertrain' },
    chassis: { color: '#3b82f6', glow: '#3b82f660', label: 'Chassis' },
    body: { color: '#a855f7', glow: '#a855f760', label: 'Body' },
    infotainment: { color: '#ec4899', glow: '#ec489960', label: 'Infotainment' },
    adas: { color: '#14b8a6', glow: '#14b8a660', label: 'ADAS' },
    diagnostic: { color: '#00f3ff', glow: '#00f3ff60', label: 'Diagnostic' },
};

const PHASE_INFO: Record<FramePhase, { label: string; color: string; description: string; bits: string }> = {
    idle: { label: 'IDLE', color: '#555', description: 'Bus is idle — recessive state (logic 1). Any node may start transmission.', bits: '' },
    sof: { label: 'SOF', color: '#22c55e', description: 'Start of Frame — a single dominant bit (logic 0) signals the beginning of a new message. All nodes synchronize here.', bits: '1 bit' },
    arbitration: { label: 'ARBITRATION', color: '#f59e0b', description: 'Arbitration field — the 11-bit (or 29-bit extended) identifier is sent MSB-first. Lower ID = higher priority wins.', bits: '11-29 bits' },
    control: { label: 'CONTROL', color: '#3b82f6', description: 'Control field — contains IDE, r0, and Data Length Code (DLC) specifying 0-8 data bytes to follow.', bits: '6 bits' },
    data: { label: 'DATA', color: '#a855f7', description: 'Data field — the actual payload. 0 to 8 bytes (64 bits max). CAN FD extends this to 64 bytes.', bits: '0-64 bits' },
    crc: { label: 'CRC', color: '#ec4899', description: 'CRC field — 15-bit CRC sequence + 1-bit CRC delimiter. All receivers compute CRC and compare.', bits: '16 bits' },
    ack: { label: 'ACK', color: '#14b8a6', description: 'ACK slot — transmitter sends recessive, any receiver that decoded correctly pulls dominant = acknowledged.', bits: '2 bits' },
    eof: { label: 'EOF', color: '#00f3ff', description: 'End of Frame — 7 recessive bits. After 3-bit intermission, bus returns to idle.', bits: '7 bits' },
    done: { label: 'COMPLETE', color: '#22c55e', description: 'Transmission complete. Frame successfully delivered and acknowledged.', bits: '' },
};

const PHASE_ORDER: FramePhase[] = ['sof', 'arbitration', 'control', 'data', 'crc', 'ack', 'eof', 'done'];

const DEFAULT_NODES: ECUNode[] = [
    { id: 'ecu1', label: 'ECM', description: 'Engine ECU - ECM', canId: '0x7E0', x: 10, online: true, domain: 'powertrain', txCount: 0, rxCount: 0, errorCount: 0, stubLength: 0.15, baudRate: '500k' },
    { id: 'ecu2', label: 'TCU', description: 'Transmission ECU - TCU', canId: '0x7E1', x: 20, online: true, domain: 'powertrain', txCount: 0, rxCount: 0, errorCount: 0, stubLength: 0.20, baudRate: '500k' },
    { id: 'ecu3', label: 'ABS/ESP', description: 'Anti-lock Braking System - ABS/ESP', canId: '0x740', x: 30, online: true, domain: 'chassis', txCount: 0, rxCount: 0, errorCount: 0, stubLength: 0.18, baudRate: '500k' },
    { id: 'ecu4', label: 'EPS', description: 'Electric Power Steering - EPS', canId: '0x742', x: 40, online: true, domain: 'chassis', txCount: 0, rxCount: 0, errorCount: 0, stubLength: 0.12, baudRate: '500k' },
    { id: 'ecu5', label: 'BCM', description: 'Body Control Module - BCM', canId: '0x650', x: 50, online: true, domain: 'body', txCount: 0, rxCount: 0, errorCount: 0, stubLength: 0.25, baudRate: '500k' },
    { id: 'ecu6', label: 'IC', description: 'Instrument Cluster - IC', canId: '0x660', x: 60, online: true, domain: 'infotainment', txCount: 0, rxCount: 0, errorCount: 0, stubLength: 0.30, baudRate: '500k' },
    { id: 'ecu7', label: 'ADAS', description: 'Advanced Driver Assistance - ADAS', canId: '0x680', x: 70, online: true, domain: 'adas', txCount: 0, rxCount: 0, errorCount: 0, stubLength: 0.10, baudRate: '500k' },
    { id: 'ecu8', label: 'OBD-GW', description: 'OBD Diagnostic Gateway - OBD-GW', canId: '0x7DF', x: 82, online: true, isLocal: true, domain: 'diagnostic', txCount: 0, rxCount: 0, errorCount: 0, stubLength: 0.05, baudRate: '500k' },
];

const BAUD_OPTIONS = ['125k', '250k', '500k', '1M'] as const;
const STORAGE_KEY = 'canscope-bus-nodes';
type PersistedNode = Omit<ECUNode, 'txCount' | 'rxCount' | 'errorCount'>;
const RANDOM_DATA = () => Array.from({ length: 8 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase());


/* ═══════════════════════════════════════════════════════════════
   Optimized Bus Stubs Component
   ═══════════════════════════════════════════════════════════════ */
const BusStubs = memo(({ nodes, selectedNode, txActive, transmission, receivingIds, isAckPhase, BUS_Y_H, BUS_Y_L, STUB_OFFSET }: {
    nodes: ECUNode[];
    selectedNode: string | null;
    txActive: boolean;
    transmission: TransmissionState | null;
    receivingIds: Set<string>;
    isAckPhase: boolean;
    BUS_Y_H: number;
    BUS_Y_L: number;
    STUB_OFFSET: number;
}) => {
    const shouldReduceMotion = useReducedMotion();
    return (
        <>
            {nodes.map((node: ECUNode, i: number) => {
                const dm = DOMAIN_META[node.domain];
                const isSelected = selectedNode === node.id;
                const isTx = txActive && transmission?.fromId === node.id;
                const isRx = receivingIds.has(node.id) && txActive;
                const stubColor = isTx ? '#22c55eaa' : isRx ? (isAckPhase ? '#14b8a6aa' : '#3b82f6aa') : node.online ? (isSelected ? dm.color + 'aa' : dm.color + '30') : '#ef444420';
                const isTop = (i % 2 === 0);
                const y1 = isTop ? (BUS_Y_H - STUB_OFFSET) : (BUS_Y_L + STUB_OFFSET);
                const connectY = isTop ? BUS_Y_H : BUS_Y_L;
                const BUS_MID = (BUS_Y_H + BUS_Y_L) / 2;
                const isDataPhase = transmission?.phase === 'data' || transmission?.phase === 'control';

                return (
                    <g key={`stub-${node.id}`}>
                        <line x1={`${node.x}%`} y1={`${y1}%`} x2={`${node.x}%`} y2={`${connectY}%`}
                            stroke={stubColor} strokeWidth={isTx || isRx ? 2.5 : isSelected ? 2 : 1.5} strokeDasharray={node.online ? 'none' : '4 3'} />
                        <circle cx={`${node.x}%`} cy={`${BUS_Y_H}%`} r={isTx || isRx ? 5 : isSelected ? 4 : 3}
                            fill={isTx ? '#22c55e' : isRx ? '#3b82f6' : node.online ? dm.color : '#333'} opacity={node.online ? 1 : 0.3} />
                        <circle cx={`${node.x}%`} cy={`${BUS_Y_L}%`} r={isTx || isRx ? 5 : isSelected ? 4 : 3}
                            fill={isTx ? '#22c55e' : isRx ? '#3b82f6' : node.online ? dm.color : '#333'} opacity={node.online ? (node.isLocal ? 0.9 : 0.6) : 0.3} />
                        {isSelected && (
                            <text
                                x={`${node.x}%`}
                                y={isTop ? `${BUS_Y_H - STUB_OFFSET - 24}%` : `${BUS_Y_L + STUB_OFFSET + 30}%`}
                                fill={dm.color}
                                fontSize="11"
                                fontFamily="monospace"
                                fontWeight="bold"
                                opacity="1"
                                textAnchor="middle">
                                {node.label}
                            </text>
                        )}
                        {/* TX glow ring */}
                        {isTx && !shouldReduceMotion && <circle cx={`${node.x}%`} cy={`${BUS_MID}%`} r="8" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.4"><animate attributeName="r" values="8;16;8" dur="1s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.4;0.1;0.4" dur="1s" repeatCount="indefinite" /></circle>}
                        {/* RX pulse ring */}
                        {isRx && isDataPhase && !shouldReduceMotion && <circle cx={`${node.x}%`} cy={`${BUS_MID}%`} r="6" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.3"><animate attributeName="r" values="6;12;6" dur="0.8s" repeatCount="indefinite" /></circle>}
                        {/* ACK pulse */}
                        {isRx && isAckPhase && transmission?.ackReceived && !shouldReduceMotion && (
                            <circle cx={`${node.x}%`} cy={`${BUS_MID}%`} r="6" fill="#14b8a640" stroke="#14b8a6" strokeWidth="1.5">
                                <animate attributeName="r" values="6;14;6" dur="0.6s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="0.6s" repeatCount="indefinite" />
                            </circle>
                        )}
                    </g>
                );
            })}
        </>
    );
});
BusStubs.displayName = 'BusStubs';

/* ═══════════════════════════════════════════════════════════════
   BusTopology — Main Component
   ═══════════════════════════════════════════════════════════════ */
export default memo(function BusTopology() {
    const [nodes, setNodes] = useState<ECUNode[]>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return DEFAULT_NODES;
            const parsed: PersistedNode[] = JSON.parse(raw);
            if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_NODES;
            // Re-attach volatile counters
            return parsed.map(n => ({ ...n, txCount: 0, rxCount: 0, errorCount: 0 }));
        } catch {
            return DEFAULT_NODES;
        }
    });
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [busLoad, setBusLoad] = useState(0);
    const [viewMode, setViewMode] = useState<'topology' | 'list'>('topology');
    const [transmission, setTransmission] = useState<TransmissionState | null>(null);
    const [messageLog, setMessageLog] = useState<MessageLogEntry[]>([]);
    const [showFrameBuilder, setShowFrameBuilder] = useState(false);
    const [frameSendFrom, setFrameSendFrom] = useState<string | null>(null);
    const [showEducation, setShowEducation] = useState(() => {
        try {
            const stored = localStorage.getItem('canscope-bus-education');
            return stored === null ? true : stored === 'true';
        } catch {
            return true;
        }
    });
    const [activeDomain, setActiveDomain] = useState<ECUDomain | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const transmissionRef = useRef<TransmissionState | null>(null);
    const nodesRef = useRef(nodes);
    const completedTransmissionIdsRef = useRef<Set<number>>(new Set());
    
    // Initialize ID counters based on existing nodes to prevent collisions with persisted data
    const initialMaxId = useMemo(() => {
        const ids = nodes.map(n => {
            const match = n.id.match(/\d+/);
            return match ? parseInt(match[0], 10) : 0;
        });
        return Math.max(100, ...ids);
    }, []); // only on initial mount
    
    const nextIdRef = useRef(initialMaxId);
    const txIdRef = useRef(0);

    const bench = useTestBench();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Read termination from context (owned by TestBenchContext, also settable by Fault Scenario Panel)
    const termLeft = bench?.terminationLeft ?? true;
    const termRight = bench?.terminationRight ?? true;
    const setTermLeft = (v: boolean) => bench?.setTerminationLeft(v);
    const setTermRight = (v: boolean) => bench?.setTerminationRight(v);

    const hasTermIssue = !termLeft || !termRight;
    const onlineCount = nodes.filter(n => n.online).length;
    const offlineCount = nodes.length - onlineCount;
    const hasTermIssueRef = useRef(hasTermIssue);

    useEffect(() => {
        nodesRef.current = nodes;
        // Persist to localStorage whenever nodes change
        try {
            const toSave: PersistedNode[] = nodes.map(({ txCount, rxCount, errorCount, ...rest }) => rest);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        } catch { /* quota exceeded — silently ignore */ }
    }, [nodes]);

    useEffect(() => {
        hasTermIssueRef.current = hasTermIssue;
    }, [hasTermIssue]);

    // ── Publish bus load / stub data to bench context ──
    useEffect(() => {
        if (!bench) return;
        bench.setBusLoad(busLoad);
        bench.setOnlineNodeCount(onlineCount);
        bench.setMaxStubLength(Math.max(...nodes.map(n => n.stubLength), 0));
    }, [bench, busLoad, onlineCount, nodes]);

    // ── React to power state changes ──
    const prevTransceiverActive = useRef(true);
    const savedOnlineState = useRef<Record<string, boolean>>({});

    useEffect(() => {
        if (!bench) return;
        const active = bench.transceiverActive;

        // Transceiver just went offline → save state and force all offline
        if (!active && prevTransceiverActive.current) {
            savedOnlineState.current = {};
            nodes.forEach(n => { savedOnlineState.current[n.id] = n.online; });
            setNodes(prev => prev.map(n => ({ ...n, online: false })));
        }

        // Transceiver just came back online → restore saved state
        if (active && !prevTransceiverActive.current) {
            setNodes(prev => prev.map(n => ({
                ...n,
                online: savedOnlineState.current[n.id] ?? true,
            })));
        }

        prevTransceiverActive.current = active;
    }, [bench?.transceiverActive]);

    // Cranking causes random ECU dropouts
    useEffect(() => {
        if (!bench || bench.powerState !== 'CRANKING') return;
        setNodes(prev => prev.map(n => ({
            ...n,
            online: n.online && Math.random() > 0.3,
        })));
    }, [bench?.powerState]);

    /* ─── Simulated background bus traffic ─── */
    useEffect(() => {
        const iv = setInterval(() => {
            setNodes(prev => prev.map(n => {
                if (!n.online) return n;
                const tx = n.txCount + Math.floor(Math.random() * 5);
                const rx = n.rxCount + Math.floor(Math.random() * 8);
                const err = n.errorCount + (hasTermIssue && Math.random() > 0.7 ? 1 : 0);
                return { ...n, txCount: tx, rxCount: rx, errorCount: err };
            }));
            setBusLoad(() => Math.min(100, Math.max(0, 15 + onlineCount * 4 + (Math.random() * 4 - 2))));
        }, 1200);
        return () => clearInterval(iv);
    }, [hasTermIssue, onlineCount]);

    /* ─── Fault state → ECU error counter spike ─── */
    useEffect(() => {
        if (!bench) return;
        const fault = bench.faultState;
        if (fault !== 'SHORT_GND' && fault !== 'OPEN_CIRCUIT') return;
        const iv = setInterval(() => {
            setNodes(prev => prev.map(n => {
                if (!n.online) return n;
                const spike = fault === 'SHORT_GND'
                    ? Math.floor(Math.random() * 8 + 3)  // heavy errors on short
                    : Math.floor(Math.random() * 3 + 1); // moderate on open circuit
                return { ...n, errorCount: n.errorCount + spike };
            }));
        }, 400);
        return () => clearInterval(iv);
    }, [bench?.faultState]);


    /* ─── Auto-dismiss completed transmissions ─── */
    useEffect(() => {
        if (!transmission || transmission.phase !== 'done') return;
        const timeout = setTimeout(() => {
            setTransmission(null);
            transmissionRef.current = null;
        }, 4000);
        return () => clearTimeout(timeout);
    }, [transmission?.phase]);

    /* ─── Transmission phase stepper ─── */
    useEffect(() => {
        if (!transmission || transmission.phase === 'done' || transmission.phase === 'idle') return;

        const phaseIdx = PHASE_ORDER.indexOf(transmission.phase);
        const phaseDurations: Record<FramePhase, number> = {
            idle: 0, sof: 600, arbitration: 1200, control: 800, data: 1400, crc: 900, ack: 800, eof: 700, done: 0,
        };
        const duration = phaseDurations[transmission.phase];

        // Progress animation within phase
        const progressIv = setInterval(() => {
            setTransmission(prev => {
                if (!prev || prev.phase !== transmission.phase) return prev;
                const newProgress = Math.min(100, prev.progress + 4);
                const updated = { ...prev, progress: newProgress };
                transmissionRef.current = updated;
                return updated;
            });
        }, duration / 25);

        // Move to next phase
        const timeout = setTimeout(() => {
            clearInterval(progressIv);
            const nextPhase = PHASE_ORDER[phaseIdx + 1];
            if (!nextPhase) return;

            setTransmission(prev => {
                if (!prev) return prev;

                // Check for errors at ACK phase
                let error: string | null = null;
                let ackReceived = prev.ackReceived;

                if (nextPhase === 'ack') {
                    const target = prev.toId === 'broadcast'
                        ? prev.participantSnapshot.filter((node) => node.id !== prev.fromId)
                        : prev.participantSnapshot.filter((node) => node.id === prev.toId);
                    const onlineTargets = target.filter((node) => node.online);
                    const anyOnline = onlineTargets.length > 0;

                    const hasBaudMismatch = onlineTargets.some((node) => {
                        const nodeBaud = parseInt(node.baudRate.replace('k', '000').replace('M', '000000'));
                        return Math.abs(nodeBaud - prev.controllerBaud) > (prev.controllerBaud * 0.01);
                    });

                    if (!anyOnline) {
                        error = 'No ACK received — target node offline. Transmitter will increment TEC.';
                    } else if (hasBaudMismatch && Math.random() > 0.3) {
                        const baudStr = prev.controllerBaud >= 1_000_000
                            ? `${(prev.controllerBaud / 1_000_000).toFixed(1)}M`
                            : `${(prev.controllerBaud / 1_000).toFixed(1)}k`;
                        error = `Baud rate mismatch — controller set to ${baudStr} but node(s) differ. Framing error.`;
                    } else if (hasTermIssueRef.current && Math.random() > 0.5) {
                        error = 'CRC mismatch due to signal reflection — impedance mismatch on bus.';
                    } else {
                        ackReceived = true;
                    }
                }

                // At done, update counters + log
                if (nextPhase === 'done') {
                    const fromNode = prev.participantSnapshot.find((node) => node.id === prev.fromId);
                    const toNode = prev.toId === 'broadcast'
                        ? null
                        : prev.participantSnapshot.find((node) => node.id === prev.toId);
                    const resolvedError = prev.error ?? error;
                    const wasSuccessful = !resolvedError && ackReceived;

                    if (!completedTransmissionIdsRef.current.has(prev.id)) {
                        completedTransmissionIdsRef.current.add(prev.id);
                        setMessageLog(log => [{
                            id: prev.id,
                            from: prev.fromId,
                            to: prev.toId,
                            fromLabel: fromNode?.label ?? '?',
                            toLabel: prev.toId === 'broadcast' ? 'ALL' : (toNode?.label ?? '?'),
                            messageType: prev.messageType,
                            dlc: prev.dlc,
                            data: prev.dataBytes,
                            success: wasSuccessful,
                            error: resolvedError,
                            timestamp: Date.now(),
                        }, ...log].slice(0, 20));

                        // Increment TX/RX once per finished transmission.
                        if (wasSuccessful) {
                            setNodes(ns => ns.map(n => {
                                if (n.id === prev.fromId) return { ...n, txCount: n.txCount + 1 };
                                if (prev.toId === 'broadcast' && n.id !== prev.fromId && n.online) return { ...n, rxCount: n.rxCount + 1 };
                                if (n.id === prev.toId) return { ...n, rxCount: n.rxCount + 1 };
                                return n;
                            }));
                        } else {
                            setNodes(ns => ns.map(n => n.id === prev.fromId ? { ...n, errorCount: n.errorCount + 1 } : n));
                        }
                    }
                }

                const updated = { ...prev, phase: nextPhase, progress: 0, ackReceived, error: error ?? prev.error };
                transmissionRef.current = updated;
                return updated;
            });
        }, duration);

        return () => { clearInterval(progressIv); clearTimeout(timeout); };
    }, [transmission?.phase]);

    /* ─── Send signal ─── */
    const sendSignal = useCallback((fromId: string, toId: string | 'broadcast', msgType: MessageType = 'data', dlc: number = 8, data?: string[]) => {
        if (transmission && transmission.phase !== 'idle' && transmission.phase !== 'done') return; // busy
        const tx: TransmissionState = {
            id: ++txIdRef.current,
            fromId,
            toId,
            phase: 'sof',
            progress: 0,
            messageType: msgType,
            dlc,
            dataBytes: data ?? RANDOM_DATA().slice(0, dlc),
            ackReceived: false,
            error: null,
            timestamp: Date.now(),
            controllerBaud: bench?.baudRate ?? 500_000,
            participantSnapshot: nodesRef.current.map(({ id, label, online, baudRate }) => ({ id, label, online, baudRate })),
        };
        completedTransmissionIdsRef.current.delete(tx.id);
        transmissionRef.current = tx;
        setTransmission(tx);
    }, [bench?.baudRate, transmission]);

    const toggleNode = (id: string) => setNodes(prev => prev.map(n => n.id === id ? { ...n, online: !n.online } : n));
    const removeNode = (id: string) => { if (selectedNode === id) setSelectedNode(null); setNodes(prev => prev.filter(n => n.id !== id)); };
    const updateNode = useCallback((id: string, updates: Partial<ECUNode>) => {
        setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
    }, []);
    const addNode = (node: Omit<ECUNode, 'id' | 'txCount' | 'rxCount' | 'errorCount'>) => {
        const id = `ecu_${++nextIdRef.current}`;
        setNodes(prev => [...prev, { ...node, id, txCount: 0, rxCount: 0, errorCount: 0 }].sort((a, b) => a.x - b.x));
        setShowAddDialog(false);
    };
    const updateNodeBaud = (id: string, baud: string) => updateNode(id, { baudRate: baud });

    const resetNodeCounters = useCallback((id: string) => {
        setNodes(prev => prev.map(n => n.id === id ? { ...n, txCount: 0, rxCount: 0, errorCount: 0 } : n));
    }, []);

    const selected = nodes.find(n => n.id === selectedNode) ?? null;
    const isBusy = !!transmission && transmission.phase !== 'idle' && transmission.phase !== 'done';

    return (
        <div className="bg-white dark:bg-[#111114] rounded-2xl border border-black/10 dark:border-[#1e1e24] shadow-[inset_0_2px_6px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] overflow-hidden transition-colors">

            {/* ═══ Header Bar ═══ */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 dark:border-[#1a1a20] bg-gray-50/50 dark:bg-[#0e0e12] flex-wrap gap-2 transition-colors">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-[#1a1a1e] border border-black/10 dark:border-[#2a2a30] flex items-center justify-center transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00f3ff" strokeWidth="2" strokeLinecap="round">
                            <path d="M4 12h16M12 4v16M7 8h10M7 16h10" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xs font-mono font-black text-dark-950 dark:text-[#f1f1f1] uppercase tracking-wider leading-none transition-colors">CAN Bus Wiring Harness</h2>
                        <p className="text-[8px] font-mono text-light-400 dark:text-gray-400 uppercase tracking-widest mt-0.5 transition-colors">ISO 11898-2 Physical Topology</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex bg-black/5 dark:bg-[#0a0a0e] border border-black/10 dark:border-[#222] rounded-md overflow-hidden transition-colors">
                        {(['topology', 'list'] as const).map(m => (
                            <button key={m} onClick={() => setViewMode(m)}
                                className={`px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider transition-all ${viewMode === m ? 'bg-white/10 dark:bg-[#1a1a20] text-cyber-blue' : 'text-light-400 dark:text-gray-400 hover:text-dark-950 dark:hover:text-gray-200'}`}>
                                {m}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge label="ONLINE" value={onlineCount} color="#22c55e" />
                        <StatusBadge label="OFFLINE" value={offlineCount} color={offlineCount > 0 ? '#ef4444' : '#333'} />
                        <StatusBadge label="LOAD" value={`${busLoad.toFixed(0)}%`} color={busLoad > 70 ? '#f59e0b' : '#22c55e'} />
                    </div>
                    <button
                        onClick={() => {
                            const next = !showEducation;
                            setShowEducation(next);
                            try { localStorage.setItem('canscope-bus-education', String(next)); } catch { /* ignore */ }
                        }}
                        aria-pressed={showEducation}
                        title="Toggle educational descriptions for each CAN frame phase"
                        className={`px-2 py-1 rounded-md text-[9px] font-mono font-bold uppercase border transition-all ${
                            showEducation
                                ? 'bg-[#f59e0b15] text-[#f59e0b] border-[#f59e0b40]'
                                : 'text-gray-600 border-[#222] hover:text-gray-400'
                        }`}
                    >
                        <span className="flex items-center gap-1">
                            {showEducation && <Check size={10} />}
                            Learn Mode
                        </span>
                    </button>
                    <button onClick={() => setShowAddDialog(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#00f3ff10] border border-[#00f3ff30] text-[#00f3ff] text-[8px] font-mono font-bold uppercase tracking-wider hover:bg-[#00f3ff20] active:scale-95 transition-all">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Add ECU
                    </button>
                    <button
                        onClick={() => setShowResetConfirm(true)}
                        className="px-3 py-1.5 rounded-md bg-[#ef444410] border border-[#ef444430] text-[#ef4444] text-[8px] font-mono font-bold uppercase tracking-wider hover:bg-[#ef444420] active:scale-95 transition-all"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* ═══ Termination Warning ═══ */}
            <AnimatePresence>
                {hasTermIssue && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="mx-4 mt-3 p-3 rounded-lg bg-[#1c0808] border border-red-900/40 flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-red-500 text-xs">!</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-mono font-bold text-red-400 uppercase tracking-wider block mb-1">Impedance Mismatch Detected</span>
                                <span className="text-[8px] font-mono text-red-400/70 leading-relaxed block">
                                    {!termLeft && !termRight ? 'Both' : !termLeft ? 'Near-end (R1)' : 'Far-end (R2)'} termination missing.
                                    Signal reflections will corrupt bit edges. Expect FORM and BIT errors above 250 kbit/s.
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ Transmission Phase Indicator ═══ */}
            <AnimatePresence>
                {transmission && transmission.phase !== 'idle' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <TransmissionPanel
                            transmission={transmission}
                            nodes={nodes}
                            showEducation={showEducation}
                            onDismiss={() => { setTransmission(null); transmissionRef.current = null; }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ Main Content ═══ */}
            <div className="p-4">
                {viewMode === 'topology' ? (
                    <TopologyView
                        nodes={nodes}
                        selectedNode={selectedNode}
                        setSelectedNode={setSelectedNode}
                        termLeft={termLeft} termRight={termRight}
                        setTermLeft={setTermLeft} setTermRight={setTermRight}
                        hasTermIssue={hasTermIssue}
                        onlineCount={onlineCount}
                        svgRef={svgRef}
                        transmission={transmission}
                        controllerBaudStr={bench?.baudRate != null
                            ? (bench.baudRate >= 1_000_000 ? '1M' : `${bench.baudRate / 1_000}k`)
                            : '500k'
                        }
                    />
                ) : (
                    <ListView nodes={nodes} selectedNode={selectedNode} setSelectedNode={setSelectedNode} toggleNode={toggleNode} removeNode={removeNode} />
                )}
            </div>

            {/* ═══ Domain Legend ═══ */}
            <div className="px-5 py-2 border-t border-black/5 dark:border-[#1a1a20] bg-gray-50/80 dark:bg-[#0c0c0f] flex items-center gap-4 flex-wrap transition-colors">
                <span className="text-[8px] font-mono text-light-400 dark:text-gray-400 uppercase tracking-widest">Domains:</span>
                {Object.entries(DOMAIN_META).map(([key, meta]) => {
                    const count = nodes.filter(n => n.domain === key).length;
                    const isActive = activeDomain === key;
                    return (
                        <button key={key} onClick={() => setActiveDomain(isActive ? null : key as ECUDomain)}
                            className={`flex items-center gap-1.5 transition-opacity cursor-pointer ${
                                activeDomain !== null && !isActive ? 'opacity-40' : 'opacity-100'
                            }`}>
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color, boxShadow: isDark ? `0 0 4px ${meta.glow}` : 'none' }} />
                            <span className="text-[9px] font-mono text-light-600 dark:text-gray-300 uppercase tracking-wider transition-colors">{meta.label} ({count})</span>
                        </button>
                    );
                })}
                {activeDomain !== null && (
                    <button onClick={() => setActiveDomain(null)} className="text-[8px] font-mono text-gray-500 hover:text-gray-300 transition-colors">
                        Clear ×
                    </button>
                )}
            </div>

            {/* ═══ Selected Node Detail Panel ═══ */}
            <AnimatePresence>
                {selected && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-[#1a1a20]">
                        <NodeDetailPanel
                            node={selected}
                            onToggle={() => toggleNode(selected.id)}
                            onRemove={() => removeNode(selected.id)}
                            onClose={() => setSelectedNode(null)}
                            onSendSignal={sendSignal}
                            onBaudChange={(b) => updateNodeBaud(selected.id, b)}
                            onUpdateNode={(u) => updateNode(selected.id, u)}
                            allNodes={nodes}
                            existingNodes={nodes}
                            isBusy={isBusy}
                            onOpenFrameBuilder={() => { setFrameSendFrom(selected.id); setShowFrameBuilder(true); }}
                            onResetCounters={() => resetNodeCounters(selected.id)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ Message Log ═══ */}
            {messageLog.length > 0 && (
                <div className="border-t border-[#1a1a20]">
                    <MessageLogPanel log={messageLog} onClear={() => setMessageLog([])} />
                </div>
            )}

            {/* ═══ Add ECU Dialog ═══ */}
            <AnimatePresence>
                {showAddDialog && (
                    <AddECUDialog
                        onAdd={addNode}
                        onClose={() => setShowAddDialog(false)}
                        existingPositions={nodes.map(n => n.x)}
                        existingNodes={nodes}
                    />
                )}
            </AnimatePresence>

            {/* ═══ Frame Builder Dialog ═══ */}
            <AnimatePresence>
                {showFrameBuilder && frameSendFrom && (
                    <FrameBuilderDialog
                        fromNode={nodes.find(n => n.id === frameSendFrom)!}
                        allNodes={nodes}
                        onSend={(toId, msgType, dlc, data) => { sendSignal(frameSendFrom, toId, msgType, dlc, data); setShowFrameBuilder(false); setFrameSendFrom(null); }}
                        onClose={() => { setShowFrameBuilder(false); setFrameSendFrom(null); }}
                        isBusy={isBusy}
                    />
                )}
            </AnimatePresence>

            {/* ═══ Reset Confirmation Dialog ═══ */}
            <AlertDialog.Root open={showResetConfirm} onOpenChange={setShowResetConfirm}>
                <AlertDialog.Portal>
                    <AlertDialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
                    <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[calc(100%-2rem)] max-w-sm p-6 bg-white dark:bg-[#111114] border border-black/10 dark:border-[#1e1e24] rounded-xl shadow-2xl focus:outline-none overflow-hidden transition-colors">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-red-500/50" />
                        
                        <AlertDialog.Title className="text-dark-950 dark:text-[#f1f1f1] font-mono font-black text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                             <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                             Reset Topology?
                        </AlertDialog.Title>
                        
                        <AlertDialog.Description className="text-light-400 dark:text-gray-400 font-mono text-[9px] leading-relaxed uppercase tracking-tight mb-6 opacity-80">
                            Warning: This operation will remove all custom ECU nodes and restore the bus wiring harness to its default ISO configuration. 
                            <span className="block mt-2 text-red-500/80 font-bold">This action cannot be undone and will clear local storage data.</span>
                        </AlertDialog.Description>
                        
                        <div className="flex gap-2 justify-end">
                            <AlertDialog.Cancel asChild>
                                <button className="px-3 py-1.5 text-[8px] font-mono font-bold uppercase tracking-wider text-light-600 dark:text-gray-400 hover:text-dark-950 dark:hover:text-white border border-black/10 dark:border-[#2a2a30] rounded-md transition-all active:scale-95">
                                    Cancel
                                </button>
                            </AlertDialog.Cancel>
                            <AlertDialog.Action asChild>
                                <button 
                                    onClick={() => {
                                        localStorage.removeItem(STORAGE_KEY);
                                        setNodes(DEFAULT_NODES);
                                        setSelectedNode(null);
                                        setShowResetConfirm(false);
                                    }}
                                    className="px-3 py-1.5 text-[8px] font-mono font-bold uppercase tracking-wider text-white bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-md transition-all active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                                >
                                    Force Reset
                                </button>
                            </AlertDialog.Action>
                        </div>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog.Root>
        </div>
    );
});

/* ═══════════════════════════════════════════════════════════════
   Transmission Panel — Phase-by-phase CAN frame lifecycle
   ═══════════════════════════════════════════════════════════════ */
function TransmissionPanel({ transmission, nodes, showEducation, onDismiss }: {
    transmission: TransmissionState;
    nodes: ECUNode[];
    showEducation: boolean;
    onDismiss: () => void;
}) {
    const fromNode = nodes.find(n => n.id === transmission.fromId);
    const toNode = transmission.toId === 'broadcast' ? null : nodes.find(n => n.id === transmission.toId);
    const pi = PHASE_INFO[transmission.phase];
    const isDone = transmission.phase === 'done';
    const hasError = !!transmission.error;
    const phaseDescription = isDone && hasError
        ? 'Transmission ended with a bus error. Review the error detail and message log before retrying.'
        : pi.description;

    // Stable bit-pattern opacities to prevent flickering during phase re-renders
    const bitPatternOpacities = useMemo(() => {
        const make = (len: number) => Array.from({ length: len }, () => Math.random() > 0.5 ? 0.8 : 0.2);
        return {
            sof: make(4), arbitration: make(11), control: make(4),
            data: make(16), crc: make(4), ack: make(4), eof: make(4),
        } as Record<string, number[]>;
    }, [transmission.id]); // Re-generate only for a new transmission, stable across phases

    return (
        <div className="mx-4 mt-3 rounded-lg border overflow-hidden" style={{ borderColor: hasError ? '#ef444440' : pi.color + '30', backgroundColor: '#0c0c10' }}>
            {/* Phase progress bar */}
            <div className="h-1 bg-[#111] relative overflow-hidden">
                <motion.div className="absolute inset-y-0 left-0" style={{ backgroundColor: hasError ? '#ef4444' : pi.color }}
                    animate={{ width: isDone ? '100%' : `${transmission.progress}%` }}
                    transition={{ duration: 0.1 }} />
            </div>

            <div className="p-4">
                {/* Header: From → To */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <motion.div className="w-2.5 h-2.5 rounded-full"
                                animate={{ backgroundColor: pi.color, boxShadow: `0 0 8px ${pi.color}80` }}
                                transition={{ duration: 0.3 }} />
                            <span className="text-[10px] font-mono font-black uppercase tracking-wider" style={{ color: pi.color }}>{pi.label}</span>
                            {pi.bits && <span className="text-[8px] font-mono text-gray-400 ml-1">({pi.bits})</span>}
                        </div>
                        <span className="text-[8px] font-mono text-gray-500 mx-2">|</span>
                        <span className="text-[8px] font-mono text-gray-300">
                            <span className="text-[#f1f1f1] font-bold">{fromNode?.label ?? '?'}.</span>
                            <ArrowRight size={10} className="text-gray-400 mx-1 inline" />
                            <span className="text-[#f1f1f1] font-bold">{transmission.toId === 'broadcast' ? 'ALL NODES' : toNode?.label ?? '?'}</span>
                        </span>
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded border ml-1"
                            style={{ color: pi.color, borderColor: pi.color + '30', backgroundColor: pi.color + '08' }}>
                            {transmission.messageType.toUpperCase()}
                        </span>
                    </div>
                    <button onClick={onDismiss}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider border border-[#222] text-gray-500 hover:text-[#f1f1f1] hover:border-[#444] transition-all active:scale-95">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        {isDone ? 'Dismiss' : 'Cancel'}
                    </button>
                </div>

                {/* Phase timeline */}
                <div className="flex items-center gap-1 mb-3">
                    {PHASE_ORDER.slice(0, -1).map((phase, i) => {
                        const currentIdx = PHASE_ORDER.indexOf(transmission.phase);
                        const isActive = i === currentIdx;
                        const isCompleted = i < currentIdx;
                        const phaseColor = PHASE_INFO[phase].color;
                        return (
                            <React.Fragment key={phase}>
                                <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                                    <motion.div
                                        className="w-full h-1.5 rounded-full relative overflow-hidden"
                                        style={{ backgroundColor: '#1a1a20' }}
                                    >
                                        <motion.div
                                            className="absolute inset-y-0 left-0 rounded-full"
                                            style={{ backgroundColor: hasError && isActive ? '#ef4444' : phaseColor }}
                                            animate={{ width: isCompleted ? '100%' : isActive ? `${transmission.progress}%` : '0%' }}
                                            transition={{ duration: 0.15 }}
                                        />
                                    </motion.div>
                                    <span className={`text-[9px] font-mono uppercase tracking-wider truncate w-full text-center ${isActive ? 'font-bold' : ''}`}
                                        style={{ color: isActive ? phaseColor : isCompleted ? phaseColor + '80' : '#333' }}>
                                        {PHASE_INFO[phase].label}
                                    </span>
                                </div>
                                {i < PHASE_ORDER.length - 2 && <div className="w-0.5 h-1.5 rounded-full mt-[-8px]" style={{ backgroundColor: isCompleted ? phaseColor + '40' : '#1a1a20' }} />}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* CAN Frame visualization */}
                <div className="flex gap-[1px] mb-3 rounded overflow-hidden">
                    {PHASE_ORDER.slice(0, -1).map((phase) => {
                        const currentIdx = PHASE_ORDER.indexOf(transmission.phase);
                        const phaseIdx = PHASE_ORDER.indexOf(phase);
                        const isActive = phaseIdx === currentIdx;
                        const isCompleted = phaseIdx < currentIdx;
                        const phaseColor = PHASE_INFO[phase].color;
                        const widths: Record<string, string> = { sof: 'w-6', arbitration: 'flex-[2]', control: 'flex-1', data: 'flex-[3]', crc: 'flex-[1.5]', ack: 'w-8', eof: 'flex-1' };
                        return (
                            <motion.div key={phase}
                                className={`h-8 flex items-center justify-center relative overflow-hidden ${widths[phase] ?? 'flex-1'}`}
                                animate={{
                                    backgroundColor: isActive ? phaseColor + '25' : isCompleted ? phaseColor + '10' : '#111118',
                                    borderColor: isActive ? phaseColor + '50' : 'transparent',
                                }}
                                style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'transparent' }}
                            >
                                {/* Bit pattern decoration */}
                                {(isCompleted || isActive) && (
                                    <div className="absolute inset-0 flex items-center justify-center gap-[1px] opacity-30 overflow-hidden">
                                        {Array.from({ length: phase === 'data' ? 16 : phase === 'arbitration' ? 11 : 4 }, (_, j) => (
                                            <div key={j} className="w-[2px] h-3 rounded-sm" style={{ backgroundColor: phaseColor, opacity: bitPatternOpacities[phase]?.[j] ?? 0.5 }} />
                                        ))}
                                    </div>
                                )}
                                <span className="text-[8px] font-mono font-bold uppercase z-10 relative" style={{ color: isActive ? phaseColor : isCompleted ? phaseColor + '80' : '#555' }}>
                                    {phase === 'data' ? `${transmission.dlc}B` : PHASE_INFO[phase].label}
                                </span>
                                {/* ACK indicator */}
                                {phase === 'ack' && isCompleted && (
                                    <motion.div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full"
                                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                                        style={{ backgroundColor: transmission.ackReceived ? '#22c55e' : '#ef4444' }} />
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Data bytes display */}
                {(transmission.phase === 'data' || PHASE_ORDER.indexOf(transmission.phase) > PHASE_ORDER.indexOf('data')) && (
                    <div className="flex items-center gap-1 mb-3">
                        <span className="text-[8px] font-mono text-gray-400 uppercase mr-1">Data:</span>
                        {transmission.dataBytes.map((b, i) => (
                            <motion.span key={i} className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border"
                                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                style={{ color: '#a855f7', borderColor: '#a855f720', backgroundColor: '#a855f708' }}>
                                {b}
                            </motion.span>
                        ))}
                    </div>
                )}

                {/* Educational description */}
                {showEducation && (
                    <motion.div className="p-2.5 rounded-md bg-[#0a0a0e] border border-[#1a1a20]"
                        key={transmission.phase}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                        <span className="text-[8px] font-mono text-gray-300 leading-relaxed block">{phaseDescription}</span>
                    </motion.div>
                )}

                {/* Error display */}
                {hasError && (
                    <motion.div className="mt-2 p-2.5 rounded-md bg-[#1c0808] border border-red-900/30"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="flex items-start gap-2">
                            <span className="text-red-500 text-[10px]">!</span>
                            <span className="text-[8px] font-mono text-red-400/80 leading-relaxed">{transmission.error}</span>
                        </div>
                    </motion.div>
                )}

                {/* Success display */}
                {isDone && !hasError && transmission.ackReceived && (
                    <motion.div className="mt-2 p-2.5 rounded-md bg-[#0a1c0a] border border-green-900/30"
                        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                        <div className="flex items-center gap-2">
                            <motion.div className="w-3 h-3 rounded-full bg-green-500"
                                initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ duration: 0.4 }}
                                style={{ boxShadow: '0 0 8px #22c55e60' }} />
                            <span className="text-[9px] font-mono font-bold text-green-400 uppercase tracking-wider">
                                Frame delivered successfully — ACK received from {transmission.toId === 'broadcast' ? 'all online nodes' : (nodes.find(n => n.id === transmission.toId)?.label ?? 'receiver')}
                            </span>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   Topology View — SVG wiring diagram
   ═══════════════════════════════════════════════════════════════ */
function TopologyView({
    nodes, selectedNode, setSelectedNode, termLeft, termRight,
    setTermLeft, setTermRight, hasTermIssue, onlineCount, svgRef,
    transmission, controllerBaudStr
}: {
    nodes: ECUNode[];
    selectedNode: string | null;
    setSelectedNode: (id: string | null) => void;
    termLeft: boolean;
    termRight: boolean;
    setTermLeft: (v: boolean) => void;
    setTermRight: (v: boolean) => void;
    hasTermIssue: boolean;
    onlineCount: number;
    svgRef: React.RefObject<SVGSVGElement | null>;
    transmission: TransmissionState | null;
    controllerBaudStr: string;
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const shouldReduceMotion = useReducedMotion();

    const nodeCount = nodes.length;
    const boxScale = nodeCount > 9 ? Math.max(0.65, 9 / nodeCount) : 1;
    const boxWidth = 80 * boxScale;
    
    const BUS_Y_H = 44;
    const BUS_Y_L = 56;
    const BUS_MID = 50;

    const STUB_OFFSET = 12; // Standard distance box edge is from the line

    const txActive = !!(transmission && transmission.phase !== 'idle' && transmission.phase !== 'done');
    const sourceNode = txActive ? nodes.find(n => n.id === transmission.fromId) : null;
    const targetNode = txActive && transmission.toId !== 'broadcast' ? nodes.find(n => n.id === transmission.toId) : null;
    const isAckPhase = transmission?.phase === 'ack';
    const isCrcPhase = transmission?.phase === 'crc';
    const isEofPhase = transmission?.phase === 'eof';

    // Compute the active bus segment (source → target or source → both ends for broadcast)
    const srcX = sourceNode?.x ?? 50;
    const tgtX = targetNode?.x ?? (transmission?.toId === 'broadcast' ? null : 50);
    // For broadcast: signal goes from source to both bus ends
    const segLeft = tgtX !== null ? Math.min(srcX, tgtX) : 4;
    const segRight = tgtX !== null ? Math.max(srcX, tgtX) : 96;
    const goesRight = tgtX !== null ? tgtX > srcX : true; // primary direction

    // Determine which nodes are "receiving" (highlighted)
    const receivingIds = useMemo(() => {
        const ids = new Set<string>();
        if (txActive && transmission) {
            if (transmission.toId === 'broadcast') {
                nodes.filter(n => n.id !== transmission.fromId && n.online).forEach(n => ids.add(n.id));
            } else {
                ids.add(transmission.toId);
            }
        }
        return ids;
    }, [txActive, transmission, nodes]);

    return (
        <div className="overflow-x-auto rounded-xl">
            <div className="relative bg-gray-50 dark:bg-[#0a0a0d] rounded-xl border border-black/10 dark:border-[#161620] overflow-hidden transition-colors" style={{ minHeight: '460px', minWidth: `${Math.max(900, nodes.length * 90)}px` }}>

            {/* Background grid */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: isDark ? 0.04 : 0.08 }}>
                <defs><pattern id="bg-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke={isDark ? "#fff" : "#000"} strokeWidth="0.5" /></pattern></defs>
                <rect width="100%" height="100%" fill="url(#bg-grid)" />
            </svg>

            {/* Main SVG wiring */}
            <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <filter id="glow-cyan"><feGaussianBlur stdDeviation="2" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                    <filter id="glow-magenta"><feGaussianBlur stdDeviation="2" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                    <filter id="glow-signal"><feGaussianBlur stdDeviation="4" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                </defs>

                {/* CANH backbone (dim base) */}
                <line x1="4%" y1={`${BUS_Y_H}%`} x2="96%" y2={`${BUS_Y_H}%`}
                    stroke={hasTermIssue ? '#ef444430' : '#00f3ff18'}
                    strokeWidth="3" strokeLinecap="round" />
                <line x1="4%" y1={`${BUS_Y_H}%`} x2="96%" y2={`${BUS_Y_H}%`}
                    stroke={hasTermIssue ? '#ef444410' : '#00f3ff08'}
                    strokeWidth="8" strokeLinecap="round" filter="url(#glow-cyan)" />

                {/* CANL backbone (dim base) */}
                <line x1="4%" y1={`${BUS_Y_L}%`} x2="96%" y2={`${BUS_Y_L}%`}
                    stroke={hasTermIssue ? '#ef444830' : '#bf00ff18'}
                    strokeWidth="3" strokeLinecap="round" />
                <line x1="4%" y1={`${BUS_Y_L}%`} x2="96%" y2={`${BUS_Y_L}%`}
                    stroke={hasTermIssue ? '#ef444810' : '#bf00ff08'}
                    strokeWidth="8" strokeLinecap="round" filter="url(#glow-magenta)" />

                {/* ─── Active bus segment highlight (source → target) ─── */}
                {txActive && (
                    <>
                        <motion.line
                            x1={`${segLeft}%`} y1={`${BUS_Y_H}%`} x2={`${segRight}%`} y2={`${BUS_Y_H}%`}
                            stroke="#00f3ff" strokeWidth="4" strokeLinecap="round"
                            initial={{ opacity: 0 }} animate={{ opacity: shouldReduceMotion ? 0.25 : [0.15, 0.35, 0.15] }}
                            transition={{ duration: 1.2, repeat: shouldReduceMotion ? 0 : Infinity }} />
                        <motion.line
                            x1={`${segLeft}%`} y1={`${BUS_Y_H}%`} x2={`${segRight}%`} y2={`${BUS_Y_H}%`}
                            stroke="#00f3ff" strokeWidth="10" strokeLinecap="round" filter="url(#glow-signal)"
                            initial={{ opacity: 0 }} animate={{ opacity: shouldReduceMotion ? 0.08 : [0.05, 0.12, 0.05] }}
                            transition={{ duration: 1.2, repeat: shouldReduceMotion ? 0 : Infinity }} />
                        <motion.line
                            x1={`${segLeft}%`} y1={`${BUS_Y_L}%`} x2={`${segRight}%`} y2={`${BUS_Y_L}%`}
                            stroke="#bf00ff" strokeWidth="4" strokeLinecap="round"
                            initial={{ opacity: 0 }} animate={{ opacity: shouldReduceMotion ? 0.25 : [0.15, 0.35, 0.15] }}
                            transition={{ duration: 1.2, repeat: shouldReduceMotion ? 0 : Infinity, delay: 0.1 }} />
                        <motion.line
                            x1={`${segLeft}%`} y1={`${BUS_Y_L}%`} x2={`${segRight}%`} y2={`${BUS_Y_L}%`}
                            stroke="#bf00ff" strokeWidth="10" strokeLinecap="round" filter="url(#glow-signal)"
                            initial={{ opacity: 0 }} animate={{ opacity: shouldReduceMotion ? 0.08 : [0.05, 0.12, 0.05] }}
                            transition={{ duration: 1.2, repeat: shouldReduceMotion ? 0 : Infinity, delay: 0.1 }} />
                    </>
                )}

                {/* Twist marks */}
                {Array.from({ length: 16 }, (_, i) => {
                    const cx = 6 + i * 5.5;
                    return <g key={`tw${i}`} opacity={isDark ? "0.12" : "0.25"}><line x1={`${cx}%`} y1={`${BUS_Y_H - 1}%`} x2={`${cx + 0.8}%`} y2={`${BUS_Y_L + 1}%`} stroke={isDark ? "#666" : "#444"} strokeWidth="0.5" /></g>;
                })}

                {/* Drop stubs and connections */}
                <BusStubs 
                    nodes={nodes} 
                    selectedNode={selectedNode} 
                    txActive={txActive} 
                    transmission={transmission} 
                    receivingIds={receivingIds} 
                    isAckPhase={isAckPhase} 
                    BUS_Y_H={BUS_Y_H} 
                    BUS_Y_L={BUS_Y_L} 
                    STUB_OFFSET={STUB_OFFSET} 
                />

                {/* ─── Directed signal packet: source → target ─── */}
                {txActive && sourceNode && !isAckPhase && !isEofPhase && (
                    <>
                        {/* CANH packet traveling from source to target */}
                        <motion.rect 
                            y={`${BUS_Y_H}%`} 
                            height="8" 
                            rx="2"
                            fill="#00f3ff" 
                            filter="url(#glow-signal)"
                            key={`canh-fwd-${transmission?.id}`}
                            animate={{
                                x: goesRight ? [`${srcX}%`, `${segRight}%`] : [`${srcX}%`, `${segLeft}%`],
                                opacity: shouldReduceMotion ? 0.7 : [0.7, 0.5, 0.7],
                            }}
                            style={{ width: '24px', transform: 'translateY(-4px)' }}
                            transition={{ duration: 1.2, repeat: shouldReduceMotion ? 0 : Infinity, ease: 'easeInOut' }} 
                            aria-hidden="true"
                        />
                        {/* CANL packet (complementary) */}
                        <motion.rect 
                            y={`${BUS_Y_L}%`} 
                            height="8" 
                            rx="2"
                            fill="#bf00ff" 
                            filter="url(#glow-signal)"
                            key={`canl-fwd-${transmission?.id}`}
                            animate={{
                                x: goesRight ? [`${srcX}%`, `${segRight}%`] : [`${srcX}%`, `${segLeft}%`],
                                opacity: shouldReduceMotion ? 0.5 : [0.5, 0.4, 0.5],
                            }}
                            style={{ width: '24px', transform: 'translateY(-4px)' }}
                            transition={{ duration: 1.2, repeat: shouldReduceMotion ? 0 : Infinity, ease: 'easeInOut', delay: 0.08 }} 
                            aria-hidden="true"
                        />
                        {/* For broadcast: second packet going the other direction */}
                        {tgtX === null && (
                            <>
                                <motion.rect 
                                    y={`${BUS_Y_H}%`} 
                                    height="8" 
                                    rx="2"
                                    fill="#00f3ff" 
                                    filter="url(#glow-signal)"
                                    animate={{ x: [`${srcX}%`, '4%'], opacity: shouldReduceMotion ? 0.5 : [0.5, 0.3, 0.5] }}
                                    style={{ width: '24px', transform: 'translateY(-4px)' }}
                                    transition={{ duration: 1.4, repeat: shouldReduceMotion ? 0 : Infinity, ease: 'easeInOut', delay: 0.15 }} 
                                    aria-hidden="true"
                                />
                                <motion.rect 
                                    y={`${BUS_Y_L}%`} 
                                    height="8" 
                                    rx="2"
                                    fill="#bf00ff" 
                                    filter="url(#glow-signal)"
                                    animate={{ x: [`${srcX}%`, '4%'], opacity: shouldReduceMotion ? 0.4 : [0.4, 0.25, 0.4] }}
                                    style={{ width: '24px', transform: 'translateY(-4px)' }}
                                    transition={{ duration: 1.4, repeat: shouldReduceMotion ? 0 : Infinity, ease: 'easeInOut', delay: 0.2 }} 
                                    aria-hidden="true"
                                />
                            </>
                        )}
                    </>
                )}

                {/* ─── ACK return signal: target → source ─── */}
                {txActive && sourceNode && isAckPhase && (
                    <>
                        <motion.rect 
                            y={`${BUS_Y_H}%`} 
                            height="8" 
                            rx="2"
                            fill="#14b8a6" 
                            filter="url(#glow-signal)"
                            key={`ack-h-${transmission?.id}`}
                            animate={{
                                x: goesRight ? [`${segRight}%`, `${srcX}%`] : [`${segLeft}%`, `${srcX}%`],
                                opacity: shouldReduceMotion ? 0.7 : [0.7, 0.5, 0.7],
                            }}
                            style={{ width: '20px', transform: 'translateY(-4px)' }}
                            transition={{ duration: 0.8, repeat: shouldReduceMotion ? 0 : Infinity, ease: 'easeInOut' }} 
                            aria-hidden="true"
                        />
                        <motion.rect 
                            y={`${BUS_Y_L}%`} 
                            height="8" 
                            rx="2"
                            fill="#14b8a6" 
                            filter="url(#glow-signal)"
                            key={`ack-l-${transmission?.id}`}
                            animate={{
                                x: goesRight ? [`${segRight}%`, `${srcX}%`] : [`${segLeft}%`, `${srcX}%`],
                                opacity: shouldReduceMotion ? 0.5 : [0.5, 0.4, 0.5],
                            }}
                            style={{ width: '20px', transform: 'translateY(-4px)' }}
                            transition={{ duration: 0.8, repeat: shouldReduceMotion ? 0 : Infinity, ease: 'easeInOut', delay: 0.06 }} 
                            aria-hidden="true"
                        />
                    </>
                )}

                {/* ─── EOF: both wires flash recessive ─── */}
                {txActive && isEofPhase && (
                    <>
                        <motion.line x1={`${segLeft}%`} y1={`${BUS_Y_H}%`} x2={`${segRight}%`} y2={`${BUS_Y_H}%`}
                            stroke="#00f3ff" strokeWidth="3" strokeLinecap="round"
                            animate={{ opacity: shouldReduceMotion ? 0.4 : [0.4, 0.1, 0.4] }} transition={{ duration: 0.3, repeat: shouldReduceMotion ? 0 : Infinity }} />
                        <motion.line x1={`${segLeft}%`} y1={`${BUS_Y_L}%`} x2={`${segRight}%`} y2={`${BUS_Y_L}%`}
                            stroke="#bf00ff" strokeWidth="3" strokeLinecap="round"
                            animate={{ opacity: shouldReduceMotion ? 0.4 : [0.4, 0.1, 0.4] }} transition={{ duration: 0.3, repeat: shouldReduceMotion ? 0 : Infinity, delay: 0.05 }} />
                    </>
                )}
            </svg>

            {/* Wire labels */}
            <div className="absolute text-[9px] font-mono font-black tracking-widest pointer-events-none transition-colors" style={{ left: '5.5%', top: `${BUS_Y_H - 4.5}%`, color: isDark ? '#00f3ff70' : '#00b4ccdd' }}>CANH</div>
            <div className="absolute text-[9px] font-mono font-black tracking-widest pointer-events-none transition-colors" style={{ left: '5.5%', top: `${BUS_Y_L + 1.5}%`, color: isDark ? '#bf00ff70' : '#9d00ccdd' }}>CANL</div>

            {/* ─── Floating data packet label between wires ─── */}
            {txActive && sourceNode && transmission && (
                <motion.div
                    className="absolute pointer-events-none flex items-center gap-1.5 z-30"
                    style={{ top: `${BUS_MID - 2}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                    key={`pkt-${transmission.id}-${transmission.phase}`}
                    animate={{
                        left: isAckPhase
                            ? (goesRight ? [`${segRight}%`, `${(srcX + segRight) / 2}%`] : [`${segLeft}%`, `${(srcX + segLeft) / 2}%`])
                            : (goesRight ? [`${srcX}%`, `${(srcX + segRight) / 2}%`] : [`${srcX}%`, `${(srcX + segLeft) / 2}%`]),
                        opacity: [0, 1, 1],
                    }}
                    transition={{ duration: 1.0, ease: 'easeOut' }}
                >
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md border backdrop-blur-sm"
                        style={{
                            backgroundColor: isAckPhase ? '#14b8a615' : '#00f3ff10',
                            borderColor: isAckPhase ? '#14b8a640' : '#00f3ff30',
                        }}>
                        {/* Direction arrow */}
                        <span className="text-[8px]" style={{ color: isAckPhase ? '#14b8a6' : '#00f3ff' }}>
                            {isAckPhase
                                ? (goesRight ? <ArrowLeft size={8} /> : <ArrowRight size={8} />)
                                : (goesRight ? <ArrowRight size={8} /> : <ArrowLeft size={8} />)
                            }
                        </span>
                        <span className="text-[8px] font-mono font-bold uppercase whitespace-nowrap" style={{ color: isAckPhase ? '#14b8a6' : '#00f3ff' }}>
                            {isAckPhase
                                ? 'ACK'
                                : isEofPhase
                                    ? 'EOF'
                                    : `${sourceNode.canId} ${isCrcPhase ? 'CRC' : `[${transmission.dlc}B]`}`
                            }
                        </span>
                    </div>
                </motion.div>
            )}

            {/* ─── Source → Target route label ─── */}
            {txActive && sourceNode && transmission && (
                <motion.div
                    className="absolute pointer-events-none z-30"
                    style={{ top: `${BUS_Y_L + 4}%`, left: `${(segLeft + segRight) / 2}%`, transform: 'translateX(-50%)' }}
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 dark:bg-[#0a0a0f]/90 border border-black/10 dark:border-[#222] backdrop-blur-sm transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ boxShadow: isDark ? '0 0 4px #22c55e80' : 'none' }} />
                        <span className="text-[8px] font-mono font-bold text-green-600 dark:text-green-400">{sourceNode.label}</span>
                        {isAckPhase ? <ArrowLeft size={8} className="text-light-400 dark:text-gray-600" /> : <ArrowRight size={8} className="text-light-400 dark:text-gray-600" />}
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" style={{ boxShadow: isDark ? '0 0 4px #3b82f680' : 'none' }} />
                        <span className="text-[8px] font-mono font-bold text-blue-600 dark:text-blue-400">
                            {transmission.toId === 'broadcast' ? 'ALL' : (targetNode?.label ?? '?')}
                        </span>
                    </div>
                </motion.div>
            )}

            {/* Ambient signal pulses (when no active transmission) */}
            {!txActive && !hasTermIssue && onlineCount > 0 && (
                <>
                    <motion.div className="absolute pointer-events-none rounded-full"
                        style={{ top: `${BUS_Y_H - 0.5}%`, height: '4px', width: '60px', background: 'linear-gradient(90deg, transparent, #00f3ff50, transparent)', filter: 'blur(1px)' }}
                        animate={{ left: shouldReduceMotion ? '50%' : ['4%', '92%'] }} transition={{ duration: 2.2, repeat: shouldReduceMotion ? 0 : Infinity, ease: 'linear', repeatDelay: 0.8 }} />
                    <motion.div className="absolute pointer-events-none rounded-full"
                        style={{ top: `${BUS_Y_L - 0.5}%`, height: '4px', width: '60px', background: 'linear-gradient(90deg, transparent, #bf00ff40, transparent)', filter: 'blur(1px)' }}
                        animate={{ left: shouldReduceMotion ? '50%' : ['92%', '4%'] }} transition={{ duration: 2.5, repeat: shouldReduceMotion ? 0 : Infinity, ease: 'linear', repeatDelay: 1.0 }} />
                </>
            )}

            {/* Reflection pulses */}
            {hasTermIssue && !txActive && (
                <motion.div className="absolute pointer-events-none rounded-full"
                    style={{ top: `${BUS_MID - 1}%`, height: '10px', width: '24px', background: 'linear-gradient(90deg, transparent, #ef4444, transparent)', filter: 'blur(3px)' }}
                    animate={{ left: shouldReduceMotion ? ( !termRight ? '85%' : '9%' ) : (!termRight ? ['90%', '80%', '90%'] : ['4%', '14%', '4%']), opacity: shouldReduceMotion ? 0.8 : [0.8, 0.2, 0.8] }}
                    transition={{ duration: 0.5, repeat: shouldReduceMotion ? 0 : Infinity }} />
            )}

            {/* Termination Resistors */}
            <TermResistor side="left" isOn={termLeft} onToggle={() => setTermLeft(!termLeft)} busYH={BUS_Y_H} busYL={BUS_Y_L} />
            <TermResistor side="right" isOn={termRight} onToggle={() => setTermRight(!termRight)} busYH={BUS_Y_H} busYL={BUS_Y_L} />

            {/* ECU Node Boxes */}
            {nodes.map((node, i) => {
                const isTx = !!(txActive && transmission?.fromId === node.id);
                const isRx = !!(receivingIds.has(node.id) && txActive);
                const isTop = i % 2 === 0;
                return (
                    <ECUBox key={node.id} node={node}
                        isSelected={selectedNode === node.id}
                        onSelect={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                        anchorY={isTop ? (BUS_Y_H - STUB_OFFSET) : (BUS_Y_L + STUB_OFFSET)}
                        isBottom={!isTop}
                        isTx={isTx} isRx={isRx}
                        controllerBaudStr={controllerBaudStr}
                        boxWidth={boxWidth} />
                );
            })}

            {/* TX/RX label overlay during transmission */}
            {txActive && (
                <div className="absolute bottom-8 left-0 right-0 flex flex-wrap items-center justify-center gap-4 pointer-events-none px-4">
                    {sourceNode && (
                        <motion.div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#22c55e15] border border-[#22c55e40]"
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                            <div className={`w-2 h-2 rounded-full bg-green-500 ${!shouldReduceMotion ? 'animate-pulse' : ''}`} />
                            <span className="text-[8px] font-mono font-bold text-green-400 uppercase">{sourceNode.label} TX</span>
                        </motion.div>
                    )}
                    {[...receivingIds].map(id => {
                        const n = nodes.find(nn => nn.id === id);
                        if (!n) return null;
                        return (
                            <motion.div key={id} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3b82f615] border border-[#3b82f640]"
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                <div className={`w-2 h-2 rounded-full bg-blue-500 ${!shouldReduceMotion ? 'animate-pulse' : ''}`} />
                                <span className="text-[8px] font-mono font-bold text-blue-400 uppercase">{n.label} RX</span>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Bus info strip */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-gradient-to-t from-gray-100 dark:from-[#0a0a0d] to-transparent transition-colors">
                <span className="text-[10px] font-mono text-light-500 dark:text-gray-400">R1 120{'\u03A9'} {termLeft ? 'ON' : 'OFF'}</span>
                <span className="text-[10px] font-mono text-light-500 dark:text-gray-400">Twisted-pair differential bus &middot; ISO 11898-2 &middot; Z₀ = 120{'\u03A9'}</span>
                <span className="text-[10px] font-mono text-light-500 dark:text-gray-400">R2 120{'\u03A9'} {termRight ? 'ON' : 'OFF'}</span>
            </div>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   ECU Box
   ═══════════════════════════════════════════════════════════════ */
const ECUBox = memo(({ node, isSelected, onSelect, anchorY, isBottom, isTx, isRx, controllerBaudStr, boxWidth }: {
    node: ECUNode;
    isSelected: boolean;
    onSelect: () => void;
    anchorY: number;
    isBottom: boolean;
    isTx: boolean;
    isRx: boolean;
    controllerBaudStr: string;
    boxWidth: number;
}) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const dm = DOMAIN_META[node.domain];
    const borderGlow = isTx ? '#22c55e' : isRx ? '#3b82f6' : isSelected ? dm.color : null;
    
    return (
        <Tooltip
            content={
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dm.color }} />
                        <span className="text-[10px] font-mono font-black text-dark-950 dark:text-[#f1f1f1] uppercase tracking-wider">{node.label}</span>
                    </div>
                    {node.description && (
                        <p className="text-[9px] font-mono text-light-400 dark:text-gray-400 leading-relaxed border-t border-black/5 dark:border-[#1a1a20] pt-1 mt-1 transition-colors">
                            {node.description}
                        </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[8px] font-mono text-cyan-600 dark:text-[#00f3ff] font-bold">{node.canId}</span>
                        <span className="text-[8px] font-mono text-light-300 dark:text-gray-700">|</span>
                        <span className="text-[8px] font-mono text-light-400 dark:text-gray-500 uppercase">{dm.label}</span>
                    </div>
                </div>
            }
            side={isBottom ? 'bottom' : 'top'}
            delayDuration={400}
        >
            <div className="absolute transition-all duration-500 z-10"
                style={{ left: `${node.x}%`, top: `${anchorY}%`, width: `${boxWidth}px`, transform: `translateX(-50%) translateY(${isBottom ? '0' : '-100%'})` }}>
                <motion.button
                onClick={onSelect}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                    "w-full flex flex-col items-center bg-white dark:bg-[#0a0a0f] rounded-xl p-2.5 border shadow-xl relative transition-all duration-300",
                    isSelected ? "z-20 scale-[1.02]" : "z-10",
                    isDark ? "shadow-black/60" : "shadow-slate-200/50"
                )}
                style={{
                    borderColor: borderGlow ? borderGlow : (node.online ? (isDark ? '#222230' : '#94a3b8') : (isDark ? '#1a0a0a' : '#f87171')),
                    borderWidth: borderGlow ? 2 : 1,
                    boxShadow: borderGlow && isDark ? `0 0 15px ${borderGlow}25` : 'none'
                }}
                aria-label={`Node ${node.label} (${node.canId}). Domain: ${node.domain}. ${node.online ? 'Online' : 'Offline'}`}
                aria-pressed={isSelected}
            >
                {/* Node Status Indicator */}
                <div className="flex w-full justify-between items-center mb-2 px-0.5">
                    <div className="flex flex-col items-start">
                         <span className={cn("text-[8px] font-black tracking-tight transition-colors uppercase", isDark ? "text-gray-400" : "text-gray-500")}>ID</span>
                         <span className={cn("text-[10px] font-bold font-mono transition-colors", isSelected ? "text-cyber-blue" : (isDark ? "text-white" : "text-slate-900"))}>{node.canId}</span>
                    </div>
                    {node.online && (
                        <div className="flex items-center gap-1.5">
                            {(isTx || isRx) && (
                                <span className={cn(
                                    "flex h-4 items-center px-1.5 rounded text-[7px] font-black border animate-pulse transition-colors uppercase tracking-wider",
                                    isTx ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                )}>
                                    {isTx ? 'TX' : 'RX'}
                                </span>
                            )}
                            <div className="flex items-center gap-1">
                                <span className={cn("w-1.5 h-1.5 rounded-full transition-all duration-500", node.online ? "bg-green-500 shadow-[0_0_4px_#22c55e]" : "bg-red-500")} />
                                <span className={cn("text-[7px] font-black uppercase tracking-tighter transition-colors", node.online ? "text-green-500" : "text-red-500")}>
                                    {node.online ? 'ON' : 'OFF'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className={cn("text-[9px] font-black tracking-tighter mb-1.5 transition-colors uppercase truncate w-full px-1", isSelected ? (isDark ? "text-white" : "text-slate-900") : (isDark ? "text-gray-300" : "text-slate-700"))}>{node.label}</div>

                {node.online && (
                    <>
                        <div className="flex flex-wrap gap-1 justify-center mb-1">
                            {node.baudRate !== controllerBaudStr && (
                                <span className="text-[6px] font-mono px-1 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded uppercase font-bold" title="Baudrate mismatch!">MISMATCH</span>
                            )}
                            {node.isLocal && <span className="text-[6px] font-mono px-1 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded uppercase font-bold">LOCAL</span>}
                        </div>
                        <span className="text-[7px] font-mono uppercase tracking-wider block mt-1 px-1 py-[1px] rounded-sm mx-auto w-fit"
                            style={{ backgroundColor: dm.color + '10', color: dm.color + '90', border: `1px solid ${dm.color}20` }}>
                            {dm.label}
                        </span>
                    </>
                )}

                {!node.online && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-black/70 flex flex-col items-center justify-center rounded-lg backdrop-blur-[1px] transition-colors">
                        <span className="text-[8px] font-mono text-red-600 dark:text-red-500 font-bold uppercase transition-colors">OFF</span>
                    </div>
                )}
            </motion.button>
        </div>
        </Tooltip>
    );
});
ECUBox.displayName = 'ECUBox';

/* ═══════════════════════════════════════════════════════════════
   Termination Resistor
   ═══════════════════════════════════════════════════════════════ */
const TermResistor = memo(({ side, isOn, onToggle, busYH, busYL }: {
    side: 'left' | 'right';
    isOn: boolean;
    onToggle: () => void;
    busYH: number;
    busYL: number;
}) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const isLeft = side === 'left';
    const midY = (busYH + busYL) / 2;
    return (
        <button
            type="button"
            className="group absolute z-20 flex flex-col items-center bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
            style={{ [side]: '1%', top: `${midY - 8}%` }}
            onClick={onToggle}
            aria-pressed={isOn}
            aria-label={`Toggle ${isLeft ? 'R1' : 'R2'} termination resistor`}
        >
            <div className={`relative w-8 h-14 rounded-md border flex flex-col items-center justify-center gap-[2px] transition-all duration-300 group-hover:scale-105 ${isOn ? '' : 'opacity-50'}`}
                style={{ borderColor: isOn ? (isLeft ? '#00f3ff40' : '#bf00ff40') : (isDark ? '#333' : '#e5e7eb'), backgroundColor: isDark ? '#0a0a0f' : '#ffffff', boxShadow: (isOn && isDark) ? `0 0 12px ${isLeft ? '#00f3ff15' : '#bf00ff15'}` : 'none' }}>
                {[0, 1, 2, 3, 4].map(i => <div key={i} className="w-5 h-[1.5px] rounded-full transition-colors duration-300" style={{ backgroundColor: isOn ? (isLeft ? '#00f3ff35' : '#bf00ff35') : (isDark ? '#1a1a20' : '#f1f5f9') }} />)}
                <motion.div className="absolute -bottom-2.5 w-3.5 h-3.5 rounded-full border-2"
                    animate={{ backgroundColor: isOn ? '#22c55e' : (isDark ? '#111' : '#f8fafc'), borderColor: isOn ? '#22c55e60' : (isDark ? '#333' : '#e2e8f0'), boxShadow: (isOn && isDark) ? '0 0 8px #22c55e50' : 'none' }} />
            </div>
            <span className="mt-2 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors" style={{ color: isOn ? (isLeft ? '#00f3ff' : '#bf00ff') : (isDark ? '#444' : '#94a3b8') }}>{isLeft ? 'R1' : 'R2'}</span>
            <span className="text-[8px] font-mono font-bold" style={{ color: isOn ? (isDark ? '#888' : '#64748b') : '#ef444480' }}>120{'\u03A9'}</span>
            <span className="text-[8px] font-mono font-bold" style={{ color: isOn ? '#22c55e' : '#ef4444' }}>{isOn ? 'ON' : 'OFF'}</span>
        </button>
    );
});
TermResistor.displayName = 'TermResistor';

/* ═══════════════════════════════════════════════════════════════
   List View
   ═══════════════════════════════════════════════════════════════ */
function ListView({ nodes, selectedNode, setSelectedNode, toggleNode, removeNode }: {
    nodes: ECUNode[];
    selectedNode: string | null;
    setSelectedNode: (id: string | null) => void;
    toggleNode: (id: string) => void;
    removeNode: (id: string) => void;
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    return (
        <div className="overflow-x-auto">
        <table className="w-full text-[8px] font-mono">
            <thead><tr className="border-b border-black/5 dark:border-[#1a1a20] transition-colors">
                {['Status', 'ECU Name', 'CAN ID', 'Domain', 'Baud', 'Stub', 'TX', 'RX', 'Errors', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-light-400 dark:text-gray-600 font-bold uppercase tracking-wider">{h}</th>
                ))}
            </tr></thead>
            <tbody>{nodes.map(node => {
                const dm = DOMAIN_META[node.domain];
                const isSel = selectedNode === node.id;
                return (
                    <tr key={node.id} onClick={() => setSelectedNode(isSel ? null : node.id)}
                        className={`border-b border-black/[0.03] dark:border-[#111118] cursor-pointer transition-colors ${isSel ? 'bg-gray-100 dark:bg-[#111118]' : 'hover:bg-gray-50 dark:hover:bg-[#0d0d12]'}`}>
                        <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: node.online ? '#22c55e' : '#ef4444', boxShadow: isDark ? `0 0 4px ${node.online ? '#22c55e60' : '#ef444460'}` : 'none' }} />
                                <span className={cn("text-[8px] font-bold uppercase transition-colors", node.online ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500")}>
                                    {node.online ? 'ON' : 'OFF'}
                                </span>
                            </div>
                        </td>
                        <td className="py-2 px-3 font-bold text-dark-900 dark:text-gray-300 uppercase transition-colors">{node.label}</td>
                        <td className="py-2 px-3 text-light-500 dark:text-gray-500 transition-colors">{node.canId}</td>
                        <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded-sm text-[8px]" style={{ backgroundColor: dm.color + '15', color: dm.color, border: `1px solid ${dm.color}25` }}>{dm.label}</span></td>
                        <td className="py-2 px-3 text-light-500 dark:text-gray-500 transition-colors">{node.baudRate}</td>
                        <td className="py-2 px-3 text-light-500 dark:text-gray-500 transition-colors">{node.stubLength}m</td>
                        <td className="py-2 px-3 text-green-500">{node.txCount}</td>
                        <td className="py-2 px-3 text-blue-400">{node.rxCount}</td>
                        <td className="py-2 px-3" style={{ color: node.errorCount > 0 ? '#ef4444' : (isDark ? '#333' : '#cbd5e1') }}>{node.errorCount}</td>
                        <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                                <button onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-colors ${node.online ? 'text-red-400 border-red-500/30 hover:bg-red-500/10' : 'text-green-600 dark:text-green-400 border-green-500/30 hover:bg-green-500/10'}`}>
                                    {node.online ? 'OFF' : 'ON'}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                                    className="px-2 py-0.5 rounded text-[9px] font-bold text-light-400 dark:text-gray-600 border border-black/10 dark:border-[#222] hover:text-red-400 hover:border-red-500/30 transition-colors">DEL</button>
                            </div>
                        </td>
                    </tr>
                );
            })}</tbody>
        </table>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   Node Detail Panel
   ═══════════════════════════════════════════════════════════════ */
function NodeDetailPanel({
    node, onToggle, onRemove, onClose, onSendSignal, onBaudChange, onUpdateNode,
    allNodes, existingNodes, isBusy, onOpenFrameBuilder, onResetCounters
}: {
    node: ECUNode;
    onToggle: () => void;
    onRemove: () => void;
    onClose: () => void;
    onSendSignal: (from: string, to: string | 'broadcast', msgType?: MessageType, dlc?: number, data?: string[]) => void;
    onBaudChange: (baud: string) => void;
    onUpdateNode: (updates: Partial<Pick<ECUNode, 'label' | 'description' | 'canId' | 'domain' | 'stubLength'>>) => void;
    allNodes: ECUNode[];
    existingNodes: ECUNode[];
    isBusy: boolean;
    onOpenFrameBuilder: () => void;
    onResetCounters: () => void;
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({
        label: node.label,
        description: node.description || '',
        canId: node.canId,
        domain: node.domain,
        stubLength: String(node.stubLength)
    });

    useEffect(() => {
        setDraft({
            label: node.label,
            description: node.description || '',
            canId: node.canId,
            domain: node.domain,
            stubLength: String(node.stubLength)
        });
        setEditing(false);
    }, [node.id]);

    const duplicateNode = existingNodes.find(
        n => n.id !== node.id && n.canId.toLowerCase() === draft.canId.toLowerCase() && draft.canId.length >= 4
    );

    const handleSave = () => {
        if (!draft.label.trim() || draft.canId.length < 4 || duplicateNode) return;
        onUpdateNode({
            label: draft.label.trim(),
            description: draft.description.trim() || undefined,
            canId: draft.canId,
            domain: draft.domain as ECUDomain,
            stubLength: parseFloat(draft.stubLength) || node.stubLength
        });
        setEditing(false);
    };

    const handleCancel = () => {
        setDraft({
            label: node.label,
            description: node.description || '',
            canId: node.canId,
            domain: node.domain,
            stubLength: String(node.stubLength)
        });
        setEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') handleCancel();
    };

    const dm = DOMAIN_META[node.domain];
    const onlineColor = node.online ? dm.color : '#ef4444';
    const onlineGlow = node.online ? dm.glow : '#ef444460';

    return (
        <div className="bg-white dark:bg-[#0c0c0f] px-5 py-4 transition-colors" onKeyDown={editing ? handleKeyDown : undefined}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                        <motion.div className="w-3 h-3 rounded-full" animate={{ backgroundColor: onlineColor, boxShadow: isDark ? `0 0 8px ${onlineGlow}` : 'none' }} />
                        <span className={cn("text-[7px] font-black uppercase tracking-tighter transition-colors", node.online ? "text-green-500" : "text-red-500")}>
                            {node.online ? 'ON' : 'OFF'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 group">
                        <div>
                            <h3 className="text-sm font-mono font-black text-dark-950 dark:text-[#f1f1f1] uppercase tracking-tight transition-colors">
                                {node.label}
                                {node.isLocal && <span className="ml-2 text-[8px] text-light-400 dark:text-gray-600 font-bold border border-black/10 dark:border-gray-600/30 px-1 rounded uppercase tracking-tighter transition-colors">Local Controller</span>}
                            </h3>
                            <p className="text-[8px] font-mono text-light-500 dark:text-gray-500 transition-colors">{node.canId} &middot; {dm.label} &middot; {node.baudRate}</p>
                        </div>
                        {!editing && (
                            <button onClick={() => setEditing(true)} aria-label="Edit ECU"
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded transition-all hover:bg-black/5 dark:hover:bg-white/5 text-light-400 dark:text-gray-600 hover:text-dark-400 dark:hover:text-gray-300">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
                <button onClick={onClose} className="text-light-400 dark:text-gray-600 hover:text-dark-400 dark:hover:text-gray-400 p-1 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
            </div>

            {/* Editing Form OR Stats Display */}
            <div className="mb-4">
                {editing ? (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-lg bg-gray-50 dark:bg-[#111116] border border-black/10 dark:border-[#2a2a32] shadow-xl space-y-4 transition-colors">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="text-[8px] font-mono text-light-500 dark:text-gray-500 uppercase tracking-wider block mb-1">ECU Name</label>
                                <input value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} autoFocus
                                    className="w-full bg-white dark:bg-[#0a0a0e] border border-black/10 dark:border-[#222] rounded-md px-2.5 py-1.5 text-[10px] font-mono text-dark-950 dark:text-[#f1f1f1] focus:outline-none focus:border-cyber-blue/40 dark:focus:border-[#00f3ff40] transition-colors" />
                            </div>
                            <div>
                                <label className="text-[8px] font-mono text-light-500 dark:text-gray-500 uppercase tracking-wider block mb-1">CAN ID</label>
                                <input value={draft.canId} onChange={e => setDraft({ ...draft, canId: e.target.value })}
                                    className={`w-full bg-white dark:bg-[#0a0a0e] border rounded-md px-2.5 py-1.5 text-[10px] font-mono text-dark-950 dark:text-[#f1f1f1] focus:outline-none transition-colors ${duplicateNode ? 'border-red-500/50 focus:border-red-400' : 'border-black/10 dark:border-[#222] focus:border-cyber-blue/40 dark:focus:border-[#00f3ff40]'}`} />
                                {duplicateNode && <p className="text-[8px] font-mono text-red-500 dark:text-red-400 mt-1 uppercase">CAN ID already in use by {duplicateNode.label}</p>}
                            </div>
                            <div>
                                <label className="text-[8px] font-mono text-light-500 dark:text-gray-500 uppercase tracking-wider block mb-1">Stub Length (m)</label>
                                <input type="number" step="0.01" value={draft.stubLength} onChange={e => setDraft({ ...draft, stubLength: e.target.value })}
                                    className="w-full bg-white dark:bg-[#0a0a0e] border border-black/10 dark:border-[#222] rounded-md px-2.5 py-1.5 text-[10px] font-mono text-dark-950 dark:text-[#f1f1f1] focus:outline-none focus:border-cyber-blue/40 dark:focus:border-[#00f3ff40] transition-colors" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[8px] font-mono text-light-500 dark:text-gray-400 uppercase tracking-wider block mb-1">Description (Tooltip)</label>
                            <input value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })}
                                placeholder="e.g. Engine ECU - ECM"
                                className="w-full bg-white dark:bg-[#0a0a0e] border border-black/10 dark:border-[#222] rounded-md px-2.5 py-1.5 text-[10px] font-mono text-dark-950 dark:text-[#f1f1f1] focus:outline-none focus:border-cyber-blue/40 dark:focus:border-[#00f3ff40] transition-colors" />
                        </div>

                        <div>
                            <label className="text-[8px] font-mono text-light-500 dark:text-gray-500 uppercase tracking-wider block mb-1.5">Network Domain</label>
                            <div className="flex flex-wrap gap-1">
                                {(Object.entries(DOMAIN_META) as [ECUDomain, typeof DOMAIN_META[ECUDomain]][]).map(([key, meta]) => (
                                    <button key={key} onClick={() => setDraft({ ...draft, domain: key })}
                                        className={`px-2 py-1 rounded text-[9px] font-mono font-bold uppercase border transition-all ${draft.domain === key ? '' : 'border-black/10 dark:border-[#222] text-light-400 dark:text-gray-600 hover:text-dark-400 dark:hover:text-gray-400'}`}
                                        style={draft.domain === key ? { backgroundColor: meta.color + '15', color: meta.color, borderColor: meta.color + '50' } : undefined}>
                                        {meta.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <button onClick={handleCancel}
                                className="px-3 py-1.5 rounded-md text-[8px] font-mono font-bold uppercase tracking-wider border border-black/10 dark:border-[#222] text-light-500 dark:text-gray-500 hover:text-dark-950 dark:hover:text-[#f1f1f1] transition-all">
                                Cancel
                            </button>
                            <button onClick={handleSave}
                                disabled={!draft.label.trim() || draft.canId.length < 4 || !!duplicateNode}
                                className="px-4 py-1.5 rounded-md text-[8px] font-mono font-bold uppercase tracking-wider bg-[#00f3ff15] border border-[#00f3ff40] text-[#00f3ff] hover:bg-[#00f3ff25] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                Save Changes
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                            {[
                                { k: 'State', v: node.online ? 'ONLINE' : 'OFFLINE', c: node.online ? '#22c55e' : '#ef4444' },
                                { k: 'Baud Rate', v: node.baudRate, c: '#888' },
                                { k: 'Stub Length', v: `${node.stubLength}m`, c: '#888' },
                                { k: 'TX Frames', v: node.txCount.toLocaleString(), c: '#22c55e' },
                                { k: 'RX Frames', v: node.rxCount.toLocaleString(), c: '#3b82f6' },
                                { k: 'Errors', v: node.errorCount.toLocaleString(), c: node.errorCount > 0 ? '#ef4444' : '#333' },
                                { v: dm.label.toUpperCase(), c: dm.color, k: 'Domain' },
                            ].map(s => (
                                <div key={s.k} className="px-3 py-2 rounded-md bg-gray-50 dark:bg-[#111116] border border-black/5 dark:border-[#1a1a22] transition-colors">
                                    <span className="text-[9px] font-mono text-light-400 dark:text-gray-400 uppercase tracking-wider block mb-0.5 transition-colors">{s.k}</span>
                                    <span className="text-[10px] font-mono font-bold" style={{ color: s.c }}>{s.v}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-end">
                            <button
                                onClick={onResetCounters}
                                className="flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-mono font-bold text-light-500 dark:text-gray-500 border border-black/10 dark:border-[#1a1a22] hover:text-dark-950 dark:hover:text-[#f1f1f1] hover:border-black/20 dark:hover:border-[#333] transition-all active:scale-95"
                                title="Reset TX, RX, and error counters for this node"
                            >
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                    <path d="M3 3v5h5" />
                                </svg>
                                Reset Counters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
                {/* Baud selector */}
                <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-light-500 dark:text-gray-400 uppercase mr-1 transition-colors">Baud:</span>
                    {BAUD_OPTIONS.map(b => (
                        <button key={b} onClick={() => onBaudChange(b)}
                            className={`px-2 py-1 rounded text-[9px] font-mono font-bold border transition-all ${node.baudRate === b ? 'bg-cyber-blue/15 text-cyber-blue border-cyber-blue/40 dark:bg-[#00f3ff15] dark:text-[#00f3ff] dark:border-[#00f3ff40]' : 'text-light-400 dark:text-gray-600 border-black/10 dark:border-[#222] hover:border-black/20 dark:hover:border-[#333]'}`}>
                            {b}
                        </button>
                    ))}
                </div>

                <div className="w-px h-5 bg-black/5 dark:bg-[#222] transition-colors" />

                {/* Quick send buttons */}
                <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] font-mono text-light-500 dark:text-gray-400 uppercase mr-1 transition-colors">Send to:</span>
                    {isBusy && (
                        <span className="text-[8px] font-mono font-bold text-amber-500 dark:text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded px-1.5 py-0.5 ml-1 animate-pulse">
                            Bus busy
                        </span>
                    )}
                    {allNodes.filter(n => n.id !== node.id && n.online).map(target => (
                        <button key={target.id} onClick={() => onSendSignal(node.id, target.id)}
                            disabled={isBusy || !node.online}
                            className="px-2 py-1 rounded text-[9px] font-mono font-bold text-light-500 dark:text-gray-500 border border-black/10 dark:border-[#222] hover:text-cyber-blue dark:hover:text-[#00f3ff] hover:border-cyber-blue/40 dark:hover:border-[#00f3ff40] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                            {target.label}
                        </button>
                    ))}
                    <button onClick={() => onSendSignal(node.id, 'broadcast')}
                        disabled={isBusy || !node.online}
                        className="px-2 py-1 rounded text-[9px] font-mono font-bold text-yellow-600 dark:text-yellow-500/70 border border-yellow-500/20 hover:text-yellow-500 dark:hover:text-yellow-400 hover:border-yellow-500/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                        ALL
                    </button>
                </div>

                <div className="w-px h-5 bg-black/5 dark:bg-[#222] transition-colors" />

                {/* Frame builder */}
                <button onClick={onOpenFrameBuilder}
                    disabled={isBusy || !node.online}
                    className="px-3 py-1 rounded text-[9px] font-mono font-bold text-[#a855f7] border border-[#a855f730] hover:bg-[#a855f710] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    Build Frame...
                </button>

                <div className="flex-1" />

                <button onClick={onToggle}
                    className={`px-4 py-1.5 rounded-md text-[8px] font-mono font-bold uppercase tracking-wider border transition-all active:scale-95 ${node.online ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'}`}>
                    {node.online ? 'Disconnect' : 'Connect'}
                </button>
                <button onClick={onRemove}
                    className="px-4 py-1.5 rounded-md text-[8px] font-mono font-bold uppercase tracking-wider border border-black/10 dark:border-[#222] text-light-600 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:border-red-500/30 transition-all active:scale-95">
                    Remove
                </button>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   Message Log Panel
   ═══════════════════════════════════════════════════════════════ */
function MessageLogPanel({ log, onClear }: { log: MessageLogEntry[]; onClear: () => void }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [expanded, setExpanded] = useState(true);

    const downloadFile = (content: string, filename: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportCSV = () => {
        const header = 'Timestamp,From,To,Type,DLC,Data,Success,Error';
        const rows = log.map(e =>
            [new Date(e.timestamp).toISOString(), e.fromLabel, e.toLabel,
             e.messageType, e.dlc, `"[${e.data.join(' ')}]"` ,
             e.success, e.error ?? ''].join(',')
        );
        downloadFile([header, ...rows].join('\n'), `can-log-${Date.now()}.csv`, 'text/csv');
    };

    const exportJSON = () => {
        downloadFile(JSON.stringify(log, null, 2), `can-log-${Date.now()}.json`, 'application/json');
    };

    return (
        <div className="bg-white dark:bg-[#0a0a0e] transition-colors">
            <div className="w-full flex items-center justify-between px-5 py-2 hover:bg-gray-50 dark:hover:bg-[#0e0e12] transition-colors">
                <button onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-2">
                    <span className="text-[8px] font-mono font-bold text-light-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Message Log</span>
                    <span className="text-[10px] font-mono text-light-500 dark:text-gray-400 transition-colors">({log.length})</span>
                    <span className="text-light-400 dark:text-gray-600 text-[10px] transition-colors">{expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}</span>
                </button>
                <div className="flex items-center gap-2">
                    <button onClick={exportCSV} disabled={log.length === 0}
                        className="text-[10px] font-mono text-light-500 dark:text-gray-400 hover:text-cyber-blue dark:hover:text-[#00f3ff] uppercase disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        CSV
                    </button>
                    <button onClick={exportJSON} disabled={log.length === 0}
                        className="text-[10px] font-mono text-light-500 dark:text-gray-400 hover:text-cyber-purple dark:hover:text-[#a855f7] uppercase disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        JSON
                    </button>
                    <button onClick={onClear}
                        className="text-[10px] font-mono text-light-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 uppercase transition-colors">Clear</button>
                </div>
            </div>
            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="max-h-48 overflow-y-auto px-5 pb-3 space-y-1">
                            {log.map((entry) => (
                                <motion.div key={`${entry.id}-${entry.timestamp}`}
                                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}
                                    className={`flex items-center gap-3 px-3 py-1.5 rounded-md text-[8px] font-mono transition-colors ${entry.success ? 'bg-gray-50 dark:bg-[#111116]' : 'bg-red-50 dark:bg-[#1a0808]'}`}>
                                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: entry.success ? '#22c55e' : '#ef4444', boxShadow: isDark ? `0 0 4px ${entry.success ? '#22c55e60' : '#ef444460'}` : 'none' }} />
                                    <span className="text-light-400 dark:text-gray-600 w-16 flex-shrink-0 transition-colors uppercase">{new Date(entry.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                    <span className="text-dark-900 dark:text-gray-300 font-bold w-14 flex-shrink-0 transition-colors text-center">{entry.fromLabel}</span>
                                    <ArrowRight size={10} className="text-light-400 dark:text-gray-600 transition-colors" />
                                    <span className="text-dark-900 dark:text-gray-300 font-bold w-14 flex-shrink-0 transition-colors text-center">{entry.toLabel}</span>
                                    <span className="px-1 py-[1px] rounded border text-[8px] uppercase"
                                        style={{
                                            color: entry.messageType === 'diagnostic' ? '#00f3ff' : entry.messageType === 'remote' ? '#f59e0b' : '#a855f7',
                                            borderColor: entry.messageType === 'diagnostic' ? '#00f3ff20' : entry.messageType === 'remote' ? '#f59e0b20' : '#a855f720'
                                        }}>
                                        {entry.messageType}
                                    </span>
                                    <span className="text-light-400 dark:text-gray-500 transition-colors">{entry.dlc}B</span>
                                    <span className="text-light-400 dark:text-gray-600 flex-1 truncate transition-colors">[{entry.data.join(' ')}]</span>
                                    {entry.error && (
                                        <span className="text-red-400 text-[8px] truncate max-w-[160px] cursor-help" title={entry.error}>
                                            {entry.error}
                                        </span>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   Frame Builder Dialog
   ═══════════════════════════════════════════════════════════════ */
function FrameBuilderDialog({ fromNode, allNodes, onSend, onClose, isBusy }: {
    fromNode: ECUNode;
    allNodes: ECUNode[];
    onSend: (toId: string | 'broadcast', msgType: MessageType, dlc: number, data: string[]) => void;
    onClose: () => void;
    isBusy: boolean;
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [toId, setToId] = useState<string | 'broadcast'>('broadcast');
    const [msgType, setMsgType] = useState<MessageType>('data');
    const [dlc, setDlc] = useState(8);
    const [dataBytes, setDataBytes] = useState<string[]>(RANDOM_DATA());

    const updateByte = (idx: number, val: string) => {
        const clamped = val.replace(/[^0-9a-fA-F]/g, '').slice(0, 2).toUpperCase();
        setDataBytes(prev => { const n = [...prev]; n[idx] = clamped; return n; });
    };

    const containerRef = useRef<HTMLDivElement>(null);
    const lastActiveElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
        lastActiveElement.current = document.activeElement as HTMLElement;
        return () => {
            setTimeout(() => {
                lastActiveElement.current?.focus();
            }, 50);
        };
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        const focusable = containerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        const initialFocus = containerRef.current.querySelector('button, input');
        (initialFocus as HTMLElement)?.focus();

        const handleTab = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        window.addEventListener('keydown', handleTab);
        return () => window.removeEventListener('keydown', handleTab);
    }, []);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-colors" onClick={onClose}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                ref={containerRef}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-[#111116] border border-black/10 dark:border-[#2a2a30] rounded-xl shadow-2xl p-6 w-full max-w-lg transition-colors">

                <h3 className="text-sm font-mono font-black text-dark-950 dark:text-[#f1f1f1] uppercase tracking-wider mb-1 transition-colors">Build CAN Frame</h3>
                <p className="text-[8px] font-mono text-light-500 dark:text-gray-500 mb-4 transition-colors">Transmitting from <span className="text-cyber-blue dark:text-[#00f3ff] font-bold">{fromNode.label}</span> ({fromNode.canId})</p>

                <div className="space-y-4">
                    {/* Target */}
                    <div>
                        <label className="text-[8px] font-mono text-light-500 dark:text-gray-500 uppercase tracking-wider block mb-1.5 transition-colors">Target Node</label>
                        <div className="flex flex-wrap gap-1.5">
                            <button onClick={() => setToId('broadcast')}
                                className={`px-2.5 py-1.5 rounded text-[9px] font-mono font-bold uppercase border transition-all ${toId === 'broadcast' ? 'bg-orange-500/15 text-orange-600 dark:text-[#f59e0b] border-orange-500/50' : 'text-light-400 dark:text-gray-600 border-black/10 dark:border-[#222]'}`}>
                                Broadcast (All)
                            </button>
                            {allNodes.filter(n => n.id !== fromNode.id).map(n => (
                                <button key={n.id} onClick={() => setToId(n.id)}
                                    className={`px-2.5 py-1.5 rounded text-[8px] font-mono font-bold uppercase border transition-all ${toId === n.id ? 'bg-cyber-blue/15 text-cyber-blue dark:text-[#00f3ff] border-cyber-blue/50' : 'text-light-400 dark:text-gray-600 border-black/10 dark:border-[#222]'}`}>
                                    {n.label}
                                    {!n.online && <span className="ml-1 text-red-500 dark:text-red-400 normal-case">(off)</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message Type */}
                    <div>
                        <label className="text-[8px] font-mono text-light-500 dark:text-gray-500 uppercase tracking-wider block mb-1.5 transition-colors">Frame Type</label>
                        <div className="flex gap-1.5">
                            {([['data', 'Data Frame', 'Standard data payload'], ['remote', 'Remote Frame', 'Request data from target'], ['diagnostic', 'Diagnostic', 'UDS/OBD request']] as const).map(([type, label, desc]) => (
                                <button key={type} onClick={() => setMsgType(type)}
                                    className={`flex-1 px-3 py-2 rounded border text-left transition-all ${msgType === type ? 'border-cyber-blue/40 bg-cyber-blue/5 dark:border-[#00f3ff40] dark:bg-[#00f3ff08]' : 'border-black/10 dark:border-[#222] hover:border-black/20 dark:hover:border-[#333]'}`}>
                                    <span className={`text-[8px] font-mono font-bold block transition-colors ${msgType === type ? 'text-cyber-blue dark:text-[#00f3ff]' : 'text-light-400 dark:text-gray-400'}`}>{label}</span>
                                    <span className="text-[9px] font-mono text-light-400 dark:text-gray-400 block mt-0.5 transition-colors">{desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* DLC */}
                    <div>
                        <label className="text-[8px] font-mono text-light-500 dark:text-gray-500 uppercase tracking-wider block mb-1.5 transition-colors">Data Length Code (DLC): {dlc} bytes</label>
                        <div className="flex gap-1">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(d => (
                                <button key={d} onClick={() => setDlc(d)}
                                    className={`w-8 h-8 rounded text-[8px] font-mono font-bold border transition-all ${dlc === d ? 'bg-cyber-purple/15 text-cyber-purple border-cyber-purple/50 dark:bg-[#a855f715] dark:text-[#a855f7] dark:border-[#a855f750]' : 'text-light-400 dark:text-gray-600 border-black/10 dark:border-[#222]'}`}>
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Data Bytes */}
                    {dlc > 0 && msgType !== 'remote' && (
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[8px] font-mono text-light-500 dark:text-gray-500 uppercase tracking-wider transition-colors">Data Bytes (hex)</label>
                                <button onClick={() => setDataBytes(RANDOM_DATA())} className="text-[10px] font-mono text-light-400 dark:text-gray-400 hover:text-cyber-purple dark:hover:text-[#a855f7] transition-colors">Randomize</button>
                            </div>
                            <div className="flex gap-1.5">
                                {Array.from({ length: dlc }, (_, i) => (
                                    <div key={i} className="flex flex-col items-center gap-0.5">
                                        <span className="text-[8px] font-mono text-light-300 dark:text-gray-700 transition-colors">D{i}</span>
                                        <input value={dataBytes[i] ?? '00'} onChange={e => updateByte(i, e.target.value)}
                                            className="w-9 h-8 text-center bg-white dark:bg-[#0a0a0e] border border-black/10 dark:border-[#222] rounded text-[9px] font-mono font-bold text-cyber-purple dark:text-[#a855f7] focus:outline-none focus:border-cyber-purple/40 dark:focus:border-[#a855f740] uppercase transition-colors"
                                            maxLength={2} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Frame preview */}
                    <div className="p-3 rounded-md bg-gray-50 dark:bg-[#0a0a0e] border border-black/10 dark:border-[#1a1a20] transition-colors">
                        <span className="text-[9px] font-mono text-light-400 dark:text-gray-400 uppercase tracking-wider block mb-1 transition-colors">Frame Preview</span>
                        <div className="flex gap-[2px] rounded overflow-hidden">
                            {[
                                { label: 'SOF', color: '#22c55e', w: 'w-4' },
                                { label: fromNode.canId, color: '#f59e0b', w: 'flex-[2]' },
                                { label: `DLC:${dlc}`, color: '#3b82f6', w: 'flex-1' },
                                { label: msgType === 'remote' ? 'RTR' : (dlc > 0 ? dataBytes.slice(0, dlc).join(' ') : '—'), color: '#a855f7', w: 'flex-[3]' },
                                { label: 'CRC', color: '#ec4899', w: 'flex-1' },
                                { label: 'ACK', color: '#14b8a6', w: 'w-6' },
                                { label: 'EOF', color: '#00f3ff', w: 'w-6' },
                            ].map((seg, i) => (
                                <div key={i} className={`${seg.w} h-6 flex items-center justify-center px-1 transition-colors`}
                                    style={{ backgroundColor: seg.color + (isDark ? '15' : '10'), borderBottom: `2px solid ${seg.color}${isDark ? '40' : '60'}` }}>
                                    <span className="text-[8px] font-mono font-bold truncate transition-colors" style={{ color: seg.color }}>{seg.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 mt-5">
                    <button onClick={onClose} className="px-4 py-2 rounded-md text-[8px] font-mono font-bold uppercase tracking-wider border border-black/10 dark:border-[#222] text-light-500 dark:text-gray-500 hover:text-dark-950 dark:hover:text-[#f1f1f1] transition-all">Cancel</button>
                    <div className="flex items-center gap-2">
                        {isBusy && (
                            <span className="text-[8px] font-mono font-bold text-amber-500 dark:text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded px-1.5 py-1.5 animate-pulse">
                                Bus busy
                            </span>
                        )}
                        <button onClick={() => onSend(toId, msgType, dlc, msgType === 'remote' ? [] : dataBytes.slice(0, dlc))}
                            disabled={isBusy}
                            className="px-5 py-2 rounded-md text-[8px] font-mono font-bold uppercase tracking-wider bg-green-500/10 dark:bg-[#22c55e15] border border-green-500/30 dark:border-[#22c55e40] text-green-600 dark:text-[#22c55e] hover:bg-green-500/20 dark:hover:bg-[#22c55e25] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                            Transmit Frame
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   Add ECU Dialog
   ═══════════════════════════════════════════════════════════════ */
function AddECUDialog({ onAdd, onClose, existingPositions, existingNodes }: {
    onAdd: (node: Omit<ECUNode, 'id' | 'description' | 'txCount' | 'rxCount' | 'errorCount'> & { description?: string }) => void;
    onClose: () => void;
    existingPositions: number[];
    existingNodes: Pick<ECUNode, 'id' | 'label' | 'canId'>[];
}) {
    const [label, setLabel] = useState('');
    const [description, setDescription] = useState('');
    const [canId, setCanId] = useState('0x');
    const [domain, setDomain] = useState<ECUDomain>('body');
    const [stubLength, setStubLength] = useState('0.20');
    const [baudRate, setBaudRate] = useState('500k');

    const duplicateNode = existingNodes.find(
        n => n.canId.toLowerCase() === canId.toLowerCase() && canId.length >= 4
    );

    const findFreePosition = (): number => {
        // Try to find a balanced spot with 8% gap first (optimal for visual)
        for (let x = 10; x <= 90; x += 2) { if (!existingPositions.some(p => Math.abs(p - x) < 8)) return x; }
        // If crowded, reduce gap to 5% (minimal for clarity)
        for (let x = 5; x <= 95; x += 2) { if (!existingPositions.some(p => Math.abs(p - x) < 5)) return x; }
        // Still no? Just append after the rightmost node
        const maxPos = existingPositions.length > 0 ? Math.max(...existingPositions) : 50;
        return Math.min(98, maxPos + 2);
    };

    const handleSubmit = () => {
        if (!label.trim() || canId.length < 4 || duplicateNode) return;
        onAdd({ label: label.trim(), description: description.trim() || undefined, canId, x: findFreePosition(), online: true, domain, stubLength: parseFloat(stubLength) || 0.20, baudRate });
    };

    const containerRef = useRef<HTMLDivElement>(null);
    const lastActiveElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
        lastActiveElement.current = document.activeElement as HTMLElement;
        return () => {
            setTimeout(() => {
                lastActiveElement.current?.focus();
            }, 50);
        };
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        const focusable = containerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        const initialFocus = containerRef.current.querySelector('input');
        initialFocus?.focus();

        const handleTab = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        window.addEventListener('keydown', handleTab);
        return () => window.removeEventListener('keydown', handleTab);
    }, []);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                ref={containerRef}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-[#111116] border border-black/10 dark:border-[#2a2a30] rounded-xl shadow-2xl p-6 w-full max-w-md transition-colors">
                <h3 className="text-sm font-mono font-black text-dark-950 dark:text-[#f1f1f1] uppercase tracking-wider mb-4 transition-colors">Add ECU Node</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-[8px] font-mono text-light-500 dark:text-gray-500 uppercase tracking-wider block mb-1 transition-colors">ECU Name</label>
                        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Airbag SRS"
                            className={`w-full bg-white dark:bg-[#0a0a0e] border rounded-md px-3 py-2 text-xs font-mono text-dark-900 dark:text-[#f1f1f1] placeholder:text-gray-300 dark:placeholder:text-gray-700 focus:outline-none transition-colors ${!label.trim() && label.length > 0 ? 'border-red-500/50 focus:border-red-400' : 'border-black/10 dark:border-[#222] focus:border-cyan-500/50 dark:focus:border-[#00f3ff40]'}`} />
                        {!label.trim() && label.length > 0 && (
                            <p className="text-[8px] font-mono text-red-500 dark:text-red-400 mt-1">
                                ECU name is required.
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="text-[8px] font-mono text-light-500 dark:text-gray-500 uppercase tracking-wider block mb-1 transition-colors">Description (Tooltip)</label>
                        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Engine ECU - ECM"
                            className="w-full bg-white dark:bg-[#0a0a0e] border border-black/10 dark:border-[#222] rounded-md px-3 py-2 text-xs font-mono text-dark-900 dark:text-[#f1f1f1] placeholder:text-gray-300 dark:placeholder:text-gray-700 focus:outline-none focus:border-cyan-500/50 dark:focus:border-[#00f3ff40] transition-colors" />
                    </div>
                    <div>
                        <label className="text-[8px] font-mono text-light-500 dark:text-gray-500 uppercase tracking-wider block mb-1 transition-colors">CAN ID</label>
                        <input value={canId} onChange={e => setCanId(e.target.value)} placeholder="0x7E2"
                            className={`w-full bg-white dark:bg-[#0a0a0e] border rounded-md px-3 py-2 text-xs font-mono text-dark-900 dark:text-[#f1f1f1] placeholder:text-gray-300 dark:placeholder:text-gray-700 focus:outline-none transition-colors ${canId.length < 4 && canId.length > 0 ? 'border-red-500/50 focus:border-red-400' : 'border-black/10 dark:border-[#222] focus:border-cyan-500/50 dark:focus:border-[#00f3ff40]'}`} />
                        {duplicateNode && (
                            <p className="text-[8px] font-mono text-red-500 dark:text-red-400 mt-1">
                                CAN ID {canId} is already in use by {duplicateNode.label}
                            </p>
                        )}
                        {canId.length < 4 && canId.length > 0 && !duplicateNode && (
                            <p className="text-[8px] font-mono text-light-400 dark:text-gray-500 mt-1 uppercase tracking-tighter transition-colors">
                                ID must be 4+ characters (e.g., 0x7E0)
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="text-[8px] font-mono text-light-500 dark:text-gray-500 uppercase tracking-wider block mb-1 transition-colors">Domain</label>
                        <div className="flex flex-wrap gap-1.5">
                            {(Object.entries(DOMAIN_META) as [ECUDomain, typeof DOMAIN_META[ECUDomain]][]).map(([key, meta]) => (
                                <button key={key} onClick={() => setDomain(key)}
                                    className={`px-2.5 py-1 rounded text-[9px] font-mono font-bold uppercase border transition-all ${domain === key ? '' : 'border-black/10 dark:border-[#222] text-light-400 dark:text-gray-600 hover:text-dark-900 dark:hover:text-gray-400'}`}
                                    style={domain === key ? { backgroundColor: meta.color + '15', color: meta.color, borderColor: meta.color + '50' } : undefined}>
                                    {meta.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[8px] font-mono text-light-500 dark:text-gray-500 uppercase tracking-wider block mb-1 transition-colors">Stub Length (m)</label>
                            <input value={stubLength} onChange={e => setStubLength(e.target.value)} placeholder="0.20"
                                className="w-full bg-white dark:bg-[#0a0a0e] border border-black/10 dark:border-[#222] rounded-md px-3 py-2 text-xs font-mono text-dark-900 dark:text-[#f1f1f1] placeholder:text-gray-300 dark:placeholder:text-gray-700 focus:outline-none focus:border-cyan-500/50 dark:focus:border-[#00f3ff40] transition-colors" />
                        </div>
                        <div>
                            <label className="text-[8px] font-mono text-light-500 dark:text-gray-500 uppercase tracking-wider block mb-1 transition-colors">Baud Rate</label>
                            <div className="flex gap-1">
                                {BAUD_OPTIONS.map(b => (
                                    <button key={b} onClick={() => setBaudRate(b)}
                                        className={`px-2 py-1.5 rounded text-[9px] font-mono font-bold border transition-all flex-1 ${baudRate === b ? 'bg-cyan-500/10 dark:bg-[#00f3ff15] text-cyan-600 dark:text-[#00f3ff] border-cyan-500/30 dark:border-[#00f3ff40]' : 'text-light-400 dark:text-gray-600 border-black/10 dark:border-[#222] hover:text-dark-900 dark:hover:text-gray-400 transition-colors'}`}>{b}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                    <button onClick={onClose} className="px-4 py-2 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider border border-black/10 dark:border-[#222] text-light-500 dark:text-gray-500 hover:text-dark-950 dark:hover:text-[#f1f1f1] transition-all">Cancel</button>
                    <button onClick={handleSubmit} disabled={!label.trim() || canId.length < 4 || !!duplicateNode}
                        className="px-4 py-2 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 dark:bg-[#00f3ff15] border border-cyan-500/30 dark:border-[#00f3ff40] text-cyan-600 dark:text-[#00f3ff] hover:bg-cyan-500/20 dark:hover:bg-[#00f3ff25] transition-all disabled:opacity-30 disabled:cursor-not-allowed">Add to Bus</button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Small helpers ─── */
function StatusBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    return (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-[#0a0a0e] border border-black/10 dark:border-[#1a1a20] rounded-md transition-colors">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: isDark ? `0 0 4px ${color}60` : 'none' }} />
            <span className="text-[9px] font-mono text-light-500 dark:text-gray-400 uppercase tracking-wider transition-colors">{label}</span>
            <span className="text-[11px] font-mono font-bold transition-colors" style={{ color }}>{value}</span>
        </div>
    );
}
