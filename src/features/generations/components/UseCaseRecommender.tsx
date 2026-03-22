import { useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Lightbulb, Zap } from 'lucide-react';
import { GENERATIONS, PROFILE_HINTS } from '../data';
import type { UseCaseProfile } from '../types';
import { getGenerationRecommendation } from '../utils/comparison';
import { cn } from '../../../utils/cn';

interface UseCaseRecommenderProps {
  payloadBytes: number;
  updateHz: number;
}

const PROFILES: UseCaseProfile[] = [
  'Body',
  'Powertrain',
  'Diagnostics',
  'ADAS',
  'OTA',
];

/** Radial confidence gauge — visual indicator of recommendation strength */
function ConfidenceGauge({
  confidence,
  accentClass,
}: {
  confidence: 'high' | 'medium';
  accentClass: string;
}) {
  const percent = confidence === 'high' ? 90 : 60;
  const size = 48;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

   return (
    <div className="relative flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-gray-200 dark:text-white/5"
          strokeWidth={strokeWidth}
        />
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
          style={{
            transition:
              'stroke-dashoffset 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        />
      </svg>
      <span className="absolute text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-500">
        {confidence === 'high' ? 'HI' : 'MD'}
      </span>
    </div>
  );
}

export function UseCaseRecommender({
  payloadBytes,
  updateHz,
}: UseCaseRecommenderProps) {
  const reduceMotion = useReducedMotion();
  const [profile, setProfile] = useState<UseCaseProfile>('Diagnostics');

  const recommendation = useMemo(
    () => getGenerationRecommendation({ payloadBytes, updateHz, profile }),
    [payloadBytes, profile, updateHz]
  );

  const primarySpec = GENERATIONS[recommendation.recommended];

  return (
    <section className="rounded-3xl border border-gray-200 dark:border-white/10 bg-gray-50/30 dark:bg-white/[0.02] p-6 md:p-8">
       <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black uppercase tracking-widest text-dark-950 dark:text-white">
            Use-Case Recommender
          </h2>
          <p className="text-xs text-gray-500 font-bold">
            Actionable recommendation based on profile and workload.
          </p>
        </div>
      </div>

      {/* Profile tabs */}
       <div className="mb-5 flex flex-wrap gap-2">
        {PROFILES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setProfile(item)}
            className={cn(
              'relative rounded-lg border px-3 py-2 text-[11px] font-black uppercase tracking-wider transition-all duration-200 shadow-sm',
               profile === item
                ? 'border-cyber-blue/50 dark:border-cyan-400/40 bg-cyber-blue/10 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-200 shadow-[0_2px_8px_rgba(0,243,255,0.15)] dark:shadow-[0_0_8px_rgba(0,243,255,0.1)]'
                : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-transparent hover:text-dark-950 dark:hover:text-white hover:border-gray-300 dark:hover:border-white/20'
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Recommendation card with AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.article
          key={`${recommendation.recommended}-${profile}`}
          initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
           className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/30 p-5 transition-colors duration-300 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
              Recommended Generation
            </p>
            <div className="flex items-center gap-3">
              <ConfidenceGauge
                confidence={recommendation.confidence}
                accentClass={primarySpec.accentTextClass}
              />
              <span
                className={cn(
                  'text-sm font-black uppercase tracking-wider',
                  primarySpec.accentTextClass
                )}
              >
                {recommendation.confidence}
              </span>
            </div>
          </div>

          <h3
            className={cn(
              'mb-3 flex items-center gap-2 text-2xl font-black tracking-tight',
              primarySpec.accentTextClass
            )}
          >
            <Zap size={20} />
            {primarySpec.id} — {primarySpec.title}
          </h3>

           <p className="mb-4 text-sm text-gray-800 dark:text-gray-300 font-medium leading-relaxed">{recommendation.reason}</p>
 
          <p className="mb-4 flex items-start gap-2 rounded-lg border border-gray-200 dark:border-white/5 bg-white/50 dark:bg-black/20 p-3 text-sm text-gray-600 dark:text-gray-400 shadow-inner italic">
            <Lightbulb size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-cyan-300" />
            {PROFILE_HINTS[profile]}
          </p>

          {/* Alternatives with animated list */}
           <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 dark:text-gray-500">
              Alternatives
            </p>
            {recommendation.alternatives.map((alt, idx) => (
              <motion.div
                key={alt.id}
                initial={reduceMotion ? undefined : { opacity: 0, x: -8 }}
                animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                transition={
                  reduceMotion
                    ? undefined
                    : { delay: 0.1 + idx * 0.08, duration: 0.2 }
                }
                 className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 font-medium"
              >
                 <CheckCircle2
                  size={14}
                  className="mt-1 shrink-0 text-emerald-700 dark:text-emerald-300"
                />
                <span>
                  <strong className={GENERATIONS[alt.id].accentTextClass}>
                    {alt.id}:
                  </strong>{' '}
                  {alt.reason}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.article>
      </AnimatePresence>
    </section>
  );
}
