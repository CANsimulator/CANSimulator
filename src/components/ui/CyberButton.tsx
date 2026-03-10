import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

interface CyberButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
    children?: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'outline' | 'ghost' | 'active';
    isLoading?: boolean;
    shimmer?: boolean;
}

export const CyberButton: React.FC<CyberButtonProps> = ({
    children,
    className,
    variant = 'primary',
    isLoading = false,
    shimmer = true,
    disabled,
    ...props
}) => {
    const baseStyles = "relative px-6 py-3 rounded-lg font-bold transition-all duration-300 overflow-hidden flex items-center justify-center gap-2";

    const variants = {
        primary: "bg-dark-900 border border-cyber-blue/50 text-cyber-blue hover:text-white hover:bg-cyber-blue/20 shadow-neon/20 hover:shadow-neon",
        secondary: "bg-dark-900 border border-cyber-purple/50 text-cyber-purple hover:text-white hover:bg-cyber-purple/20 shadow-neon-purple/20 hover:shadow-neon-purple",
        success: "bg-dark-900 border border-cyber-green/50 text-cyber-green hover:text-dark-950 hover:bg-cyber-green shadow-neon-green/20 hover:shadow-neon-green",
        outline: "bg-transparent border border-white/20 text-white hover:border-white/40 hover:bg-white/5",
        ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-white/5 border-transparent",
        active: "bg-gradient-to-r from-cyber-blue to-cyber-purple text-white shadow-neon border-none"
    };

    const isDisabled = disabled || isLoading;

    return (
        <motion.button
            whileHover={!isDisabled ? { scale: 1.02, y: -2 } : {}}
            whileTap={!isDisabled ? { scale: 0.98 } : {}}
            className={cn(baseStyles, variants[variant], isDisabled && "opacity-50 cursor-not-allowed", className)}
            disabled={isDisabled}
            {...props}
        >
            {shimmer && !isDisabled && (
                <span className="absolute inset-0 -translate-x-[100%] bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer opacity-30 pointer-events-none" />
            )}

            {!isDisabled && variant !== 'ghost' && variant !== 'outline' && (
                <span className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-current to-transparent filter blur-xl" />
            )}

            <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                ) : children}
            </span>
        </motion.button>
    );
};
