import { motion, useReducedMotion } from 'framer-motion';
import { Gauge, Route, ShieldCheck } from 'lucide-react';
import { GENERATION_ORDER, GENERATIONS } from '../data';
import type { GenerationId } from '../types';
import { cn } from '../../../utils/cn';

interface EvolutionTimelineProps {
  primary: GenerationId;
}

export function EvolutionTimeline({ primary }: EvolutionTimelineProps) {
  const reduceMotion = useReducedMotion();

  const milestoneCopy: Record<GenerationId, string> = {
    Classic: 'Deterministic control foundation',
    FD: 'Throughput and payload expansion',
    XL: 'High-capacity future architecture',
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black uppercase tracking-widest text-white">Evolution Timeline</h2>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
          Understand differences: era to capability shift
        </p>
      </div>

      <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {GENERATION_ORDER.map((id, idx) => {
          const spec = GENERATIONS[id];
          const active = primary === id;
          return (
            <motion.li
              key={id}
              initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={reduceMotion ? undefined : { duration: 0.2, delay: idx * 0.08 }}
              className={cn(
                'rounded-2xl border p-5 transition-all duration-200',
                active
                  ? `${spec.accentBorderClass} ${spec.accentSurfaceClass}`
                  : 'border-white/10 bg-dark-900/40'
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={cn(
                    'text-xs font-black uppercase tracking-[0.2em]',
                    active ? spec.accentTextClass : 'text-gray-500'
                  )}
                >
                  {spec.yearLabel}
                </span>
                {idx === 0 && <ShieldCheck size={14} className={spec.accentTextClass} />}
                {idx === 1 && <Gauge size={14} className={spec.accentTextClass} />}
                {idx === 2 && <Route size={14} className={spec.accentTextClass} />}
              </div>
              <h3 className="mb-2 text-xl font-black tracking-tight text-white">{spec.title}</h3>
              <p className="text-sm text-gray-400">{milestoneCopy[id]}</p>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}

