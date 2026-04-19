import React, { useRef, useEffect, useCallback } from 'react';
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
}

export const WaveformViewer: React.FC<WaveformViewerProps> = ({
    state, signal, fftMode, cursorsOn, cursors, persistence, traceGlow, onMeas, onStateChange,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef(0);
    const scrollRef = useRef(0);
    const persistRef = useRef<HTMLCanvasElement | null>(null);
    const renderRef = useRef<(ts: number) => void>(() => { });
    const lastUpdRef = useRef(0);
    const zoomRef = useRef(1.0);
    const panRef = useRef(0);
    const dragRef = useRef<{ startX: number; startY: number; startPan: number; startOffsetH: number; startOffsetL: number; startOffsetD: number; vpd: number } | null>(null);
    const rowHRef = useRef(0);
    const stateRef = useRef(state);

    const doRender = useCallback((ts: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const parent = canvas.parentElement;
        if (!parent) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = parent.clientWidth;
        const h = parent.clientHeight;

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

        const zoom = zoomRef.current;
        const effectiveTb = state.timebase / zoom;

        // Axis labels
        ctx.fillStyle = inkFaint;
        ctx.font = `10px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'left';
        const vpd = state.channels.h.vpd;
        for (let i = 0; i <= rows; i++) {
            const y = i * rowH;
            const v = ((rows / 2 - i) * vpd).toFixed(1);
            ctx.fillText(`${v}V`, 4, Math.max(10, Math.min(wh - 2, y + 3)));
        }
        ctx.textAlign = 'center';
        for (let i = 0; i <= cols; i++) {
            const x = i * colW;
            const t = ((i - cols / 2) * effectiveTb).toFixed(0);
            ctx.fillText(`${t}µs`, x, wh + 14);
        }

        // Generate signals
        scrollRef.current = state.running ? (scrollRef.current + 0.004 / zoom) : scrollRef.current;
        const N = Math.ceil(w / zoom);
        const { H, L, D } = GENERATORS[signal](N, scrollRef.current + panRef.current);

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

        const vToY = (v: number, vpdScale: number, offset: number) => {
            const center = wh / 2 - (offset / vpdScale) * rowH;
            return center - ((v - 2.5) / vpdScale) * rowH;
        };

        const drawTrace = (arr: Float32Array, color: string, vpdScale: number, offset: number) => {
            if (traceGlow) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
            else { ctx.shadowBlur = 0; }
            ctx.strokeStyle = color; ctx.lineWidth = 1.8;
            ctx.beginPath();
            for (let i = 0; i < N; i++) {
                const x = i * zoom;
                const y = vToY(arr[i], vpdScale, offset);
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
                        const y = vToY(arr[i], vpdScale, offset);
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

        if (fftMode) {
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
        } else {
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
            if (state.channels.h.on) drawTrace(H, ch1c, state.channels.h.vpd, state.channels.h.off);
            if (state.channels.l.on) drawTrace(L, ch2c, state.channels.l.vpd, state.channels.l.off);
            if (state.channels.d.on) drawTrace(D, chdc, state.channels.d.vpd, state.channels.d.off);
        }

        // Trigger line (clipped to waveform area)
        if (!fftMode) {
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

        // Zoom indicator
        if (zoom !== 1.0) {
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

        // Cursors
        if (cursorsOn && !fftMode) {
            ctx.save();
            ctx.strokeStyle = accent + 'CC'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
            const totalUs = effectiveTb * cols;
            const x1 = (cursors.t1 / totalUs + 0.5) * w;
            const x2 = (cursors.t2 / totalUs + 0.5) * w;
            ctx.beginPath();
            ctx.moveTo(x1, 0); ctx.lineTo(x1, h);
            ctx.moveTo(x2, 0); ctx.lineTo(x2, h);
            const y1 = vToY(cursors.v1, state.channels.d.vpd, state.channels.d.off);
            const y2 = vToY(cursors.v2, state.channels.d.vpd, state.channels.d.off);
            ctx.moveTo(0, y1); ctx.lineTo(w, y1);
            ctx.moveTo(0, y2); ctx.lineTo(w, y2);
            ctx.stroke(); ctx.setLineDash([]);
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
            ctx.restore();
        }

        // Throttled measurement update
        if (ts - lastUpdRef.current > 200) {
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
    }, [state, signal, fftMode, cursorsOn, cursors, persistence, traceGlow, onMeas]);

    useEffect(() => { renderRef.current = doRender; }, [doRender]);
    useEffect(() => { stateRef.current = state; }, [state]);

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

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.25 : 1 / 1.25;
            zoomRef.current = Math.max(0.25, Math.min(16, zoomRef.current * factor));
        };

        const onMouseDown = (e: MouseEvent) => {
            dragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                startPan: panRef.current,
                startOffsetH: state.channels.h.off,
                startOffsetL: state.channels.l.off,
                startOffsetD: state.channels.d.off,
                vpd: state.channels.d.vpd,
            };
            canvas.style.cursor = 'grabbing';
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!dragRef.current) return;
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;

            panRef.current = dragRef.current.startPan - (dx / canvas.clientWidth) / zoomRef.current;

            if (rowHRef.current > 0) {
                const offsetChange = -(dy / rowHRef.current) * dragRef.current.vpd;
                onStateChange?.({
                    ...stateRef.current,
                    channels: {
                        h: { ...stateRef.current.channels.h, off: dragRef.current.startOffsetH + offsetChange },
                        l: { ...stateRef.current.channels.l, off: dragRef.current.startOffsetL + offsetChange },
                        d: { ...stateRef.current.channels.d, off: dragRef.current.startOffsetD + offsetChange },
                    },
                });
            }
        };

        const onMouseUp = () => {
            dragRef.current = null;
            canvas.style.cursor = 'crosshair';
        };

        const onDblClick = () => {
            zoomRef.current = 1.0;
            panRef.current = 0;
        };

        canvas.style.cursor = 'crosshair';
        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('dblclick', onDblClick);

        return () => {
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('dblclick', onDblClick);
        };
    }, []);

    useEffect(() => {
        const loop = (ts: number) => {
            renderRef.current(ts);
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, []);

    return <canvas ref={canvasRef} />;
};
