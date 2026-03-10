import { CANFrameBuilder } from '../components/can/CANFrameBuilder';
import { CANBusMonitor } from '../components/can/CANBusMonitor';
import { ArbitrationVisualizer } from '../components/can/ArbitrationVisualizer';
import { BorderBeam } from '../components/ui/BorderBeam';
import { PowerSupplyDashboard } from '../components/power/PowerSupplyDashboard';

export default function SimulatorPage() {
    return (
        <div className="max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8">
            {/* Status Bar */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 flex items-center gap-4 group relative overflow-hidden">
                    <div className="w-12 h-12 rounded-lg bg-cyber-blue/10 flex items-center justify-center text-cyber-blue text-2xl">📟</div>
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase font-mono">Baud Rate</p>
                        <p className="text-lg font-bold">500 Kbps</p>
                    </div>
                    <BorderBeam duration={3} size={100} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="glass-panel p-4 flex items-center gap-4 group relative overflow-hidden">
                    <div className="w-12 h-12 rounded-lg bg-cyber-purple/10 flex items-center justify-center text-cyber-purple text-2xl">🚀</div>
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase font-mono">CAN FD Mode</p>
                        <p className="text-lg font-bold">Enabled (2 Mbps)</p>
                    </div>
                    <BorderBeam duration={4} size={100} className="opacity-0 group-hover:opacity-100 transition-opacity" colorFrom="#bd00ff" colorTo="#ff0099" />
                </div>
                <div className="glass-panel p-4 flex items-center gap-4 group relative overflow-hidden">
                    <div className="w-12 h-12 rounded-lg bg-cyber-green/10 flex items-center justify-center text-cyber-green text-xl">⚡</div>
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase font-mono">Bus Status</p>
                        <p className="text-lg font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyber-green shadow-glow animate-pulse inline-block" />
                            Online
                        </p>
                    </div>
                </div>
            </section>

            {/* Main Grid */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: controls */}
                <div className="lg:col-span-4 space-y-6">
                    <CANFrameBuilder />
                    <div className="glass-panel p-6 bg-cyber-blue/5 border-cyber-blue/20">
                        <h4 className="text-xs font-bold text-cyber-blue uppercase mb-4 tracking-widest">Active Nodes</h4>
                        <div className="space-y-3">
                            {[
                                { label: 'Engine ECU (ECM)', id: '0x7E8' },
                                { label: 'Brake ECU (ABS)', id: '0x7E9' },
                                { label: 'Diag Gateway', id: '0x7DF' },
                            ].map(n => (
                                <div key={n.id} className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400">{n.label}</span>
                                    <span className="text-cyber-green font-mono">{n.id}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 space-y-6">
                    <CANBusMonitor />
                    <ArbitrationVisualizer />
                </div>
            </section>

            {/* Power Supply System - Moved to bottom */}
            <PowerSupplyDashboard />
        </div>
    );
}
