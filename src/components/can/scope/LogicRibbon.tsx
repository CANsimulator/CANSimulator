import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import type { ScopeSync } from './WaveformViewer';
import {
    CAN_FULL_PATTERN,
    CAN_BIT_FIELD_MAP,
    CAN_BIT_STUFF_MARKERS,
    CAN_SEGMENT_BOUNDARIES,
    type SegmentBoundary,
} from './protocolUtils';

// ── Types ────────────────────────────────────────────────────────────────────

interface LogicRibbonProps {
    syncRef: React.MutableRefObject<ScopeSync>;
    running: boolean;
}

interface HoverInfo {
    x: number;
    y: number;
    bitIndex: number;
    fieldLabel: string;
    fieldCls: string;
    fieldColor: string;
    bitValue: number;
    positionInField: number;
    fieldTotalBits: number;
    isStuffBit: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Resolves CSS custom properties to actual color values */
function resolveColor(color: string, root: HTMLElement): string {
    if (!color.startsWith('var(')) return color;
    const prop = color.slice(4, -1);
    const resolved = getComputedStyle(root).getPropertyValue(prop).trim();
    if (resolved) return resolved;
    
    // Fallbacks for known variables if CSS is not loaded yet or prop is missing
    if (prop === '--bg-2') return '#10161a';
    if (prop === '--ink-faint') return '#5f7582';
    if (prop === '--accent') return '#ffd400';
    if (prop === '--warn') return '#ffae00';
    if (prop === '--ok') return '#22c55e';
    if (prop === '--danger') return '#ff4d3a';
    
    return '#888';
}

// ── Constants ────────────────────────────────────────────────────────────────

const FIELD_ROW_H = 28;
const BIT_ROW_H = 22;
const TRACE_ROW_H = 20;
const STUFF_ROW_H = 14;
const GAP = 1;
const TOTAL_H = FIELD_ROW_H + BIT_ROW_H + TRACE_ROW_H + STUFF_ROW_H + GAP * 3;

// Stuff marker indices as a Set for O(1) lookup
const STUFF_SET = new Set(CAN_BIT_STUFF_MARKERS.map(m => m.afterBitIndex));

// ── Component ────────────────────────────────────────────────────────────────

export const LogicRibbon: React.FC<LogicRibbonProps> = React.memo(({ syncRef, running }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef(0);
    const [hover, setHover] = useState<HoverInfo | null>(null);
    const hoverRef = useRef<HoverInfo | null>(null);
    const { theme } = useTheme();

    // Cache basic theme colors
    const themeColors = useMemo(() => {
        const root = document.documentElement;
        const css = getComputedStyle(root);
        return {
            bg2: css.getPropertyValue('--bg-2').trim() || '#10161a',
            accent: css.getPropertyValue('--accent').trim() || '#ffd400',
            inkFaint: css.getPropertyValue('--ink-faint').trim() || '#5f7582',
            warn: css.getPropertyValue('--warn').trim() || '#ffae00',
            gridC: css.getPropertyValue('--grid-c').trim() || 'rgba(255,255,255,0.06)',
        };
    }, [theme]);

    // Pre-resolve field colors to avoid getComputedStyle in loop
    const fieldColorCache = useMemo(() => {
        const root = document.documentElement;
        const cache: Record<string, string> = {};
        
        // Unique field colors from the map AND segments
        const vars = [
            ...CAN_BIT_FIELD_MAP.map(m => m.fieldColor),
            ...CAN_SEGMENT_BOUNDARIES.map(s => s.color)
        ];
        const uniqueVars = Array.from(new Set(vars));
        
        uniqueVars.forEach(v => {
            cache[v] = resolveColor(v, root);
        });
        return cache;
    }, [theme]);

    // Cache dimensions
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const parent = canvas.parentElement;
        if (!parent) return;

        const observer = new ResizeObserver((entries) => {
            if (entries[0]) setWidth(entries[0].contentRect.width);
        });
        observer.observe(parent);
        return () => observer.disconnect();
    }, []);

    // We track mouse position in canvas-local coordinates for hover detection
    const mouseRef = useRef<{ x: number; y: number } | null>(null);

