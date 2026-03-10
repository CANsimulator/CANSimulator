import { useMemo, useState } from 'react';
import { CheckCircle2, Lightbulb } from 'lucide-react';
import { GENERATIONS, PROFILE_HINTS } from '../data';
import type { UseCaseProfile } from '../types';
import { getGenerationRecommendation } from '../utils/comparison';
import { cn } from '../../../utils/cn';

interface UseCaseRecommenderProps {
  payloadBytes: number;
  updateHz: number;
}

const PROFILES: UseCaseProfile[] = ['Body', 'Powertrain', 'Diagnostics', 'ADAS', 'OTA'];

export function UseCaseRecommender({ payloadBytes, updateHz }: UseCaseRecommenderProps) {
  const [profile, setProfile] = useState<UseCaseProfile>('Diagnostics');

  const recommendation = useMemo(
    () => getGenerationRecommendation({ payloadBytes, updateHz, profile }),
    [payloadBytes, profile, updateHz]
  );

  const primarySpec = GENERATIONS[recommendation.recommended];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black uppercase tracking-widest text-white">Use-Case Recommender</h2>
          <p className="text-xs text-gray-500">Actionable recommendation based on profile and workload.</p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {PROFILES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setProfile(item)}
            className={cn(
              'rounded-lg border px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200',
              profile === item
                ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200'
                : 'border-white/10 text-gray-400 hover:text-white'
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <article className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Recommended Generation</p>
          <span className={cn('text-sm font-black uppercase tracking-wider', primarySpec.accentTextClass)}>
            {recommendation.confidence} confidence
          </span>
        </div>
        <h3 className={cn('mb-3 text-2xl font-black tracking-tight', primarySpec.accentTextClass)}>
          {primarySpec.id} - {primarySpec.title}
        </h3>
        <p className="mb-4 text-sm text-gray-300">{recommendation.reason}</p>
        <p className="mb-4 flex items-start gap-2 text-sm text-gray-400">
          <Lightbulb size={16} className="mt-0.5 text-cyan-300" />
          {PROFILE_HINTS[profile]}
        </p>

        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Alternatives</p>
          {recommendation.alternatives.map((alt) => (
            <div key={alt.id} className="flex items-start gap-2 text-sm text-gray-300">
              <CheckCircle2 size={14} className="mt-1 text-emerald-300" />
              <span>
                <strong>{alt.id}:</strong> {alt.reason}
              </span>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

