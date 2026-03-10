import React from 'react';
import { VoltageScope } from '../components/can/VoltageScope';
import { BitTimingConfig } from '../components/can/BitTimingConfig';
import { BusTopology } from '../components/can/BusTopology';
import { PowerSupplyDashboard } from '../components/power/PowerSupplyDashboard';

const PhysicalPage: React.FC = () => {
    return (
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 max-w-[1600px]">
            {/* ─── Bench Label ─── */}
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight leading-none mb-1 font-mono">
                        TEST BENCH
                    </h1>
                    <p className="text-[9px] font-mono font-bold text-gray-600 uppercase tracking-[0.2em]">
                        CAN Physical Layer Analysis &middot; ISO 11898-2 &middot; Signal Integrity &amp; Power
                    </p>
                </div>
                <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-[#1a1a1e] border border-[#2a2a30] rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_4px_#22c55e]" />
                    <span className="text-[8px] font-mono text-gray-500 uppercase tracking-wider">Equipment Ready</span>
                </div>
            </div>

            {/* ─── Rack 1: Oscilloscope (full width, star of the show) ─── */}
            <section>
                <RackLabel number={1} name="Differential Voltage Oscilloscope" badge="500 kbit/s" />
                <VoltageScope />
            </section>

            {/* ─── Rack 2: Wiring Harness + Power Supply ─── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <section>
                    <RackLabel number={2} name="Bus Wiring Harness" badge="4 Nodes" />
                    <BusTopology />
                </section>

                <section>
                    <RackLabel number={3} name="Lab Power Supply" badge="PPS-3005" />
                    <PowerSupplyDashboard />
                </section>
            </div>

            {/* ─── Rack 3: CAN Controller Bit Timing ─── */}
            <section>
                <RackLabel number={4} name="CAN Controller — Bit Timing Registers" badge="MCP2515" />
                <BitTimingConfig />
            </section>
        </div>
    );
};

// ─── Rack Unit Label ────────────────────────────────────────
const RackLabel: React.FC<{ number: number; name: string; badge?: string }> = ({ number, name, badge }) => (
    <div className="flex items-center gap-3 mb-2">
        <span className="text-[9px] font-mono font-black text-gray-700 bg-[#111] px-2 py-0.5 rounded border border-[#222]">
            {number}U
        </span>
        <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest">{name}</span>
        {badge && (
            <span className="text-[8px] font-mono text-gray-600 bg-[#111] px-1.5 py-0.5 rounded border border-[#1a1a20]">{badge}</span>
        )}
    </div>
);

export default PhysicalPage;
