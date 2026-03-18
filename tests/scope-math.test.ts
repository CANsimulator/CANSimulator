import { describe, it, expect } from 'vitest';
import { normToCanvasX, canvasXToNorm, PLOT_W } from '../src/utils/scope-math';

describe('Scope Math Utilities', () => {
    const defaultView = { zoomX: 1, zoomY: 1, panX: 0, panY: 0 };

    it('should map normalized 0.5 to center of plot at default zoom', () => {
        expect(normToCanvasX(0.5, defaultView)).toBe(PLOT_W / 2);
    });

    it('should map center of plot back to normalized 0.5', () => {
        expect(canvasXToNorm(PLOT_W / 2, defaultView)).toBe(0.5);
    });

    it('should handle zoom correctly', () => {
        const zoomedView = { zoomX: 2, zoomY: 1, panX: 0, panY: 0 };
        // At 2x zoom, 0.5 stays at center
        expect(normToCanvasX(0.5, zoomedView)).toBe(PLOT_W / 2);
        
        // At 2x zoom, 0.75 (3/4) would be:
        // (0.75 * 840 - 420) * 2 + 420 = (630 - 420) * 2 + 420 = 210 * 2 + 420 = 420 + 420 = 840
        expect(normToCanvasX(0.75, zoomedView)).toBe(PLOT_W);
    });

    it('should handle pan correctly', () => {
        const pannedView = { zoomX: 1, zoomY: 1, panX: 100, panY: 0 };
        // At 0 offset pan, 0.5 is at 420 + 100 = 520
        expect(normToCanvasX(0.5, pannedView)).toBe(PLOT_W / 2 + 100);
    });

    it('should be reversible with complex zoom and pan', () => {
        const complexView = { zoomX: 3.5, zoomY: 1, panX: -123, panY: 0 };
        const originalNorm = 0.333;
        const x = normToCanvasX(originalNorm, complexView);
        const recoveredNorm = canvasXToNorm(x, complexView);
        expect(recoveredNorm).toBeCloseTo(originalNorm, 5);
    });
});
