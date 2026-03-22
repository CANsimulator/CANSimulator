import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown, Minus, TrendingUp } from 'lucide-react';
import type { GenerationSpec } from '../types';
import { cn } from '../../../utils/cn';

interface CompareMatrixProps {
  primary: GenerationSpec;
  compare: GenerationSpec;
  sideBySide: boolean;
}

interface MatrixRow {
  label: string;
  primary: string;
  compare: string;
  primaryBetter?: boolean;
  compareBetter?: boolean;
  detail?: string;
  /** Numeric value for bar chart visualization (0-100 scale) */
  primaryBar?: number;
  compareBar?: number;
}

function buildRows(primary: GenerationSpec, compare: GenerationSpec): MatrixRow[] {
  const payloadMax = Math.max(primary.maxPayloadBytes, compare.maxPayloadBytes);
  const rateMax = Math.max(primary.maxDataRateMbps, compare.maxDataRateMbps);

  return [
    {
      label: 'Introduced',
      primary: primary.yearLabel,
      compare: compare.yearLabel,
      detail: `${primary.id} was introduced in ${primary.yearLabel}, ${compare.id} in ${compare.yearLabel}.`,
    },
    {
      label: 'Max payload',
      primary: `${primary.maxPayloadBytes} B`,
      compare: `${compare.maxPayloadBytes} B`,
      primaryBetter: primary.maxPayloadBytes > compare.maxPayloadBytes,
      compareBetter: compare.maxPayloadBytes > primary.maxPayloadBytes,
      detail: `Payload capacity determines how much application data fits in a single frame. Larger payloads reduce transport-layer fragmentation.`,
      primaryBar: (primary.maxPayloadBytes / payloadMax) * 100,
      compareBar: (compare.maxPayloadBytes / payloadMax) * 100,
    },
    {
      label: 'Max data rate',
      primary: `${primary.maxDataRateMbps} Mbit/s`,
      compare: `${compare.maxDataRateMbps} Mbit/s`,
      primaryBetter: primary.maxDataRateMbps > compare.maxDataRateMbps,
      compareBetter: compare.maxDataRateMbps > primary.maxDataRateMbps,
      detail: `Data phase bit rate. Higher rates reduce frame transmission time and increase overall bus throughput.`,
      primaryBar: (primary.maxDataRateMbps / rateMax) * 100,
      compareBar: (compare.maxDataRateMbps / rateMax) * 100,
    },
    {
      label: 'CRC scheme',
      primary: primary.crcScheme,
      compare: compare.crcScheme,
      detail: `CRC polynomials protect frame integrity. Stronger CRCs (more bits) catch more multi-bit errors.`,
    },
    {
      label: 'Identifier support',
      primary: primary.identifierSupport,
      compare: compare.identifierSupport,
      detail: `Identifier formats determine addressing capability and arbitration priority granularity.`,
    },
    {
      label: 'Compatibility',
      primary: primary.compatibility,
      compare: compare.compatibility,
      detail: `Legacy compatibility determines how easily a generation integrates with existing vehicle networks.`,
    },
  ];
}

function IndicatorIcon({
  isBetter,
  isEqual,
  accentClass,
}: {
  isBetter?: boolean;
  isEqual: boolean;
  accentClass: string;
}) {
  if (isBetter) {
    return <TrendingUp size={14} className={cn(accentClass, 'animate-pulse')} />;
  }
  if (isEqual) {
    return <Minus size={14} className="text-gray-600" />;
  }
  return <Check size={14} className="text-gray-500" />;
}

function BarChart({
  percent,
  accentSoftClass,
}: {
  percent: number;
  accentSoftClass: string;
}) {
  return (
    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/5">
      <div
        className={cn('h-full rounded-full transition-all duration-500', accentSoftClass)}
        style={{ width: `${Math.max(percent, 2)}%` }}
      />
    </div>
  );
}

