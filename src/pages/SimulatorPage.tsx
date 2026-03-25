import { CANFrameBuilder } from '../components/can/CANFrameBuilder';
import { CANBusMonitor } from '../components/can/CANBusMonitor';
import { BorderBeam } from '../components/ui/BorderBeam';
import { PowerSupplyDashboard } from '../components/power/PowerSupplyDashboard';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords, ChevronRight } from 'lucide-react';
import { UDSConsole } from '../components/can/UDSConsole';

export default function SimulatorPage() {
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
                                { label: 'Engine ECU (ECM)', id: '0x7E0 / 0x7E8', status: 'Online' },
                                { label: 'Brake ECU (ABS)', id: '0x7E1 / 0x7E9', status: 'Online' },
                                { label: 'Diagnostic Tester', id: '0x7DF / Functional', status: 'Host' },
                            ].map(n => (
                                <div key={n.id} className="flex items-center justify-between text-xs">
                                    <div className="flex flex-col">
                                        <span className="text-gray-600 dark:text-gray-400 font-bold">{n.label}</span>
                                        <span className="text-[11px] text-gray-400 dark:text-gray-600 font-mono italic">{n.id}</span>
                                    </div>
                                    <span className="text-cyber-green font-mono font-black animate-pulse">{n.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Traces / Console */}
                <div className="lg:col-span-8 space-y-6">
                    <CANBusMonitor />
                    
                    {/* UDS Console Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 ml-1">
                            <div className="w-1.5 h-6 bg-cyber-blue rounded-full shadow-[0_0_8px_#00f3ff]" />
                            <h2 className="text-lg font-black text-white uppercase tracking-tighter">Diagnostics & Timings</h2>
                        </div>
                        <UDSConsole />
                    </div>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.005 }}
                        className="glass-panel p-6 border-cyber-purple/30 bg-cyber-purple/5 group relative overflow-hidden cursor-pointer"
                    >
                        <Link to="/arbitration" className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-cyber-purple/20 flex items-center justify-center text-cyber-purple text-2xl animate-pulse shadow-[0_0_15px_rgba(191,0,255,0.2)]">
                                    <Swords size={24} aria-hidden="true" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-cyber-purple uppercase tracking-tight">Arbitration Arena</h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 font-bold">See CAN bus arbitration in action bit-by-bit</p>
                                </div>
                            </div>
                            <div className="text-cyber-purple group-hover:translate-x-1 transition-transform">
                                <ChevronRight size={20} />
                            </div>
                        </Link>
                        <BorderBeam duration={5} size={150} colorFrom="#bf00ff" colorTo="#00f3ff" className="opacity-40" />
                    </motion.div>
                </div>
            </section>

            {/* Power Supply System - Moved to bottom */}
            <PowerSupplyDashboard />
        </div>
    );
}
