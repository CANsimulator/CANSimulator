import { cn } from "../../utils/cn";
import { useReducedMotion } from "framer-motion";
import React, { useEffect, useState } from "react";

interface MeteorsProps {
    number?: number;
    className?: string;
}

export const Meteors = ({ number = 20, className }: MeteorsProps) => {
    const shouldReduceMotion = useReducedMotion();
    const [meteorStyles, setMeteorStyles] = useState<React.CSSProperties[]>([]);

    useEffect(() => {
        if (shouldReduceMotion) return;
        const styles = [...new Array(number)].map(() => ({
            top: -5,
            left: Math.floor(Math.random() * window.innerWidth) + "px",
            animationDelay: Math.random() * 1 + 0.2 + "s",
            animationDuration: Math.floor(Math.random() * 8 + 2) + "s",
        }));
        setMeteorStyles(styles);
    }, [number, shouldReduceMotion]);

    if (shouldReduceMotion) return null;

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {meteorStyles.map((style, idx) => (
                <span
                    key={idx}
                    className={cn(
                        "pointer-events-none absolute left-1/2 top-1/2 h-0.5 w-0.5 rotate-[215deg] animate-meteor rounded-[9999px] bg-slate-500 shadow-[0_0_0_1px_ffffff10]",
                        "before:absolute before:top-1/2 before:z-[-1] before:h-[1px] before:w-[50px] before:translate-y-[-50%] before:bg-gradient-to-r before:from-[#64748b] before:to-transparent",
                        className,
                    )}
                    style={style}
                ></span>
            ))}
        </div>
    );
};
