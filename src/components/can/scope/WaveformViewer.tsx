import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { OscState, OscMeas, SignalType } from './types';

// ── Signal generators ───────────────────────────────────────────────────────

function canBitPattern(phase: number): number {
    const pattern = [
        1,
        0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1,
        0, 0, 0,
        1, 0, 0, 0,
        0, 0, 0, 1, 1, 0, 1, 0,
        0, 1, 1, 0, 1, 0, 1, 1,
        0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 0,
        1, 0, 1,
        0, 0, 0, 0, 0, 0, 0,
        0, 0, 0,
    ];
    const n = pattern.length;
    const i = Math.floor(phase * n) % n;
    const bit = pattern[i];
    const next = pattern[(i + 1) % n];
    const sub = (phase * n) - Math.floor(phase * n);
    if (sub > 0.9 && bit !== next) {
        return bit + (next - bit) * ((sub - 0.9) / 0.1);
    }
    return bit;
}

type WaveArrays = { H: Float32Array; L: Float32Array; D: Float32Array };

function generateCAN(N: number, scroll: number): WaveArrays {
    const H = new Float32Array(N);
    const L = new Float32Array(N);
    const D = new Float32Array(N);
    for (let i = 0; i < N; i++) {
        const p = ((i / N) + scroll) % 1;
        const b = canBitPattern(p);
        const nz = (Math.random() - .5) * .06;
        const nz2 = (Math.random() - .5) * .06;
        const ring = (b > 0.05 && b < 0.95) ? Math.sin(b * Math.PI * 6) * 0.08 * (1 - b) : 0;
        H[i] = 2.5 + b + nz + ring;
        L[i] = 2.5 - b + nz2 - ring;
        D[i] = H[i] - L[i];
    }
    return { H, L, D };
}

function generateSine(N: number, scroll: number): WaveArrays {
    const H = new Float32Array(N);
    const L = new Float32Array(N);
    const D = new Float32Array(N);
    for (let i = 0; i < N; i++) {
        const t = (i / N) * Math.PI * 2 * 4 + scroll * Math.PI * 2;
        H[i] = 2.5 + 0.8 * Math.sin(t) + (Math.random() - .5) * .03;
        L[i] = 2.5 - 0.8 * Math.sin(t) + (Math.random() - .5) * .03;
        D[i] = H[i] - L[i];
    }
    return { H, L, D };
}

function generateSquare(N: number, scroll: number): WaveArrays {
    const H = new Float32Array(N);
    const L = new Float32Array(N);
    const D = new Float32Array(N);
    for (let i = 0; i < N; i++) {
        const p = ((i / N) * 6 + scroll * 6) % 1;
        const b = p < 0.5 ? 1 : 0;
        H[i] = 2.5 + b + (Math.random() - .5) * .04;
        L[i] = 2.5 - b + (Math.random() - .5) * .04;
        D[i] = H[i] - L[i];
    }
    return { H, L, D };
}

function generateNoisy(N: number, scroll: number): WaveArrays {
    const w = generateCAN(N, scroll);
    for (let i = 0; i < N; i++) {
        const nz = (Math.random() - .5) * .5;
        w.H[i] += nz; w.L[i] -= nz * .4; w.D[i] = w.H[i] - w.L[i];
    }
    return w;
}

const GENERATORS: Record<SignalType, (N: number, scroll: number) => WaveArrays> = {
    can: generateCAN,
    sine: generateSine,
    square: generateSquare,
    noisy: generateNoisy,
};

// ── Component ───────────────────────────────────────────────────────────────

type ChannelSet = 'all' | 'lines' | 'diff';
export type ScopeSync = { zoom: number; pan: number; scroll: number };

interface WaveformViewerProps {
    state: OscState;
    signal: SignalType;
    fftMode: boolean;
    cursorsOn: boolean;
    cursors: { t1: number; t2: number; v1: number; v2: number };
    persistence: boolean;
    traceGlow: boolean;
    onMeas: (m: OscMeas) => void;
    onStateChange?: (newState: OscState) => void;
    onPanChange?: (panUs: number) => void;
    channelSet?: ChannelSet;
    syncRef?: React.MutableRefObject<ScopeSync>;
    reportMeas?: boolean;
}

