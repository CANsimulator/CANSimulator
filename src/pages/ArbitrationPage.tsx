import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Container } from '../components/ui/Container';
import { LabNavigation } from '../components/ui/LabNavigation';
import { Sword, Zap, Shield, Cpu, RefreshCw, Info, AlertTriangle } from 'lucide-react';
import { canSimulator } from '../services/can/can-simulator';
import { cn } from '../utils/cn';

type IdValidation = { label: string; color: string } | null;

function getIdValidation(id: number): IdValidation {
    if (id <= 0x7FF) return { label: 'Standard (11-bit)', color: 'text-cyber-green' };
    if (id <= 0x1FFFFFFF) return { label: 'Extended (29-bit)', color: 'text-amber-400' };
    return { label: 'Invalid CAN ID', color: 'text-red-400' };
}

function hexToBinaryDisplay(id: number): { binary: string; isExtended: boolean } {
    const isExtended = id > 0x7FF;
    const bits = isExtended ? 29 : 11;
    const binary = id.toString(2).padStart(bits, '0');
    // Group into chunks of 3-4 for readability
    const grouped = binary.match(/.{1,4}/g)?.join(' ') || binary;
    return { binary: grouped, isExtended };
}

export default function ArbitrationPage() {
    const [nodeAId, setNodeAId] = useState(0x100);
    const [nodeBId, setNodeBId] = useState(0x110);
    const [isFighting, setIsFighting] = useState(false);
    const [showResult, setShowResult] = useState(false);

    // New Step Mode states
    const [stepMode, setStepMode] = useState(false);
    const [currentStep, setCurrentStep] = useState(-1); // -1 means not started
    const [isAutoStepping, setIsAutoStepping] = useState(false);
    const [globalAutoRun, setGlobalAutoRun] = useState(false);

    const arbitration = useMemo(() =>
        canSimulator.simulateArbitration([
            { id: nodeAId, name: 'Alpha' },
            { id: nodeBId, name: 'Beta' }
        ]),
        [nodeAId, nodeBId]);

    const losingPoint = useMemo(() => {
        const bitsA = nodeAId.toString(2).padStart(11, '0').split('').map(Number);
        const bitsB = nodeBId.toString(2).padStart(11, '0').split('').map(Number);
        for (let i = 0; i < 11; i++) {
            if (bitsA[i] !== bitsB[i]) return i;
        }
        return -1;
    }, [nodeAId, nodeBId]);

    const handleReset = () => {
        setCurrentStep(-1);
        setIsFighting(false);
        setShowResult(false);
        setIsAutoStepping(false);
    };

    const advanceStep = () => {
        setCurrentStep(prev => {
            if (prev >= 10) {
                setShowResult(true);
                setIsAutoStepping(false);
                return prev;
            }
            const next = prev + 1;
            if (next >= 10) setShowResult(true);
            return next;
        });
    };

    const startArena = () => {
        setCurrentStep(-1);
        setShowResult(false);
        setIsFighting(true);
    };

    // Global Auto-Run Effect
    useEffect(() => {
        if (!globalAutoRun) return;
        
        const runRound = () => {
            const randomHex = () => Math.floor(Math.random() * 0x7FF);
            setNodeAId(randomHex());
            setNodeBId(randomHex());
            
            // Allow state to settle, then start
            setTimeout(() => {
                startArena();
            }, 50);
        };

        runRound();
        const interval = setInterval(runRound, 1500 + (11 * 300)); // Delay includes animation time
        
        return () => clearInterval(interval);
    }, [globalAutoRun]);

    useEffect(() => {
        let timer: ReturnType<typeof setInterval> | undefined;
        if (isFighting && !stepMode) {
            setShowResult(false);
            timer = setInterval(() => {
                setCurrentStep(prev => {
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
    }, [isFighting, stepMode]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        if (isAutoStepping && stepMode && currentStep < 10) {
            timer = setTimeout(() => advanceStep(), 400);
        } else if (currentStep >= 10) {
            setIsAutoStepping(false);
        }
        return () => clearTimeout(timer);
    }, [isAutoStepping, currentStep, stepMode]);

    const handleIdChange = (value: string, setter: (v: number) => void) => {
        const filtered = value.toUpperCase().replace(/[^0-9A-F]/g, '');
        // Allow up to 8 hex digits for 29-bit IDs
        if (filtered.length <= 8) {
            setter(parseInt(filtered || '0', 16));
        }
    };

    const isValidId = (id: number) => id <= 0x7FF;

    const getBits = (id: number) => {
        return id.toString(2).padStart(11, '0').split('').map(Number);
    };

    const bitsA = useMemo(() => getBits(nodeAId), [nodeAId]);
    const bitsB = useMemo(() => getBits(nodeBId), [nodeBId]);

    return (
        <div className="min-h-screen py-20 bg-light-50 dark:bg-dark-950 font-sans transition-colors duration-500">
            <Container>
                <div className="relative z-10 space-y-12">
                    {/* Header */}
                    <div className="space-y-4 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyber-purple/10 border border-cyber-purple/30 text-[11px] font-black text-cyber-purple uppercase tracking-[0.3em]"
                        >
                            <Sword size={12} />
                            Priority Arena
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-b from-dark-950 dark:from-white via-cyber-purple to-red-500 italic uppercase tracking-tighter"
                        >
                            Arbitration Battle
                        </motion.h1>
                        <p className="text-light-500 dark:text-gray-500 max-w-xl mx-auto font-medium italic">
                            The Bus-Master Battle. Lower IDs are dominant "0"s, winning the right to speak while others go silent.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Node A */}
                        <div className={cn(
                            "p-8 rounded-[3rem] border transition-all duration-700 relative",
                            showResult && (arbitration.isTie || arbitration.winnerIndex === 0) ? "bg-cyber-purple/10 border-cyber-purple/30 shadow-[0_0_50px_rgba(191,0,255,0.15)]" : "bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/5 opacity-60"
                        )}>
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 rounded-2xl bg-cyber-purple/10 dark:bg-cyber-purple/20 flex items-center justify-center text-cyber-purple border border-cyber-purple/20 dark:border-cyber-purple/30">
                                    <Cpu size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-dark-950 dark:text-white uppercase italic tracking-widest text-cyber-purple">Node Alpha</h3>
                                    <div className="text-[11px] font-bold text-light-500 dark:text-gray-500 uppercase italic">Priority Contender</div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2 relative">
                                    <label className="text-[11px] font-black text-light-600 dark:text-gray-600 uppercase tracking-widest">Identifier (Hex)</label>
                                    <input
                                        type="text"
                                        maxLength={8}
                                        value={nodeAId.toString(16).toUpperCase()}
                                        onChange={(e) => handleIdChange(e.target.value, setNodeAId)}
                                        className={cn(
                                            "w-full bg-white dark:bg-black/40 border rounded-2xl p-4 font-mono text-xl font-black outline-none transition-all text-center",
                                            isValidId(nodeAId) ? "text-cyber-purple border-gray-200 dark:border-white/10 focus:border-cyber-purple/50" : "text-amber-500 border-amber-500/50"
                                        )}
                                        placeholder="7FF"
                                    />
                                    <div className="flex flex-col items-center mt-2 space-y-1">
                                        {(() => {
                                            const v = getIdValidation(nodeAId);
                                            if (!v) return null;
                                            return (
                                                <span className={cn("text-[9px] font-black uppercase tracking-widest", v.color)}>
                                                    {v.label}
                                                </span>
                                            );
                                        })()}
                                        {(() => {
                                            const result = hexToBinaryDisplay(nodeAId);
                                            return (
                                                <p className={cn("text-[10px] font-mono", result.isExtended ? 'text-amber-500/70' : 'text-gray-500')}>
                                                    {result.isExtended
                                                        ? `0b ${result.binary}`
                                                        : `= 0b ${result.binary}`}
                                                </p>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div className="flex justify-center gap-2">
                                    {bitsA.map((bit, i) => (
                                        <div key={i} className={cn(
                                            "w-6 h-8 rounded-md flex items-center justify-center font-mono font-black text-xs transition-all duration-500",
                                            currentStep === i ? "bg-cyber-purple text-white scale-125 ring-2 ring-cyber-purple ring-offset-1 dark:ring-offset-dark-900" :
                                                currentStep > i && bit === 0 ? "bg-cyber-purple/20 text-cyber-purple" : "bg-black/5 dark:bg-white/5 text-light-600 dark:text-gray-600",
                                            stepMode && currentStep > i && bitsA[i] !== bitsB[i] && i === losingPoint && arbitration.winnerIndex === 1 && "bg-red-500/20"
                                        )}>
                                            {bit}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Node B */}
                        <div className={cn(
                            "p-8 rounded-[3rem] border transition-all duration-700 relative",
                            showResult && (arbitration.isTie || arbitration.winnerIndex === 1) ? "bg-red-500/10 border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.15)]" : "bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/5 opacity-60"
                        )}>
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 rounded-2xl bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center text-red-500 border border-red-500/20 dark:border-red-500/30 font-black italic">
                                    B
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-dark-950 dark:text-white uppercase italic tracking-widest text-red-500">Node Beta</h3>
                                    <div className="text-[11px] font-bold text-light-500 dark:text-gray-500 uppercase italic">Priority Contender</div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2 relative">
                                    <label className="text-[11px] font-black text-light-600 dark:text-gray-600 uppercase tracking-widest">Identifier (Hex)</label>
                                    <input
                                        type="text"
                                        maxLength={8}
                                        value={nodeBId.toString(16).toUpperCase()}
                                        onChange={(e) => handleIdChange(e.target.value, setNodeBId)}
                                        className={cn(
                                            "w-full bg-white dark:bg-black/40 border rounded-2xl p-4 font-mono text-xl font-black outline-none transition-all text-center",
                                            isValidId(nodeBId) ? "text-red-500 border-gray-200 dark:border-white/10 focus:border-red-500/50" : "text-amber-500 border-red-500/50"
                                        )}
                                        placeholder="001"
                                    />
                                    <div className="flex flex-col items-center mt-2 space-y-1">
                                        {(() => {
                                            const v = getIdValidation(nodeBId);
                                            if (!v) return null;
                                            return (
                                                <span className={cn("text-[9px] font-black uppercase tracking-widest", v.color)}>
                                                    {v.label}
                                                </span>
                                            );
                                        })()}
                                        {(() => {
                                            const result = hexToBinaryDisplay(nodeBId);
                                            return (
                                                <p className={cn("text-[10px] font-mono", result.isExtended ? 'text-amber-500/70' : 'text-gray-500')}>
                                                    {result.isExtended
                                                        ? `0b ${result.binary}`
                                                        : `= 0b ${result.binary}`}
                                                </p>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div className="flex justify-center gap-2">
                                    {bitsB.map((bit, i) => (
                                        <div key={i} className={cn(
                                            "w-6 h-8 rounded-md flex items-center justify-center font-mono font-black text-xs transition-all duration-500",
                                            currentStep === i ? "bg-red-500 text-white scale-125 ring-2 ring-red-500 ring-offset-1 dark:ring-offset-dark-900" :
                                                currentStep > i && bit === 0 ? "bg-red-500/20 text-red-500" : "bg-black/5 dark:bg-white/5 text-light-600 dark:text-gray-600",
                                            stepMode && currentStep > i && bitsA[i] !== bitsB[i] && i === losingPoint && arbitration.winnerIndex === 0 && "bg-red-500/20"
                                        )}>
                                            {bit}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-8">
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex items-center gap-6 mb-2">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="text-[10px] font-black uppercase text-gray-500 group-hover:text-cyber-blue transition-colors">Normal</div>
                                    <div 
                                        onClick={() => setStepMode(!stepMode)}
                                        className={cn(
                                            "w-10 h-5 rounded-full p-1 transition-colors relative",
                                            stepMode ? "bg-cyber-blue" : "bg-gray-300 dark:bg-white/10"
                                        )}
                                    >
                                        <motion.div 
                                            animate={{ x: stepMode ? 20 : 0 }}
                                            className="w-3 h-3 bg-white rounded-full shadow-sm"
                                        />
                                    </div>
                                    <div className="text-[10px] font-black uppercase text-gray-500 group-hover:text-cyber-blue transition-colors">Step Mode</div>
                                </label>
                            </div>

                            {stepMode && currentStep >= -1 ? (
                                <div className="flex items-center gap-4 animate-in fade-in zoom-in duration-300">
                                    <button
                                        onClick={advanceStep}
                                        disabled={currentStep >= 10 || isAutoStepping}
                                        className="px-6 py-2 rounded-xl bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue text-xs font-black uppercase tracking-widest hover:bg-cyber-blue/20 transition-all disabled:opacity-30"
                                    >
                                        Next Bit
                                    </button>
                                    <button
                                        onClick={() => setIsAutoStepping(!isAutoStepping)}
                                        disabled={currentStep >= 10}
                                        className={cn(
                                            "px-6 py-2 rounded-xl border text-xs font-black uppercase tracking-widest transition-all",
                                            isAutoStepping ? "bg-amber-500 text-white border-amber-500" : "bg-cyber-blue/10 border-cyber-blue/30 text-cyber-blue hover:bg-cyber-blue/20"
                                        )}
                                    >
                                        {isAutoStepping ? "Pause" : "Auto-Step"}
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-500 text-xs font-black uppercase tracking-widest hover:text-white transition-all"
                                    >
                                        Reset
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-4 justify-center">
                                    <button
                                        onClick={startArena}
                                        disabled={isFighting || globalAutoRun}
                                        className="px-12 py-5 rounded-full bg-dark-950 dark:bg-white text-white dark:text-black font-black uppercase tracking-[0.3em] flex items-center gap-4 hover:scale-[1.05] disabled:opacity-50 disabled:scale-100 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(255,255,255,0.1)] group"
                                    >
                                        {isFighting ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} className="group-hover:animate-pulse" />}
                                        {isFighting ? "Simulating..." : "Initiate Arbitration"}
                                    </button>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleReset}
                                            className="px-8 py-5 rounded-full bg-white/5 border border-white/10 text-gray-500 text-xs font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all"
                                        >
                                            Reset
                                        </button>
                                        <button
                                            onClick={() => setGlobalAutoRun(a => !a)}
                                            className={cn(
                                                "px-8 py-5 rounded-full border text-xs font-black uppercase tracking-widest transition-all",
                                                globalAutoRun 
                                                    ? "bg-red-500/20 border-red-500/50 text-red-500 hover:bg-red-500/30" 
                                                    : "bg-cyber-green/10 border-cyber-green/30 text-cyber-green hover:bg-cyber-green/20"
                                            )}
                                        >
                                            {globalAutoRun ? "Stop Auto" : "Start Auto"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Battle Log */}
                        <div className="w-full max-w-4xl p-10 rounded-[3rem] bg-gray-50 dark:bg-white/[0.01] border border-gray-200 dark:border-white/5 space-y-8 relative overflow-hidden transition-colors duration-300">
                            <div className="absolute top-0 right-0 p-8 text-black/5 dark:text-white/5 transition-opacity duration-300"><Sword size={120} /></div>

                            <h3 className="text-xl font-black text-dark-950 dark:text-white uppercase italic tracking-widest flex items-center gap-2 relative z-10">
                                <Shield size={20} className="text-cyber-purple" />
                                Arbitration Report
                            </h3>

                            <AnimatePresence mode="wait">
                                {currentStep === -1 && !isFighting ? (
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
                                            <div className="p-4 rounded-2xl bg-white dark:bg-black/40 border border-gray-200 dark:border-white/5">
                                                <div className="text-[11px] font-black text-gray-500 dark:text-gray-600 uppercase mb-2">Current State</div>
                                                <div className={cn("text-lg font-black italic", currentStep >= 10 ? "text-cyber-emerald" : "text-gray-400 dark:text-gray-400")}>
                                                    {currentStep >= 10 ? "COMPLETED" : currentStep === -1 ? "-" : `BIT ${currentStep}`}
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white dark:bg-black/40 border border-gray-200 dark:border-white/5">
                                                <div className="text-[11px] font-black text-gray-500 dark:text-gray-600 uppercase mb-2">Winning Node</div>
                                                <div className={cn("text-lg font-black italic", 
                                                    showResult ? (arbitration.isTie ? "text-amber-500" : (arbitration.winnerIndex === 0 ? "text-cyber-purple" : "text-red-500")) : "text-gray-400 dark:text-gray-400")}>
                                                    {showResult ? (arbitration.isTie ? "TIE (COLLISION)" : (arbitration.winnerIndex === 0 ? "Alpha" : "Beta")) : "???"}
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white dark:bg-black/40 border border-gray-200 dark:border-white/5">
                                                <div className="text-[11px] font-black text-gray-500 dark:text-gray-600 uppercase mb-2">Reason</div>
                                                <div className={cn("text-sm font-bold italic", showResult && arbitration.isTie ? "text-amber-500/70" : "text-gray-400 dark:text-gray-400")}>
                                                    {showResult ? (arbitration.isTie ? "ID COLLISION" : "Lower ID Dominant") : "Awaiting Result"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className={cn("p-6 rounded-2xl border flex items-start gap-4 transition-all duration-500", 
                                            showResult && arbitration.isTie ? "bg-red-500/20 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse" : "bg-cyber-purple/10 border-cyber-purple/20")}>
                                            <div className="shrink-0 pt-1">
                                                {showResult && arbitration.isTie ? (
                                                    <AlertTriangle size={20} className="text-red-500" />
                                                ) : (
                                                    <Info size={20} className="text-cyber-purple" />
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <div className={cn("text-[11px] font-black uppercase tracking-widest", 
                                                    showResult && arbitration.isTie ? "text-red-500" : "text-cyber-purple")}>
                                                    {showResult && arbitration.isTie ? "Critical Protocol Violation" : "Protocol Insight"}
                                                </div>
                                                <p className={cn("text-xs leading-relaxed font-medium transition-colors",
                                                    showResult && arbitration.isTie ? "text-red-200" : "text-light-400 dark:text-gray-400")}>
                                                    {showResult && arbitration.isTie ? (
                                                        "CRITICAL: Identical identifiers detected! On a real CAN bus, this causes a catastrophic collision. Since both nodes drive the bus identically during the ID phase, neither 'loses' arbitration. If their data then differs, both will detect an 'Error Frame' simultaneously, potentially leading to a bus-off condition if not resolved by hardware."
                                                     ) : (
                                                        "In CAN, a '0' is Dominant. When Node Alpha sends '0' and Node Beta sends '1', the bus wire effectively stays at '0'. Node Beta detects that what it sent ('1') is not what it sees on the bus ('0'), and immediately stops transmitting to avoid collisions."
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
                <LabNavigation />
            </Container>
        </div>
    );
}
