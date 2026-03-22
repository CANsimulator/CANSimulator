import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { COMPATIBILITY_DESCRIPTIONS } from '../data';
import type { GenerationSpec } from '../types';
import { cn } from '../../../utils/cn';
import { AnimatedCounter } from './AnimatedCounter';

interface QuickMetricsStripProps {
  spec: GenerationSpec;
}

interface MetricItem {
  label: string;
  value: number;
  suffix: string;
  tooltip: string;
  /** Maximum reference value for progress ring */
  maxRef: number;
}

function ProgressRing({
  percent,
  accentClass,
  size = 36,
}: {
  percent: number;
  accentClass: string;
  size?: number;
}) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className="shrink-0 -rotate-90"
      aria-hidden="true"
    >
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        className="text-gray-100 dark:text-white/10 transition-colors duration-300"
        strokeWidth={strokeWidth}
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className={accentClass}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
      />
    </svg>
  );
}

function MetricCard({
  item,
  accentTextClass,
  accentSoftClass,
  reduceMotion,
  idx,
}: {
  item: MetricItem;
  accentTextClass: string;
  accentSoftClass: string;
  reduceMotion: boolean | null;
  idx: number;
}) {
  const [hovered, setHovered] = useState(false);
  const percent = (item.value / item.maxRef) * 100;

  return (
    <motion.article
      initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : { duration: 0.25, delay: idx * 0.06 }}
      className="group relative rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/30 p-3 transition-all duration-200 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-black/40"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-3">
        <ProgressRing percent={percent} accentClass={accentTextClass} />
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            {item.label}
          </p>
          <AnimatedCounter
            value={item.value}
            suffix={` ${item.suffix}`}
            className="font-mono text-sm font-semibold text-dark-900 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Tooltip on hover */}
      {hovered && (
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 4 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          className={cn(
            'absolute left-0 right-0 top-full z-20 mt-2 rounded-lg border border-gray-200 dark:border-white/10 p-2.5 text-xs text-gray-600 dark:text-gray-300',
            accentSoftClass,
            'bg-white dark:bg-dark-950/95 backdrop-blur-sm shadow-lg dark:shadow-none'
          )}
        >
          {item.tooltip}
        </motion.div>
      )}
    </motion.article>
  );
}

export function QuickMetricsStrip({ spec }: QuickMetricsStripProps) {
  const reduceMotion = useReducedMotion();

  const items: MetricItem[] = [
    {
      label: 'Max Payload',
      value: spec.maxPayloadBytes,
      suffix: 'bytes',
      tooltip: `Maximum data bytes per single frame. ${spec.id} supports up to ${spec.maxPayloadBytes} bytes.`,
      maxRef: 2048,
    },
    {
      label: 'Max Data Rate',
      value: spec.maxDataRateMbps,
      suffix: 'Mbit/s',
      tooltip: `Peak data-phase bit rate on the bus. ${spec.id} achieves ${spec.maxDataRateMbps} Mbit/s.`,
      maxRef: 20,
    },
    {
      label: 'CRC',
      value: 0,
      suffix: spec.crcScheme,
      tooltip: `Error detection scheme: ${spec.crcScheme}. Stronger CRCs catch more bit errors.`,
      maxRef: 1,
    },
    {
      label: 'Identifiers',
      value: 0,
      suffix: spec.identifierSupport,
      tooltip: `Address formats for message routing: ${spec.identifierSupport}.`,
      maxRef: 1,
    },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-900/50 p-4 md:p-5 transition-colors duration-300">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-black uppercase tracking-widest text-dark-950 dark:text-white">
          Quick Metrics
        </h2>
        <span
          className={cn(
            'rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]',
            spec.accentBorderClass,
            spec.accentTextClass,
            spec.accentSoftClass
          )}
        >
          {spec.compatibility}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {items.map((item, idx) => (
          <MetricCard
            key={item.label}
            item={item}
            accentTextClass={spec.accentTextClass}
            accentSoftClass={spec.accentSoftClass}
            reduceMotion={reduceMotion}
            idx={idx}
          />
        ))}

        <article className="col-span-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/30 p-3 md:col-span-1">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Compatibility
          </p>
          <p className={cn('text-sm font-semibold', spec.accentTextClass)}>
            {spec.compatibility}
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {COMPATIBILITY_DESCRIPTIONS[spec.compatibility]}
          </p>
        </article>
      </div>
    </section>
  );
}