    const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        mouseRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }, []);

    const onMouseLeave = useCallback(() => {
        mouseRef.current = null;
        hoverRef.current = null;
        setHover(null);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const render = () => {
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx || width === 0) return;

            const dpr = window.devicePixelRatio || 1;
            const w = width;
            const h = TOTAL_H;

            if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
                canvas.width = w * dpr;
                canvas.height = h * dpr;
                canvas.style.width = `${w}px`;
                canvas.style.height = `${h}px`;
            }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const { zoom, pan, scroll } = syncRef.current;
            const n = CAN_FULL_PATTERN.length;
            const { bg2, accent, inkFaint, warn, gridC } = themeColors;

            // Background
            ctx.fillStyle = bg2;
            ctx.fillRect(0, 0, w, h);

            // ── Mapping: screen-x → bit index ────────────────────────
            const bitWidth = (zoom * w) / n;

            // If bits are too narrow to render individually, fall back to segment-only mode
            const showBitCells = bitWidth >= 4;
            const showBitValues = bitWidth >= 12;

            // ── Row Y positions ──────────────────────────────────────
            const fieldY = 0;
            const bitY = fieldY + FIELD_ROW_H + GAP;
            const traceY = bitY + BIT_ROW_H + GAP;
            const stuffY = traceY + TRACE_ROW_H + GAP;

            // ── Helper to get X position for a given bit index ───────
            const bitToX = (bitIdx: number): number => {
                const phase = bitIdx / n;
                const baseScroll = (scroll + pan) % 1;
                return (phase - baseScroll) * zoom * w;
            };

            // ── Draw segment boundaries (field row) ──────────────────
            const segmentsToDraw: Array<{ seg: SegmentBoundary; x: number; segW: number }> = [];

            for (const seg of CAN_SEGMENT_BOUNDARIES) {
                const color = fieldColorCache[seg.color] || '#888';
                let x0 = bitToX(seg.startBit);
                const segW = seg.bits * bitWidth;

                // Handle wrapping for scrolling
                while (x0 + segW < 0) x0 += zoom * w;
                while (x0 > w) x0 -= zoom * w;

                // Draw all visible copies (handles zoom < 1 wrapping)
                let x = x0;
                while (x < w) {
                    if (x + segW > 0) {
                        segmentsToDraw.push({ seg, x, segW });

                        // Field background
                        ctx.fillStyle = color + '30';
                        ctx.fillRect(x, fieldY, segW - 0.5, FIELD_ROW_H);

                        // Left border accent
                        ctx.fillStyle = color;
                        ctx.fillRect(x, fieldY, 2, FIELD_ROW_H);

                        // Top and bottom field borders
                        ctx.strokeStyle = color + '50';
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(x, fieldY);
                        ctx.lineTo(x + segW - 0.5, fieldY);
                        ctx.moveTo(x, fieldY + FIELD_ROW_H);
                        ctx.lineTo(x + segW - 0.5, fieldY + FIELD_ROW_H);
                        ctx.stroke();

                        // Right divider
                        ctx.strokeStyle = color + '40';
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(x + segW - 0.5, fieldY);
                        ctx.lineTo(x + segW - 0.5, fieldY + FIELD_ROW_H);
                        ctx.stroke();

                        // Label — center within the *visible* slice of the segment
                        if (segW > 20) {
                            const visL = Math.max(x, 4);
                            const visR = Math.min(x + segW - 4, w - 4);
                            if (visR > visL) {
                                const visW = visR - visL;
                                const maxLabelW = Math.min(segW - 8, visW - 4);
                                const cx = (visL + visR) / 2;
                                ctx.fillStyle = color;
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';

                                if (segW > 50) {
                                    ctx.font = `bold 10px 'JetBrains Mono', monospace`;
                                    const label = segW > 120 ? seg.label : seg.shortLabel;
                                    let displayLabel = label;
                                    while (ctx.measureText(displayLabel).width > maxLabelW && displayLabel.length > 1) {
                                        displayLabel = displayLabel.slice(0, -1);
                                    }
                                    ctx.fillText(displayLabel, cx, fieldY + FIELD_ROW_H / 2 - 5);

                                    ctx.font = `9px 'JetBrains Mono', monospace`;
                                    ctx.fillStyle = color + 'AA';
                                    ctx.fillText(`${seg.bits}b`, cx, fieldY + FIELD_ROW_H / 2 + 7);
                                } else {
                                    ctx.font = `bold 9px 'JetBrains Mono', monospace`;
                                    let label = seg.shortLabel;
                                    while (ctx.measureText(label).width > maxLabelW && label.length > 1) {
                                        label = label.slice(0, -1);
                                    }
                                    ctx.fillText(label, cx, fieldY + FIELD_ROW_H / 2);
                                }
                            }
                        }
                    }
                    x += zoom * w;
                    if (zoom >= 1) break;
                }
            }

            // ── Draw individual bit cells (bit row) ──────────────────
            if (showBitCells) {
                for (let px = 0; px < w; px += Math.max(1, bitWidth)) {
                    const phase = ((px / w) / zoom + scroll + pan) % 1;
                    const pNorm = phase < 0 ? 1 + phase : phase;
                    const bitIdx = Math.floor(pNorm * n) % n;

                    const mapping = CAN_BIT_FIELD_MAP[bitIdx];
                    if (!mapping) continue;

                    const color = fieldColorCache[mapping.fieldColor] || '#888';
                    const cellX = px;
                    const cellW = Math.max(1, bitWidth);
                    
                    const logBit = mapping.logicalBit;

                    // Bit cell background — dominant (0) is brighter, recessive (1) is dimmer
                    if (logBit === 0) {
                        ctx.fillStyle = color + '3A';
                    } else {
                        ctx.fillStyle = color + '18';
                    }
                    ctx.fillRect(cellX, bitY, cellW - 0.5, BIT_ROW_H);

                    // Cell border
                    ctx.strokeStyle = color + '25';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(cellX, bitY, cellW - 0.5, BIT_ROW_H);

                    // Bit value text
                    if (showBitValues && cellW > 8) {
                        ctx.font = `bold 10px 'JetBrains Mono', monospace`;
                        ctx.fillStyle = logBit === 0 ? color : color + '88';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(String(logBit), cellX + cellW / 2, bitY + BIT_ROW_H / 2);
                    }
                }
            } else {
                // Fallback: show a compressed color band matching fields
                for (let px = 0; px < w; px++) {
                    const phase = ((px / w) / zoom + scroll + pan) % 1;
                    const pNorm = phase < 0 ? 1 + phase : phase;
                    const bitIdx = Math.floor(pNorm * n) % n;

                    const mapping = CAN_BIT_FIELD_MAP[bitIdx];
                    if (!mapping) continue;

                    const color = fieldColorCache[mapping.fieldColor] || '#888';
                    const logBit = mapping.logicalBit;
                    ctx.fillStyle = logBit === 0 ? color + '50' : color + '1A';
                    ctx.fillRect(px, bitY, 1, BIT_ROW_H);
                }
            }

            // ── Draw digital trace (trace row) ───────────────────────
            const traceHigh = traceY + 2;
            const traceLow = traceY + TRACE_ROW_H - 2;

            ctx.strokeStyle = accent;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 3;
            ctx.shadowColor = accent;
            ctx.beginPath();

            for (let px = 0; px < w; px++) {
                const phase = ((px / w) / zoom + scroll + pan) % 1;
                const pNorm = phase < 0 ? 1 + phase : phase;
                const i = Math.floor(pNorm * n) % n;
                const bit = CAN_FULL_PATTERN[i];

                const y = bit === 1 ? traceHigh : traceLow;

                if (px === 0) {
                    ctx.moveTo(px, y);
                } else {
                    const prevPhase = (((px - 1) / w) / zoom + scroll + pan) % 1;
                    const prevPNorm = prevPhase < 0 ? 1 + prevPhase : prevPhase;
                    const prevI = Math.floor(prevPNorm * n) % n;
                    if (prevI !== i) {
                        const prevBit = CAN_FULL_PATTERN[prevI];
                        ctx.lineTo(px, prevBit === 1 ? traceHigh : traceLow);
                    }
                    ctx.lineTo(px, y);
                }
            }
            ctx.stroke();
            ctx.shadowBlur = 0;

            // ── Draw bit-stuffing indicators (stuff row) ──────────────
            if (CAN_BIT_STUFF_MARKERS.length > 0) {
                for (const marker of CAN_BIT_STUFF_MARKERS) {
                    let markerX = bitToX(marker.afterBitIndex) + bitWidth;

                    // Handle wrapping
                    while (markerX < -bitWidth) markerX += zoom * w;
                    while (markerX > w + bitWidth) markerX -= zoom * w;

                    let mx = markerX;
                    while (mx < w + bitWidth) {
                        if (mx > -bitWidth && mx < w + bitWidth) {
                            // Draw stuff indicator triangle
                            const triW = Math.min(8, Math.max(3, bitWidth * 0.6));
                            const triH = STUFF_ROW_H - 4;

                            ctx.fillStyle = warn;
                            ctx.beginPath();
                            ctx.moveTo(mx - triW / 2, stuffY + triH + 2);
                            ctx.lineTo(mx, stuffY + 2);
                            ctx.lineTo(mx + triW / 2, stuffY + triH + 2);
                            ctx.closePath();
                            ctx.fill();

                            // Vertical connector line from stuff row up through all rows
                            ctx.strokeStyle = warn + '55';
                            ctx.lineWidth = 0.5;
                            ctx.setLineDash([2, 2]);
                            ctx.beginPath();
                            ctx.moveTo(mx, fieldY);
                            ctx.lineTo(mx, stuffY + triH + 2);
                            ctx.stroke();
                            ctx.setLineDash([]);

                            // Label if wide enough
                            if (bitWidth > 18) {
                                ctx.font = `bold 7px 'JetBrains Mono', monospace`;
                                ctx.fillStyle = warn;
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'bottom';
                                ctx.fillText('S', mx, stuffY + STUFF_ROW_H);
                            }
                        }
                        mx += zoom * w;
                        if (zoom >= 1) break;
                    }
                }
            }

            // ── Row labels (left side) ───────────────────────────────
            const labelBg = bg2 + 'D9'; // Equivalent to 0.85 opacity
            const labelW = 42;

            // Field row label
            ctx.fillStyle = labelBg;
            ctx.fillRect(0, fieldY, labelW, FIELD_ROW_H);
            ctx.font = `bold 8px 'JetBrains Mono', monospace`;
            ctx.fillStyle = inkFaint;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('FIELD', labelW / 2, fieldY + FIELD_ROW_H / 2);

            // Bit row label
            ctx.fillStyle = labelBg;
            ctx.fillRect(0, bitY, labelW, BIT_ROW_H);
            ctx.fillStyle = inkFaint;
            ctx.fillText('BITS', labelW / 2, bitY + BIT_ROW_H / 2);

            // Trace row label
            ctx.fillStyle = labelBg;
            ctx.fillRect(0, traceY, labelW, TRACE_ROW_H);
            ctx.fillStyle = accent + '88';
            ctx.fillText('BUS', labelW / 2, traceY + TRACE_ROW_H / 2);

            // Stuff row label
            if (CAN_BIT_STUFF_MARKERS.length > 0) {
                ctx.fillStyle = labelBg;
                ctx.fillRect(0, stuffY, labelW, STUFF_ROW_H);
                ctx.fillStyle = warn + '88';
                ctx.font = `bold 7px 'JetBrains Mono', monospace`;
                ctx.fillText('STUFF', labelW / 2, stuffY + STUFF_ROW_H / 2);
            }

            // ── Hover detection (done in render loop for perf) ────────
            const mouse = mouseRef.current;
            if (mouse) {
                const mPhase = ((mouse.x / w) / zoom + scroll + pan) % 1;
                const mPNorm = mPhase < 0 ? 1 + mPhase : mPhase;
                const mBitIdx = Math.floor(mPNorm * n) % n;
                const mapping = CAN_BIT_FIELD_MAP[mBitIdx];

                if (mapping && mouse.y >= fieldY && mouse.y <= stuffY + STUFF_ROW_H) {
                    const isStuff = STUFF_SET.has(mBitIdx);
                    const newHover: HoverInfo = {
                        x: mouse.x,
                        y: mouse.y,
                        bitIndex: mBitIdx,
                        fieldLabel: mapping.fieldLabel,
                        fieldCls: mapping.fieldCls,
                        fieldColor: fieldColorCache[mapping.fieldColor] || '#888',
                        bitValue: mapping.logicalBit,
                        positionInField: mapping.positionInField,
                        fieldTotalBits: mapping.fieldTotalBits,
                        isStuffBit: isStuff,
                    };

                    // Only update React state if hover actually changed
                    const prev = hoverRef.current;
                    if (!prev || prev.bitIndex !== newHover.bitIndex) {
                        hoverRef.current = newHover;
                        setHover(newHover);
                    }

                    // Draw hover highlight
                    const hoverBitX = bitToX(mBitIdx);
                    let hx = hoverBitX;
                    while (hx < -bitWidth) hx += zoom * w;
                    while (hx > w) hx -= zoom * w;

                    if (hx > -bitWidth && hx < w + bitWidth) {
                        ctx.fillStyle = '#ffffff15';
                        ctx.fillRect(hx, fieldY, bitWidth, FIELD_ROW_H + BIT_ROW_H + TRACE_ROW_H + GAP * 2);

                        ctx.strokeStyle = '#ffffff40';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([]);
                        ctx.beginPath();
                        ctx.moveTo(hx + bitWidth / 2, fieldY);
                        ctx.lineTo(hx + bitWidth / 2, traceY + TRACE_ROW_H);
                        ctx.stroke();
                    }
                }
            } else if (hoverRef.current) {
                hoverRef.current = null;
                setHover(null);
            }

            // Subtle separator line between rows
            ctx.strokeStyle = gridC;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(0, bitY - 0.5);
            ctx.lineTo(w, bitY - 0.5);
            ctx.moveTo(0, traceY - 0.5);
            ctx.lineTo(w, traceY - 0.5);
            ctx.moveTo(0, stuffY - 0.5);
            ctx.lineTo(w, stuffY - 0.5);
            ctx.stroke();

            rafRef.current = requestAnimationFrame(render);
        };

        rafRef.current = requestAnimationFrame(render);
        return () => cancelAnimationFrame(rafRef.current);
    }, [syncRef, running, themeColors, fieldColorCache, width]);

    return (
        <div
            className="logic-analyzer-ribbon"
            role="img"
            aria-label="CAN Protocol Decode Ribbon — shows field mapping, decoded bits, digital trace, and bit-stuffing indicators synchronized to the oscilloscope waveform above"
        >
            <canvas
                ref={canvasRef}
                onMouseMove={onMouseMove}
                onMouseLeave={onMouseLeave}
                className="logic-ribbon-canvas"
            />

            {/* Hover tooltip */}
            {hover && (
                <div
                    className="logic-ribbon-tooltip"
                    style={{
                        left: Math.min(hover.x + 12, (canvasRef.current?.clientWidth ?? 300) - 220),
                        top: Math.max(2, hover.y - 70),
                    } as React.CSSProperties}
                >
                    <div className="logic-ribbon-tooltip-header" style={{ borderLeftColor: hover.fieldColor } as React.CSSProperties}>
                        <span className="logic-ribbon-tooltip-field" style={{ color: hover.fieldColor } as React.CSSProperties}>
                            {hover.fieldLabel}
                        </span>
                        <span className="logic-ribbon-tooltip-bits">
                            bit {hover.positionInField + 1}/{hover.fieldTotalBits}
                        </span>
                    </div>
                    <div className="logic-ribbon-tooltip-body">
                        <span>
                            Value: <b className={hover.bitValue === 0 ? 'osc-text-ok' : 'osc-text-danger'}>
                                {hover.bitValue} ({hover.bitValue === 0 ? 'dominant' : 'recessive'})
                            </b>
                        </span>
                        <span>Bit index: <b className="osc-font-bold">#{hover.bitIndex}</b></span>
                        {hover.isStuffBit && (
                            <span className="logic-ribbon-tooltip-stuff">
                                ⚡ Bit-stuff boundary
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Row legend (far right) */}
            <div className="logic-ribbon-legend" aria-hidden="true">
                <span className="osc-ink-faint">PROTOCOL DECODE</span>
                {CAN_BIT_STUFF_MARKERS.length > 0 && (
                    <span className="osc-text-warn">
                        ▲ {CAN_BIT_STUFF_MARKERS.length} stuff
                    </span>
                )}
            </div>
        </div>
    );
});
