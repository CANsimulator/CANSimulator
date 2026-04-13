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
    const baseStyles = "relative px-6 py-3 rounded-xl font-[Space_Grotesk] tracking-widest transition-all duration-300 overflow-hidden flex items-center justify-center gap-2 border-[0.5px] border-transparent";

    const variants = {
        primary: "bg-gradient-to-br from-[#006876] to-[#00bcd4] text-[#ffffff] font-bold",
        secondary: "bg-[#6f48b2] text-[#ffffff] font-bold",
        success: "bg-gradient-to-br from-[#006876] to-[#00bcd4] text-[#ffffff] font-bold", // Clinical doesn't distinct success, we'll map to primary
        outline: "bg-transparent text-[#3c494c] border-[#bbc9cc]/15 font-bold hover:bg-[#edeeef]",
        ghost: "bg-transparent text-[#3c494c] hover:bg-[#edeeef] border-transparent font-medium",
        active: "bg-[#e1e3e4] text-[#191c1d] border-[#bbc9cc]/15"
    };

    const isDisabled = disabled || isLoading;

    return (
        <motion.button
            whileHover={!isDisabled ? { scale: 1.02 } : {}}
            whileTap={!isDisabled ? { scale: 0.98 } : {}}
            className={cn(baseStyles, variants[variant], isDisabled && "opacity-50 cursor-not-allowed", className)}
            disabled={isDisabled}
            {...props}
        >
            {shimmer && !isDisabled && (
                <span className="absolute inset-x-0 bottom-0 h-[2px] bg-current opacity-30 transform -translate-x-[100%] animate-shimmer" />
            )}

            {!isDisabled && variant !== 'ghost' && variant !== 'outline' && (
                <span className="absolute inset-0 bg-current opacity-0 hover:opacity-[0.05] transition-opacity duration-500" />
            )}

            <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                ) : children}
            </span>
        </motion.button>
    );
};
