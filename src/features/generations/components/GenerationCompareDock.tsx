import { useMemo, useState } from 'react';
import { ArrowLeftRight, Copy, GitCompareArrows } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);

  const compareOptions = useMemo(
    () => GENERATION_ORDER.filter((id) => id !== primary),
    [primary]
  );

  const handleCopy = async () => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <section className="sticky top-[70px] z-30 rounded-2xl border border-white/10 bg-dark-950/85 px-3 py-3 backdrop-blur-xl shadow-lg shadow-black/20">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label="CAN generation selector"
            className="flex flex-wrap gap-2 rounded-xl bg-white/5 p-1"
          >
            {GENERATION_ORDER.map((id) => {
              const spec = GENERATIONS[id];
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={primary === id}
                  onClick={() => onPrimaryChange(id)}
                  className={cn(
                    'rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wider transition-all duration-200',
                    primary === id
                      ? `${spec.accentSurfaceClass} ${spec.accentTextClass} border border-white/20`
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  {id}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onToggleSideBySide(!sideBySide)}
            aria-pressed={sideBySide}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-bold uppercase tracking-widest transition-all duration-200',
              sideBySide
                ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200'
                : 'border-white/10 text-gray-400 hover:text-white'
            )}
          >
            <GitCompareArrows size={14} />
            Side-by-Side
          </button>
        </div>

        <div className="flex items-center gap-2">
          {sideBySide && (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Compare
              </span>
              {compareOptions.map((id) => {
                const spec = GENERATIONS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onCompareChange(id)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-200',
                      compare === id
                        ? `${spec.accentSurfaceClass} ${spec.accentTextClass} border border-white/20`
                        : 'text-gray-400 hover:text-white'
                    )}
                  >
                    {id}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={onSwap}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-300 transition-colors hover:text-white"
              >
                <ArrowLeftRight size={13} />
                Swap
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 transition-colors hover:text-white"
          >
            <Copy size={12} />
            {copied ? 'Copied' : 'Copy Link'}
          </button>
        </div>
      </div>
    </section>
  );
}

