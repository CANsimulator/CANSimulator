import React, { useEffect, useRef, useState, useCallback } from 'react';

// ─── Scope Constants ────────────────────────────────────────
const BASE_W = 800;
const BASE_H = 480;
const MARGIN = { top: 32, right: 60, bottom: 40, left: 64 };
const PLOT_W = BASE_W - MARGIN.left - MARGIN.right;
const PLOT_H = BASE_H - MARGIN.top - MARGIN.bottom;

const VDIV_OPTIONS = [0.2, 0.5, 1, 2, 5] as const;
const TDIV_OPTIONS = [10, 20, 50, 100, 200, 500] as const; // µs per division

type VDiv = (typeof VDIV_OPTIONS)[number];
type TDiv = (typeof TDIV_OPTIONS)[number];
type TriggerEdge = 'rising' | 'falling';
type TriggerSource = 'CH1' | 'CH2';
type RunMode = 'run' | 'stop' | 'single';

interface ChannelConfig {
    enabled: boolean;
    vdiv: VDiv;
    offset: number;
}

interface ScopeState {
    ch1: ChannelConfig;
    ch2: ChannelConfig;
    math: boolean;
    tdiv: TDiv;
    triggerSource: TriggerSource;
    triggerLevel: number;
    triggerEdge: TriggerEdge;
    runMode: RunMode;
}

interface ViewState {
    zoomX: number; // 1 = default
    zoomY: number;
    panX: number;  // in pixels offset
    panY: number;
}

interface SamplePoint {
    canh: number;
    canl: number;
    isDominant: boolean;
    t: number; // sample index / time
}

// ─── Colors ──────────────────────────────────────────────────
const COLORS = {
    ch1: '#00d4ff',
    ch1Glow: 'rgba(0,212,255,0.15)',
    ch2: '#c850ff',
    ch2Glow: 'rgba(200,80,255,0.15)',
    math: '#00ff88',
    mathGlow: 'rgba(0,255,136,0.15)',
    trigger: '#ffd000',
    grid: 'rgba(255,255,255,0.06)',
    gridMajor: 'rgba(255,255,255,0.12)',
    axisLabel: 'rgba(255,255,255,0.45)',
    axisValue: 'rgba(255,255,255,0.65)',
    bg: '#0a0a10',
    plotBg: '#060610',
    border: '#1a1a2e',
};

// ─── Waveform Generator ─────────────────────────────────────
function generateSample(prev: SamplePoint | null, index: number): SamplePoint {
    const wasDominant = prev?.isDominant ?? false;
    let isDominant: boolean;
    if (wasDominant) {
        isDominant = Math.random() > 0.35;
    } else {
        isDominant = Math.random() > 0.55;
    }

    const noise = () => (Math.random() - 0.5) * 0.1;
    const wasTransition = prev ? prev.isDominant !== isDominant : false;
    const ringing = wasTransition ? (Math.random() - 0.5) * 0.18 : 0;

    const canh = isDominant ? 3.5 + noise() + ringing : 2.5 + noise() * 0.3;
    const canl = isDominant ? 1.5 + noise() + ringing : 2.5 + noise() * 0.3;

    return { canh, canl, isDominant, t: index };
}

function stepOption<T>(options: readonly T[], current: T, dir: 1 | -1): T {
    const idx = options.indexOf(current);
    const next = idx + dir;
    if (next < 0 || next >= options.length) return current;
    return options[next];
}

function clamp(v: number, min: number, max: number) {
    return Math.min(max, Math.max(min, v));
}

