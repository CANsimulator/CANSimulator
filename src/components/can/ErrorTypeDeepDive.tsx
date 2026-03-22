import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { BitStreamVisualizer } from './BitStreamVisualizer';
import {
    ERROR_TYPE_CATALOG,
    generateErrorDemo,
    type CANErrorType,
    type ErrorDemoResult,
} from '../../services/can/can-error-catalog';

// ----------------------------------------------------------------
// Tab icons for each error type
// ----------------------------------------------------------------
const ERROR_ICONS: Record<CANErrorType, React.ReactNode> = {
    BIT: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 4l16 16M4 20L20 4" strokeLinecap="round" />
        </svg>
    ),
    STUFF: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 12h4l2-8 4 16 2-8h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    FORM: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <path d="M4 10h16M10 4v16" />
        </svg>
    ),
    ACK: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M8 12h8M12 16V8" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" />
        </svg>
    ),
    CRC: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="3" y="3" width="18" height="18" rx="3" />
        </svg>
    ),
};

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------
export const ErrorTypeDeepDive: React.FC = () => {
    const [selectedType, setSelectedType] = useState<CANErrorType>('BIT');
    const [demo, setDemo] = useState<ErrorDemoResult | null>(null);
    const [animateKey, setAnimateKey] = useState(0);

    const info = useMemo(
        () => ERROR_TYPE_CATALOG.find((e) => e.type === selectedType)!,
        [selectedType],
    );

    const handleGenerate = useCallback(() => {
        const result = generateErrorDemo(selectedType);
        setDemo(result);
        setAnimateKey((k) => k + 1);
    }, [selectedType]);

    const handleTabChange = useCallback((type: CANErrorType) => {
        setSelectedType(type);
        setDemo(null);
    }, []);

    return (
        <section
            className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-dark-900/80 border border-gray-200 dark:border-dark-700 backdrop-blur-sm shadow-sm"
            aria-label="Error Type Deep-Dive"
        >
            {/* Section header */}
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-[10px] font-black text-cyber-green uppercase tracking-widest px-2 border-l-2 border-cyber-green">
                    Error Type Deep-Dive
                </h2>
                 <span className="text-[9px] font-bold text-gray-500 dark:text-gray-600 uppercase tracking-wider">
                    ISO 11898-1 · 5 Error Types · Interactive
                </span>
            </div>

            {/* Tab bar */}
            <div 
                role="tablist" 
                aria-label="CAN Error Types"
                className="flex flex-wrap gap-2 mb-5"
                onKeyDown={(e) => {
                    const currentIndex = ERROR_TYPE_CATALOG.findIndex(err => err.type === selectedType);
                    if (e.key === 'ArrowRight') {
                        const nextIndex = (currentIndex + 1) % ERROR_TYPE_CATALOG.length;
                        handleTabChange(ERROR_TYPE_CATALOG[nextIndex].type);
                    } else if (e.key === 'ArrowLeft') {
                        const prevIndex = (currentIndex - 1 + ERROR_TYPE_CATALOG.length) % ERROR_TYPE_CATALOG.length;
                        handleTabChange(ERROR_TYPE_CATALOG[prevIndex].type);
                    }
                }}
            >
                {ERROR_TYPE_CATALOG.map((err) => {
                    const isActive = selectedType === err.type;
                    return (
                        <button
                            key={err.type}
                            id={`tab-${err.type}`}
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`tabpanel-${err.type}`}
                            tabIndex={isActive ? 0 : -1}
                            onClick={() => handleTabChange(err.type)}
                             className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all duration-200 border"
                            style={{
                                backgroundColor: isActive ? `${err.colorHex}15` : 'transparent',
                                borderColor: isActive ? `${err.colorHex}40` : (document.documentElement.classList.contains('dark') ? '#1a1a24' : '#e2e8f0'),
                                color: isActive ? err.colorHex : (document.documentElement.classList.contains('dark') ? '#6b7280' : '#475569'),
                                boxShadow: isActive
                                    ? `0 0 12px ${err.colorHex}15`
                                    : 'none',
                            }}
                        >
                             <span style={{ color: isActive ? err.colorHex : (document.documentElement.classList.contains('dark') ? '#4b5563' : '#94a3b8') }}>
                                {ERROR_ICONS[err.type]}
                             </span>
                            {err.title}
                        </button>
                    );
                })}
            </div>

            {/* Active error type content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={selectedType}
                    role="tabpanel"
                    id={`tabpanel-${selectedType}`}
                    aria-labelledby={`tab-${selectedType}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                >
                    {/* Info cards row */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Description */}
                        <div className="lg:col-span-2 p-4 rounded-xl bg-gray-50 dark:bg-dark-800/50 border border-gray-200 dark:border-dark-700">
                            <div className="flex items-center gap-2 mb-2">
                                <span
                                    className="text-[10px] font-black uppercase tracking-widest"
                                    style={{ color: info.colorHex }}
                                >
                                    {info.title}
                                </span>
                                 <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                                     style={{
                                         borderColor: `${info.colorHex}30`,
                                         color: `${info.colorHex}cc`,
                                         backgroundColor: `${info.colorHex}08`,
                                     }}
                                 >
                                      {info.detectedBy}
                                 </span>
                                 <span className="text-[12px] font-mono text-gray-500 dark:text-gray-400">{info.isoReference}</span>
                            </div>
                            <p className="text-[12px] leading-relaxed text-gray-600 dark:text-gray-400 font-medium mb-3">
                                {info.description}
                            </p>
                              <div className="p-3 rounded-lg bg-gray-100 dark:bg-dark-900/60 border border-gray-200 dark:border-dark-700">
                                 <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                                     Mechanism
                                 </span>
                                 <p className="text-[11px] text-gray-700 dark:text-gray-300 font-mono leading-relaxed">
                                     {info.mechanism}
                                 </p>
                             </div>
                        </div>

                        {/* Real-world cause + Generate button */}
                         <div className="flex flex-col gap-3">
                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-800/50 border border-gray-200 dark:border-dark-700 flex-1">
                                 <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">
                                     Real-World Causes
                                 </span>
                                 <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400 font-medium">
                                     {info.realWorldCause}
                                 </p>
                            </div>

                            <motion.button
                                onClick={handleGenerate}
                                whileTap={{ scale: 0.97 }}
                                 className="w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 border-2"
                                style={{
                                    backgroundColor: `${info.colorHex}15`,
                                    borderColor: `${info.colorHex}50`,
                                    color: info.colorHex,
                                    boxShadow: `0 0 20px ${info.colorHex}15`,
                                }}
                                onMouseEnter={(e) => {
                                    (e.target as HTMLElement).style.boxShadow = `0 0 25px ${info.colorHex}30`;
                                    (e.target as HTMLElement).style.backgroundColor = `${info.colorHex}25`;
                                }}
                                onMouseLeave={(e) => {
                                    (e.target as HTMLElement).style.boxShadow = `0 0 20px ${info.colorHex}15`;
                                    (e.target as HTMLElement).style.backgroundColor = `${info.colorHex}15`;
                                }}
                                >
                                    <Zap size={14} className="inline mr-1.5" /> Generate {info.title} Demo
                                </motion.button>
                        </div>
                    </div>

                    {/* Demo visualization */}
                    <AnimatePresence>
                        {demo && (
                            <motion.div
                                key={`demo-${animateKey}`}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-4 overflow-hidden"
                            >
                                {/* Bit stream comparison */}
                                 <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-800/30 border border-gray-200 dark:border-dark-700 space-y-4">
                                    <div className="flex items-center justify-between">
                                         <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                             CAN Frame Bit-Level View
                                         </span>
                                        <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                                            ID=0x123 · DLC=2 · Data=[0xAB, 0xCD] · 60 bits
                                        </span>
                                    </div>

                                    {/* Correct frame */}
                                    <BitStreamVisualizer
                                        bits={demo.correctBits}
                                        errorBitIndices={[]}
                                        fields={demo.fields}
                                        animate={true}
                                        label="Valid Frame"
                                        variant="correct"
                                    />

                                    {/* Corrupted frame */}
                                    <BitStreamVisualizer
                                        bits={demo.corruptedBits}
                                        errorBitIndices={demo.errorBitIndices}
                                        fields={demo.fields}
                                        animate={true}
                                        label={`Frame with ${info.title}`}
                                        variant="corrupted"
                                    />
                                </div>

                                {/* Explanation cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="p-4 rounded-xl border"
                                        style={{
                                            borderColor: `${info.colorHex}20`,
                                            backgroundColor: `${info.colorHex}05`,
                                        }}
                                    >
                                        <span
                                             className="text-[10px] font-black uppercase tracking-widest block mb-1.5"
                                             style={{ color: info.colorHex }}
                                         >
                                             What Went Wrong
                                         </span>
                                          <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400 font-medium">
                                             {demo.explanation}
                                         </p>
                                    </motion.div>
 
                                    <motion.div
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="p-4 rounded-xl bg-red-500/10 dark:bg-red-500/5 border border-red-500/20 dark:border-red-500/15 shadow-sm"
                                    >
                                         <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest block mb-1.5">
                                             Bus Consequence
                                         </span>
                                         <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400 font-medium">
                                             {demo.whatHappens}
                                         </p>
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </AnimatePresence>
        </section>
    );
};
