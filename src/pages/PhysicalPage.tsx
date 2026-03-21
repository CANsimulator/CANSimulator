import React from 'react';
import { BitTimingConfig } from '../components/can/BitTimingConfig';
import { BusTopology } from '../components/can/BusTopology';
import { VoltageScope } from '../components/can/VoltageScope';
import { FaultScenarioPanel } from '../components/physical/FaultScenarioPanel';
import { PowerSupplyDashboard } from '../components/power/PowerSupplyDashboard';
import { TestBenchProvider, useTestBench } from '../context/TestBenchContext';

const PhysicalPageInner: React.FC = () => {
    const bench = useTestBench();
    const baudLabel = bench
        ? bench.baudRate >= 1_000_000
            ? `${bench.baudRate / 1_000_000} Mbit/s`
            : `${bench.baudRate / 1_000} kbit/s`
        : '500 kbit/s';
    const nodesLabel = bench ? `${bench.onlineNodeCount} Nodes · Interactive` : '8 Nodes · Interactive';
    const benchStatus = !bench
        ? { label: 'Nominal Bench', tone: 'ready' as const }
        : !bench.transceiverActive
            ? { label: 'XCVR Offline', tone: 'fail' as const }
            : bench.faultState !== 'NONE' || !bench.terminationOk || bench.signalDegradation > 0.18 || bench.supplyVoltage < 9
                ? { label: 'Bench Warning', tone: 'warn' as const }
                : { label: 'Nominal Bench', tone: 'ready' as const };
    const statusAccent = benchStatus.tone === 'ready'
        ? 'bg-green-500 shadow-[0_0_4px_#22c55e]'
        : benchStatus.tone === 'warn'
            ? 'bg-amber-500 shadow-[0_0_4px_#f59e0b]'
            : 'bg-red-500 shadow-[0_0_4px_#ef4444] animate-pulse';

    return (
        <div className="container mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:px-4 sm:py-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="mb-1 font-mono text-2xl font-black uppercase leading-none tracking-tight text-dark-950 dark:text-[#f1f1f1] sm:text-3xl transition-colors">
                        TEST BENCH
                    </h1>
                    <p className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-light-600 dark:text-[#f1f1f1] transition-colors">
                        CAN Physical Layer Analysis · ISO 11898-2 · Signal Integrity &amp; Power
                    </p>
                </div>
                <div className="hidden items-center gap-3 rounded-lg border border-black/10 dark:border-[#2a2a30] bg-gray-50 dark:bg-[#1a1a1e] px-3 py-1.5 sm:flex transition-colors">
                    <div className={`h-1.5 w-1.5 rounded-full ${statusAccent}`} />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-light-600 dark:text-[#f1f1f1]">
                        {benchStatus.label}
                    </span>
                </div>
            </div>

            <section>
                <RackLabel number={1} name="Differential Voltage Oscilloscope" badge={baudLabel} />
                <VoltageScope />
            </section>

            <section>
                <RackLabel number={1.5} name="Fault Scenario Injector" badge="MASTER CTRL" />
                <FaultScenarioPanel />
            </section>

            <section>
                <RackLabel number={2} name="Bus Wiring Harness" badge={nodesLabel} />
                <BusTopology />
            </section>

            <section>
                <RackLabel number={3} name="Lab Power Supply" badge="PPS-3005" />
                <PowerSupplyDashboard />
            </section>

            <section>
                <RackLabel number={4} name="CAN Controller - Bit Timing Registers" badge="MCP2515" />
                <BitTimingConfig />
            </section>
        </div>
    );
};

const PhysicalPage: React.FC = () => (
    <TestBenchProvider>
        <PhysicalPageInner />
    </TestBenchProvider>
);

const RackLabel: React.FC<{ number: number; name: string; badge?: string }> = ({ number, name, badge }) => (
    <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="rounded border border-black/10 dark:border-[#222] bg-gray-200 dark:bg-[#111] px-2 py-0.5 text-[11px] font-mono font-black text-dark-950 dark:text-[#f1f1f1] transition-colors">
            {number}U
        </span>
        <span className="text-[12px] font-mono font-black uppercase tracking-widest text-dark-950 dark:text-[#f1f1f1] transition-colors">{name}</span>
        {badge && (
            <span className="rounded border border-black/10 dark:border-[#1a1a20] bg-gray-100 dark:bg-[#111] px-1.5 py-0.5 text-[10px] font-mono text-light-600 dark:text-[#f1f1f1] transition-colors">
                {badge}
            </span>
        )}
    </div>
);

export default PhysicalPage;
