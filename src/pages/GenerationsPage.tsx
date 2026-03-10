import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  UseCaseRecommender,
} from '../features/generations/components';

export default function GenerationsPage() {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-dark-950 py-14 font-sans">
      <Container variant="wide" className="space-y-6">
        <header className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <Cpu size={14} className="text-cyan-300" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Protocol evolution
                </span>
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tight text-white md:text-6xl">
                Generations Hub
              </h1>
              <p className="max-w-2xl text-sm text-gray-400 md:text-base">
                Compare CAN Classic, CAN FD, and CAN XL with an interactive decision lab. Follow one
                path to understand protocol differences and another to choose the best fit for your
                workload.
              </p>
            </div>
            <GlossaryDrawer />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            <a
              href="#compare-matrix"
              className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 transition-colors hover:bg-cyan-500/15"
            >
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-cyan-200">
                Path A
              </p>
              <p className="text-sm font-semibold text-gray-100">Understand Differences</p>
              <p className="mt-1 text-xs text-gray-300">
                Scan timeline, metric matrix, and generation deltas.
              </p>
            </a>
            <a
              href="#choose-fit"
              className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 transition-colors hover:bg-violet-500/15"
            >
              <p className="mb-1 text-xs font-black uppercase tracking-widest text-violet-200">
                Path B
              </p>
              <p className="text-sm font-semibold text-gray-100">Choose Best Fit</p>
              <p className="mt-1 text-xs text-gray-300">
                Model bus-load and use-case recommendations for your scenario.
              </p>
            </a>
          </div>
        </header>

        <GenerationCompareDock
          primary={primary}
          compare={compare}
          sideBySide={sideBySide}
          onPrimaryChange={setPrimary}
          onCompareChange={setCompare}
          onToggleSideBySide={setSideBySide}
          onSwap={swapGenerations}
        />

        <EvolutionTimeline primary={primary} />

        <QuickMetricsStrip spec={primarySpec} />

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article
            className={cn(
              'rounded-3xl border p-6',
              primarySpec.accentBorderClass,
              primarySpec.accentSurfaceClass
            )}
          >
            <p className={cn('mb-2 text-xs font-black uppercase tracking-[0.2em]', primarySpec.accentTextClass)}>
              Primary Focus
            </p>
            <h2 className="mb-2 text-2xl font-black text-white">{primarySpec.title}</h2>
            <p className="mb-4 text-sm text-gray-300">{primarySpec.summary}</p>
            <ul className="space-y-2">
              {primarySpec.keyCapabilities.map((item) => (
                <li key={item} className="text-sm text-gray-200">
                  - {item}
                </li>
              ))}
            </ul>
          </article>

          <article
            className={cn(
              'rounded-3xl border p-6',
              compareSpec.accentBorderClass,
              compareSpec.accentSurfaceClass
            )}
          >
            <p className={cn('mb-2 text-xs font-black uppercase tracking-[0.2em]', compareSpec.accentTextClass)}>
              Compare Target
            </p>
            <h2 className="mb-2 text-2xl font-black text-white">{compareSpec.title}</h2>
            <p className="mb-4 text-sm text-gray-300">{compareSpec.summary}</p>
            <ul className="space-y-2">
              {compareSpec.keyCapabilities.map((item) => (
                <li key={item} className="text-sm text-gray-200">
                  - {item}
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={14} className={primarySpec.accentTextClass} />
            <h2 className="text-base font-black uppercase tracking-widest text-white">
              What changes from previous generation
            </h2>
          </div>
          <ul className="space-y-2">
            {primarySpec.changesFromPrevious.map((item) => (
              <li key={item} className="text-sm text-gray-300">
                - {item}
              </li>
            ))}
          </ul>
        </section>

        <div id="compare-matrix">
          <CompareMatrix primary={primarySpec} compare={compareSpec} sideBySide={sideBySide} />
        </div>

        <div id="choose-fit" className="space-y-6">
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
          <UseCaseRecommender payloadBytes={payloadBytes} updateHz={updateHz} />
        </div>

        <MigrationChecklist primary={primary} />

        <section className="rounded-3xl border border-amber-300/20 bg-amber-500/5 p-6">
          <h2 className="mb-2 text-base font-black uppercase tracking-widest text-amber-200">
            Reality check
          </h2>
          <p className="text-sm text-gray-300">
            Deployment choices are not purely technical: tooling maturity, ECU fleet age, validation
            capacity, and supplier readiness often dominate generation decisions. Treat recommendations
            as guidance, then validate on your target network.
          </p>
        </section>

        <section className="flex justify-center pb-8 pt-3">
          <button
            type="button"
            onClick={() => navigate('/inspector')}
            className="group inline-flex items-center gap-3 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-7 py-4 text-sm font-black uppercase tracking-[0.15em] text-cyan-100 transition-all duration-200 hover:bg-cyan-500/20"
          >
            Next Lab: Bit-Level Inspector
            <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </section>
      </Container>
    </div>
  );
}

