import { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Gauge, Route, ShieldCheck } from 'lucide-react';
import { GENERATION_ORDER, GENERATIONS } from '../data';
import type { GenerationId } from '../types';
import { cn } from '../../../utils/cn';

interface EvolutionTimelineProps {
  primary: GenerationId;
  onPrimaryChange?: (id: GenerationId) => void;
}

export function EvolutionTimeline({ primary, onPrimaryChange }: EvolutionTimelineProps) {
  const reduceMotion = useReducedMotion();
  const listRef = useRef<HTMLOListElement>(null);

  const milestoneCopy: Record<GenerationId, string> = {
    Classic: 'Deterministic control foundation',
    FD: 'Throughput and payload expansion',
    XL: 'High-capacity future architecture',
  };

  const icons: Record<GenerationId, React.ElementType> = {
    Classic: ShieldCheck,
    FD: Gauge,
    XL: Route,
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: GenerationId, idx: number) => {
    const list = listRef.current;
    if (!list) return;

    const items = Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]'));
    let nextIdx = -1;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        nextIdx = (idx + 1) % items.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        nextIdx = (idx - 1 + items.length) % items.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIdx = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIdx = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onPrimaryChange?.(id);
        return;
      default:
        return;
    }

    if (nextIdx !== -1) {
      const nextId = GENERATION_ORDER[nextIdx];
      onPrimaryChange?.(nextId);
      items[nextIdx].focus();
    }
  };

  return (
     <section className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6 md:p-8 transition-all duration-300 shadow-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black uppercase tracking-widest text-dark-950 dark:text-white">
          Evolution Timeline
        </h2>
        <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-600 dark:text-gray-500 transition-colors">
          Use arrow keys to navigate
        </p>
      </div>

       {/* Horizontal connecting line (desktop only) */}
      <div className="relative">
        <div className="absolute left-0 right-0 top-[42px] hidden h-[2px] bg-gradient-to-r from-cyan-500/40 via-violet-500/40 to-emerald-500/40 dark:from-cyan-500/30 dark:via-violet-500/30 dark:to-emerald-500/30 md:block transition-all" />

        <ol 
          ref={listRef}
          role="tablist"
          aria-label="CAN Generations Timeline"
          className="relative grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          {GENERATION_ORDER.map((id, idx) => {
            const spec = GENERATIONS[id];
            const active = primary === id;
            const Icon = icons[id];

            return (
              <motion.li
                key={id}
                initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={
                  reduceMotion ? undefined : { duration: 0.3, delay: idx * 0.1 }
                }
                whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                onClick={() => onPrimaryChange?.(id)}
                onKeyDown={(e) => handleKeyDown(e, id, idx)}
                tabIndex={active ? 0 : -1}
                role="tab"
                aria-selected={active}
                aria-controls={`generation-panel-${id}`}
                id={`generation-tab-${id}`}
                className={cn(
                  'group relative cursor-pointer rounded-2xl border p-5 transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-cyber-blue shadow-sm hover:shadow-md',
                  active
                    ? `${spec.accentBorderClass} ${spec.accentSurfaceClass}`
                    : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-900/40 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-100 dark:hover:bg-dark-900/60'
                )}
                style={
                  active
                    ? {
                      boxShadow: `0 0 20px ${id === 'Classic' ? 'rgba(0,243,255,0.15)' : id === 'FD' ? 'rgba(139,92,246,0.15)' : 'rgba(52,211,153,0.15)'}`,
                    }
                    : undefined
                }
              >
                {/* Pulsing dot connector */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 hidden md:block">
                  <div
                    className={cn(
                      'h-3 w-3 rounded-full border-2 transition-all duration-300',
                      active
                        ? `${spec.accentSurfaceClass} border-current ${spec.accentTextClass}`
                        : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-dark-950'
                    )}
                  />
                  {active && !reduceMotion && (
                    <div
                      className={cn(
                        'absolute inset-0 animate-ping rounded-full opacity-40',
                        spec.accentSurfaceClass
                      )}
                    />
                  )}
                </div>

                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={cn(
                      'text-xs font-black uppercase tracking-[0.2em] transition-colors duration-200',
                      active ? spec.accentTextClass : 'text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400'
                    )}
                  >
                    {spec.yearLabel}
                  </span>
                  <Icon
                    size={16}
                    className={cn(
                      'transition-all duration-300',
                      active
                        ? spec.accentTextClass
                        : 'text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400'
                    )}
                  />
                </div>

                 <h3 className="mb-2 text-xl font-black tracking-tight text-dark-950 dark:text-white transition-colors">
                  {spec.title}
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-400 font-medium transition-colors">{milestoneCopy[id]}</p>

                {/* Active indicator bar */}
                <div
                  className={cn(
                    'mt-4 h-0.5 rounded-full transition-all duration-300',
                    active
                      ? `${spec.accentSurfaceClass} opacity-100`
                      : 'bg-gray-200 dark:bg-white/5 opacity-0 group-hover:opacity-100'
                  )}
                />
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