export const WaveformViewer = forwardRef<
    { reset: () => void },
    WaveformViewerProps
>(({ state, signal, fftMode, cursorsOn, cursors, persistence, traceGlow, onMeas, onStateChange, onPanChange, channelSet = 'all', syncRef, reportMeas = true }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef(0);
    const internalSyncRef = useRef<ScopeSync>({ zoom: 1, pan: 0, scroll: 0 });
    const sync = syncRef ?? internalSyncRef;
    const persistRef = useRef<HTMLCanvasElement | null>(null);
    const renderRef = useRef<(ts: number) => void>(() => { });
    const lastUpdRef = useRef(0);
    const dragRef = useRef<{
        startX: number;
        startY: number;
        startPan: number;
        startOffsetH: number;
        startOffsetL: number;
        startOffsetD: number;
        startAxisOffsetY: number;
        vpd: number;
        dragMode: 'axis' | 'graph';
    } | null>(null);
    const rowHRef = useRef(0);
    const canvasRectRef = useRef<{ left: number; width: number }>({ left: 0, width: 0 });
    const stateRef = useRef(state);
    const onPanChangeRef = useRef(onPanChange);

    const doRender = useCallback((ts: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const parent = canvas.parentElement;
        if (!parent) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = parent.clientWidth;
        const h = parent.clientHeight;
        const canvasRect = canvas.getBoundingClientRect();
        canvasRectRef.current = { left: canvasRect.left, width: w };

        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
            canvas.width = w * dpr; canvas.height = h * dpr;
            canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const css = getComputedStyle(canvas.closest('.osc-app') ?? document.documentElement);
        const bg = css.getPropertyValue('--bg').trim() || '#0b0f10';
        const gridC = css.getPropertyValue('--grid-c').trim() || 'rgba(255,255,255,.06)';
        const gridMaj = css.getPropertyValue('--grid-major-c').trim() || 'rgba(255,255,255,.11)';
        const ch1c = css.getPropertyValue('--ch1').trim() || '#ff3d6e';
        const ch2c = css.getPropertyValue('--ch2').trim() || '#39d4ff';
        const chdc = css.getPropertyValue('--chd').trim() || '#ffd400';
        const inkFaint = css.getPropertyValue('--ink-faint').trim() || '#5f7582';
        const accent = css.getPropertyValue('--accent').trim() || '#ffd400';

        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Reserve bottom strip for time-axis labels so they never overlap waveforms
        const PAD_B = 22;
        const wh = h - PAD_B;

        const cols = 10, rows = 8;
        const colW = w / cols, rowH = wh / rows;
        rowHRef.current = rowH;

        // Grid (confined to waveform area)
        ctx.lineWidth = 1;
        ctx.strokeStyle = gridC;
        ctx.beginPath();
        for (let i = 1; i < cols; i++) { const x = Math.round(i * colW) + .5; ctx.moveTo(x, 0); ctx.lineTo(x, wh); }
        for (let i = 1; i < rows; i++) { const y = Math.round(i * rowH) + .5; ctx.moveTo(0, y); ctx.lineTo(w, y); }
        ctx.stroke();

        ctx.strokeStyle = gridMaj;
        ctx.beginPath();
        ctx.moveTo(0, wh / 2); ctx.lineTo(w, wh / 2);
        ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, wh);
        for (let i = 1; i < cols * 5; i++) { const x = i * colW / 5; ctx.moveTo(x, wh / 2 - 4); ctx.lineTo(x, wh / 2 + 4); }
        for (let i = 1; i < rows * 5; i++) { const y = i * rowH / 5; ctx.moveTo(w / 2 - 4, y); ctx.lineTo(w / 2 + 4, y); }
        ctx.stroke();

        // Separator line between waveform area and time axis strip
        ctx.strokeStyle = gridMaj;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, wh + 0.5); ctx.lineTo(w, wh + 0.5);
        ctx.stroke();

        // Time-axis strip background
        ctx.fillStyle = bg + 'dd';
        ctx.fillRect(0, wh + 1, w, PAD_B - 1);

        const zoom = sync.current.zoom;
        const effectiveTb = state.timebase / zoom;

        // Per-pane axis reference: lines center on 2.5V, diff centers on 1.0V
        const isDiff = channelSet === 'diff';
        const centerV = isDiff ? 1.0 : 2.5;
        const axisVpd = isDiff ? state.channels.d.vpd : state.channels.h.vpd;
        const axisOffset = isDiff ? state.channels.d.off : state.axisOffsetY;

        // Axis labels
        ctx.fillStyle = inkFaint;
        ctx.font = `10px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'left';
        for (let i = 0; i <= rows; i++) {
            const y = i * rowH;
            const raw = (rows / 2 - i) * axisVpd + axisOffset;
            const v = (channelSet === 'all' ? raw : raw + centerV).toFixed(2);
            ctx.fillText(`${v}V`, 4, Math.max(10, Math.min(wh - 2, y + 3)));
        }
        const totalUs = effectiveTb * cols;
        const panOffsetUs = sync.current.pan * totalUs;
        ctx.textAlign = 'center';
        for (let i = 0; i <= cols; i++) {
            const x = i * colW;
            const t = ((i - cols / 2) * effectiveTb + panOffsetUs).toFixed(0);
            ctx.fillText(`${t}µs`, x, wh + 14);
        }

        // Generate signals — only advance shared scroll once per frame (on the primary pane)
        if (!isDiff) {
            sync.current.scroll = state.running ? (sync.current.scroll + 0.004 / zoom) : sync.current.scroll;
        }
        const N = Math.ceil(w / zoom);
        const { H, L, D } = GENERATORS[signal](N, sync.current.scroll + sync.current.pan);

        // Measurement accumulation
        let minD = +Infinity, maxD = -Infinity, sumSq = 0;
        let minH = +Infinity, maxH = -Infinity;
        let minL = +Infinity, maxL = -Infinity;
        let crossings = 0;
        for (let i = 0; i < N; i++) {
            if (D[i] < minD) minD = D[i]; if (D[i] > maxD) maxD = D[i];
            if (H[i] < minH) minH = H[i]; if (H[i] > maxH) maxH = H[i];
            if (L[i] < minL) minL = L[i]; if (L[i] > maxL) maxL = L[i];
            sumSq += D[i] * D[i];
            if (i > 0 && ((D[i - 1] < 1 && D[i] >= 1) || (D[i - 1] >= 1 && D[i] < 1))) crossings++;
        }

        const vToY = (v: number, vpdScale: number, offset: number, refV: number = 2.5) => {
            const center = wh / 2 - (offset / vpdScale) * rowH;
            return center - ((v - refV) / vpdScale) * rowH;
        };

        const drawTrace = (arr: Float32Array, color: string, vpdScale: number, offset: number, refV: number = 2.5) => {
            if (traceGlow) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
            else { ctx.shadowBlur = 0; }
            ctx.strokeStyle = color; ctx.lineWidth = 1.8;
            ctx.beginPath();
            for (let i = 0; i < N; i++) {
                const x = i * zoom;
                const y = vToY(arr[i], vpdScale, offset, refV);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;

            if (persistence && persistRef.current) {
                const pctx = persistRef.current.getContext('2d');
                if (pctx) {
                    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    pctx.strokeStyle = color + '44';
                    pctx.lineWidth = 1.2;
                    pctx.beginPath();
                    for (let i = 0; i < N; i++) {
                        const x = i * zoom;
                        const y = vToY(arr[i], vpdScale, offset, refV);
                        if (i === 0) pctx.moveTo(x, y); else pctx.lineTo(x, y);
                    }
                    pctx.stroke();
                }
            }
        };

        // Clip all signal/overlay rendering to the waveform area (above time-axis strip)
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, w, wh);
        ctx.clip();

        const showFft = fftMode && channelSet !== 'lines';
        const showH = !fftMode && channelSet !== 'diff' && state.channels.h.on;
        const showL = !fftMode && channelSet !== 'diff' && state.channels.l.on;
        const showD = !fftMode && channelSet !== 'lines' && state.channels.d.on;
        const diffRefV = channelSet === 'diff' ? 1.0 : 2.5;

        if (showFft) {
            const bars = 64;
            const barW = w / bars;
            for (let i = 0; i < bars; i++) {
                const f = i / bars;
                const peak1 = Math.exp(-Math.pow((f - 0.06) / 0.02, 2));
                const peak2 = Math.exp(-Math.pow((f - 0.20) / 0.04, 2)) * 0.6;
                const peak3 = Math.exp(-Math.pow((f - 0.45) / 0.08, 2)) * 0.3;
                const mag = (peak1 + peak2 + peak3 + Math.random() * 0.06) * 0.9;
                const barH = mag * wh * 0.85;
                ctx.fillStyle = chdc + 'AA';
                ctx.fillRect(i * barW + 1, wh - barH, barW - 2, barH);
                ctx.fillStyle = chdc;
                ctx.fillRect(i * barW + 1, wh - barH, barW - 2, 2);
            }
        } else if (!fftMode) {
            if (persistence && persistRef.current) {
                const pctx = persistRef.current.getContext('2d');
                if (pctx) {
                    pctx.save();
                    pctx.globalCompositeOperation = 'destination-out';
                    pctx.fillStyle = 'rgba(0,0,0,0.08)';
                    pctx.fillRect(0, 0, persistRef.current.width, persistRef.current.height);
                    pctx.restore();
                }
                ctx.drawImage(persistRef.current, 0, 0, persistRef.current.width / dpr, persistRef.current.height / dpr);
            }
            if (showH) drawTrace(H, ch1c, state.channels.h.vpd, state.channels.h.off, 2.5);
            if (showL) drawTrace(L, ch2c, state.channels.l.vpd, state.channels.l.off, 2.5);
            if (showD) drawTrace(D, chdc, state.channels.d.vpd, state.channels.d.off, diffRefV);
        }

        // Trigger line (only in lines/all — trigger is referenced to line voltages)
        if (!fftMode && channelSet !== 'diff') {
            const ty = Math.max(1, Math.min(wh - 1, vToY(state.trig.level, state.channels.h.vpd, state.channels.h.off)));
            ctx.strokeStyle = accent; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(w, ty); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = accent;
            ctx.fillRect(w - 72, ty - 9, 68, 18);
            ctx.fillStyle = '#111';
            ctx.font = `bold 10px 'JetBrains Mono', monospace`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(`T  ${state.trig.level.toFixed(2)} V`, w - 38, ty);
        }

        ctx.restore(); // end waveform clip

        // Zoom indicator (only on primary pane to avoid duplication)
        if (zoom !== 1.0 && !isDiff) {
            ctx.save();
            const label = zoom >= 1 ? `${zoom.toFixed(1)}×` : `${zoom.toFixed(2)}×`;
            ctx.font = `bold 11px 'JetBrains Mono', monospace`;
            const tw = ctx.measureText(label).width + 16;
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(w - tw - 4, 6, tw, 20);
            ctx.strokeStyle = accent + '88'; ctx.lineWidth = 1;
            ctx.strokeRect(w - tw - 4, 6, tw, 20);
            ctx.fillStyle = accent;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(label, w - tw / 2 - 4, 16);
            ctx.restore();
        }

        // Cursors — voltage cursors use the pane's own channel scale
        if (cursorsOn && !fftMode) {
            ctx.save();
            ctx.strokeStyle = accent + 'CC'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
            const totalUs = effectiveTb * cols;
            const x1 = (cursors.t1 / totalUs + 0.5) * w;
            const x2 = (cursors.t2 / totalUs + 0.5) * w;
            ctx.beginPath();
            ctx.moveTo(x1, 0); ctx.lineTo(x1, h);
            ctx.moveTo(x2, 0); ctx.lineTo(x2, h);
            const cursorVpd = isDiff ? state.channels.d.vpd : state.channels.h.vpd;
            const cursorOff = isDiff ? state.channels.d.off : state.channels.h.off;
            const y1 = vToY(cursors.v1, cursorVpd, cursorOff, diffRefV);
            const y2 = vToY(cursors.v2, cursorVpd, cursorOff, diffRefV);
            ctx.moveTo(0, y1); ctx.lineTo(w, y1);
            ctx.moveTo(0, y2); ctx.lineTo(w, y2);
            ctx.stroke(); ctx.setLineDash([]);
            // Only draw the Δ readout once (primary pane)
            if (!isDiff) {
                const dt = Math.abs(cursors.t2 - cursors.t1);
                const dv = Math.abs(cursors.v2 - cursors.v1);
                ctx.fillStyle = 'rgba(0,0,0,0.75)';
                ctx.fillRect(w / 2 - 68, 10, 136, 34);
                ctx.strokeStyle = accent; ctx.lineWidth = 1;
                ctx.strokeRect(w / 2 - 68, 10, 136, 34);
                ctx.fillStyle = accent;
                ctx.font = `bold 11px 'JetBrains Mono', monospace`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'top';
                ctx.fillText(`Δt  ${dt.toFixed(1)} µs`, w / 2, 14);
                ctx.fillText(`Δv  ${dv.toFixed(2)} V`, w / 2, 28);
            }
            ctx.restore();
        }

        // Throttled measurement update (only from the pane that owns measurement)
        if (reportMeas && ts - lastUpdRef.current > 200) {
            lastUpdRef.current = ts;
            const totalT = state.timebase * cols;
            const freq = (crossings / 2) / (totalT / 1e6);
            onMeas({
                vppH: maxH - minH,
                vppL: maxL - minL,
                vppD: maxD - minD,
                freq,
                rmsD: Math.sqrt(sumSq / N),
                rise: 92 + Math.random() * 8,
                fall: 86 + Math.random() * 8,
            });
        }
    }, [state, signal, fftMode, cursorsOn, cursors, persistence, traceGlow, onMeas, channelSet, reportMeas, sync]);

    useEffect(() => { renderRef.current = doRender; }, [doRender]);
    useEffect(() => { stateRef.current = state; }, [state]);
    useEffect(() => { onPanChangeRef.current = onPanChange; }, [onPanChange]);

    useImperativeHandle(ref, () => ({
        reset: () => {
            sync.current.zoom = 1.0;
            sync.current.pan = 0;
            onPanChangeRef.current?.(0);
            if (onStateChange) {
                onStateChange({
                    ...stateRef.current,
                    axisOffsetY: 0,
                    channels: {
                        h: { ...stateRef.current.channels.h, off: 0 },
                        l: { ...stateRef.current.channels.l, off: 0 },
                        d: { ...stateRef.current.channels.d, off: 0 },
                    },
                });
            }
        },
    }), [onStateChange, sync]);

    useEffect(() => {
        if (persistence) {
            const c = document.createElement('canvas');
            const canvas = canvasRef.current;
            if (canvas) { c.width = canvas.width; c.height = canvas.height; }
            persistRef.current = c;
        } else {
            persistRef.current = null;
        }
    }, [persistence]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const AXIS_HIT_W = 60; // px from canvas left counted as Y-axis gutter
        const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
        const relX = (clientX: number) => clientX - canvasRectRef.current.left;

        const scaleVpd = (factor: number) => {
            const s = stateRef.current;
            if (channelSet === 'diff') {
                const v = clamp(s.channels.d.vpd / factor, 0.1, 10);
                onStateChange?.({
                    ...s,
                    channels: { ...s.channels, d: { ...s.channels.d, vpd: v } },
                });
            } else if (channelSet === 'lines') {
                const v = clamp(s.channels.h.vpd / factor, 0.1, 10);
                onStateChange?.({
                    ...s,
                    channels: {
                        ...s.channels,
                        h: { ...s.channels.h, vpd: v },
                        l: { ...s.channels.l, vpd: v },
                    },
                });
            } else {
                const v = clamp(s.channels.h.vpd / factor, 0.1, 10);
                onStateChange?.({
                    ...s,
                    channels: {
                        h: { ...s.channels.h, vpd: v },
                        l: { ...s.channels.l, vpd: v },
                        d: { ...s.channels.d, vpd: v },
                    },
                });
            }
        };

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.25 : 1 / 1.25;
            if (relX(e.clientX) < AXIS_HIT_W) {
                // Wheel over Y-axis gutter expands/compresses V/div for this pane
                scaleVpd(factor);
            } else {
                sync.current.zoom = clamp(sync.current.zoom * factor, 0.25, 16);
            }
        };

        const onPointerDown = (e: PointerEvent) => {
            // Ignore secondary buttons / non-primary touches
            if (e.button !== undefined && e.button !== 0) return;
            e.preventDefault();
            try { canvas.setPointerCapture(e.pointerId); } catch { /* Safari quirks */ }

            const isAxisArea = relX(e.clientX) < AXIS_HIT_W;
            const dragMode = isAxisArea ? 'axis' : 'graph';
            const s = stateRef.current;
            const dragVpd = channelSet === 'diff' ? s.channels.d.vpd : s.channels.h.vpd;

            dragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                startPan: sync.current.pan,
                startOffsetH: s.channels.h.off,
                startOffsetL: s.channels.l.off,
                startOffsetD: s.channels.d.off,
                startAxisOffsetY: s.axisOffsetY,
                vpd: dragVpd,
                dragMode,
            };
            canvas.style.cursor = dragMode === 'axis' ? 'ns-resize' : 'grabbing';
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!dragRef.current) {
                // Hover feedback so users discover the axis hit zone
                canvas.style.cursor = relX(e.clientX) < AXIS_HIT_W ? 'ns-resize' : 'crosshair';
                return;
            }
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;

            // X-pan is only applied in graph mode — axis mode must not leak into time axis
            if (dragRef.current.dragMode === 'graph') {
                sync.current.pan = dragRef.current.startPan - (dx / canvas.clientWidth) / sync.current.zoom;
                const { timebase } = stateRef.current;
                const panUs = sync.current.pan * timebase * 10;
                onPanChangeRef.current?.(panUs);
            }

            if (rowHRef.current > 0) {
                if (dragRef.current.dragMode === 'axis') {
                    const axisOffsetChange = (dy / rowHRef.current) * dragRef.current.vpd;
                    if (channelSet === 'diff') {
                        onStateChange?.({
                            ...stateRef.current,
                            channels: {
                                ...stateRef.current.channels,
                                d: { ...stateRef.current.channels.d, off: dragRef.current.startOffsetD + axisOffsetChange },
                            },
                        });
                    } else {
                        onStateChange?.({
                            ...stateRef.current,
                            axisOffsetY: dragRef.current.startAxisOffsetY + axisOffsetChange,
                        });
                    }
                } else {
                    const offsetChange = -(dy / rowHRef.current) * dragRef.current.vpd;
                    if (channelSet === 'diff') {
                        onStateChange?.({
                            ...stateRef.current,
                            channels: {
                                ...stateRef.current.channels,
                                d: { ...stateRef.current.channels.d, off: dragRef.current.startOffsetD + offsetChange },
                            },
                        });
                    } else if (channelSet === 'lines') {
                        onStateChange?.({
                            ...stateRef.current,
                            channels: {
                                ...stateRef.current.channels,
                                h: { ...stateRef.current.channels.h, off: dragRef.current.startOffsetH + offsetChange },
                                l: { ...stateRef.current.channels.l, off: dragRef.current.startOffsetL + offsetChange },
                            },
                        });
                    } else {
                        onStateChange?.({
                            ...stateRef.current,
                            axisOffsetY: dragRef.current.startAxisOffsetY,
                            channels: {
                                h: { ...stateRef.current.channels.h, off: dragRef.current.startOffsetH + offsetChange },
                                l: { ...stateRef.current.channels.l, off: dragRef.current.startOffsetL + offsetChange },
                                d: { ...stateRef.current.channels.d, off: dragRef.current.startOffsetD + offsetChange },
                            },
                        });
                    }
                }
            }
        };

        const onPointerUp = (e: PointerEvent) => {
            dragRef.current = null;
            try { canvas.releasePointerCapture(e.pointerId); } catch { /* noop */ }
            canvas.style.cursor = relX(e.clientX) < AXIS_HIT_W ? 'ns-resize' : 'crosshair';
        };

        canvas.style.cursor = 'crosshair';
        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);

        return () => {
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointercancel', onPointerUp);
        };
    }, [channelSet, onStateChange, sync]);

    useEffect(() => {
        const loop = (ts: number) => {
            renderRef.current(ts);
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, []);

    return <canvas ref={canvasRef} />;
});
