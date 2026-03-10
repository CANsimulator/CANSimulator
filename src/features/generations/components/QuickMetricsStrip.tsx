import { COMPATIBILITY_DESCRIPTIONS } from '../data';
import type { GenerationSpec } from '../types';
import { cn } from '../../../utils/cn';

interface QuickMetricsStripProps {
  spec: GenerationSpec;
}

export function QuickMetricsStrip({ spec }: QuickMetricsStripProps) {
  const items = [
    { label: 'Max Payload', value: `${spec.maxPayloadBytes} bytes` },
    { label: 'Max Data Rate', value: `${spec.maxDataRateMbps} Mbit/s` },
    { label: 'CRC', value: spec.crcScheme },
    { label: 'Identifiers', value: spec.identifierSupport },
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-dark-900/50 p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-black uppercase tracking-widest text-white">Quick Metrics Strip</h2>
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
        {items.map((item) => (
          <article key={item.label} className="rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">{item.label}</p>
            <p className="text-sm font-semibold text-gray-100">{item.value}</p>
          </article>
        ))}

        <article className="col-span-2 rounded-xl border border-white/10 bg-black/30 p-3 md:col-span-1">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Compatibility</p>
          <p className={cn('text-sm font-semibold', spec.accentTextClass)}>{spec.compatibility}</p>
          <p className="mt-1 text-xs text-gray-400">
            {COMPATIBILITY_DESCRIPTIONS[spec.compatibility]}
          </p>
        </article>
      </div>
    </section>
  );
}

