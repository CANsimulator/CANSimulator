import { CANFrameBuilder } from '../components/can/CANFrameBuilder';
import { CANBusMonitor } from '../components/can/CANBusMonitor';
import { BorderBeam } from '../components/ui/BorderBeam';
import { PowerSupplyDashboard } from '../components/power/PowerSupplyDashboard';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords, ChevronRight } from 'lucide-react';

export default function SimulatorPage() {
    return (
        <div className="max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8">
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
                                    <span className="text-gray-600 dark:text-gray-400 font-bold">{n.label}</span>
                                    <span className="text-cyber-green font-mono font-black">{n.id}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 space-y-6">
                    <CANBusMonitor />
                    
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.01 }}
                        className="glass-panel p-6 border-cyber-purple/30 bg-cyber-purple/5 group relative overflow-hidden cursor-pointer"
                    >
                        <Link to="/arbitration" className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-cyber-purple/20 flex items-center justify-center text-cyber-purple text-2xl animate-pulse">
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
