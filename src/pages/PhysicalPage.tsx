import React from 'react';
import { BitTimingConfig } from '../components/can/BitTimingConfig';
import BusTopology from '../components/can/BusTopology';
import { VoltageScope } from '../components/can/VoltageScope';
import { FaultScenarioPanel } from '../components/physical/FaultScenarioPanel';
import { PowerSupplyDashboard } from '../components/power/PowerSupplyDashboard';
import { useTestBench } from '../context/TestBenchContext';

import { LazyMount } from '../components/ui/LazyMount';

const PhysicalPageInner: React.FC = () => {
    const bench = useTestBench();

    React.useEffect(() => {
        document.title = "CAN Physical Layer | UDS Simulator";
        const meta = document.querySelector('meta[name="description"]');
        if (meta) {
            meta.setAttribute("content", "Simulate CAN Bus Physical Layer characteristics, termination, and fault scenarios in a high-fidelity cyber-environment.");
        }
    }, []);

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
        <div className="relative w-full max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-12 py-8 overflow-hidden">
            {/* ── Vertical Rack Rail (Issue #219) ── */}
            <div className="absolute left-6 lg:left-12 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-black/10 dark:via-white/10 to-transparent hidden sm:block">
                <div className="absolute inset-0 flex flex-col justify-around py-48 opacity-30 select-none">
                    {[...Array(25)].map((_, i) => (
                        <div key={i} className="w-[5px] h-[5px] rounded-sm bg-black dark:bg-white -ml-[2px] shadow-sm transform rotate-45 border border-black/20 dark:border-white/20" />
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-16 sm:gap-24 lg:pl-16">
                {/* ── Main Dashboard Header ── */}
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-2">
                    <div>
                        <h1 className="mb-1 font-sans text-3xl font-black uppercase leading-none tracking-widest text-dark-950 dark:text-white sm:text-4xl transition-colors">
                            TEST BENCH
                        </h1>
                        <p className="text-xs sm:text-sm font-mono font-bold uppercase tracking-[0.2em] text-light-600 dark:text-[#f1f1f1] transition-colors">
                            CAN Physical Layer Analysis · ISO 11898-2 · Signal Integrity &amp; Power
                        </p>
                        
                        {/* Jump Links Navigation (Issue 257) */}
                        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Section shortcuts">
                            {[
                                { id: 'power-supply', label: 'Power Supply' },
                                { id: 'bit-timing', label: 'Bit Timing' },
                                { id: 'transceiver', label: 'Transceiver' }
                            ].map(({ id, label }) => (
                                <a
                                    key={id}
                                    href={`#${id}`}
                                    className="flex-shrink-0 px-3 py-1 rounded border border-black/10 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-all focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    {label}
                                </a>
                            ))}
                        </nav>
                    </div>
                    <div className="flex items-center gap-1.5 xs:gap-3 rounded-lg border border-black/10 dark:border-[#2a2a30] bg-gray-50 dark:bg-[#1a1a1e] px-2 xs:px-3 py-1.5 transition-colors">
                        <div className={`h-1.5 w-1.5 rounded-full ${statusAccent}`} />
                        <span className="text-[11px] font-mono uppercase tracking-wider text-light-600 dark:text-[#f1f1f1] truncate max-w-[100px] xs:max-w-none">
                            {benchStatus.label}
                        </span>
                    </div>
                </header>

                <section id="transceiver" className="px-2 scroll-mt-24">
                    <RackLabel number={1} name="Differential Voltage Oscilloscope" badge={baudLabel} />
                    <VoltageScope />
                </section>

                <section className="px-2">
                    <RackLabel number={1.5} name="Fault Scenario Injector" badge="MASTER CTRL" />
                    <FaultScenarioPanel />
                </section>

                <section className="px-2">
                    <RackLabel number={2} name="Bus Wiring Harness" badge={nodesLabel} />
                    <LazyMount minHeight={500}>
                        <BusTopology />
                    </LazyMount>
                </section>

                <section id="power-supply" className="px-2 scroll-mt-24">
                    <RackLabel number={3} name="Lab Power Supply" badge="PPS-3005" />
                    <LazyMount minHeight={400}>
                        <PowerSupplyDashboard />
                    </LazyMount>
                </section>

                <section id="bit-timing" className="px-2 scroll-mt-24">
                    <RackLabel number={4} name="CAN Controller - Bit Timing Registers" badge="MCP2515" />
                    <LazyMount minHeight={600}>
                        <BitTimingConfig />
                    </LazyMount>
                </section>
            </div>
        </div>
    );
};

const PhysicalPage: React.FC = () => (
    <PhysicalPageInner />
);

const RackLabel: React.FC<{ number: number; name: string; badge?: string }> = ({ number, name, badge }) => (
    <div className="mb-5 flex flex-wrap items-center gap-2 sm:gap-3 relative border-b border-black/8 dark:border-white/6 pb-3">
        {/* Structural Connector */}
        <div className="absolute -left-10 lg:-left-16 w-8 lg:w-12 h-[2px] bg-black/8 dark:bg-white/8 hidden sm:block top-1/2 -translate-y-1/2" />

        <span className="rounded-md border border-black/15 dark:border-[#2a2a32] bg-gray-200/80 dark:bg-[#131318] px-2.5 py-1 text-xs sm:text-sm font-mono font-black text-dark-950 dark:text-[#c8c8d8] transition-colors shadow-sm tabular-nums">
            {number}U
        </span>
        <span className="text-sm sm:text-base font-sans font-black uppercase tracking-[0.12em] text-dark-950 dark:text-[#e8e8f0] transition-colors">{name}</span>
        {badge && (
            <span className="rounded border border-black/10 dark:border-[#222230] bg-gray-100 dark:bg-[#0e0e14] px-2 py-0.5 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wide text-light-500 dark:text-gray-500 transition-colors">
                {badge}
            </span>
        )}
    </div>
);

export default PhysicalPage;