export function CompareMatrix({ primary, compare, sideBySide }: CompareMatrixProps) {
  const reduceMotion = useReducedMotion();
  const rows = buildRows(primary, compare);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const toggleRow = (label: string) => {
    setExpandedRow((prev) => (prev === label ? null : label));
  };

  return (
    <section className="rounded-3xl border border-gray-200 dark:border-white/10 bg-gray-50/30 dark:bg-white/[0.02] p-6 md:p-8">
       <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black uppercase tracking-widest text-dark-950 dark:text-white">
            Interactive Compare Matrix
          </h2>
          <p className="text-xs text-gray-500 font-bold">
            Click any row to expand details. Bars show relative scale.
          </p>
        </div>
         <span className="rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 dark:text-gray-300 transition-colors">
          {sideBySide ? 'Side-by-side active' : 'Single-focus view'}
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10">
          <table className="w-full table-fixed border-collapse">
             <thead>
              <tr className="bg-gray-100/80 dark:bg-dark-900/70 transition-colors">
                 <th className="w-[28%] border-b border-gray-200 dark:border-white/10 px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 dark:text-gray-400">
                  Metric
                </th>
                 <th
                  className={cn(
                    'border-b border-gray-200 dark:border-white/10 px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em]',
                    primary.accentTextClass
                  )}
                >
                  {primary.id}
                </th>
                 <th
                  className={cn(
                    'border-b border-gray-200 dark:border-white/10 px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em]',
                    compare.accentTextClass
                  )}
                >
                  {compare.id}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isExpanded = expandedRow === row.label;
                return (
                  <tr
                    key={row.label}
                    onClick={() => toggleRow(row.label)}
                    style={{
                      animationDelay: `${idx * 40}ms`,
                    }}
                    className={cn(
                      'cursor-pointer transition-colors duration-150',
                      !reduceMotion && 'animate-fade-in opacity-0 [animation-fill-mode:forwards]',
                      'odd:bg-gray-100/30 dark:odd:bg-black/20 even:bg-transparent dark:even:bg-black/10',
                      'hover:bg-gray-100 dark:hover:bg-white/[0.04]',
                      isExpanded && 'bg-gray-200/50 dark:bg-white/[0.06]'
                    )}
                  >
                     <td className="border-b border-gray-100 dark:border-white/5 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        {row.label}
                        <ChevronDown
                          size={12}
                          className={cn(
                            'text-gray-600 transition-transform duration-200',
                            isExpanded && 'rotate-180'
                          )}
                        />
                      </div>
                      <AnimatePresence>
                        {isExpanded && row.detail && (
                          <motion.p
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                              className="mt-2 overflow-hidden text-xs font-semibold text-gray-600 dark:text-gray-500 leading-relaxed"
                          >
                            {row.detail}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </td>
                      <td className="border-b border-gray-100 dark:border-white/5 px-4 py-3 text-sm text-dark-950 dark:text-gray-200 font-medium">
                      <div className="flex items-center gap-2">
                        <IndicatorIcon
                          isBetter={row.primaryBetter}
                          isEqual={row.primary === row.compare}
                          accentClass={primary.accentTextClass}
                        />
                        <span>{row.primary}</span>
                      </div>
                      {row.primaryBar !== undefined && (
                        <BarChart
                          percent={row.primaryBar}
                          accentSoftClass={primary.accentSoftClass}
                        />
                      )}
                    </td>
                     <td className="border-b border-gray-100 dark:border-white/5 px-4 py-3 text-sm text-dark-950 dark:text-gray-200 font-medium">
                      <div className="flex items-center gap-2">
                        <IndicatorIcon
                          isBetter={row.compareBetter}
                          isEqual={row.primary === row.compare}
                          accentClass={compare.accentTextClass}
                        />
                        <span>{row.compare}</span>
                      </div>
                      {row.compareBar !== undefined && (
                        <BarChart
                          percent={row.compareBar}
                          accentSoftClass={compare.accentSoftClass}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile stacked view */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => {
          const isExpanded = expandedRow === row.label;
          return (
            <article
              key={row.label}
              className={cn(
                "rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/30 p-5 transition-colors duration-300",
                "cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-cyber-blue/40"
              )}
              onClick={() => toggleRow(row.label)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleRow(row.label);
                }
              }}
              tabIndex={0}
              role="button"
              aria-expanded={isExpanded}
            >
             <header className="flex items-center justify-between rounded-t-xl border-b border-gray-100 dark:border-white/10 bg-gray-100 dark:bg-dark-950/95 px-4 py-2 transition-colors duration-300">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 dark:text-gray-400">
                  {row.label}
                </p>
                <ChevronDown
                  size={12}
                  className={cn(
                    'text-gray-600 transition-transform duration-200',
                    isExpanded && 'rotate-180'
                  )}
                />
              </header>
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      'text-xs font-black uppercase tracking-wider',
                      primary.accentTextClass
                    )}
                  >
                    {primary.id}
                  </span>
                   <span className="text-sm text-dark-950 dark:text-gray-200">{row.primary}</span>
                </div>
                {row.primaryBar !== undefined && (
                  <BarChart
                    percent={row.primaryBar}
                    accentSoftClass={primary.accentSoftClass}
                  />
                )}
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      'text-xs font-black uppercase tracking-wider',
                      compare.accentTextClass
                    )}
                  >
                    {compare.id}
                  </span>
                   <span className="text-sm text-dark-950 dark:text-gray-200">{row.compare}</span>
                </div>
                {row.compareBar !== undefined && (
                  <BarChart
                    percent={row.compareBar}
                    accentSoftClass={compare.accentSoftClass}
                  />
                )}
                 <AnimatePresence>
                  {isExpanded && row.detail && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden pt-2 text-xs text-gray-700 dark:text-gray-500 font-medium leading-relaxed"
                    >
                      {row.detail}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
