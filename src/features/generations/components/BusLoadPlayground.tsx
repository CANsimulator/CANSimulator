import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Activity, AlertTriangle, Layers, Timer } from 'lucide-react';
import { GENERATIONS, SCENARIOS } from '../data';
import type { CompareScenario, GenerationId } from '../types';
import { estimateBusLoad } from '../utils/comparison';
import { cn } from '../../../utils/cn';
import { AnimatedCounter } from './AnimatedCounter';
import { NeonSlider } from './NeonSlider';

interface BusLoadPlaygroundProps {
  primary: GenerationId;
  compare: GenerationId;
  sideBySide: boolean;
  scenario: CompareScenario['id'];
  payloadBytes: number;
  updateHz: number;
  onScenarioChange: (scenario: CompareScenario['id']) => void;
  onPayloadBytesChange: (value: number) => void;
  onUpdateHzChange: (value: number) => void;
}

function LoadCard({
  generation,
  loadPercent,
  frameCount,
  estimatedBitsPerSecond,
  reduceMotion,
  idx,
}: {
  generation: GenerationId;
  loadPercent: number;
  frameCount: number;
  estimatedBitsPerSecond: number;
  reduceMotion: boolean | null;
  idx: number;
}) {
  const spec = GENERATIONS[generation];
  const safeBar = Math.min(loadPercent, 100);
  const isWarning = loadPercent > 80;
  const isCritical = loadPercent > 95;

  // Gradient color based on load
  const getBarGradient = () => {
    if (isCritical) return 'from-red-600 to-red-400';
    if (isWarning) return 'from-amber-500 to-yellow-400';
    return `from-cyan-500 to-cyan-400`;
  };

  return (
    <motion.article
      initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : { duration: 0.25, delay: idx * 0.08 }}
       className={cn(
        'rounded-xl border bg-gray-50/50 dark:bg-black/30 p-4 transition-all duration-300 shadow-sm',
        isWarning
          ? 'border-amber-500/30 shadow-[0_4px_15px_rgba(245,158,11,0.1)] dark:shadow-[0_0_15px_rgba(245,158,11,0.1)]'
          : 'border-gray-200 dark:border-white/10'
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <h4
          className={cn(
            'text-sm font-black uppercase tracking-wider',
            spec.accentTextClass
          )}
        >
          {spec.id}
        </h4>
        <div className="flex items-center gap-2">
          {isWarning && (
            <motion.div
              initial={reduceMotion ? undefined : { scale: 0 }}
              animate={
                reduceMotion
                  ? undefined
                  : { scale: [1, 1.2, 1] }
              }
              transition={
                reduceMotion
                  ? undefined
                  : { repeat: Infinity, duration: 1.5 }
              }
            >
              <AlertTriangle
                size={14}
                className={isCritical ? 'text-red-400' : 'text-amber-400'}
              />
            </motion.div>
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            {frameCount} frame{frameCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Load percentage with animated counter */}
       <AnimatedCounter
        value={loadPercent}
        decimals={2}
        suffix="%"
        className={cn(
          'mb-2 block text-2xl font-black',
          isCritical ? 'text-red-600 dark:text-red-300' : isWarning ? 'text-amber-600 dark:text-amber-200' : 'text-dark-950 dark:text-white'
        )}
      />

      {/* Animated load bar */}
      <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/[0.06]">
        <motion.div
          className={cn('h-full rounded-full bg-gradient-to-r', getBarGradient())}
          initial={{ width: 0 }}
          animate={{ width: `${safeBar}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

       <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
        <AnimatedCounter value={estimatedBitsPerSecond} className="text-gray-700 dark:text-gray-300" />
        <span className="ml-1">bps</span>
      </p>
    </motion.article>
  );
}

export function BusLoadPlayground({
  primary,
  compare,
  sideBySide,
  scenario,
  payloadBytes,
  updateHz,
  onScenarioChange,
  onPayloadBytesChange,
  onUpdateHzChange,
}: BusLoadPlaygroundProps) {
  const reduceMotion = useReducedMotion();
  const selectedScenario =
    SCENARIOS.find((item) => item.id === scenario) ?? SCENARIOS[0];

  const estimates = useMemo(() => {
    return {
      Classic: estimateBusLoad(payloadBytes, updateHz, GENERATIONS.Classic),
      FD: estimateBusLoad(payloadBytes, updateHz, GENERATIONS.FD),
      XL: estimateBusLoad(payloadBytes, updateHz, GENERATIONS.XL),
    };
  }, [payloadBytes, updateHz]);

  const cards = sideBySide
    ? [primary, compare]
    : (['Classic', 'FD', 'XL'] as GenerationId[]);

  return (
    <section className="rounded-3xl border border-gray-200 dark:border-white/10 bg-gray-50/30 dark:bg-white/[0.02] p-6 md:p-8">
       <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black uppercase tracking-widest text-dark-950 dark:text-white">
            Payload & Bus-Load Playground
          </h2>
          <p className="text-xs text-gray-500 font-bold">
            Adjust sliders and pick a scenario to compare estimated network load.
          </p>
        </div>
         <span className="rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 dark:text-gray-300">
          Scenario: {selectedScenario.shortLabel}
        </span>
      </div>

      {/* Scenario buttons */}
       <div className="mb-5 flex flex-wrap gap-2">
        {SCENARIOS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onScenarioChange(item.id);
              onPayloadBytesChange(item.payloadBytes);
              onUpdateHzChange(item.updateHz);
            }}
            className={cn(
              'rounded-lg border px-3 py-2 text-[11px] font-black uppercase tracking-wider transition-all duration-200 shadow-sm',
               scenario === item.id
                ? 'border-cyber-blue/50 dark:border-cyan-400/40 bg-cyber-blue/10 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-200 shadow-[0_2px_8px_rgba(0,243,255,0.15)] dark:shadow-[0_0_8px_rgba(0,243,255,0.1)]'
                : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-transparent hover:text-dark-950 dark:hover:text-white hover:border-gray-300 dark:hover:border-white/20'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

       <p className="mb-5 text-sm text-gray-600 dark:text-gray-400">{selectedScenario.description}</p>

      {/* Neon sliders */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <NeonSlider
          label="Payload size"
          min={1}
          max={2048}
          value={payloadBytes}
          onChange={onPayloadBytesChange}
          valueSuffix="bytes"
        />
        <NeonSlider
          label="Update rate"
          min={1}
          max={200}
          value={updateHz}
          onChange={onUpdateHzChange}
          valueSuffix="Hz"
        />
      </div>

      {/* Load cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {cards.map((id, idx) => {
          const estimate = estimates[id];
          return (
            <LoadCard
              key={id}
              generation={id}
              loadPercent={estimate.loadPercent}
              frameCount={estimate.frameCount}
              estimatedBitsPerSecond={estimate.estimatedBitsPerSecond}
              reduceMotion={reduceMotion}
              idx={idx}
            />
          );
        })}
      </div>

      {/* Summary metrics strip */}
       <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20 p-4 transition-colors duration-300 shadow-sm">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
            <Layers size={12} />
            Frames per message
          </p>
          <p className="font-mono text-sm text-gray-700 dark:text-gray-300 font-bold">
            Classic: {estimates.Classic.frameCount} · FD: {estimates.FD.frameCount} · XL:{' '}
            {estimates.XL.frameCount}
          </p>
        </article>
        <article className="rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20 p-4 transition-colors duration-300 shadow-sm">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
            <Activity size={12} />
            Primary load
          </p>
          <AnimatedCounter
            value={estimates[primary].loadPercent}
            decimals={2}
            suffix="%"
            className="font-mono text-sm text-gray-700 dark:text-gray-300 font-bold"
          />
        </article>
        <article className="rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20 p-4 transition-colors duration-300 shadow-sm">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
            <Timer size={12} />
            Inter-message interval
          </p>
          <AnimatedCounter
            value={1000 / updateHz}
            decimals={2}
            suffix=" ms"
            className="font-mono text-sm text-gray-700 dark:text-gray-300 font-bold"
          />
        </article>
      </div>
    </section>
  );
}
