import React from 'react';
import { cn } from '../../utils/cn';

interface ContainerProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'narrow' | 'wide';
}

export const Container: React.FC<ContainerProps> = ({
    children,
    className,
    variant = 'default'
}) => {
    const maxWidth = {
        default: 'max-w-7xl',
        narrow: 'max-w-5xl',
        wide: 'max-w-[1440px]'
    }[variant];

    return (
        <div className={cn(
            'mx-auto px-4 sm:px-6 lg:px-8 w-full',
            maxWidth,
            className
        )}>
            {children}
        </div>
    );
};
