import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Container } from '../components/ui/Container';
import { Sword, Zap, Shield, Cpu, RefreshCw, Info, AlertTriangle } from 'lucide-react';
import { canSimulator } from '../services/can/can-simulator';
import { cn } from '../utils/cn';

export default function ArbitrationPage() {
    const [nodeAId, setNodeAId] = useState(0x100);
    const [nodeBId, setNodeBId] = useState(0x110);
    const [activeBit, setActiveBit] = useState(-1);
    const [isFighting, setIsFighting] = useState(false);
    const [showResult, setShowResult] = useState(false);

    const arbitration = useMemo(() =>
        canSimulator.simulateArbitration([
            { id: nodeAId, name: 'Alpha' },
            { id: nodeBId, name: 'Beta' }
        ]),
        [nodeAId, nodeBId]);

    useEffect(() => {
        let timer: ReturnType<typeof setInterval> | undefined;
        if (isFighting) {
            setShowResult(false);
            timer = setInterval(() => {
                setActiveBit(prev => {
                    if (prev >= 10) {
                        setIsFighting(false);
                        setShowResult(true);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 300);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [isFighting]);

    const startArena = () => {
        setActiveBit(-1);
        setShowResult(false);
        setIsFighting(true);
    };

    const handleIdChange = (value: string, setter: (v: number) => void) => {
        const filtered = value.toUpperCase().replace(/[^0-9A-F]/g, '');
        if (filtered.length <= 3) {
            setter(parseInt(filtered || '0', 16));
        }
    };

    const isValidId = (id: number) => id <= 0x7FF;

    const getBit = (id: number, pos: number) => {
        const bits = id.toString(2).padStart(11, '0').split('').map(Number);
        return bits[pos];
    };

    return (
        <div className="min-h-screen py-20 bg-light-50 dark:bg-dark-950 font-sans transition-colors duration-500">
            <Container>
                <div className="relative z-10 space-y-12">
                    {/* Header */}
                    <div className="space-y-4 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyber-purple/10 border border-cyber-purple/30 text-[10px] font-black text-cyber-purple uppercase tracking-[0.3em]"
                        >
                            <Sword size={12} />
                            Priority Arena
                        </motion.div>
                        <h1 className="text-6xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-b from-dark-950 dark:from-white via-cyber-purple to-red-500 italic uppercase tracking-tighter">
                            Arbitration Battle
                        </h1>
                        <p className="text-light-500 dark:text-gray-500 max-w-xl mx-auto font-medium italic">
                            The Bus-Master Battle. Lower IDs are dominant "0"s, winning the right to speak while others go silent.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Node A */}
                        <div className={cn(
                            "p-8 rounded-[3rem] border transition-all duration-700 relative",
                            showResult && (arbitration.isTie || arbitration.winnerIndex === 0) ? "bg-cyber-purple/10 border-cyber-purple/30 shadow-[0_0_50px_rgba(191,0,255,0.15)]" : "bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 opacity-60"
                        )}>
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 rounded-2xl bg-cyber-purple/20 flex items-center justify-center text-cyber-purple border border-cyber-purple/30">
                                    <Cpu size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-dark-950 dark:text-white uppercase italic tracking-widest text-cyber-purple">Node Alpha</h3>
                                    <div className="text-[10px] font-bold text-light-500 dark:text-gray-500 uppercase italic">Priority Contender</div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2 relative">
                                    <label className="text-[10px] font-black text-light-600 dark:text-gray-600 uppercase tracking-widest">Identifier (Hex)</label>
                                    <input
                                        type="text"
                                        maxLength={3}
                                        value={nodeAId.toString(16).toUpperCase()}
                                        onChange={(e) => handleIdChange(e.target.value, setNodeAId)}
                                        className={cn(
                                            "w-full bg-white/40 dark:bg-black/40 border rounded-2xl p-4 font-mono text-xl font-black outline-none transition-all text-center",
                                            isValidId(nodeAId) ? "text-cyber-purple border-black/10 dark:border-white/10 focus:border-cyber-purple/50" : "text-red-500 border-red-500/50"
                                        )}
                                        placeholder="7FF"
                                    />
                                    {!isValidId(nodeAId) && (
                                        <motion.span 
                                            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                                            className="text-[9px] text-red-500 font-bold uppercase tracking-tighter absolute -bottom-5 left-0 w-full text-center flex items-center justify-center gap-1"
                                        >
                                            <AlertTriangle size={10} aria-hidden="true" />
                                            Out of range (Max 0x7FF)
                                        </motion.span>
                                    )}
                                </div>

                                <div className="flex justify-center gap-2">
                                    {Array.from({ length: 11 }).map((_, i) => (
                                        <div key={i} className={cn(
                                            "w-6 h-8 rounded-md flex items-center justify-center font-mono font-black text-xs transition-all duration-500",
                                            activeBit === i ? "bg-cyber-purple text-white scale-125" :
                                                activeBit > i && getBit(nodeAId, i) === 0 ? "bg-cyber-purple/20 text-cyber-purple" : "bg-black/5 dark:bg-white/5 text-light-600 dark:text-gray-600"
                                        )}>
                                            {getBit(nodeAId, i)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Node B */}
                        <div className={cn(
                            "p-8 rounded-[3rem] border transition-all duration-700 relative",
                            showResult && (arbitration.isTie || arbitration.winnerIndex === 1) ? "bg-red-500/10 border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.15)]" : "bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 opacity-60"
                        )}>
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500 border border-red-500/30 font-black italic">
                                    B
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-dark-950 dark:text-white uppercase italic tracking-widest text-red-500">Node Beta</h3>
                                    <div className="text-[10px] font-bold text-light-500 dark:text-gray-500 uppercase italic">Priority Contender</div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2 relative">
                                    <label className="text-[10px] font-black text-light-600 dark:text-gray-600 uppercase tracking-widest">Identifier (Hex)</label>
                                    <input
                                        type="text"
                                        maxLength={3}
                                        value={nodeBId.toString(16).toUpperCase()}
                                        onChange={(e) => handleIdChange(e.target.value, setNodeBId)}
                                        className={cn(
                                            "w-full bg-white/40 dark:bg-black/40 border rounded-2xl p-4 font-mono text-xl font-black outline-none transition-all text-center",
                                            isValidId(nodeBId) ? "text-red-500 border-black/10 dark:border-white/10 focus:border-red-500/50" : "text-red-500 border-red-500/50"
                                        )}
                                        placeholder="001"
                                    />
                                    {!isValidId(nodeBId) && (
                                        <motion.span 
                                            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                                            className="text-[9px] text-red-500 font-bold uppercase tracking-tighter absolute -bottom-5 left-0 w-full text-center flex items-center justify-center gap-1"
                                        >
                                            <AlertTriangle size={10} aria-hidden="true" />
                                            Out of range (Max 0x7FF)
                                        </motion.span>
                                    )}
                                </div>

                                <div className="flex justify-center gap-2">
                                    {Array.from({ length: 11 }).map((_, i) => (
                                        <div key={i} className={cn(
                                            "w-6 h-8 rounded-md flex items-center justify-center font-mono font-black text-xs transition-all duration-500",
                                            activeBit === i ? "bg-red-500 text-white scale-125" :
                                                activeBit > i && getBit(nodeBId, i) === 0 ? "bg-red-500/20 text-red-500" : "bg-black/5 dark:bg-white/5 text-light-600 dark:text-gray-600"
                                        )}>
                                            {getBit(nodeBId, i)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-8">
                        <button
                            onClick={startArena}
                            disabled={isFighting}
                            className="px-12 py-5 rounded-full bg-dark-950 dark:bg-white text-white dark:text-black font-black uppercase tracking-[0.3em] flex items-center gap-4 hover:scale-[1.05] disabled:opacity-50 disabled:scale-100 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(255,255,255,0.1)] group"
                        >
                            {isFighting ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} className="group-hover:animate-pulse" />}
                            {isFighting ? "Simulating..." : "Initiate Arbitration"}
                        </button>

                        {/* Battle Log */}
                        <div className="w-full max-w-4xl p-10 rounded-[3rem] bg-black/[0.01] dark:bg-white/[0.01] border border-black/5 dark:border-white/5 space-y-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 text-black/5 dark:text-white/5"><Sword size={120} /></div>

                            <h3 className="text-xl font-black text-dark-950 dark:text-white uppercase italic tracking-widest flex items-center gap-2 relative z-10">
                                <Shield size={20} className="text-cyber-purple" />
                                Arbitration Report
                            </h3>

                            <AnimatePresence mode="wait">
                                {activeBit === -1 && !isFighting ? (
                                    <motion.div
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className="text-center py-8 text-light-600 dark:text-gray-600 italic font-medium"
                                    >
                                        Waiting for transmission start...
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className="space-y-6 relative z-10"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center uppercase">
                                            <div className="p-4 rounded-2xl bg-white/40 dark:bg-black/40 border border-black/5 dark:border-white/5">
                                                <div className="text-[10px] font-black text-light-600 dark:text-gray-600 uppercase mb-2">Current State</div>
                                                <div className={cn("text-lg font-black italic", activeBit >= 10 ? "text-cyber-emerald" : "text-light-400 dark:text-gray-400")}>
                                                    {activeBit >= 10 ? "COMPLETED" : activeBit === -1 ? "-" : `BIT ${activeBit}`}
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white/40 dark:bg-black/40 border border-black/5 dark:border-white/5">
                                                <div className="text-[10px] font-black text-light-600 dark:text-gray-600 uppercase mb-2">Winning Node</div>
                                                <div className={cn("text-lg font-black italic", 
                                                    showResult ? (arbitration.isTie ? "text-amber-500" : (arbitration.winnerIndex === 0 ? "text-cyber-purple" : "text-red-500")) : "text-light-400 dark:text-gray-400")}>
                                                    {showResult ? (arbitration.isTie ? "TIE (COLLISION)" : (arbitration.winnerIndex === 0 ? "Alpha" : "Beta")) : "???"}
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white/40 dark:bg-black/40 border border-black/5 dark:border-white/5">
                                                <div className="text-[10px] font-black text-light-600 dark:text-gray-600 uppercase mb-2">Reason</div>
                                                <div className={cn("text-sm font-bold italic", showResult && arbitration.isTie ? "text-amber-500/70" : "text-light-400 dark:text-gray-400")}>
                                                    {showResult ? (arbitration.isTie ? "ID COLLISION" : "Lower ID Dominant") : "Awaiting Result"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className={cn("p-6 rounded-2xl border flex items-start gap-4 transition-colors", 
                                            showResult && arbitration.isTie ? "bg-amber-500/10 border-amber-500/20" : "bg-cyber-purple/10 border-cyber-purple/20")}>
                                            <Info size={20} className={cn("shrink-0", showResult && arbitration.isTie ? "text-amber-500" : "text-cyber-purple")} />
                                            <p className="text-xs text-light-400 dark:text-gray-400 leading-relaxed font-medium">
                                                {showResult && arbitration.isTie ? (
                                                    "Identical identifiers! In a real CAN bus, this leads to a collision beyond the ID field unless data is also identical. If frames match bit-for-bit, both nodes assume they won, but this is a critical design error that can break ACK slots and CRC checks if data ever differs."
                                                ) : (
                                                    "In CAN, a '0' is Dominant. When Node Alpha sends '0' and Node Beta sends '1', the bus wire effectively stays at '0'. Node Beta detects that what it sent ('1') is not what it sees on the bus ('0'), and immediately stops transmitting to avoid collisions."
                                                )}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
}
