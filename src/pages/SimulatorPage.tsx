import { CANFrameBuilder } from '../components/can/CANFrameBuilder';
import { CANBusMonitor } from '../components/can/CANBusMonitor';
import { PowerSupplyDashboard } from '../components/power/PowerSupplyDashboard';
import { Save, Download } from 'lucide-react';
import { UDSConsole } from '../components/can/UDSConsole';
import { useTestBench } from '../context/TestBenchContext';
import { usePower } from '../context/PowerContext';

type NodeStatus = 'Online' | 'Offline' | 'Fault' | 'Host';

export default function SimulatorPage() {
    const bench = useTestBench();
    const power = usePower();

    function getNodeStatus(): NodeStatus {
        if (power.faultState !== 'NONE') return 'Fault';
        if (!bench.transceiverActive || power.powerState === 'OFF') return 'Offline';
        return 'Online';
    }

    const busNodeStatus = getNodeStatus();

    return (
        <div className="max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8">
            {/* Main Grid */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: controls */}
                <div className="lg:col-span-4 space-y-6">
                    <CANFrameBuilder />
                    <div className="glass-panel p-6 bg-cyber-blue/5 border-cyber-blue/20">
                        <h4 className="text-xs font-bold text-cyber-blue uppercase mb-4 tracking-widest">Connected Nodes (Simulated)</h4>
                        <div className="space-y-3">
                            {[
                                { label: 'Engine ECU (ECM)', id: '0x7E0 / 0x7E8', status: busNodeStatus },
                                { label: 'Brake ECU (ABS)', id: '0x7E1 / 0x7E9', status: busNodeStatus },
                                { label: 'Diagnostic Tester', id: '0x7DF / Functional', status: 'Host' as NodeStatus },
                            ].map(n => {
                                const statusColor = 
                                    n.status === 'Online' ? 'text-cyber-green' :
                                    n.status === 'Fault' ? 'text-red-400' :
                                    n.status === 'Host' ? 'text-cyber-blue' :
                                    'text-gray-500';

                                return (
                                    <div key={n.id} className="flex items-center justify-between text-xs">
                                        <div className="flex flex-col">
                                            <span className="text-gray-600 dark:text-gray-400 font-bold">{n.label}</span>
                                            <span className="text-[11px] text-gray-400 dark:text-gray-600 font-mono italic">{n.id}</span>
                                        </div>
                                        <span className={`font-mono font-black ${statusColor} ${n.status === 'Online' ? 'animate-pulse' : ''}`}>
                                            {n.status}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right: Traces / Console */}
                <div className="lg:col-span-8 space-y-6">
                    <CANBusMonitor />
                    
                    {/* UDS Console Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between ml-1">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-cyber-blue rounded-full shadow-[0_0_8px_#00f3ff]" />
                                <h2 className="text-lg font-black text-white uppercase tracking-tighter">Diagnostics & Timings</h2>
                            </div>
                            <div className="flex gap-2">
                                <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold tracking-widest uppercase rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5">
                                    <Download size={14} />
                                    Export Logs
                                </button>
                                <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold tracking-widest uppercase rounded bg-cyber-blue/10 hover:bg-cyber-blue/20 text-cyber-blue transition-colors border border-cyber-blue/30">
                                    <Save size={14} />
                                    Save Workspace
                                </button>
                            </div>
                        </div>
                        <UDSConsole />
                    </div>
                </div>
            </section>

            {/* Power Supply System - Moved to bottom */}
            <PowerSupplyDashboard />
        </div>
    );
}
