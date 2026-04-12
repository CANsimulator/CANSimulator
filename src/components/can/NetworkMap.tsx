import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Laptop, HardDrive, Share2, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Node {
    id: string;
    label: string;
    icon: LucideIcon;
    color: string;
    subject: string;
}

interface NetworkMapProps {
    onNodeSelect: (subject: string) => void;
    activeSubject: string;
}

const NODES: Node[] = [
    { id: 'ecu1', label: 'Engine Control (ECU 1)', icon: Cpu, color: 'cyber-blue', subject: 'ECU 1 Fault Report' },
    { id: 'ecu2', label: 'Body Control (ECU 2)', icon: HardDrive, color: 'cyber-purple', subject: 'ECU 2 Logic Question' },
    { id: 'gateway', label: 'Gateway Node', icon: Share2, color: 'cyber-emerald', subject: 'Central Gateway Integration' },
    { id: 'tester', label: 'OBD Tester', icon: Laptop, color: 'cyber-pink', subject: 'DTC Tester Tooling' },
];

export const NetworkMap: React.FC<NetworkMapProps> = ({ onNodeSelect, activeSubject }) => {
    return (
        <div className="relative p-12 bg-dark-950/50 rounded-[3rem] border border-white/5 overflow-hidden">
            {/* Background bus line */}
            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gray-600/30 to-transparent -translate-y-1/2" />
            
            <div className="relative z-10 flex items-center justify-between gap-4">
                {NODES.map((node) => {
                    const isActive = activeSubject === node.subject;
                    const Icon = node.icon;
                    return (
                        <div key={node.id} className="flex flex-col items-center gap-6">
                            <motion.button
                                whileHover={{ scale: 1.1, y: -5 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onNodeSelect(node.subject)}
                                className={cn(
                                    "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 relative",
                                    isActive 
                                        ? "bg-dark-900 border-cyber-blue shadow-[0_0_30px_rgba(0,243,255,0.2)]"
                                        : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20 hover:text-white"
                                )}
                            >
                                <Icon size={32} className={cn("transition-colors duration-500", isActive ? "text-cyber-blue" : "")} />
                                
                                {/* Connection line type vertical */}
                                <div className={cn(
                                    "absolute top-full left-1/2 -translate-x-1/2 w-[2px] h-6 bg-gradient-to-b transition-opacity",
                                    isActive ? "opacity-100 from-cyber-blue to-transparent" : "opacity-30 from-gray-600 to-transparent"
                                )} 
                                />
                            </motion.button>
                            
                            <div className="text-center">
                                <p className={cn(
                                    "text-[10px] font-black uppercase tracking-widest transition-colors",
                                    isActive ? "text-cyber-blue" : "text-gray-500"
                                )}>
                                    {node.label}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Hint */}
            <div className="mt-12 text-center">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest italic animate-pulse">
                    Select a node to context-link your message
                </p>
            </div>
        </div>
    );
};
