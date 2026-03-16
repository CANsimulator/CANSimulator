import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Cpu, Sparkles } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { cn } from '../utils/cn';
import { GENERATIONS, SCENARIOS } from '../features/generations/data';
import { useGenerationCompareState } from '../features/generations/hooks/useGenerationCompareState';
import {
  BusLoadPlayground,
  CompareMatrix,
  EvolutionTimeline,
  GenerationCompareDock,
  GlossaryDrawer,
  MigrationChecklist,
  QuickMetricsStrip,
  SectionReveal,
  UseCaseRecommender,
} from '../features/generations/components';

export default function GenerationsPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const {
    primary,
    compare,
    scenario,
    sideBySide,
    setPrimary,
    setCompare,
    setScenario,
    setSideBySide,
    swapGenerations,
  } = useGenerationCompareState();

  const primarySpec = GENERATIONS[primary];
  const compareSpec = GENERATIONS[compare];

  const scenarioDefaults = useMemo(
    () => SCENARIOS.find((item) => item.id === scenario) ?? SCENARIOS[0],
    [scenario]
  );

  const [payloadBytes, setPayloadBytes] = useState(scenarioDefaults.payloadBytes);
  const [updateHz, setUpdateHz] = useState(scenarioDefaults.updateHz);

  useEffect(() => {
    setPayloadBytes(scenarioDefaults.payloadBytes);
    setUpdateHz(scenarioDefaults.updateHz);
  }, [scenarioDefaults.id, scenarioDefaults.payloadBytes, scenarioDefaults.updateHz]);

  return (
    <div className="relative min-h-screen bg-dark-950 py-14 font-sans">
      {/* Subtle ambient grid pattern */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,243,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,243,255,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <Container variant="wide" className="relative space-y-6">
        {/* ──────────── Hero Header ──────────── */}
        <motion.header
          initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={reduceMotion ? undefined : { duration: 0.5 }}
          className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <Cpu size={14} className="text-cyan-300" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Protocol evolution
                </span>
              </div>

              {/* Gradient headline */}
              <h1 className="text-4xl font-black uppercase tracking-tight md:text-6xl">
                <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
                  Generations Hub
                </span>
              </h1>

              <p className="max-w-2xl text-sm text-gray-400 md:text-base">
                Compare CAN Classic, CAN FD, and CAN XL with an interactive decision lab.
                Follow one path to understand protocol differences and another to choose the
                best fit for your workload.
              </p>
            </div>
            <GlossaryDrawer />
          </div>

          {/* Path cards */}
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            <motion.a
              href="#compare-matrix"
              whileHover={reduceMotion ? undefined : { scale: 1.01 }}
              whileTap={reduceMotion ? undefined : { scale: 0.99 }}
              className="group rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 transition-all duration-200 hover:bg-cyan-500/15 hover:shadow-[0_0_20px_rgba(0,243,255,0.1)]"
            >
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-cyan-200">
                Path A
              </p>
              <p className="text-sm font-semibold text-gray-100 group-hover:text-white">
                Understand Differences
              </p>
              <p className="mt-1 text-xs text-gray-300">
                Scan timeline, metric matrix, and generation deltas.
              </p>
            </motion.a>

            <motion.a
              href="#choose-fit"
              whileHover={reduceMotion ? undefined : { scale: 1.01 }}
              whileTap={reduceMotion ? undefined : { scale: 0.99 }}
              className="group rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 transition-all duration-200 hover:bg-violet-500/15 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]"
            >
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-violet-200">
                Path B
              </p>
              <p className="text-sm font-semibold text-gray-100 group-hover:text-white">
                Choose Best Fit
              </p>
              <p className="mt-1 text-xs text-gray-300">
                Model bus-load and use-case recommendations for your scenario.
              </p>
            </motion.a>
          </div>
        </motion.header>

        {/* ──────────── Compare Dock (sticky) ──────────── */}
        <GenerationCompareDock
          primary={primary}
          compare={compare}
          sideBySide={sideBySide}
          onPrimaryChange={setPrimary}
          onCompareChange={setCompare}
          onToggleSideBySide={setSideBySide}
          onSwap={swapGenerations}
        />

        {/* ──────────── Evolution Timeline ──────────── */}
        <SectionReveal delay={0.05}>
          <EvolutionTimeline primary={primary} onPrimaryChange={setPrimary} />
        </SectionReveal>

        {/* ──────────── Quick Metrics ──────────── */}
        <SectionReveal delay={0.1}>
          <QuickMetricsStrip spec={primarySpec} />
        </SectionReveal>

        {/* ──────────── Generation Focus Cards ──────────── */}
        <SectionReveal delay={0.1}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <motion.article
              whileHover={reduceMotion ? undefined : { scale: 1.01 }}
              className={cn(
                'rounded-3xl border p-6 transition-all duration-300',
                primarySpec.accentBorderClass,
                primarySpec.accentSurfaceClass
              )}
              style={{
                boxShadow: `0 0 25px ${primary === 'Classic' ? 'rgba(0,243,255,0.08)' : primary === 'FD' ? 'rgba(139,92,246,0.08)' : 'rgba(52,211,153,0.08)'}`,
              }}
            >
              <p
                className={cn(
                  'mb-2 text-xs font-black uppercase tracking-[0.2em]',
                  primarySpec.accentTextClass
                )}
              >
                Primary Focus
              </p>
              <h2 className="mb-2 text-2xl font-black text-white">{primarySpec.title}</h2>
              <p className="mb-4 text-sm text-gray-300">{primarySpec.summary}</p>
              <ul className="space-y-2">
                {primarySpec.keyCapabilities.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-200">
                    <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', primarySpec.accentSurfaceClass)} />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.article>

            <motion.article
              whileHover={reduceMotion ? undefined : { scale: 1.01 }}
              className={cn(
                'rounded-3xl border p-6 transition-all duration-300',
                compareSpec.accentBorderClass,
                compareSpec.accentSurfaceClass
              )}
              style={{
                boxShadow: `0 0 25px ${compare === 'Classic' ? 'rgba(0,243,255,0.08)' : compare === 'FD' ? 'rgba(139,92,246,0.08)' : 'rgba(52,211,153,0.08)'}`,
              }}
            >
              <p
                className={cn(
                  'mb-2 text-xs font-black uppercase tracking-[0.2em]',
                  compareSpec.accentTextClass
                )}
              >
                Compare Target
              </p>
              <h2 className="mb-2 text-2xl font-black text-white">{compareSpec.title}</h2>
              <p className="mb-4 text-sm text-gray-300">{compareSpec.summary}</p>
              <ul className="space-y-2">
                {compareSpec.keyCapabilities.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-200">
                    <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', compareSpec.accentSurfaceClass)} />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.article>
          </div>
        </SectionReveal>

        {/* ──────────── Changes from Previous ──────────── */}
        <SectionReveal delay={0.05}>
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={14} className={primarySpec.accentTextClass} />
              <h2 className="text-base font-black uppercase tracking-widest text-white">
                What changes from previous generation
              </h2>
            </div>
            <ul className="space-y-2">
              {primarySpec.changesFromPrevious.map((item, idx) => (
                <motion.li
                  key={item}
                  initial={reduceMotion ? undefined : { opacity: 0, x: -8 }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={
                    reduceMotion ? undefined : { delay: idx * 0.08, duration: 0.25 }
                  }
                  className="flex items-start gap-2 text-sm text-gray-300"
                >
                  <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', primarySpec.accentSurfaceClass)} />
                  {item}
                </motion.li>
              ))}
            </ul>
          </div>
        </SectionReveal>

        {/* ──────────── Compare Matrix ──────────── */}
        <SectionReveal id="compare-matrix" delay={0.05}>
          <CompareMatrix primary={primarySpec} compare={compareSpec} sideBySide={sideBySide} />
        </SectionReveal>

        {/* ──────────── Choose Best Fit Section ──────────── */}
        <div id="choose-fit" className="space-y-6">
          <SectionReveal delay={0.05}>
            <BusLoadPlayground
              primary={primary}
              compare={compare}
              sideBySide={sideBySide}
              scenario={scenario}
              payloadBytes={payloadBytes}
              updateHz={updateHz}
              onScenarioChange={setScenario}
              onPayloadBytesChange={setPayloadBytes}
              onUpdateHzChange={setUpdateHz}
            />
          </SectionReveal>

          <SectionReveal delay={0.05}>
            <UseCaseRecommender payloadBytes={payloadBytes} updateHz={updateHz} />
          </SectionReveal>
        </div>

        {/* ──────────── Migration Checklist ──────────── */}
        <SectionReveal delay={0.05}>
          <MigrationChecklist primary={primary} />
        </SectionReveal>

        {/* ──────────── Reality Check ──────────── */}
        <SectionReveal delay={0.05}>
          <div className="rounded-3xl border border-amber-300/20 bg-amber-500/5 p-6">
            <h2 className="mb-2 text-base font-black uppercase tracking-widest text-amber-200">
              Reality check
            </h2>
            <p className="text-sm text-gray-300">
              Deployment choices are not purely technical: tooling maturity, ECU fleet age,
              validation capacity, and supplier readiness often dominate generation decisions.
              Treat recommendations as guidance, then validate on your target network.
            </p>
          </div>
        </SectionReveal>

        {/* ──────────── CTA ──────────── */}
        <section className="flex justify-center pb-8 pt-3">
          <motion.button
            type="button"
            onClick={() => navigate('/inspector')}
            whileHover={reduceMotion ? undefined : { scale: 1.04 }}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            className="group inline-flex items-center gap-3 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-7 py-4 text-sm font-black uppercase tracking-[0.15em] text-cyan-100 transition-all duration-200 hover:bg-cyan-500/20 hover:shadow-[0_0_20px_rgba(0,243,255,0.15)]"
          >
            Next Lab: Bit-Level Inspector
            <ArrowRight
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </motion.button>
        </section>
      </Container>
    </div>
  );
}
