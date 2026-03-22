"use client";

import { cn } from "../../utils/cn";

interface ShineBorderProps {
    borderRadius?: number;
    borderWidth?: number;
    duration?: number;
    color?: string | string[];
    className?: string;
    children: React.ReactNode;
}

/**
 * @name Shine Border
 * @description Shine Border is a background animation that creates a shining border effect around a container.
 */
export default function ShineBorder({
    borderRadius = 8,
    borderWidth = 1,
    duration = 14,
    color = "#00f3ff",
    className,
    children,
}: ShineBorderProps) {
    return (
        <div
            style={
                {
                    "--border-radius": `${borderRadius}px`,
                } as React.CSSProperties
            }
            className={cn(
                "relative min-h-[60px] w-fit min-w-[300px] place-items-center rounded-[--border-radius] bg-white p-3 text-black dark:bg-black dark:text-white",
                className,
            )}
        >
            <div
                style={
                    {
                        "--border-width": `${borderWidth}px`,
                        "--duration": `${duration}s`,
                        "--mask-linear-gradient": `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
                        "--background-radial-gradient": `radial-gradient(transparent,transparent, ${Array.isArray(color) ? color.join(",") : color
                            },transparent,transparent)`,
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                        WebkitMask: 'var(--mask-linear-gradient)',
                        mask: 'var(--mask-linear-gradient)',
                    } as React.CSSProperties
                }
                className={cn(
                    "bg-shine-size absolute inset-0 rounded-[--border-radius] p-[--border-width] will-change-[background-position]",
                    "[background-image:--background-radial-gradient] [background-size:300%_300%]",
                    "motion-safe:animate-shine"
                )}
            ></div>
            {children}
        </div>
    );
}