// ─── Component ──────────────────────────────────────────────
export const VoltageScope: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const samplesRef = useRef<SamplePoint[]>([]);
    const animRef = useRef<number>(0);
    const lastTick = useRef<number>(0);
    const sampleCounter = useRef<number>(0);
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0 });
    const viewStart = useRef({ panX: 0, panY: 0 });

    const [scope, setScope] = useState<ScopeState>({
        ch1: { enabled: true, vdiv: 1, offset: 0 },
        ch2: { enabled: true, vdiv: 1, offset: 0 },
        math: false,
        tdiv: 100,
        triggerSource: 'CH1',
        triggerLevel: 2.5,
        triggerEdge: 'rising',
        runMode: 'run',
    });

    const [view, setView] = useState<ViewState>({
        zoomX: 1,
        zoomY: 1,
        panX: 0,
        panY: 0,
    });

    const [measurements, setMeasurements] = useState({
        ch1Vpp: 0, ch1Avg: 0,
        ch2Vpp: 0, ch2Avg: 0,
        vdiff: 0, freq: 0,
    });

    const scopeRef = useRef(scope);
    const viewRef = useRef(view);
    useEffect(() => { scopeRef.current = scope; }, [scope]);
    useEffect(() => { viewRef.current = view; }, [view]);

    // ─── Coordinate transforms ──────────────────────────────
    const vToY = useCallback((v: number, ch: ChannelConfig, vw: ViewState) => {
        const center = PLOT_H / 2;
        const pxPerVolt = (PLOT_H / 8) / ch.vdiv; // 8 divisions
        const baseY = center - (v - 2.5 + ch.offset) * pxPerVolt;
        return (baseY - PLOT_H / 2) * vw.zoomY + PLOT_H / 2 + vw.panY;
    }, []);

    const sampleToX = useCallback((i: number, total: number, vw: ViewState) => {
        const baseX = (i / Math.max(total - 1, 1)) * PLOT_W;
        return (baseX - PLOT_W / 2) * vw.zoomX + PLOT_W / 2 + vw.panX;
    }, []);

    // ─── Drawing ────────────────────────────────────────────
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const s = scopeRef.current;
        const vw = viewRef.current;
        const samples = samplesRef.current;

        const dpr = window.devicePixelRatio || 1;
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
            canvas.width = cw * dpr;
            canvas.height = ch * dpr;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Background
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, cw, ch);

        // Plot area background
        ctx.fillStyle = COLORS.plotBg;
        ctx.fillRect(MARGIN.left, MARGIN.top, PLOT_W, PLOT_H);

        ctx.save();
        ctx.beginPath();
        ctx.rect(MARGIN.left, MARGIN.top, PLOT_W, PLOT_H);
        ctx.clip();
        ctx.translate(MARGIN.left, MARGIN.top);

        // ── Grid ──
        const gridDivsX = 10;
        const gridDivsY = 8;

        // Vertical grid lines
        for (let i = 0; i <= gridDivsX; i++) {
            const baseX = (i / gridDivsX) * PLOT_W;
            const x = (baseX - PLOT_W / 2) * vw.zoomX + PLOT_W / 2 + vw.panX;
            if (x < -1 || x > PLOT_W + 1) continue;
            ctx.strokeStyle = i === gridDivsX / 2 ? COLORS.gridMajor : COLORS.grid;
            ctx.lineWidth = i === gridDivsX / 2 ? 1 : 0.5;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, PLOT_H);
            ctx.stroke();

            // Sub-divisions (small ticks on center axis)
            if (i < gridDivsX) {
                for (let sub = 1; sub < 5; sub++) {
                    const subX = ((i + sub / 5) / gridDivsX) * PLOT_W;
                    const sx = (subX - PLOT_W / 2) * vw.zoomX + PLOT_W / 2 + vw.panX;
                    if (sx < 0 || sx > PLOT_W) continue;
                    const cy = PLOT_H / 2 + vw.panY;
                    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(sx, cy - 3);
                    ctx.lineTo(sx, cy + 3);
                    ctx.stroke();
                }
            }
        }

        // Horizontal grid lines
        for (let i = 0; i <= gridDivsY; i++) {
            const baseY = (i / gridDivsY) * PLOT_H;
            const y = (baseY - PLOT_H / 2) * vw.zoomY + PLOT_H / 2 + vw.panY;
            if (y < -1 || y > PLOT_H + 1) continue;
            ctx.strokeStyle = i === gridDivsY / 2 ? COLORS.gridMajor : COLORS.grid;
            ctx.lineWidth = i === gridDivsY / 2 ? 1 : 0.5;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(PLOT_W, y);
            ctx.stroke();

            // Sub-divisions on center axis
            if (i < gridDivsY) {
                for (let sub = 1; sub < 5; sub++) {
                    const subY = ((i + sub / 5) / gridDivsY) * PLOT_H;
                    const sy = (subY - PLOT_H / 2) * vw.zoomY + PLOT_H / 2 + vw.panY;
                    if (sy < 0 || sy > PLOT_H) continue;
                    const cx = PLOT_W / 2 + vw.panX;
                    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(cx - 3, sy);
                    ctx.lineTo(cx + 3, sy);
                    ctx.stroke();
                }
            }
        }

        if (samples.length >= 2) {
            // ── Trigger level ──
            const trigCh = s.triggerSource === 'CH1' ? s.ch1 : s.ch2;
            const trigY = vToY(s.triggerLevel, trigCh, vw);
            ctx.strokeStyle = 'rgba(255,208,0,0.3)';
            ctx.setLineDash([6, 4]);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, trigY);
            ctx.lineTo(PLOT_W, trigY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Trigger label
            ctx.fillStyle = COLORS.trigger;
            ctx.font = '600 9px "Inter", system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`T ${s.triggerLevel.toFixed(1)}V`, PLOT_W - 4, clamp(trigY - 4, 12, PLOT_H - 4));

            // ── Draw waveform traces ──
            const drawTrace = (getData: (s: SamplePoint) => number, chConfig: ChannelConfig, color: string, glowColor: string) => {
                const points: { x: number; y: number }[] = [];
                for (let i = 0; i < samples.length; i++) {
                    const x = sampleToX(i, samples.length, vw);
                    const y = vToY(getData(samples[i]), chConfig, vw);
                    points.push({ x, y });
                }

                // Intensity gradient (Z-axis): fade older samples
                // Also compute velocity for intensity modulation
                const drawSegments = (lineWidth: number, alpha: number, isGlow: boolean) => {
                    for (let i = 1; i < points.length; i++) {
                        const p0 = points[i - 1];
                        const p1 = points[i];

                        // Z-axis intensity: recent samples brighter, fast transitions brighter
                        const age = 1 - (i / points.length) * 0.3; // slight fade for older
                        const dy = Math.abs(p1.y - p0.y);
                        const velocity = Math.min(dy / 50, 1);
                        // Fast edges = dimmer (like a real scope beam), slow = brighter
                        const intensityZ = age * (1 - velocity * 0.5);

                        ctx.globalAlpha = alpha * intensityZ;
                        ctx.strokeStyle = isGlow ? glowColor : color;
                        ctx.lineWidth = isGlow ? lineWidth + (1 - velocity) * 4 : lineWidth;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        ctx.beginPath();
                        ctx.moveTo(p0.x, p0.y);
                        ctx.lineTo(p1.x, p1.y);
                        ctx.stroke();
                    }
                    ctx.globalAlpha = 1;
                };

                // Glow layer (wider, dimmer)
                drawSegments(5, 0.12, true);
                // Main trace
                drawSegments(2, 0.85, false);
                // Bright core
                drawSegments(0.8, 0.4, false);
                // White hot center for slow-moving beam
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                for (let i = 0; i < points.length; i++) {
                    if (i === 0) ctx.moveTo(points[i].x, points[i].y);
                    else ctx.lineTo(points[i].x, points[i].y);
                }
                ctx.stroke();

                // Sample dots at data points (visible when zoomed in)
                if (vw.zoomX > 2) {
                    ctx.fillStyle = color;
                    ctx.globalAlpha = 0.7;
                    for (const p of points) {
                        if (p.x < -5 || p.x > PLOT_W + 5) continue;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.globalAlpha = 1;
                }
            };

            if (s.ch1.enabled) {
                drawTrace(p => p.canh, s.ch1, COLORS.ch1, COLORS.ch1Glow);
            }
            if (s.ch2.enabled) {
                drawTrace(p => p.canl, s.ch2, COLORS.ch2, COLORS.ch2Glow);
            }
            if (s.math) {
                const mathCh: ChannelConfig = { enabled: true, vdiv: s.ch1.vdiv, offset: -2.5 + s.ch1.offset };
                drawTrace(p => p.canh - p.canl, mathCh, COLORS.math, COLORS.mathGlow);
            }
        }

        ctx.restore();

        // ── Plot border ──
        ctx.strokeStyle = COLORS.border;
        ctx.lineWidth = 1;
        ctx.strokeRect(MARGIN.left, MARGIN.top, PLOT_W, PLOT_H);

        // ── Y-axis labels (voltage) ──
        ctx.font = '10px "JetBrains Mono", "Fira Code", monospace';
        ctx.textAlign = 'right';
        const gridDivsYCount = 8;
        const activeCh = s.ch1.enabled ? s.ch1 : s.ch2;
        for (let i = 0; i <= gridDivsYCount; i++) {
            const baseY = (i / gridDivsYCount) * PLOT_H;
            const y = (baseY - PLOT_H / 2) * vw.zoomY + PLOT_H / 2 + vw.panY;
            const screenY = y + MARGIN.top;
            if (screenY < MARGIN.top - 5 || screenY > MARGIN.top + PLOT_H + 5) continue;

            // Convert pixel back to voltage
            const v = 2.5 - activeCh.offset + (PLOT_H / 2 - baseY) / ((PLOT_H / 8) / activeCh.vdiv);

            ctx.fillStyle = COLORS.axisValue;
            ctx.fillText(`${v.toFixed(1)}V`, MARGIN.left - 8, screenY + 3);

            // Small tick
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(MARGIN.left - 4, screenY);
            ctx.lineTo(MARGIN.left, screenY);
            ctx.stroke();
        }

        // ── X-axis labels (time) ──
        ctx.textAlign = 'center';
        for (let i = 0; i <= 10; i++) {
            const baseX = (i / 10) * PLOT_W;
            const x = (baseX - PLOT_W / 2) * vw.zoomX + PLOT_W / 2 + vw.panX;
            const screenX = x + MARGIN.left;
            if (screenX < MARGIN.left - 10 || screenX > MARGIN.left + PLOT_W + 10) continue;

            const t = i * s.tdiv;
            ctx.fillStyle = COLORS.axisValue;
            ctx.fillText(`${t}µs`, screenX, MARGIN.top + PLOT_H + 16);

            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(screenX, MARGIN.top + PLOT_H);
            ctx.lineTo(screenX, MARGIN.top + PLOT_H + 4);
            ctx.stroke();
        }

        // ── Axis titles ──
        ctx.font = '10px "Inter", system-ui, sans-serif';
        ctx.fillStyle = COLORS.axisLabel;
        ctx.textAlign = 'center';
        ctx.fillText('Time', MARGIN.left + PLOT_W / 2, MARGIN.top + PLOT_H + 32);

        ctx.save();
        ctx.translate(14, MARGIN.top + PLOT_H / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Voltage', 0, 0);
        ctx.restore();

        // ── Top info bar ──
        ctx.font = '600 10px "JetBrains Mono", "Fira Code", monospace';
        const infoY = 16;

        // Channel indicators
        let infoX = MARGIN.left;
        if (s.ch1.enabled) {
            ctx.fillStyle = COLORS.ch1;
            ctx.textAlign = 'left';
            ctx.fillText(`CH1 ${s.ch1.vdiv}V/div CANH`, infoX, infoY);
            infoX += 160;
        }
        if (s.ch2.enabled) {
            ctx.fillStyle = COLORS.ch2;
            ctx.textAlign = 'left';
            ctx.fillText(`CH2 ${s.ch2.vdiv}V/div CANL`, infoX, infoY);
            infoX += 160;
        }
        if (s.math) {
            ctx.fillStyle = COLORS.math;
            ctx.textAlign = 'left';
            ctx.fillText(`MATH CH1−CH2`, infoX, infoY);
        }

        // Right side: timebase + run mode + zoom
        ctx.textAlign = 'right';
        ctx.fillStyle = COLORS.axisLabel;
        ctx.fillText(`${s.tdiv}µs/div`, MARGIN.left + PLOT_W, infoY);

        ctx.fillStyle = s.runMode === 'run' ? '#00ff88' : '#ff4444';
        ctx.fillText(
            s.runMode === 'run' ? '● RUN' : s.runMode === 'single' ? '● ARMED' : '● STOP',
            MARGIN.left + PLOT_W - 90, infoY
        );

        // Zoom indicator
        if (vw.zoomX !== 1 || vw.zoomY !== 1) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillText(`Zoom: ${vw.zoomX.toFixed(1)}x × ${vw.zoomY.toFixed(1)}x`, MARGIN.left + PLOT_W - 180, infoY);
        }

        // ── Channel ground markers on left edge of plot ──
        if (s.ch1.enabled) {
            const gndY = vToY(2.5, s.ch1, vw) + MARGIN.top;
            if (gndY > MARGIN.top && gndY < MARGIN.top + PLOT_H) {
                ctx.fillStyle = COLORS.ch1;
                ctx.beginPath();
                ctx.moveTo(MARGIN.left, gndY);
                ctx.lineTo(MARGIN.left - 8, gndY - 5);
                ctx.lineTo(MARGIN.left - 8, gndY + 5);
                ctx.fill();
            }
        }
        if (s.ch2.enabled) {
            const gndY = vToY(2.5, s.ch2, vw) + MARGIN.top;
            if (gndY > MARGIN.top && gndY < MARGIN.top + PLOT_H) {
                ctx.fillStyle = COLORS.ch2;
                ctx.beginPath();
                ctx.moveTo(MARGIN.left, gndY);
                ctx.lineTo(MARGIN.left - 8, gndY - 5);
                ctx.lineTo(MARGIN.left - 8, gndY + 5);
                ctx.fill();
            }
        }

    }, [vToY, sampleToX]);

    // ─── Compute measurements ───────────────────────────────
    const computeMeasurements = useCallback(() => {
        const samples = samplesRef.current;
        if (samples.length < 10) return;

        const ch1Vals = samples.map(s => s.canh);
        const ch2Vals = samples.map(s => s.canl);

        const ch1Min = Math.min(...ch1Vals);
        const ch1Max = Math.max(...ch1Vals);
        const ch2Min = Math.min(...ch2Vals);
        const ch2Max = Math.max(...ch2Vals);

        const ch1Avg = ch1Vals.reduce((a, b) => a + b) / ch1Vals.length;
        const ch2Avg = ch2Vals.reduce((a, b) => a + b) / ch2Vals.length;

        let transitions = 0;
        for (let i = 1; i < samples.length; i++) {
            if (samples[i].isDominant !== samples[i - 1].isDominant) transitions++;
        }

        setMeasurements({
            ch1Vpp: ch1Max - ch1Min,
            ch1Avg,
            ch2Vpp: ch2Max - ch2Min,
            ch2Avg,
            vdiff: ch1Avg - ch2Avg,
            freq: transitions * 2,
        });
    }, []);

    // ─── Animation loop ─────────────────────────────────────
    const tick = useCallback((time: number) => {
        const s = scopeRef.current;
        const interval = s.tdiv / 2;

        if (s.runMode !== 'stop' && time - lastTick.current > interval) {
            const prev = samplesRef.current.length > 0
                ? samplesRef.current[samplesRef.current.length - 1]
                : null;
            const sample = generateSample(prev, sampleCounter.current++);
            samplesRef.current.push(sample);

            const maxSamples = 120;
            if (samplesRef.current.length > maxSamples) {
                samplesRef.current = samplesRef.current.slice(-maxSamples);
            }

            if (s.runMode === 'single' && samplesRef.current.length >= maxSamples) {
                setScope(prev => ({ ...prev, runMode: 'stop' }));
            }

            lastTick.current = time;
        }

        draw();
        animRef.current = requestAnimationFrame(tick);
    }, [draw]);

    useEffect(() => {
        animRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animRef.current);
    }, [tick]);

    useEffect(() => {
        const interval = setInterval(computeMeasurements, 500);
        return () => clearInterval(interval);
    }, [computeMeasurements]);

    // ─── Zoom with mouse wheel ──────────────────────────────
    const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;

        // Get mouse position relative to plot area
        const rect = canvasRef.current!.getBoundingClientRect();
        const mx = e.clientX - rect.left - MARGIN.left * (rect.width / BASE_W);
        const my = e.clientY - rect.top - MARGIN.top * (rect.height / BASE_H);

        setView(prev => {
            if (e.shiftKey) {
                // Shift+wheel: zoom Y only
                const newZoomY = clamp(prev.zoomY * factor, 0.25, 20);
                const plotMy = my / (rect.height / BASE_H);
                const newPanY = plotMy - (plotMy - prev.panY) * (newZoomY / prev.zoomY);
                return { ...prev, zoomY: newZoomY, panY: newPanY };
            } else if (e.ctrlKey) {
                // Ctrl+wheel: zoom X only
                const newZoomX = clamp(prev.zoomX * factor, 0.25, 20);
                const plotMx = mx / (rect.width / BASE_W);
                const newPanX = plotMx - (plotMx - prev.panX) * (newZoomX / prev.zoomX);
                return { ...prev, zoomX: newZoomX, panX: newPanX };
            } else {
                // Default: zoom both axes uniformly
                const newZoomX = clamp(prev.zoomX * factor, 0.25, 20);
                const newZoomY = clamp(prev.zoomY * factor, 0.25, 20);
                const plotMx = mx / (rect.width / BASE_W);
                const plotMy = my / (rect.height / BASE_H);
                const newPanX = plotMx - (plotMx - prev.panX) * (newZoomX / prev.zoomX);
                const newPanY = plotMy - (plotMy - prev.panY) * (newZoomY / prev.zoomY);
                return { zoomX: newZoomX, zoomY: newZoomY, panX: newPanX, panY: newPanY };
            }
        });
    }, []);

    // ─── Pan with middle-click or right-click drag ──────────
    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        // Middle button (1) or right button (2) for panning, left (0) for trigger
        if (e.button === 1 || e.button === 2) {
            isPanning.current = true;
            panStart.current = { x: e.clientX, y: e.clientY };
            viewStart.current = { panX: viewRef.current.panX, panY: viewRef.current.panY };
            e.currentTarget.setPointerCapture(e.pointerId);
            e.preventDefault();
        } else if (e.button === 0) {
            // Left click: adjust trigger
            const rect = canvasRef.current!.getBoundingClientRect();
            const normY = clamp((e.clientY - rect.top) / rect.height, 0, 1);
            const triggerLevel = Number((5 - normY * 5).toFixed(1));
            setScope(prev => ({ ...prev, triggerLevel }));
        }
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (isPanning.current) {
            const rect = canvasRef.current!.getBoundingClientRect();
            const scaleX = BASE_W / rect.width;
            const scaleY = BASE_H / rect.height;
            const dx = (e.clientX - panStart.current.x) * scaleX;
            const dy = (e.clientY - panStart.current.y) * scaleY;
            setView(prev => ({
                ...prev,
                panX: viewStart.current.panX + dx,
                panY: viewStart.current.panY + dy,
            }));
        }
    }, []);

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (isPanning.current) {
            isPanning.current = false;
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
        }
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); // Prevent context menu when right-click panning
    }, []);

    // ─── Keyboard shortcuts ─────────────────────────────────
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case '+':
            case '=':
                setView(prev => ({
                    ...prev,
                    zoomX: clamp(prev.zoomX * 1.2, 0.25, 20),
                    zoomY: clamp(prev.zoomY * 1.2, 0.25, 20),
                }));
                break;
            case '-':
                setView(prev => ({
                    ...prev,
                    zoomX: clamp(prev.zoomX / 1.2, 0.25, 20),
                    zoomY: clamp(prev.zoomY / 1.2, 0.25, 20),
                }));
                break;
            case 'r':
            case 'R':
                setView({ zoomX: 1, zoomY: 1, panX: 0, panY: 0 });
                break;
            case ' ':
                e.preventDefault();
                setScope(prev => ({ ...prev, runMode: prev.runMode === 'run' ? 'stop' : 'run' }));
                break;
            case 'Enter':
                e.preventDefault();
                samplesRef.current = [];
                setScope(prev => ({ ...prev, runMode: 'single' }));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setScope(prev => ({ ...prev, triggerLevel: Math.min(5, prev.triggerLevel + 0.1) }));
                break;
            case 'ArrowDown':
                e.preventDefault();
                setScope(prev => ({ ...prev, triggerLevel: Math.max(0, prev.triggerLevel - 0.1) }));
                break;
        }
    }, []);

    // ─── Control helpers ────────────────────────────────────
    const updateCh = (ch: 'ch1' | 'ch2', updates: Partial<ChannelConfig>) => {
        setScope(prev => ({ ...prev, [ch]: { ...prev[ch], ...updates } }));
    };

    const resetView = () => setView({ zoomX: 1, zoomY: 1, panX: 0, panY: 0 });

    const zoomIn = () => setView(prev => ({
        ...prev,
        zoomX: clamp(prev.zoomX * 1.3, 0.25, 20),
        zoomY: clamp(prev.zoomY * 1.3, 0.25, 20),
    }));

    const zoomOut = () => setView(prev => ({
        ...prev,
        zoomX: clamp(prev.zoomX / 1.3, 0.25, 20),
        zoomY: clamp(prev.zoomY / 1.3, 0.25, 20),
    }));

    return (
        <div className="space-y-0">
            <div className="bg-[#0e0e14] rounded-xl border border-[#1a1a2e] p-3 sm:p-4 shadow-lg">
                {/* ─── Header ─── */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-300 tracking-wide">CAN-SCOPE</span>
                        <span className="text-[9px] text-gray-600 font-mono">CSO-2000</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Zoom controls */}
                        <div className="flex items-center gap-1">
                            <ZoomButton label="−" onClick={zoomOut} title="Zoom out" />
                            <button
                                onClick={resetView}
                                className="px-2 py-0.5 text-[9px] font-mono text-gray-500 hover:text-white bg-[#111118] border border-[#222] rounded transition-colors"
                                title="Reset zoom (R)"
                            >
                                {view.zoomX !== 1 || view.zoomY !== 1
                                    ? `${view.zoomX.toFixed(1)}x`
                                    : '1:1'}
                            </button>
                            <ZoomButton label="+" onClick={zoomIn} title="Zoom in" />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${scope.runMode === 'run' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : scope.runMode === 'single' ? 'bg-amber-400' : 'bg-red-400'}`} />
                            <span className="text-[9px] font-mono text-gray-500 uppercase">
                                {scope.runMode === 'run' ? 'Running' : scope.runMode === 'single' ? 'Armed' : 'Stopped'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ─── Display + Measurements ─── */}
                <div className="flex flex-col xl:flex-row gap-3">
                    {/* Graph Canvas */}
                    <div className="flex-1 relative">
                        <canvas
                            ref={canvasRef}
                            className="w-full rounded-lg cursor-crosshair touch-none focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/50"
                            style={{ aspectRatio: `${BASE_W}/${BASE_H}` }}
                            tabIndex={0}
                            role="img"
                            aria-label="CAN bus oscilloscope — scroll to zoom, right-drag to pan, click to set trigger"
                            onWheel={handleWheel}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                            onContextMenu={handleContextMenu}
                            onKeyDown={handleKeyDown}
                        />
                        {/* Zoom hint overlay */}
                        <div className="absolute bottom-2 left-2 flex gap-2 pointer-events-none">
                            <span className="text-[8px] font-mono text-gray-700 bg-black/40 px-1.5 py-0.5 rounded">Scroll: Zoom</span>
                            <span className="text-[8px] font-mono text-gray-700 bg-black/40 px-1.5 py-0.5 rounded">Right-drag: Pan</span>
                            <span className="text-[8px] font-mono text-gray-700 bg-black/40 px-1.5 py-0.5 rounded">Shift/Ctrl+Scroll: Axis zoom</span>
                        </div>
                    </div>

                    {/* ─── Measurement Panel ─── */}
                    <div className="xl:w-52 flex xl:flex-col gap-2 flex-wrap">
                        <MeasurementBlock label="CH1 CANH" color={COLORS.ch1} items={[
                            { key: 'Vpp', val: `${measurements.ch1Vpp.toFixed(2)} V` },
                            { key: 'Avg', val: `${measurements.ch1Avg.toFixed(2)} V` },
                        ]} />
                        <MeasurementBlock label="CH2 CANL" color={COLORS.ch2} items={[
                            { key: 'Vpp', val: `${measurements.ch2Vpp.toFixed(2)} V` },
                            { key: 'Avg', val: `${measurements.ch2Avg.toFixed(2)} V` },
                        ]} />
                        <MeasurementBlock label="DIFFERENTIAL" color={COLORS.math} items={[
                            { key: 'Vdiff', val: `${measurements.vdiff.toFixed(2)} V` },
                            { key: 'Trans', val: `${measurements.freq} edges` },
                        ]} />
                    </div>
                </div>

                {/* ─── Control Strip ─── */}
                <div className="mt-3 pt-3 border-t border-[#1a1a2e] flex flex-col lg:flex-row gap-3">
                    <ControlGroup label="Acquire">
                        <ScopeButton
                            label={scope.runMode === 'run' ? 'Stop' : 'Run'}
                            active={scope.runMode === 'run'}
                            color={scope.runMode === 'run' ? '#00ff88' : '#ff4444'}
                            onClick={() => setScope(prev => ({ ...prev, runMode: prev.runMode === 'run' ? 'stop' : 'run' }))}
                        />
                        <ScopeButton label="Single" active={scope.runMode === 'single'} color="#ffd000"
                            onClick={() => { samplesRef.current = []; setScope(prev => ({ ...prev, runMode: 'single' })); }}
                        />
                    </ControlGroup>

                    <Divider />

                    <ControlGroup label="CH1 — CANH" color={COLORS.ch1}>
                        <ScopeButton
                            label={scope.ch1.enabled ? 'ON' : 'OFF'}
                            active={scope.ch1.enabled}
                            color={COLORS.ch1}
                            onClick={() => updateCh('ch1', { enabled: !scope.ch1.enabled })}
                        />
                        <StepControl
                            label="V/div"
                            value={`${scope.ch1.vdiv}V`}
                            onUp={() => updateCh('ch1', { vdiv: stepOption(VDIV_OPTIONS, scope.ch1.vdiv, 1) })}
                            onDown={() => updateCh('ch1', { vdiv: stepOption(VDIV_OPTIONS, scope.ch1.vdiv, -1) })}
                        />
                    </ControlGroup>

                    <Divider />

                    <ControlGroup label="CH2 — CANL" color={COLORS.ch2}>
                        <ScopeButton
                            label={scope.ch2.enabled ? 'ON' : 'OFF'}
                            active={scope.ch2.enabled}
                            color={COLORS.ch2}
                            onClick={() => updateCh('ch2', { enabled: !scope.ch2.enabled })}
                        />
                        <StepControl
                            label="V/div"
                            value={`${scope.ch2.vdiv}V`}
                            onUp={() => updateCh('ch2', { vdiv: stepOption(VDIV_OPTIONS, scope.ch2.vdiv, 1) })}
                            onDown={() => updateCh('ch2', { vdiv: stepOption(VDIV_OPTIONS, scope.ch2.vdiv, -1) })}
                        />
                    </ControlGroup>

                    <Divider />

                    <ControlGroup label="Math">
                        <ScopeButton
                            label="CH1−CH2"
                            active={scope.math}
                            color={COLORS.math}
                            onClick={() => setScope(prev => ({ ...prev, math: !prev.math }))}
                        />
                    </ControlGroup>

                    <Divider />

                    <ControlGroup label="Horizontal">
                        <StepControl
                            label="Time/div"
                            value={`${scope.tdiv}µs`}
                            onUp={() => setScope(prev => ({ ...prev, tdiv: stepOption(TDIV_OPTIONS, prev.tdiv, 1) }))}
                            onDown={() => setScope(prev => ({ ...prev, tdiv: stepOption(TDIV_OPTIONS, prev.tdiv, -1) }))}
                        />
                    </ControlGroup>

                    <Divider />

                    <ControlGroup label="Trigger">
                        <ScopeButton
                            label={scope.triggerSource}
                            active
                            color={scope.triggerSource === 'CH1' ? COLORS.ch1 : COLORS.ch2}
                            onClick={() => setScope(prev => ({
                                ...prev,
                                triggerSource: prev.triggerSource === 'CH1' ? 'CH2' : 'CH1',
                            }))}
                        />
                        <StepControl
                            label="Level"
                            value={`${scope.triggerLevel.toFixed(1)}V`}
                            onUp={() => setScope(prev => ({ ...prev, triggerLevel: Math.min(5, prev.triggerLevel + 0.5) }))}
                            onDown={() => setScope(prev => ({ ...prev, triggerLevel: Math.max(0, prev.triggerLevel - 0.5) }))}
                        />
                        <ScopeButton
                            label={scope.triggerEdge === 'rising' ? '↑ Rise' : '↓ Fall'}
                            active
                            color={COLORS.trigger}
                            onClick={() => setScope(prev => ({
                                ...prev,
                                triggerEdge: prev.triggerEdge === 'rising' ? 'falling' : 'rising',
                            }))}
                        />
                    </ControlGroup>
                </div>
            </div>
        </div>
    );
};

// ─── Sub-components ─────────────────────────────────────────

const ZoomButton: React.FC<{ label: string; onClick: () => void; title: string }> = ({ label, onClick, title }) => (
    <button
        onClick={onClick}
        title={title}
        className="w-6 h-6 flex items-center justify-center text-xs font-mono text-gray-500 hover:text-white bg-[#111118] border border-[#222] rounded transition-colors hover:bg-[#1a1a24]"
    >
        {label}
    </button>
);

const ControlGroup: React.FC<{ label: string; color?: string; children: React.ReactNode }> = ({ label, color, children }) => (
    <div className="flex flex-col gap-1.5">
        <span className="text-[7px] font-mono font-semibold uppercase tracking-widest" style={{ color: color || '#6b7280' }}>{label}</span>
        <div className="flex items-center gap-1.5">{children}</div>
    </div>
);

const Divider: React.FC = () => (
    <div className="hidden lg:block w-px self-stretch bg-[#1a1a2e] mx-1" />
);

const ScopeButton: React.FC<{
    label: string;
    active: boolean;
    color: string;
    onClick: () => void;
}> = ({ label, active, color, onClick }) => (
    <button
        onClick={onClick}
        className="relative px-3 py-1.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-95"
        style={{
            backgroundColor: active ? `${color}12` : '#0e0e14',
            border: `1px solid ${active ? `${color}40` : '#222'}`,
            color: active ? color : '#555',
            boxShadow: active ? `0 0 12px ${color}10` : 'none',
        }}
    >
        <span
            className="absolute top-1 right-1 w-1 h-1 rounded-full"
            style={{
                backgroundColor: active ? color : '#333',
                boxShadow: active ? `0 0 4px ${color}` : 'none',
            }}
        />
        {label}
    </button>
);

const StepControl: React.FC<{
    label: string;
    value: string;
    onUp: () => void;
    onDown: () => void;
}> = ({ label, value, onUp, onDown }) => (
    <div className="flex items-center gap-0">
        <button
            onClick={onDown}
            className="w-6 h-7 flex items-center justify-center bg-[#0e0e14] border border-[#222] rounded-l-md text-gray-600 hover:text-white hover:bg-[#1a1a24] active:bg-[#080810] transition-all text-[10px] font-mono"
        >
            ◀
        </button>
        <div className="h-7 px-2 flex flex-col items-center justify-center bg-[#080810] border-y border-[#222] min-w-[50px]">
            <span className="text-[7px] font-mono text-gray-600 uppercase leading-none">{label}</span>
            <span className="text-[10px] font-mono font-bold text-gray-300 leading-none">{value}</span>
        </div>
        <button
            onClick={onUp}
            className="w-6 h-7 flex items-center justify-center bg-[#0e0e14] border border-[#222] rounded-r-md text-gray-600 hover:text-white hover:bg-[#1a1a24] active:bg-[#080810] transition-all text-[10px] font-mono"
        >
            ▶
        </button>
    </div>
);

const MeasurementBlock: React.FC<{
    label: string;
    color: string;
    items: { key: string; val: string }[];
}> = ({ label, color, items }) => (
    <div className="flex-1 min-w-[140px] p-2.5 rounded-lg bg-[#080810] border border-[#1a1a2e]">
        <div className="text-[8px] font-mono font-semibold uppercase tracking-widest mb-1.5" style={{ color }}>{label}</div>
        {items.map(item => (
            <div key={item.key} className="flex justify-between items-baseline">
                <span className="text-[8px] font-mono text-gray-600">{item.key}</span>
                <span className="text-[10px] font-mono font-bold text-gray-300">{item.val}</span>
            </div>
        ))}
    </div>
);
