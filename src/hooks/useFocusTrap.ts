import { useEffect, useCallback, type RefObject } from 'react';

/**
 * Custom hook to trap focus within a container, useful for modals, drawers, and popovers.
 * 
 * @param containerRef Ref to the container that should trap focus.
 * @param isOpen Boolean indicating if the trap is active.
 * @param onClose Callback to be called when the user presses Escape.
 * @param restoreFocusElement Element to restore focus to when closing. Defaults to the element that was active when opening.
 */
export function useFocusTrap(
    containerRef: RefObject<HTMLElement | null>,
    isOpen: boolean,
    onClose?: () => void,
    restoreFocusElement?: HTMLElement | null
) {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen || !containerRef.current) return;

        if (e.key === 'Escape' && onClose) {
            e.preventDefault();
            e.stopPropagation();
            onClose();
            return;
        }

        if (e.key === 'Tab') {
            const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            
            if (focusableElements.length === 0) {
                e.preventDefault();
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstElement || document.activeElement === containerRef.current) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
    }, [isOpen, onClose, containerRef]);

    useEffect(() => {
        if (!isOpen) return;

        const lastActiveElement = (restoreFocusElement || document.activeElement) as HTMLElement;

        document.addEventListener('keydown', handleKeyDown, true);
        
        // Slight delay to allow animations to start and container to be visible
        const timer = setTimeout(() => {
            if (containerRef.current) {
                const firstFocusable = containerRef.current.querySelector<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                if (firstFocusable) {
                    firstFocusable.focus();
                } else {
                    containerRef.current.focus();
                }
            }
        }, 150);

        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
            clearTimeout(timer);
            if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
                // Restore focus with a small delay to ensure modal is gone
                setTimeout(() => lastActiveElement.focus(), 50);
            }
        };
    }, [isOpen, handleKeyDown, restoreFocusElement, containerRef]);
}
