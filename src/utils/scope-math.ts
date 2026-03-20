/**
 * Oscilloscope Coordinate Transformation Utilities
 * 
 * Handles mapping between:
 * - Normalized (0.0 to 1.0) values
 * - Real-world values (Volts, Microseconds)
 * - Canvas/Screen space (Pixels)
 */

export const PLOT_W = 840; // CANVAS_W (900) - M.left (52) - M.right (8)
export const PLOT_H_WAVE = 200;

interface ViewState {
    zoomX: number;
    zoomY: number;
    panX: number;
    panY: number;
}

/**
 * Maps normalized cursor position to canvas-relative X (within the plot area)
 */
export function normToCanvasX(pos: number, vw: ViewState): number {
    return (pos * PLOT_W - PLOT_W / 2) * vw.zoomX + PLOT_W / 2 + vw.panX;
}

/**
 * Maps canvas-relative X (within the plot area) to normalized cursor position
 */
export function canvasXToNorm(x: number, vw: ViewState): number {
    return ((x - vw.panX - PLOT_W / 2) / vw.zoomX + PLOT_W / 2) / PLOT_W;
}

/**
 * Clamps a value between min and max
 */
export function clamp(v: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, v));
}

/**
 * Calculates the differential voltage with gating based on channel enable states.
 */
export function calculateVDiff(canh: number, canl: number, ch1Enabled: boolean, ch2Enabled: boolean): number {
    const v1 = ch1Enabled ? canh : 0;
    const v2 = ch2Enabled ? canl : 0;
    return v1 - v2;
}
