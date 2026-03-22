import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../utils/cn';

export default function NotFoundPage() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-20">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                    "glass-panel p-10 sm:p-14 text-center max-w-lg relative overflow-hidden transition-colors duration-300",
                    isDark ? "border-cyber-blue/20" : "border-black/5"
                )}
            >
                {/* Background glow for the number */}
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-cyber-blue/10 rounded-full blur-3xl transition-opacity duration-300" />
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-cyber-purple/10 rounded-full blur-3xl transition-opacity duration-300" />

                <div className="relative z-10">
                    <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyber-blue to-cyber-purple mb-4 tracking-tighter leading-none">
                        404
                    </div>
                    
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight uppercase">
                        Protocol Out of Range
                    </h1>
                    
                    <p className="text-gray-500 dark:text-gray-400 text-base mb-10 leading-relaxed font-medium">
                        The requested URI does not match any known service or diagnostics configuration.
                    </p>
                    
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-cyber-blue to-cyber-purple text-white rounded-full hover:shadow-neon/40 hover:scale-105 active:scale-95 transition-all text-sm font-black uppercase tracking-widest leading-none"
                    >
                        <ArrowLeft size={16} aria-hidden="true" />
                        Back to Terminal
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
