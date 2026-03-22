import { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowLeftRight, Copy, Check, GitCompareArrows, Layers } from 'lucide-react';
import { GENERATIONS, GENERATION_ORDER } from '../data';
import type { GenerationId } from '../types';
import { cn } from '../../../utils/cn';

interface GenerationCompareDockProps {
  primary: GenerationId;
  compare: GenerationId;
  sideBySide: boolean;
  onPrimaryChange: (generation: GenerationId) => void;
  onCompareChange: (generation: GenerationId) => void;
  onToggleSideBySide: (enabled: boolean) => void;
  onSwap: () => void;
}

export function GenerationCompareDock({
  primary,
  compare,
  sideBySide,
  onPrimaryChange,
  onCompareChange,
  onToggleSideBySide,
  onSwap,
}: GenerationCompareDockProps) {
  const reduceMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [swapRotation, setSwapRotation] = useState(0);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const compareOptions = useMemo(
    () => GENERATION_ORDER.filter((id) => id !== primary),
    [primary]
  );

  const handleCopy = async () => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
      setCopied(false);
      copyTimerRef.current = null;
    }, 1400);
  };

  const handleSwap = () => {
    setSwapRotation((prev) => prev + 180);
    onSwap();
  };

  return (
    <section className="sticky top-[70px] z-30 rounded-2xl border border-white/10 bg-dark-950/85 px-3 py-3 backdrop-blur-xl shadow-lg shadow-black/20">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Primary selector */}
        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label="CAN generation selector"
            className="relative flex flex-wrap gap-1 rounded-xl bg-white/5 p-1"
          >
            {GENERATION_ORDER.map((id) => {
              const spec = GENERATIONS[id];
              const isActive = primary === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onPrimaryChange(id)}
                  className={cn(
                    'relative rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors duration-200',
                    isActive ? spec.accentTextClass : 'text-gray-400 hover:text-white'
                  )}
                >
                  {/* Animated pill background */}
                  {isActive && (
                    <motion.div
                      layoutId={reduceMotion ? undefined : 'primary-pill'}
                      className={cn(
                        'absolute inset-0 rounded-lg border border-white/20',
                        spec.accentSurfaceClass
                      )}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{id}</span>
                </button>
              );
            })}
          </div>

          {/* Side-by-side toggle */}
          <button
            type="button"
            onClick={() => onToggleSideBySide(!sideBySide)}
            aria-pressed={sideBySide}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-bold uppercase tracking-widest transition-all duration-200',
              sideBySide
                ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200 shadow-[0_0_8px_rgba(0,243,255,0.15)]'
                : 'border-white/10 text-gray-400 hover:text-white'
            )}
          >
            <GitCompareArrows size={14} />
            <span className="hidden sm:inline">Side-by-Side</span>
          </button>
        </div>

        {/* Compare + Actions */}
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {sideBySide && (
              <motion.div
                initial={reduceMotion ? undefined : { opacity: 0, x: 20 }}
                animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1"
              >
                <Layers size={12} className="text-gray-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  vs
                </span>
                {compareOptions.map((id) => {
                  const spec = GENERATIONS[id];
                  const isCompare = compare === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onCompareChange(id)}
                      className={cn(
                        'relative rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-200',
                        isCompare
                          ? spec.accentTextClass
                          : 'text-gray-400 hover:text-white'
                      )}
                    >
                      {isCompare && (
                        <motion.div
                          layoutId={reduceMotion ? undefined : 'compare-pill'}
                          className={cn(
                            'absolute inset-0 rounded-md border border-white/20',
                            spec.accentSurfaceClass
                          )}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">{id}</span>
                    </button>
                  );
                })}

                {/* Swap button with rotation */}
                <motion.button
                  type="button"
                  onClick={handleSwap}
                  animate={reduceMotion ? undefined : { rotate: swapRotation }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-300 transition-colors hover:text-white hover:border-white/20"
                >
                  <ArrowLeftRight size={13} />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Copy link */}
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200',
              copied
                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                : 'border-white/10 text-gray-400 hover:text-white'
            )}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Link'}
          </button>
        </div>
      </div>
    </section>
  );
}
