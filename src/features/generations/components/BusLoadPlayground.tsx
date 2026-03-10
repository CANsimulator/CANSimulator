import { useMemo } from 'react';
import { Activity, Layers, Timer } from 'lucide-react';
import { GENERATIONS, SCENARIOS } from '../data';
import type { CompareScenario, GenerationId } from '../types';
import { estimateBusLoad } from '../utils/comparison';
import { cn } from '../../../utils/cn';

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
}: {
  generation: GenerationId;
  loadPercent: number;
  frameCount: number;
  estimatedBitsPerSecond: number;
}) {
  const spec = GENERATIONS[generation];
  const safeBar = Math.min(loadPercent, 100);

  return (
    <article className="rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className={cn('text-sm font-black uppercase tracking-wider', spec.accentTextClass)}>{spec.id}</h4>
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          {frameCount} frame(s)
        </span>
      </div>
      <p className="mb-2 text-2xl font-black text-white">{loadPercent.toFixed(2)}%</p>
      <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn('h-full rounded-full transition-all duration-200', spec.accentSoftClass)}
          style={{ width: `${safeBar}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">{estimatedBitsPerSecond.toLocaleString()} bps estimated</p>
    </article>
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
  const selectedScenario = SCENARIOS.find((item) => item.id === scenario) ?? SCENARIOS[0];

  const estimates = useMemo(() => {
    return {
      Classic: estimateBusLoad(payloadBytes, updateHz, GENERATIONS.Classic),
      FD: estimateBusLoad(payloadBytes, updateHz, GENERATIONS.FD),
      XL: estimateBusLoad(payloadBytes, updateHz, GENERATIONS.XL),
    };
  }, [payloadBytes, updateHz]);

  const cards = sideBySide ? [primary, compare] : ['Classic', 'FD', 'XL'];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black uppercase tracking-widest text-white">
            Payload and Bus-Load Playground
          </h2>
          <p className="text-xs text-gray-500">
            Choose best fit: model workload and compare estimated network load.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300">
          Scenario: {selectedScenario.shortLabel}
        </span>
      </div>

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
              'rounded-lg border px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200',
              scenario === item.id
                ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200'
                : 'border-white/10 text-gray-400 hover:text-white'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="mb-5 text-sm text-gray-400">{selectedScenario.description}</p>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              Payload size
            </label>
            <span className="text-sm font-bold text-white">{payloadBytes} bytes</span>
          </div>
          <input
            type="range"
            min={1}
            max={2048}
            value={payloadBytes}
            onChange={(e) => onPayloadBytesChange(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              Update rate
            </label>
            <span className="text-sm font-bold text-white">{updateHz} Hz</span>
          </div>
          <input
            type="range"
            min={1}
            max={200}
            value={updateHz}
            onChange={(e) => onUpdateHzChange(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {cards.map((id) => {
          const estimate = estimates[id as GenerationId];
          return (
            <LoadCard
              key={id}
              generation={id as GenerationId}
              loadPercent={estimate.loadPercent}
              frameCount={estimate.frameCount}
              estimatedBitsPerSecond={estimate.estimatedBitsPerSecond}
            />
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
            <Layers size={12} />
            Frames per message
          </p>
          <p className="text-sm text-gray-300">
            Classic: {estimates.Classic.frameCount}, FD: {estimates.FD.frameCount}, XL: {estimates.XL.frameCount}
          </p>
        </article>
        <article className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
            <Activity size={12} />
            Primary load
          </p>
          <p className="text-sm text-gray-300">{estimates[primary].loadPercent.toFixed(2)}%</p>
        </article>
        <article className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
            <Timer size={12} />
            Inter-message interval
          </p>
          <p className="text-sm text-gray-300">{(1000 / updateHz).toFixed(2)} ms</p>
        </article>
      </div>
    </section>
  );
}

