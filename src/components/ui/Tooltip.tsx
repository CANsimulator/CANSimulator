import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import React from 'react';
import { cn } from '../../utils/cn';

interface TooltipProps {
    children: React.ReactNode;
    content: React.ReactNode;
    className?: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    delayDuration?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({ 
    children, 
    content, 
    className, 
    side = 'top',
    delayDuration = 200
}) => {
    return (
        <TooltipPrimitive.Provider>
            <TooltipPrimitive.Root delayDuration={delayDuration}>
                <TooltipPrimitive.Trigger asChild>
                    {children}
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                        side={side}
                        sideOffset={5}
                        className={cn(
                            "z-[100] px-3 py-1.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-widest",
                            "bg-white/95 dark:bg-[#0a0a0f]/95 backdrop-blur-md",
                            "border border-black/10 dark:border-[#00f3ff40]",
                            "text-dark-950 dark:text-[#00f3ff] shadow-xl dark:shadow-neon/10",
                            "transition-colors duration-300",
                            className
                        )}
                        asChild
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: side === 'bottom' ? -4 : 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: side === 'bottom' ? -4 : 4 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                        >
                            {content}
                            <TooltipPrimitive.Arrow className="fill-black/10 dark:fill-[#00f3ff40]" />
                        </motion.div>
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    );
};
