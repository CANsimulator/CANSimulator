import { useCallback } from 'react';
import { useMediaQuery } from './useMediaQuery';

interface UseMomentaryActionOptions {
    isActive: boolean;
    onStart: () => void;
    onEnd: () => void;
}

export function useMomentaryAction({ isActive, onStart, onEnd }: UseMomentaryActionOptions) {
    const isCoarsePointer = useMediaQuery('(pointer: coarse)');

    const handlePointerDown = useCallback(() => {
        if (isCoarsePointer) return;
        onStart();
    }, [isCoarsePointer, onStart]);

    const handlePointerUp = useCallback(() => {
        if (isCoarsePointer) return;
        onEnd();
    }, [isCoarsePointer, onEnd]);

    const handleClick = useCallback(() => {
        if (!isCoarsePointer) return;
        if (isActive) onEnd();
        else onStart();
    }, [isActive, isCoarsePointer, onEnd, onStart]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
        if (event.repeat) return;
        if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            onStart();
        }
    }, [onStart]);

    const handleKeyUp = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            onEnd();
        }
    }, [onEnd]);

    const handleBlur = useCallback(() => {
        if (!isCoarsePointer) onEnd();
    }, [isCoarsePointer, onEnd]);

    return {
        isCoarsePointer,
        interactionHint: isCoarsePointer ? 'Tap to toggle' : 'Hold to activate',
        handleBlur,
        handleClick,
        handleKeyDown,
        handleKeyUp,
        handlePointerDown,
        handlePointerUp,
        handlePointerLeave: handlePointerUp,
        handlePointerCancel: handlePointerUp,
    };
}
