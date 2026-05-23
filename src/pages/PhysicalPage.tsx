import React from 'react';
import { BitTimingConfig } from '../components/can/BitTimingConfig';
import BusTopology from '../components/can/BusTopology';
import { VoltageScope } from '../components/can/VoltageScope';
import { FaultScenarioPanel } from '../components/physical/FaultScenarioPanel';
import { PowerSupplyDashboard } from '../components/power/PowerSupplyDashboard';
import { useTestBench } from '../context/TestBenchContext';

import { LazyMount } from '../components/ui/LazyMount';
import { LabNavigation } from '../components/ui/LabNavigation';

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
        ? 'bg-[var(--ok)] shadow-[0_0_8px_var(--ok)]'
        : benchStatus.tone === 'warn'
            ? 'bg-[var(--warn)] shadow-[0_0_8px_var(--warn)]'
            : 'bg-[var(--danger)] shadow-[0_0_8px_var(--danger)] animate-pulse';

    return (
        <div className="relative w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 py-8 overflow-x-hidden bg-[var(--bg)] min-h-screen">
            {/* ── Vertical Rack Rail ── */}
            <div className="absolute left-6 lg:left-12 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[var(--stroke)] to-transparent hidden sm:block" aria-hidden="true">
                <div className="absolute inset-0 flex flex-col justify-around py-48 opacity-30 select-none">
                    {[...Array(25)].map((_, i) => (
                        <div key={i} className="w-[5px] h-[5px] rounded-sm bg-[var(--ink-faint)] -ml-[2px] shadow-sm transform rotate-45 border border-[var(--stroke)]" />
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-16 sm:gap-24 lg:pl-16">
                {/* ── Main Dashboard Header ── */}
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-2">
                    <div>
                        <h1 className="mb-1 font-sans text-3xl font-black uppercase leading-none tracking-widest text-[var(--ink)] sm:text-4xl transition-colors">
                            TEST BENCH
                        </h1>
                        <p className="text-xs sm:text-sm font-mono font-bold uppercase tracking-[0.2em] text-[var(--ink-dim)] transition-colors">
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
                                    className="flex-shrink-0 px-3 py-1 rounded border border-[var(--stroke)] bg-[var(--bg-2)] text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--ink-dim)] hover:text-[var(--accent)] hover:bg-[var(--bg-3)] transition-all focus:outline-none focus-ring-cyber"
                                >
                                    {label}
                                </a>
                            ))}
                        </nav>
                    </div>
                    <div className="flex items-center gap-1.5 xs:gap-3 rounded-lg border border-[var(--stroke)] bg-[var(--bg-2)] px-2 xs:px-3 py-1.5 transition-colors" role="status" aria-live="polite">
                        <div className={`h-1.5 w-1.5 rounded-full ${statusAccent}`} aria-hidden="true" />
                        <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--ink-dim)] truncate max-w-[100px] xs:max-w-none">
                            <span className="sr-only">Bench Status: </span>
                            {benchStatus.label}
                        </span>
                    </div>
                </header>

                <section id="transceiver" className="px-2 scroll-mt-24" role="region" aria-labelledby="rack-1">
                    <RackLabel id="rack-1" number={1} name="Differential Voltage Oscilloscope" badge={baudLabel} />
                    <VoltageScope />
                </section>

                <section className="px-2" role="region" aria-labelledby="rack-1-5">
                    <RackLabel id="rack-1-5" number={1.5} name="Fault Scenario Injector" badge="MASTER CTRL" />
                    <FaultScenarioPanel />
                </section>

                <section className="px-2" role="region" aria-labelledby="rack-2">
                    <RackLabel id="rack-2" number={2} name="Bus Wiring Harness" badge={nodesLabel} />
                    <LazyMount minHeight={500}>
                        <BusTopology />
                    </LazyMount>
                </section>

                <section id="power-supply" className="px-2 scroll-mt-24" role="region" aria-labelledby="rack-3">
                    <RackLabel id="rack-3" number={3} name="Lab Power Supply" badge="PPS-3005" />
                    <LazyMount minHeight={400}>
                        <PowerSupplyDashboard />
                    </LazyMount>
                </section>

                <section id="bit-timing" className="px-2 scroll-mt-24" role="region" aria-labelledby="rack-4">
                    <RackLabel id="rack-4" number={4} name="CAN Controller - Bit Timing Registers" badge="MCP2515" />
                    <LazyMount minHeight={600}>
                        <BitTimingConfig />
                    </LazyMount>
                </section>
                
                <LabNavigation />
            </div>
        </div>
    );
};

const PhysicalPage: React.FC = () => (
    <PhysicalPageInner />
);

const RackLabel: React.FC<{ id?: string; number: number; name: string; badge?: string }> = ({ id, number, name, badge }) => (
    <header className="mb-5 flex flex-wrap items-center gap-2 sm:gap-3 relative border-b border-[var(--stroke)] pb-3">
        {/* Structural Connector */}
        <div className="absolute -left-10 lg:-left-16 w-8 lg:w-12 h-[2px] bg-[var(--stroke)] hidden sm:block top-1/2 -translate-y-1/2" aria-hidden="true" />

        <span className="rounded-md border border-[var(--stroke-2)] bg-[var(--bg-2)] px-2.5 py-1 text-xs sm:text-sm font-mono font-black text-[var(--ink)] transition-colors shadow-sm tabular-nums">
            <span className="sr-only">Rack height: </span>
            {number}U
        </span>
        <h2 id={id} className="text-sm sm:text-base font-sans font-black uppercase tracking-[0.12em] text-[var(--ink)] transition-colors">
            {name}
        </h2>
        {badge && (
            <span className="rounded border border-[var(--stroke)] bg-[var(--bg-darker)] px-2 py-0.5 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wide text-[var(--ink-dim)] transition-colors">
                <span className="sr-only">Reference: </span>
                {badge}
            </span>
        )}
    </header>
);

export default PhysicalPage;
