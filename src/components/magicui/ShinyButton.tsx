"use client";

import React from "react";
import {
    motion,
    useReducedMotion,
    type HTMLMotionProps,
} from "framer-motion";
import { cn } from "../../utils/cn";

const animationProps = {
    initial: { "--x": "100%", scale: 1 },
    whileHover: { 
        "--x": "-100%",
        scale: 1.02,
        transition: {
            "--x": {
                repeat: Infinity,
                repeatType: "loop",
                repeatDelay: 1,
                type: "spring",
                stiffness: 20,
                damping: 15,
                mass: 2,
            }
        }
    },
    whileTap: { scale: 0.98 },
} as const;

interface ShinyButtonProps extends HTMLMotionProps<"button"> {
    children: React.ReactNode;
    className?: string;
}

const ShinyButton = React.forwardRef<HTMLButtonElement, ShinyButtonProps>(
    ({ children, className, ...props }, ref) => {
        const shouldReduceMotion = useReducedMotion();
        const animProps = shouldReduceMotion 
            ? { initial: { "--x": "0%", scale: 1 }, animate: { "--x": "0%" }, whileTap: { scale: 1 } } 
            : animationProps;

        return (
            <motion.button
                ref={ref}
                {...animProps}
                {...props}
                className={cn(
                    "relative rounded-lg px-6 py-2 font-medium backdrop-blur-xl transition-all duration-300 ease-in-out hover:shadow dark:bg-[linear-gradient(#000,#000),linear-gradient(#000_50%,rgba(0,243,255,0.6)_80%,rgba(0,243,255,0)),linear-gradient(90deg,rgba(0,243,255,0.1)_0%,rgba(255,255,255,0.15)_50%,rgba(0,243,255,0.1)_100%)] dark:[background-clip:padding-box,border-box,border-box] dark:[background-origin:border-box] dark:[border:1px_solid_transparent] dark:hover:shadow-[0_0_20px_rgba(0,243,255,0.2)]",
                    "bg-white/95 border border-gray-200/50 hover:border-cyber-blue/30 shadow-sm hover:shadow-[0_0_20px_rgba(0,243,255,0.1)]",
                    className,
                )}
            >
                <span
                    className="relative flex items-center justify-center h-full w-full text-sm uppercase tracking-wide text-dark-900 dark:text-[rgb(255,255,255,90%)]"
                    style={{
                        maskImage:
                            "linear-gradient(-75deg,rgba(0,243,255,1) calc(var(--x) + 20%),transparent calc(var(--x) + 30%),rgba(0,243,255,1) calc(var(--x) + 100%))",
                        WebkitMaskImage:
                            "linear-gradient(-75deg,rgba(0,243,255,1) calc(var(--x) + 20%),transparent calc(var(--x) + 30%),rgba(0,243,255,1) calc(var(--x) + 100%))",
                    }}
                >
                    {children}
                </span>
                <span
                    style={{
                        mask: "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
                        WebkitMask: "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
                        maskComposite: "exclude",
                        WebkitMaskComposite: "xor",
                    }}
                    className="absolute inset-0 z-10 block rounded-[inherit] bg-[linear-gradient(-75deg,rgba(0,243,255,0.1)_calc(var(--x)+20%),rgba(0,243,255,0.5)_calc(var(--x)+25%),rgba(0,243,255,0.1)_calc(var(--x)+100%))] p-px"
                ></span>
            </motion.button>
        );
    },
);

ShinyButton.displayName = "ShinyButton";

export default ShinyButton;
