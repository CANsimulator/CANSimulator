import { Check, Minus, TrendingUp } from 'lucide-react';
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
}

function buildRows(primary: GenerationSpec, compare: GenerationSpec): MatrixRow[] {
  return [
    {
      label: 'Introduced',
      primary: primary.yearLabel,
      compare: compare.yearLabel,
    },
    {
      label: 'Max payload',
      primary: `${primary.maxPayloadBytes} B`,
      compare: `${compare.maxPayloadBytes} B`,
      primaryBetter: primary.maxPayloadBytes > compare.maxPayloadBytes,
      compareBetter: compare.maxPayloadBytes > primary.maxPayloadBytes,
    },
    {
      label: 'Max data rate',
      primary: `${primary.maxDataRateMbps} Mbit/s`,
      compare: `${compare.maxDataRateMbps} Mbit/s`,
      primaryBetter: primary.maxDataRateMbps > compare.maxDataRateMbps,
      compareBetter: compare.maxDataRateMbps > primary.maxDataRateMbps,
    },
    {
      label: 'CRC scheme',
      primary: primary.crcScheme,
      compare: compare.crcScheme,
    },
    {
      label: 'Identifier support',
      primary: primary.identifierSupport,
      compare: compare.identifierSupport,
    },
    {
      label: 'Compatibility',
      primary: primary.compatibility,
      compare: compare.compatibility,
    },
  ];
}

export function CompareMatrix({ primary, compare, sideBySide }: CompareMatrixProps) {
  const rows = buildRows(primary, compare);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black uppercase tracking-widest text-white">
            Interactive Compare Matrix
          </h2>
          <p className="text-xs text-gray-500">
            Locked rows keep metric scanning consistent across generations.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300">
          {sideBySide ? 'Side-by-side active' : 'Single-focus view'}
        </span>
      </div>

      <div className="hidden md:block">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="bg-dark-900/70">
                <th className="w-[28%] border-b border-white/10 px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                  Metric
                </th>
                <th
                  className={cn(
                    'border-b border-white/10 px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em]',
                    primary.accentTextClass
                  )}
                >
                  {primary.id}
                </th>
                <th
                  className={cn(
                    'border-b border-white/10 px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em]',
                    compare.accentTextClass
                  )}
                >
                  {compare.id}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="odd:bg-black/20 even:bg-black/10">
                  <td className="border-b border-white/5 px-4 py-3 text-sm font-semibold text-gray-300">
                    {row.label}
                  </td>
                  <td className="border-b border-white/5 px-4 py-3 text-sm text-gray-200">
                    <div className="flex items-center gap-2">
                      {row.primaryBetter ? (
                        <TrendingUp size={14} className={primary.accentTextClass} />
                      ) : row.primary === row.compare ? (
                        <Minus size={14} className="text-gray-600" />
                      ) : (
                        <Check size={14} className="text-gray-500" />
                      )}
                      <span>{row.primary}</span>
                    </div>
                  </td>
                  <td className="border-b border-white/5 px-4 py-3 text-sm text-gray-200">
                    <div className="flex items-center gap-2">
                      {row.compareBetter ? (
                        <TrendingUp size={14} className={compare.accentTextClass} />
                      ) : row.primary === row.compare ? (
                        <Minus size={14} className="text-gray-600" />
                      ) : (
                        <Check size={14} className="text-gray-500" />
                      )}
                      <span>{row.compare}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article key={row.label} className="rounded-xl border border-white/10 bg-black/20">
            <header className="sticky top-[122px] z-10 rounded-t-xl border-b border-white/10 bg-dark-950/95 px-4 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{row.label}</p>
            </header>
            <div className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className={cn('text-xs font-black uppercase tracking-wider', primary.accentTextClass)}>
                  {primary.id}
                </span>
                <span className="text-sm text-gray-200">{row.primary}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className={cn('text-xs font-black uppercase tracking-wider', compare.accentTextClass)}>
                  {compare.id}
                </span>
                <span className="text-sm text-gray-200">{row.compare}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

