import { useTestBench } from '../../context/TestBenchContext';
import { usePower } from '../../context/PowerContext';
import { BorderBeam } from '../ui/BorderBeam';
import { Gauge, Rocket, Zap, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../context/ThemeContext';

interface StatusItemProps {
    label: string;
    value: string;
    icon: React.ElementType;
    colorClass: string;
    animate?: boolean;
    beamColor?: string;
    indicatorColor?: string;
}

function StatusItem({ label, value, icon: Icon, colorClass, animate, beamColor, indicatorColor }: StatusItemProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div className={cn(
            "glass-panel p-3 px-4 flex items-center gap-4 group relative overflow-hidden transition-all duration-300",
            isDark ? "hover:bg-white/5" : "hover:bg-black/5 shadow-sm"
        )}>
            <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-colors",
                colorClass
            )}>
                <Icon size={20} aria-hidden="true" />
            </div>
            <div>
                <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-mono tracking-wider">{label}</p>
                <p className="text-sm font-black flex items-center gap-2">
                    {indicatorColor && (
                        <span className={cn(
                            "w-2 h-2 rounded-full inline-block",
                            indicatorColor,
                            animate && "animate-pulse shadow-glow"
                        )} />
                    )}
                    {value}
                </p>
            </div>
            {animate && beamColor && (
                <BorderBeam 
                    duration={4} 
                    size={80} 
                    className="opacity-0 group-hover:opacity-100 transition-opacity" 
                    colorFrom={beamColor} 
                />
            )}
        </div>
    );
}

export function SimulatorStatusBar({ className }: { className?: string }) {
    const bench = useTestBench();
    const power = usePower();

    const formatBaud = (baud: number) => {
        if (baud >= 1000000) return `${(baud / 1000000).toFixed(1)} Mbps`;
        return `${(baud / 1000).toFixed(0)} Kbps`;
    };

    const isOnline = bench.transceiverActive && power.powerState !== 'OFF' && power.faultState === 'NONE';
    const isError = power.faultState !== 'NONE';

    return (
        <section className={cn("grid grid-cols-1 md:grid-cols-3 gap-3", className)}>
            <StatusItem 
                label="Baud Rate" 
                value={formatBaud(bench.baudRate)}
                icon={Gauge}
                colorClass="bg-cyber-blue/10 text-cyber-blue"
                animate={isOnline}
                beamColor="#00f3ff"
            />
            <StatusItem 
                label="CAN FD Mode" 
                value="Enabled (Data: 2 Mbps)"
                icon={Rocket}
                colorClass="bg-cyber-purple/10 text-cyber-purple"
                animate={isOnline}
                beamColor="#bd00ff"
            />
            <StatusItem 
                label="Bus Status" 
                value={isError ? `Error: ${power.faultState.replace('_', ' ')}` : (isOnline ? 'Online' : 'Standby')}
                icon={isError ? AlertCircle : Zap}
                colorClass={isError ? "bg-red-500/10 text-red-500" : (isOnline ? "bg-cyber-green/10 text-cyber-green" : "bg-gray-500/10 text-gray-500")}
                animate={isOnline}
                indicatorColor={isError ? "bg-red-500" : (isOnline ? "bg-cyber-green" : "bg-gray-500")}
            />
        </section>
    );
}
