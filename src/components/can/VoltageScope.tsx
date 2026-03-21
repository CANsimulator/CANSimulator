import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { normToCanvasX, canvasXToNorm, calculateVDiff } from '../../utils/scope-math';
import { 
    ISO, 
    BIT_TIME_SAMPLES, 
    type Sample, 
    type WaveState, 
    generateSample, 
    createInitialWaveState 
} from '../../services/can/waveform-generator';

/* ═══════════════════════════════════════════════════════════════
   CAN-SCOPE CSO-2000 — Physical Layer Oscilloscope
   A CANoe.Scope–style diagnostic tool for CAN bus analysis.
   ISO 11898 compliant voltage thresholds, eye diagram,
   protocol decode, cursors, zoom/pan.
   ═══════════════════════════════════════════════════════════════ */

// ─── Layout Constants ───────────────────────────────────────
const CANVAS_W = 900;
const CANVAS_H = 540;
const M = { top: 28, right: 8, bottom: 4, left: 52 }; // margins
const PLOT_W = CANVAS_W - M.left - M.right;

// Panel heights (proportional)
const WAVE_H = 200;   // CANH/CANL waveform
const DIFF_H = 90;    // Differential voltage
const EYE_H = 100;    // Eye diagram
const DECODE_H = 28;  // Protocol decode strip
const GAP = 8;        // between panels
const EYE_MAX_OVERLAYS = 200;

// Panel Y positions
const WAVE_Y = M.top;
const DIFF_Y = WAVE_Y + WAVE_H + GAP;
const EYE_Y = DIFF_Y + DIFF_H + GAP;
const DECODE_Y = EYE_Y + EYE_H + GAP;

// ISO thresholds and types imported from waveform-generator service

// ─── Types ──────────────────────────────────────────────────
const VDIV_OPTIONS = [0.2, 0.5, 1, 2, 5] as const;
const TDIV_OPTIONS = [5, 10, 20, 50, 100, 200, 500] as const;

type VDiv = (typeof VDIV_OPTIONS)[number];
type TDiv = (typeof TDIV_OPTIONS)[number];
type RunMode = 'run' | 'stop' | 'single';
type TriggerMode = 'auto' | 'SOF' | 'error' | 'ID';
type CursorMode = 'off' | 'time';

interface ChannelCfg { enabled: boolean; vdiv: VDiv; offset: number; }

interface ScopeState {
    ch1: ChannelCfg;
    ch2: ChannelCfg;
    math: boolean;
    tdiv: TDiv;
    triggerMode: TriggerMode;
    triggerLevel: number;
    runMode: RunMode;
    cursorMode: CursorMode;
    cursorA: number; // 0-1 normalized position
    cursorB: number;
    persistence: boolean;
    activeCh: 'ch1' | 'ch2';
}

interface ViewState { zoomX: number; zoomY: number; panX: number; panY: number; }

// Types imported from waveform-generator service or defined here

// ─── Color Palette ──────────────────────────────────────────
const C = {
    bg:        '#06060c',
    panelBg:   '#08080f',
    panelBdr:  '#14142a',
    gridFine:  'rgba(255,255,255,0.04)',
    gridMajor: 'rgba(255,255,255,0.09)',
    axisText:  'rgba(255,255,255,0.50)',
    ch1:       '#00d4ff',  // CANH — cyan
    ch1Dim:    'rgba(0,212,255,0.12)',
    ch2:       '#c850ff',  // CANL — magenta
    ch2Dim:    'rgba(200,80,255,0.12)',
    diff:      '#00ff88',  // VDIFF — green
    diffDim:   'rgba(0,255,136,0.10)',
    trigger:   '#ffd000',
    cursor:    '#ff6b35',
    cursorB:   '#35b0ff',
    dominant:  '#00ff88',
    recessive: '#ffd000',
};

// Waveform generator moved to src/services/can/waveform-generator.ts

// ─── Helpers ────────────────────────────────────────────────
function stepOpt<T>(opts: readonly T[], cur: T, dir: 1 | -1): T {
    const i = opts.indexOf(cur);
    const nx = i + dir;
    return nx < 0 || nx >= opts.length ? cur : opts[nx];
}
function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════
export const VoltageScope: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const samplesRef = useRef<Sample[]>([]);
    const eyeBufferRef = useRef<Sample[][]>([]);
    const animRef = useRef<number>(0);
    const lastTick = useRef<number>(0);
    const isPanning = useRef(false);
    const panOrigin = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
    const requestClearRef = useRef(false);
    const prevRunMode = useRef<RunMode>('run');
    const isDraggingTrigger = useRef(false);
    const draggingOffset = useRef<'ch1' | 'ch2' | null>(null);
    const isDraggingCursor = useRef<'A' | 'B' | null>(null);
    const waveStateRef = useRef<WaveState>(createInitialWaveState());
    const singleFlashRef = useRef<number>(-1000);

    const [scope, setScope] = useState<ScopeState>({
        ch1: { enabled: true, vdiv: 1, offset: 0 },
        ch2: { enabled: true, vdiv: 1, offset: 0 },
        math: true,
        tdiv: 50,
        triggerMode: 'auto',
        triggerLevel: 2.5,
        runMode: 'run',
        cursorMode: 'off',
        cursorA: 0.3,
        cursorB: 0.7,
        persistence: false,
        activeCh: 'ch1',
    });

    const [view, setView] = useState<ViewState>({ zoomX: 1, zoomY: 1, panX: 0, panY: 0 });

    const [metrics, setMetrics] = useState({
        ch1Vpp: 0, ch1Avg: 0, ch1Min: 0, ch1Max: 0,
        ch2Vpp: 0, ch2Avg: 0, ch2Min: 0, ch2Max: 0,
        vdiff: 0, riseTime: 0, fallTime: 0,
        symmetry: 0, busLoad: 0, bitRate: 0,
        eyeWidth: 0, eyeHeight: 0,
        isoCANH: true, isoCANL: true, isoDiff: true,
        isGated: false,
    });

    const scopeRef = useRef(scope);
    const viewRef = useRef(view);
    useEffect(() => { scopeRef.current = scope; }, [scope]);
    useEffect(() => { viewRef.current = view; }, [view]);

    // Handle transition clear for persistence
    useEffect(() => {
        if (prevRunMode.current === 'stop' && scope.runMode !== 'stop') {
            requestClearRef.current = true;
        }
        prevRunMode.current = scope.runMode;
    }, [scope.runMode]);

    // ─── Coordinate transforms ──────────────────────────────
    const vToPanel = useCallback((v: number, vMin: number, vMax: number, panelH: number, vw: ViewState) => {
        const norm = (v - vMin) / (vMax - vMin);
        const baseY = (1 - norm) * panelH;
        return (baseY - panelH / 2) * vw.zoomY + panelH / 2 + vw.panY;
    }, []);

    const yToV = useCallback((y: number, vMin: number, vMax: number, panelH: number, vw: ViewState) => {
        const baseY = (y - vw.panY - panelH / 2) / vw.zoomY + panelH / 2;
        const norm = 1 - baseY / panelH;
        return norm * (vMax - vMin) + vMin;
    }, []);

    const sToX = useCallback((i: number, total: number, vw: ViewState) => {
        return normToCanvasX(i / Math.max(total - 1, 1), vw);
    }, []);

    const getActiveWaveScale = useCallback(() => {
        const s = scopeRef.current;
        
        const o1 = s.ch1.enabled ? s.ch1.offset : 0;
        const o2 = s.ch2.enabled ? s.ch2.offset : 0;
        
        let avgOffset = 0;
        if (s.ch1.enabled && s.ch2.enabled) {
            avgOffset = (o1 + o2) / 2;
        } else if (s.ch1.enabled) {
            avgOffset = o1;
        } else if (s.ch2.enabled) {
            avgOffset = o2;
        }

        const getChParams = (vdiv: number) => {
            const vRange = vdiv * 8;
            const centerV = 2.5; 
            return {
                vMin: centerV - vRange / 2 - avgOffset,
                vMax: centerV + vRange / 2 - avgOffset
            };
        };

        const ch1 = getChParams(s.ch1.vdiv);
        const ch2 = getChParams(s.ch2.vdiv);
        const primary = s.activeCh === 'ch1' ? ch1 : ch2;
        
        return {
            vMin: primary.vMin,
            vMax: primary.vMax,
            avgOffset,
            ch1,
            ch2
        };
    }, []);

    // ─── Drawing helpers (defined inside draw for ctx access) ─

    // ─── Main draw ──────────────────────────────────────────
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const s = scopeRef.current;
        const vw = viewRef.current;
        const samples = samplesRef.current;

        // Dynamic scales for panels
        const activeVdiv = s[s.activeCh].vdiv;
        const diffVdiv = activeVdiv * 1.5;
        const diffVRange = diffVdiv * 4; // 4 divisions in VDIFF panel
        const diffVCenter = 1.0;         // Center around typical CAN diff
        const diffVMin = diffVCenter - diffVRange / 2;
        const diffVMax = diffVCenter + diffVRange / 2;

        // HiDPI
        const dpr = window.devicePixelRatio || 1;
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
            canvas.width = cw * dpr;
            canvas.height = ch * dpr;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const scaleX = cw / CANVAS_W;
        const scaleY = ch / CANVAS_H;
        ctx.scale(scaleX, scaleY);

        // Background persistence
        if (s.persistence && !requestClearRef.current) {
            ctx.fillStyle = 'rgba(6,6,12,0.18)';
        } else {
            ctx.fillStyle = C.bg;
            requestClearRef.current = false;
        }
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // ── Helper: draw grid ──
        const drawGrid = (w: number, h: number, cols: number, rows: number, v: ViewState) => {
            for (let i = 0; i <= cols; i++) {
                const bx = (i / cols) * w;
                const x = (bx - w / 2) * v.zoomX + w / 2 + v.panX;
                if (x < -1 || x > w + 1) continue;
                ctx.strokeStyle = i === cols / 2 ? C.gridMajor : C.gridFine;
                ctx.lineWidth = 0.5;
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            }
            for (let i = 0; i <= rows; i++) {
                const by = (i / rows) * h;
                const y = (by - h / 2) * v.zoomY + h / 2 + v.panY;
                if (y < -1 || y > h + 1) continue;
                ctx.strokeStyle = i === rows / 2 ? C.gridMajor : C.gridFine;
                ctx.lineWidth = 0.5;
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }
        };

        // ── Helper: voltage axis ──
        const drawVAxis = (h: number, vMin: number, vMax: number, unit: string, step: number, v: ViewState) => {
            ctx.font = '9px monospace';
            ctx.fillStyle = C.axisText;
            ctx.textAlign = 'right';
            for (let val = vMin; val <= vMax; val += step) {
                const y = vToPanel(val, vMin, vMax, h, v);
                if (y < -5 || y > h + 5) continue;
                ctx.fillText(`${val.toFixed(1)}${unit}`, -6, y + 3);
                ctx.strokeStyle = 'rgba(255,255,255,0.12)';
                ctx.lineWidth = 0.5;
                ctx.beginPath(); ctx.moveTo(-3, y); ctx.lineTo(0, y); ctx.stroke();
            }
        };

        // ── Helper: time axis ──
        const drawTimeAxis = (w: number, h: number, cols: number, tdiv: number, v: ViewState) => {
            ctx.font = '9px monospace';
            ctx.fillStyle = C.axisText;
            for (let i = 0; i <= cols; i++) {
                const bx = (i / cols) * w;
                const x = (bx - w / 2) * v.zoomX + w / 2 + v.panX;
                if (x < -20 || x > w + 20) continue;
                
                const timeVal = i * tdiv;
                const label = timeVal === 0 ? '0' : `${timeVal}µs`;
                
                if (x < 10) {
                    ctx.textAlign = 'left';
                    ctx.fillText(label, x + 2, h - 6);
                } else if (x > w - 10) {
                    ctx.textAlign = 'right';
                    ctx.fillText(label, x - 2, h - 6);
                } else {
                    ctx.textAlign = 'center';
                    ctx.fillText(label, x, h - 6);
                }
            }
        };

        // ── Helper: draw panel frame ──
        const drawPanel = (x: number, y: number, w: number, h: number, title: string, content: () => void, bdrColor?: string) => {
            ctx.fillStyle = C.panelBg;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = bdrColor || C.panelBdr;
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
            if (title) {
                ctx.fillStyle = 'rgba(255,255,255,0.22)';
                ctx.font = '600 8px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(title, x + 6, y + 11);
            }
            ctx.save();
            ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
            ctx.translate(x, y);
            content();
            ctx.restore();
        };

        // ── Helper: draw waveform trace with Z-axis intensity ──
        const drawWaveform = (
            samps: Sample[], getValue: (s: Sample) => number,
            vMin: number, vMax: number, panelH: number,
            color: string, glowColor: string, v: ViewState
        ) => {
            const pts: { x: number; y: number }[] = [];
            for (let i = 0; i < samps.length; i++) {
                pts.push({
                    x: sToX(i, samps.length, v),
                    y: vToPanel(getValue(samps[i]), vMin, vMax, panelH, v),
                });
            }

            // Glow
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = 6;
            ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            ctx.beginPath();
            for (let i = 0; i < pts.length; i++) {
                if (i === 0) ctx.moveTo(pts[i].x, pts[i].y); else ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.stroke();

            // Per-segment Z-axis intensity
            for (let i = 1; i < pts.length; i++) {
                const dy = Math.abs(pts[i].y - pts[i - 1].y);
                const velocity = Math.min(dy / 40, 1);
                const intensity = 0.9 - velocity * 0.5;
                ctx.strokeStyle = color;
                ctx.lineWidth = 2 - velocity * 0.8;
                ctx.globalAlpha = intensity;
                ctx.beginPath();
                ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
                ctx.lineTo(pts[i].x, pts[i].y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // White core
            ctx.strokeStyle = 'rgba(255,255,255,0.25)';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            for (let i = 0; i < pts.length; i++) {
                if (i === 0) ctx.moveTo(pts[i].x, pts[i].y); else ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.stroke();

            // Sample dots when zoomed
            if (v.zoomX > 2.5) {
                ctx.fillStyle = color;
                for (const p of pts) {
                    if (p.x < -5 || p.x > PLOT_W + 5) continue;
                    ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
                }
            }
        };

        // ════════════════════════════════════════════
        // PANEL 1: CANH / CANL Waveform
        // ════════════════════════════════════════════
        drawPanel(M.left, WAVE_Y, PLOT_W, WAVE_H, 'CANH / CANL — Physical Layer', () => {
            const { vMin, vMax, avgOffset, ch1, ch2 } = getActiveWaveScale();
            // ISO 11898 threshold bands
            const cahDomTop = vToPanel(ISO.CANH_DOM_MAX + (s.ch1.offset - avgOffset), ch1.vMin, ch1.vMax, WAVE_H, vw);
            const cahDomBot = vToPanel(ISO.CANH_DOM_MIN + (s.ch1.offset - avgOffset), ch1.vMin, ch1.vMax, WAVE_H, vw);
            ctx.fillStyle = 'rgba(0,212,255,0.04)';
            ctx.fillRect(0, cahDomTop, PLOT_W, cahDomBot - cahDomTop);

            const calDomTop = vToPanel(ISO.CANL_DOM_MAX + (s.ch2.offset - avgOffset), ch2.vMin, ch2.vMax, WAVE_H, vw);
            const calDomBot = vToPanel(ISO.CANL_DOM_MIN + (s.ch2.offset - avgOffset), ch2.vMin, ch2.vMax, WAVE_H, vw);
            ctx.fillStyle = 'rgba(200,80,255,0.04)';
            ctx.fillRect(0, calDomTop, PLOT_W, calDomBot - calDomTop);

            // Recessive center
            const recY = vToPanel(ISO.V_REC, vMin, vMax, WAVE_H, vw);
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.setLineDash([2, 4]); ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(0, recY); ctx.lineTo(PLOT_W, recY); ctx.stroke();
            ctx.setLineDash([]);

            // ISO threshold labels
            const thresholds = [
                { v: ISO.CANH_DOM_MIN + (s.ch1.offset - avgOffset), label: 'CANH min 2.75V', color: C.ch1, scale: ch1 },
                { v: ISO.CANL_DOM_MAX + (s.ch2.offset - avgOffset), label: 'CANL max 2.25V', color: C.ch2, scale: ch2 },
            ];
            for (const th of thresholds) {
                const y = vToPanel(th.v, th.scale.vMin, th.scale.vMax, WAVE_H, vw);
                if (y < 0 || y > WAVE_H) continue;
                ctx.strokeStyle = th.color; ctx.globalAlpha = 0.15;
                ctx.setLineDash([1, 3]); ctx.lineWidth = 0.5;
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(PLOT_W, y); ctx.stroke();
                ctx.setLineDash([]);
                ctx.globalAlpha = 0.3; ctx.font = '7px monospace'; ctx.fillStyle = th.color;
                ctx.textAlign = 'left'; ctx.fillText(th.label, 4, y - 3);
                ctx.globalAlpha = 1;
            }

            drawGrid(PLOT_W, WAVE_H, 10, 8, vw);
            drawVAxis(WAVE_H, vMin, vMax, 'V', activeVdiv, vw);
            drawTimeAxis(PLOT_W, WAVE_H, 10, s.tdiv, vw);

            if (samples.length < 2) return;

            // Traces
            if (s.ch2.enabled) drawWaveform(samples, p => p.canl + (s.ch2.offset - avgOffset), ch2.vMin, ch2.vMax, WAVE_H, C.ch2, C.ch2Dim, vw);
            if (s.ch1.enabled) drawWaveform(samples, p => p.canh + (s.ch1.offset - avgOffset), ch1.vMin, ch1.vMax, WAVE_H, C.ch1, C.ch1Dim, vw);

            // Trigger level
            const trigY = vToPanel(s.triggerLevel, vMin, vMax, WAVE_H, vw);
            
            // Trigger mode color and label
            const trigColors: Record<'auto' | 'SOF' | 'error' | 'ID', string> = {
                auto:  '#ffd000',   // yellow — always armed
                SOF:   '#00d4ff',   // cyan — wait for Start Of Frame
                error: '#ff4444',   // red  — wait for error frame
                ID:    '#4488ff',   // blue — wait for specific ID
            };
            const trigColor = trigColors[s.triggerMode];
            const trigLabel = s.triggerMode === 'auto' ? 'T' : s.triggerMode.toUpperCase();
            
            ctx.save();
            ctx.strokeStyle = trigColor; ctx.setLineDash([3, 3]); ctx.lineWidth = 0.8; ctx.globalAlpha = 0.5;
            ctx.beginPath(); ctx.moveTo(0, trigY); ctx.lineTo(PLOT_W, trigY); ctx.stroke();
            ctx.setLineDash([]); ctx.globalAlpha = 1;
            ctx.fillStyle = trigColor;
            ctx.beginPath(); ctx.moveTo(PLOT_W, trigY); ctx.lineTo(PLOT_W + 6, trigY - 4); ctx.lineTo(PLOT_W + 6, trigY + 4); ctx.fill();
            ctx.font = '600 8px monospace'; ctx.textAlign = 'left';
            ctx.fillText(trigLabel, PLOT_W + 8, trigY + 3);
            ctx.restore();

            // Cursors
            if (s.cursorMode === 'time') {
                const drawCur = (pos: number, color: string, label: string) => {
                    const tx = normToCanvasX(pos, vw);
                    ctx.strokeStyle = color; ctx.setLineDash([4, 2]); ctx.lineWidth = 1; ctx.globalAlpha = 0.7;
                    ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx, WAVE_H); ctx.stroke();
                    ctx.setLineDash([]); ctx.globalAlpha = 1;
                    ctx.fillStyle = color; ctx.font = '700 8px monospace'; ctx.textAlign = 'center';
                    ctx.fillText(label, tx, 20);
                };
                drawCur(s.cursorA, C.cursor, 'A');
                drawCur(s.cursorB, C.cursorB, 'B');
            }
        });

        // ════════════════════════════════════════════
        // PANEL 2: Differential Voltage
        // ════════════════════════════════════════════
        if (s.math) {
            drawPanel(M.left, DIFF_Y, PLOT_W, DIFF_H, 'VDIFF (CANH − CANL) — Differential', () => {
                // Threshold bands
                const domLineY = vToPanel(ISO.VDIFF_DOM_MIN, diffVMin, diffVMax, DIFF_H, vw);
                const topY = vToPanel(diffVMax, diffVMin, diffVMax, DIFF_H, vw);
                ctx.fillStyle = 'rgba(0,255,136,0.03)';
                ctx.fillRect(0, topY, PLOT_W, domLineY - topY);

                const recLineY = vToPanel(ISO.VDIFF_REC_MAX, diffVMin, diffVMax, DIFF_H, vw);
                const botY = vToPanel(diffVMin, diffVMin, diffVMax, DIFF_H, vw);
                ctx.fillStyle = 'rgba(255,208,0,0.03)';
                ctx.fillRect(0, recLineY, PLOT_W, botY - recLineY);

                drawGrid(PLOT_W, DIFF_H, 10, 4, vw);
                drawVAxis(DIFF_H, diffVMin, diffVMax, 'V', diffVdiv, vw);
                drawTimeAxis(PLOT_W, DIFF_H, 10, s.tdiv, vw);

                if (samples.length < 2) return;
                
                // Gated differential calculation: CANH - CANL but only for enabled channels
                drawWaveform(samples, p => calculateVDiff(p.canh, p.canl, s.ch1.enabled, s.ch2.enabled), diffVMin, diffVMax, DIFF_H, C.diff, C.diffDim, vw);

                // Threshold labels
                ctx.save();
                ctx.setLineDash([2, 2]); ctx.lineWidth = 0.6; ctx.globalAlpha = 0.3;
                ctx.strokeStyle = C.dominant;
                ctx.beginPath(); ctx.moveTo(0, domLineY); ctx.lineTo(PLOT_W, domLineY); ctx.stroke();
                ctx.strokeStyle = C.recessive;
                ctx.beginPath(); ctx.moveTo(0, recLineY); ctx.lineTo(PLOT_W, recLineY); ctx.stroke();
                ctx.setLineDash([]);
                ctx.font = '7px monospace'; ctx.globalAlpha = 0.5; ctx.textAlign = 'right';
                ctx.fillStyle = C.dominant;
                ctx.fillText('DOM ≥1.5V', PLOT_W - 4, clamp(domLineY - 3, 8, DIFF_H - 4));
                ctx.fillStyle = C.recessive;
                ctx.fillText('REC ≤0.5V', PLOT_W - 4, clamp(recLineY + 9, 8, DIFF_H - 4));
                ctx.restore();
            });
        }

        // ════════════════════════════════════════════
        // PANEL 3: Eye Diagram
        // ════════════════════════════════════════════
        const eyeData = eyeBufferRef.current;
        const isEyeReady = eyeData.length >= EYE_MAX_OVERLAYS;
        const eyeTitle = `Eye Diagram — ${isEyeReady ? '✓ READY' : '⟳ BUILDING'} (${eyeData.length}/${EYE_MAX_OVERLAYS}w)`;
        const eyeBdr = isEyeReady ? '#00ff8888' : '#ffd00088';

        drawPanel(M.left, EYE_Y, PLOT_W, EYE_H, eyeTitle, () => {
            ctx.fillStyle = 'rgba(0,10,20,0.5)';
            ctx.fillRect(0, 0, PLOT_W, EYE_H);
            drawGrid(PLOT_W, EYE_H, 8, 4, { zoomX: 1, zoomY: 1, panX: 0, panY: 0 });

            // Accumulation Progress Bar
            if (eyeData.length < EYE_MAX_OVERLAYS) {
                ctx.fillStyle = 'rgba(255,255,255,0.05)';
                ctx.fillRect(0, 0, PLOT_W, 3);
                ctx.fillStyle = C.dominant;
                ctx.fillRect(0, 0, PLOT_W * (eyeData.length / EYE_MAX_OVERLAYS), 3);
            }

            if (eyeData.length < 20) {
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.font = '600 10px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('COLLECTING TRANSITIONS...', PLOT_W / 2, EYE_H / 2 + 5);
                return;
            }

            const noZoom: ViewState = { zoomX: 1, zoomY: 1, panX: 0, panY: 0 };
            
            // Brightness boost: higher alpha when ready to clearly show eye opening
            ctx.globalAlpha = isEyeReady ? 0.25 : 0.06;
            
            for (const bitSamples of eyeData) {
                if (bitSamples.length < 2) continue;
                // CANH
                if (s.ch1.enabled) {
                    ctx.strokeStyle = C.ch1; ctx.lineWidth = 1;
                    ctx.beginPath();
                    for (let j = 0; j < bitSamples.length; j++) {
                        const x = (j / (bitSamples.length - 1)) * PLOT_W;
                        const y = vToPanel(bitSamples[j].canh, ISO.V_MIN, ISO.V_MAX, EYE_H, noZoom);
                        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                }
                // CANL
                if (s.ch2.enabled) {
                    ctx.strokeStyle = C.ch2;
                    ctx.beginPath();
                    for (let j = 0; j < bitSamples.length; j++) {
                        const x = (j / (bitSamples.length - 1)) * PLOT_W;
                        const y = vToPanel(bitSamples[j].canl, ISO.V_MIN, ISO.V_MAX, EYE_H, noZoom);
                        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                }
            }
            ctx.globalAlpha = 1;

            // Measurements
            ctx.font = '8px monospace'; ctx.fillStyle = isEyeReady ? C.dominant : C.recessive; ctx.textAlign = 'right';
            ctx.fillText(isEyeReady ? 'SIGNAL STABLE' : 'INTEGRATING...', PLOT_W - 8, EYE_H - 6);
        }, eyeBdr);

        // ════════════════════════════════════════════
        // PANEL 4: Protocol Decode Strip
        // ════════════════════════════════════════════
        drawPanel(M.left, DECODE_Y, PLOT_W, DECODE_H, '', () => {
            if (samples.length < 2) return;
            
            // Highlighted wait state for better visibility
            if (!s.ch1.enabled && !s.ch2.enabled) {
                const tw = 130;
                ctx.fillStyle = 'rgba(0, 243, 255, 0.08)';
                ctx.fillRect(PLOT_W / 2 - tw / 2, 4, tw, DECODE_H - 8);
                ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
                ctx.strokeRect(PLOT_W / 2 - tw / 2, 4, tw, DECODE_H - 8);

                ctx.fillStyle = '#00f3ff';
                ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
                ctx.fillText('WAITING FOR PROBE CONNECTION...', PLOT_W / 2, DECODE_H / 2 + 3);
                return;
            }
            
            const CAN_FIELDS = [
                { name: 'SOF', color: '#ffffff', start: 0, end: 0 },
                { name: 'ARB ID', color: '#00d4ff', start: 1, end: 11 },
                { name: 'RTR/IDE/r0', color: '#888888', start: 12, end: 14 },
                { name: 'DLC', color: '#ffd000', start: 15, end: 18 },
                { name: 'DATA', color: '#00ff88', start: 19, end: 82 },
                { name: 'CRC', color: '#ff8800', start: 83, end: 97 },
                { name: 'ACK/EOF', color: '#c850ff', start: 98, end: 107 },
            ];

            const regions: { name: string; color: string; x1: number; x2: number }[] = [];
            let currentRegion: { name: string; color: string; x1: number; x2: number } | null = null;
            let currentFieldId: string | null = null;

            for (let i = 0; i < samples.length; i++) {
                const x = sToX(i, samples.length, vw);
                const bi = samples[i].bitIndex;
                const field = CAN_FIELDS.find(f => bi >= f.start && bi <= f.end);
                
                if (field) {
                    if (!currentRegion || currentFieldId !== field.name || (i > 0 && samples[i].bitIndex < samples[i-1].bitIndex)) {
                        currentRegion = { name: field.name, color: field.color, x1: x, x2: x };
                        currentFieldId = field.name;
                        regions.push(currentRegion);
                    } else {
                        currentRegion.x2 = x;
                    }
                } else {
                    currentRegion = null;
                    currentFieldId = null;
                }
            }

            ctx.font = '600 9px monospace'; ctx.textAlign = 'center';

            regions.forEach((r) => {
                const w = Math.max(r.x2 - r.x1, 2);
                const midX = (r.x1 + r.x2) / 2;
                if (midX < -40 || midX > PLOT_W + 40) return;

                // Strip Background
                ctx.fillStyle = r.color;
                ctx.globalAlpha = 0.15;
                ctx.fillRect(r.x1, 2, w, DECODE_H - 4);

                // Strip Border
                ctx.strokeStyle = r.color;
                ctx.globalAlpha = 0.4;
                ctx.lineWidth = 1;
                ctx.strokeRect(r.x1, 2, w, DECODE_H - 4);
                
                // Label (only if wide enough)
                if (w > 20) {
                    ctx.globalAlpha = 0.9;
                    ctx.fillStyle = r.color;
                    ctx.fillText(r.name, midX, DECODE_H / 2 + 3);
                }
                ctx.globalAlpha = 1;
            });

            ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '7px monospace'; ctx.textAlign = 'left';
            ctx.fillText('DECODE', 4, 9);

            // Count frame boundaries in the visible sample buffer
            let frameCount = 0;
            for (let i = 1; i < samples.length; i++) {
                if (samples[i].bitIndex < samples[i - 1].bitIndex) {
                    frameCount++;
                }
            }

            // Frame count readout (right-aligned)
            ctx.fillStyle = frameCount > 0 ? 'rgba(0,255,136,0.5)' : 'rgba(255,255,255,0.15)';
            ctx.font = '7px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(
                frameCount === 1 ? '1 frame' : `${frameCount} frames`,
                PLOT_W - 4,
                9
            );
        });

        // ════════════════════════════════════════════
        // Header info bar
        // ════════════════════════════════════════════
        ctx.font = '600 9px monospace'; ctx.textAlign = 'left';
        let hx = M.left;
        if (s.ch1.enabled) { 
            ctx.fillStyle = C.ch1; 
            ctx.fillText(`CH1 ${s.ch1.vdiv}V`, hx, 14); 
            hx += 90; 
        }
        if (s.ch2.enabled) { 
            ctx.fillStyle = C.ch2; 
            ctx.fillText(`CH2 ${s.ch2.vdiv}V`, hx, 14); 
            hx += 90; 
        }
        if (s.math && hx < CANVAS_W - 280) { 
            ctx.fillStyle = C.diff; 
            ctx.fillText('DIFF', hx, 14); 
        }

        ctx.textAlign = 'right';
        ctx.fillStyle = C.axisText; ctx.fillText(`${s.tdiv}µs/div`, CANVAS_W - M.right - 4, 14);
        ctx.fillStyle = s.runMode === 'run' ? C.dominant : '#ff4444';
        ctx.fillText(s.runMode === 'run' ? '● RUN' : s.runMode === 'single' ? '● ARMED' : '■ STOP', CANVAS_W - M.right - 70, 14);
        ctx.fillStyle = C.trigger; ctx.globalAlpha = 0.6;
        ctx.fillText(`Trig: ${s.triggerMode} ${s.triggerLevel.toFixed(1)}V`, CANVAS_W - M.right - 130, 14);
        ctx.globalAlpha = 1;
        // Always show zoom readout
        const isZoomed = vw.zoomX !== 1 || vw.zoomY !== 1;
        ctx.fillStyle = isZoomed ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
        ctx.textAlign = 'center';
        ctx.fillText(
            isZoomed ? `${vw.zoomX.toFixed(1)}×${vw.zoomY.toFixed(1)}` : '1:1',
            CANVAS_W / 2,
            14
        );

        // Cursor measurements
        if (s.cursorMode === 'time' && samples.length > 2) {
            const idxA = Math.floor(s.cursorA * (samples.length - 1));
            const idxB = Math.floor(s.cursorB * (samples.length - 1));
            const sA = samples[clamp(idxA, 0, samples.length - 1)];
            const sB = samples[clamp(idxB, 0, samples.length - 1)];
            const dt = Math.abs(idxB - idxA) * (s.tdiv / 10);
            const dv = Math.abs(sA.canh - sB.canh);
            ctx.fillStyle = C.cursor; ctx.textAlign = 'left'; ctx.font = '600 8px monospace';
            ctx.fillText(`ΔT=${dt.toFixed(1)}µs  ΔV=${dv.toFixed(2)}V`, M.left, CANVAS_H - 4);
        }

        // Ground markers
        const { vMin, vMax, avgOffset } = getActiveWaveScale();
        let ch1gy = -1;
        if (s.ch1.enabled) {
            ch1gy = vToPanel(2.5 + (s.ch1.offset - avgOffset), vMin, vMax, WAVE_H, vw) + WAVE_Y;
            if (ch1gy > WAVE_Y && ch1gy < WAVE_Y + WAVE_H) {
                ctx.fillStyle = C.ch1;
                ctx.beginPath(); 
                ctx.moveTo(M.left, ch1gy); 
                ctx.lineTo(M.left - 8, ch1gy - 5); 
                ctx.lineTo(M.left - 8, ch1gy + 5); 
                ctx.fill();
            }
        }
        if (s.ch2.enabled) {
            const gy = vToPanel(2.5 + (s.ch2.offset - avgOffset), vMin, vMax, WAVE_H, vw) + WAVE_Y;
            // Requirement 17: offset CH2 marker by 12px below CH1 if they overlap
            const finalGy2 = (s.ch1.enabled && Math.abs(gy - ch1gy) < 2) ? ch1gy + 12 : gy;
            if (finalGy2 > WAVE_Y && finalGy2 < WAVE_Y + WAVE_H) {
                ctx.fillStyle = C.ch2;
                ctx.beginPath(); 
                ctx.moveTo(M.left, finalGy2); 
                ctx.lineTo(M.left - 8, finalGy2 - 5); 
                ctx.lineTo(M.left - 8, finalGy2 + 5); 
                ctx.fill();
            }
        }

        // ── Single capture flash overlay ──
        const flashAge = performance.now() - singleFlashRef.current;
        const FLASH_DURATION = 400; // ms
        if (singleFlashRef.current > 0 && flashAge < FLASH_DURATION) {
            const alpha = Math.max(0, 1 - flashAge / FLASH_DURATION) * 0.5;
            ctx.fillStyle = `rgba(191,0,255,${alpha.toFixed(3)})`;
            ctx.fillRect(M.left, WAVE_Y, PLOT_W, WAVE_H);
            ctx.fillStyle = `rgba(255,255,255,${(alpha * 2).toFixed(3)})`;
            ctx.font = '700 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('▶ ARMED', PLOT_W / 2 + M.left, WAVE_Y + WAVE_H / 2 + 5);
        }

    }, [vToPanel, sToX]);
    const computeMetrics = useCallback(() => {
        let samples = samplesRef.current;
        if (samples.length < 10) return;

        const scopeVal = scopeRef.current;
        let isGated = false;

        if (scopeVal.cursorMode === 'time') {
            const startPos = Math.min(scopeVal.cursorA, scopeVal.cursorB);
            const endPos = Math.max(scopeVal.cursorA, scopeVal.cursorB);
            
            // Map normalized cursor positions to sample indices
            const startIdx = Math.floor(startPos * (samples.length - 1));
            const endIdx = Math.ceil(endPos * (samples.length - 1));
            
            // Require at least 5 samples for valid gated metrics
            if (endIdx - startIdx > 4) {
                samples = samples.slice(startIdx, endIdx + 1);
                isGated = true;
            }
        }

        const { avgOffset } = getActiveWaveScale();
        const canh = samples.map(s => s.canh + (scopeVal.ch1.offset - avgOffset));
        const canl = samples.map(s => s.canl + (scopeVal.ch2.offset - avgOffset));
        const ch1Min = Math.min(...canh), ch1Max = Math.max(...canh);
        const ch2Min = Math.min(...canl), ch2Max = Math.max(...canl);
        const ch1Avg = canh.reduce((a, b) => a + b) / canh.length;
        const ch2Avg = canl.reduce((a, b) => a + b) / canl.length;

        let riseSum = 0, fallSum = 0, riseCount = 0, fallCount = 0, domSamples = 0;
        for (let i = 1; i < samples.length; i++) {
            if (samples[i].isDominant) domSamples++;
            if (samples[i].isDominant !== samples[i - 1].isDominant) {
                const dv = Math.abs(samples[i].canh - samples[i - 1].canh);
                if (samples[i].isDominant) { riseSum += dv; riseCount++; }
                else { fallSum += dv; fallCount++; }
            }
        }

        const riseTime = riseCount > 0 ? riseSum / riseCount * 20 : 0;
        const fallTime = fallCount > 0 ? fallSum / fallCount * 20 : 0;
        const symmetry = riseTime > 0 && fallTime > 0 ? Math.min(riseTime, fallTime) / Math.max(riseTime, fallTime) * 100 : 0;
        const busLoad = (domSamples / samples.length) * 100;
        const isoCANH = scopeVal.ch1.enabled && ch1Max <= ISO.CANH_DOM_MAX && (ch1Max >= ISO.CANH_DOM_MIN || ch1Avg > ISO.V_REC - 0.5);
        const isoCANL = scopeVal.ch2.enabled && ch2Min >= ISO.CANL_DOM_MIN && (ch2Min <= ISO.CANL_DOM_MAX || ch2Avg < ISO.V_REC + 0.5);
        const maxDiff = Math.max(...samples.map(s => calculateVDiff(s.canh, s.canl, scopeVal.ch1.enabled, scopeVal.ch2.enabled)));
        const isoDiff = (scopeVal.ch1.enabled || scopeVal.ch2.enabled) && maxDiff >= ISO.VDIFF_DOM_MIN;

        // ── Compute real Eye Width from eye diagram data ──
        let eyeWidth = 0;
        const eyeWins = eyeBufferRef.current;
        if ((scopeVal.ch1.enabled || scopeVal.ch2.enabled) && eyeWins.length >= 10) {
            const COLS = 20;
            const CROSS_THRESHOLD_V = 0.3;   // ±0.3V around 2.5V counts as a crossing
            const CROSS_RATIO = 0.3;          // >30% of windows crossing = column is blocked

            const crossCount = new Array(COLS).fill(0);
            for (const win of eyeWins) {
                if (win.length < 2) continue;
                for (let col = 0; col < COLS; col++) {
                    const idx = Math.round((col / (COLS - 1)) * (win.length - 1));
                    const v = win[idx].canh;
                    if (Math.abs(v - ISO.V_REC) <= CROSS_THRESHOLD_V) {
                        crossCount[col]++;
                    }
                }
            }

            // Find longest contiguous run of clear (non-crossing) columns
            let maxRun = 0, curRun = 0;
            for (let col = 0; col < COLS; col++) {
                if (crossCount[col] / eyeWins.length <= CROSS_RATIO) {
                    curRun++;
                    if (curRun > maxRun) maxRun = curRun;
                } else {
                    curRun = 0;
                }
            }
            eyeWidth = Math.round((maxRun / COLS) * 100);
        }

        setMetrics({
            ch1Vpp: scopeVal.ch1.enabled ? (ch1Max - ch1Min) : 0, 
            ch1Avg: scopeVal.ch1.enabled ? ch1Avg : 0, 
            ch1Min: scopeVal.ch1.enabled ? ch1Min : 0, 
            ch1Max: scopeVal.ch1.enabled ? ch1Max : 0,
            ch2Vpp: scopeVal.ch2.enabled ? (ch2Max - ch2Min) : 0, 
            ch2Avg: scopeVal.ch2.enabled ? ch2Avg : 0, 
            ch2Min: scopeVal.ch2.enabled ? ch2Min : 0, 
            ch2Max: scopeVal.ch2.enabled ? ch2Max : 0,
            vdiff: calculateVDiff(ch1Avg, ch2Avg, scopeVal.ch1.enabled, scopeVal.ch2.enabled), 
            riseTime: Math.round(riseTime), 
            fallTime: Math.round(fallTime),
            symmetry: Math.round(symmetry), 
            busLoad: Math.round(busLoad),
            bitRate: Math.round(1000 / (BIT_TIME_SAMPLES * (scopeVal.tdiv / 4))),
            eyeWidth,
            eyeHeight: scopeVal.ch1.enabled ? Math.round((ch1Max - ch1Min) / 2 * 100) : 0,
            isoCANH: !!isoCANH, 
            isoCANL: !!isoCANL, 
            isoDiff: !!isoDiff, 
            isGated,
        });
    }, []);

    // ─── Eye buffer ─────────────────────────────────────────
    const updateEyeBuffer = useCallback(() => {
        const samples = samplesRef.current;
        if (samples.length < BIT_TIME_SAMPLES * 3) return;
        for (let i = BIT_TIME_SAMPLES * 3; i < samples.length - 1; i++) {
            if (samples[i].isDominant !== samples[i - 1].isDominant) {
                const window = samples.slice(Math.max(0, i - BIT_TIME_SAMPLES), i + BIT_TIME_SAMPLES * 2);
                eyeBufferRef.current.push(window);
                if (eyeBufferRef.current.length > EYE_MAX_OVERLAYS) {
                    eyeBufferRef.current = eyeBufferRef.current.slice(-EYE_MAX_OVERLAYS);
                }
            }
        }
    }, []);

    // ─── Animation loop ─────────────────────────────────────
    const tick = useCallback((time: number) => {
        const s = scopeRef.current;
        const interval = s.tdiv / 4;
        if (s.runMode !== 'stop' && time - lastTick.current > interval) {
            const prev = samplesRef.current.length > 0 ? samplesRef.current[samplesRef.current.length - 1] : null;
            samplesRef.current.push(generateSample(prev, waveStateRef.current));
            const maxSamples = 200;
            if (samplesRef.current.length > maxSamples) samplesRef.current = samplesRef.current.slice(-maxSamples);
            if (s.runMode === 'single' && samplesRef.current.length >= maxSamples) {
                setScope(p => ({ ...p, runMode: 'stop' }));
            }
            lastTick.current = time;
        }
        draw();
        animRef.current = requestAnimationFrame(tick);
    }, [draw]);

    useEffect(() => { animRef.current = requestAnimationFrame(tick); return () => cancelAnimationFrame(animRef.current); }, [tick]);
    useEffect(() => { const i1 = setInterval(computeMetrics, 500); const i2 = setInterval(updateEyeBuffer, 800); return () => { clearInterval(i1); clearInterval(i2); }; }, [computeMetrics, updateEyeBuffer]);

    // ─── Zoom ───────────────────────────────────────────────
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const f = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        setView(p => {
            if (e.shiftKey) return { ...p, zoomY: clamp(p.zoomY * f, 0.25, 20) };
            if (e.ctrlKey) return { ...p, zoomX: clamp(p.zoomX * f, 0.25, 20) };
            return { ...p, zoomX: clamp(p.zoomX * f, 0.25, 20), zoomY: clamp(p.zoomY * f, 0.25, 20) };
        });
    }, []);

    // ─── Pan ────────────────────────────────────────────────
    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (CANVAS_W / rect.width);
        const mouseY = (e.clientY - rect.top) * (CANVAS_H / rect.height);

        // Left click hit-test
        if (e.button === 0) {
            const { vMin, vMax, avgOffset } = getActiveWaveScale();
            const vw = viewRef.current;
            const scopeVal = scopeRef.current;

            // 1. Cursors (A / B)
            if (scopeVal.cursorMode === 'time') {
                const vw = viewRef.current;
                const curAX = M.left + normToCanvasX(scopeVal.cursorA, vw);
                const curBX = M.left + normToCanvasX(scopeVal.cursorB, vw);
                
                const tolerance = 12;
                if (Math.abs(mouseX - curAX) < tolerance) {
                    isDraggingCursor.current = 'A';
                    e.currentTarget.setPointerCapture(e.pointerId);
                    return;
                }
                if (Math.abs(mouseX - curBX) < tolerance) {
                    isDraggingCursor.current = 'B';
                    e.currentTarget.setPointerCapture(e.pointerId);
                    return;
                }
            }

            // 2. Trigger Marker/Line (Anywhere on the horizontal line in the panel or the triangle)
            const trigY = vToPanel(scopeVal.triggerLevel, vMin, vMax, WAVE_H, vw);
            const isNearTrigLine = mouseX > M.left - 20 && mouseX < CANVAS_W && Math.abs(mouseY - (WAVE_Y + trigY)) < 24;
            if (isNearTrigLine) {
                isDraggingTrigger.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                return;
            }

            // 2. Offset Markers (Left Side)
            if (mouseX < M.left + 30) {
                // CH1 ground
                const g1y = vToPanel(2.5 + (scopeVal.ch1.offset - avgOffset), vMin, vMax, WAVE_H, vw) + WAVE_Y;
                if (Math.abs(mouseY - g1y) < 24) {
                    draggingOffset.current = 'ch1';
                    e.currentTarget.setPointerCapture(e.pointerId);
                    return;
                }
                // CH2 ground
                const g2y = vToPanel(2.5 + (scopeVal.ch2.offset - avgOffset), vMin, vMax, WAVE_H, vw) + WAVE_Y;
                if (Math.abs(mouseY - g2y) < 24) {
                    draggingOffset.current = 'ch2';
                    e.currentTarget.setPointerCapture(e.pointerId);
                    return;
                }
            }
            
            // Left-click on empty canvas: start pan
            isPanning.current = true;
            panOrigin.current = { x: e.clientX, y: e.clientY, vx: viewRef.current.panX, vy: viewRef.current.panY };
            e.currentTarget.setPointerCapture(e.pointerId);
        }

        if (e.button === 1 || e.button === 2) {
            isPanning.current = true;
            panOrigin.current = { x: e.clientX, y: e.clientY, vx: viewRef.current.panX, vy: viewRef.current.panY };
            e.currentTarget.setPointerCapture(e.pointerId); e.preventDefault();
        }
    }, [vToPanel, getActiveWaveScale]);
    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (CANVAS_W / rect.width);
        const mouseY = (e.clientY - rect.top) * (CANVAS_H / rect.height);
        const vw = viewRef.current;

        if (isDraggingCursor.current) {
            const plotX = mouseX - M.left;
            const normPos = clamp(canvasXToNorm(plotX, vw), 0, 1);
            
            if (isDraggingCursor.current === 'A') {
                setScope(p => ({ ...p, cursorA: normPos }));
            } else {
                setScope(p => ({ ...p, cursorB: normPos }));
            }
            return;
        }

        if (isDraggingTrigger.current) {
            const { vMin, vMax } = getActiveWaveScale();
            const panelY = mouseY - WAVE_Y;
            const newV = yToV(panelY, vMin, vMax, WAVE_H, viewRef.current);
            const snappedV = Math.round(newV * 10) / 10;
            const clampedV = clamp(snappedV, 0, 5);
            setScope(p => ({ ...p, triggerLevel: clampedV }));
            return;
        }

        if (draggingOffset.current) {
            const { vMin, vMax, avgOffset } = getActiveWaveScale();
            const panelY = mouseY - WAVE_Y;
            const vAtMouse = yToV(panelY, vMin, vMax, WAVE_H, viewRef.current);
            const newOffset = clamp(vAtMouse - 2.5 + avgOffset, -5, 5);
            const snappedO = Math.round(newOffset * 10) / 10;
            const ch = draggingOffset.current;
            setScope(p => ({ ...p, [ch]: { ...p[ch], offset: snappedO } }));
            return;
        }

        if (isPanning.current) {
            setView(p => ({
                ...p,
                panX: panOrigin.current.vx + (e.clientX - panOrigin.current.x) * (CANVAS_W / rect.width),
                panY: panOrigin.current.vy + (e.clientY - panOrigin.current.y) * (CANVAS_H / rect.height),
            }));
            return;
        }

        // Hover effect for markers
        const { vMin, vMax, avgOffset } = getActiveWaveScale();
        const trigY = vToPanel(scopeRef.current.triggerLevel, vMin, vMax, WAVE_H, viewRef.current);
        const isNearTrigLine = mouseX > M.left - 20 && mouseX < CANVAS_W && Math.abs(mouseY - (WAVE_Y + trigY)) < 24;
        
        let isNearCursor = false;
        if (scopeRef.current.cursorMode === 'time') {
            const curAX = M.left + normToCanvasX(scopeRef.current.cursorA, viewRef.current);
            const curBX = M.left + normToCanvasX(scopeRef.current.cursorB, viewRef.current);
            if (Math.abs(mouseX - curAX) < 8 || Math.abs(mouseX - curBX) < 8) isNearCursor = true;
        }

        let isNearOffset = false;
        if (mouseX < M.left + 30) {
            const g1y = vToPanel(2.5 + (scopeRef.current.ch1.offset - avgOffset), vMin, vMax, WAVE_H, viewRef.current) + WAVE_Y;
            const g2y = vToPanel(2.5 + (scopeRef.current.ch2.offset - avgOffset), vMin, vMax, WAVE_H, viewRef.current) + WAVE_Y;
            if (Math.abs(mouseY - g1y) < 24 || Math.abs(mouseY - g2y) < 24) isNearOffset = true;
        }

        if (canvasRef.current) {
            if (isNearCursor) {
                canvasRef.current.style.cursor = 'ew-resize';
            } else if (isNearTrigLine || isNearOffset) {
                canvasRef.current.style.cursor = 'ns-resize';
            } else {
                canvasRef.current.style.cursor = 'crosshair';
            }
        }
    }, [yToV, vToPanel, getActiveWaveScale]);
    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const mouseY = (e.clientY - rect.top) * (CANVAS_H / rect.height);
        const { vMin, vMax, avgOffset } = getActiveWaveScale();
        const panelY = mouseY - WAVE_Y;

        if (isDraggingCursor.current) isDraggingCursor.current = null;
        if (isDraggingTrigger.current) {
            const finalV = yToV(panelY, vMin, vMax, WAVE_H, viewRef.current);
            const snappedV = Math.round(finalV * 10) / 10;
            const clampedV = clamp(snappedV, 0, 5);
            setScope(p => ({ ...p, triggerLevel: clampedV }));
            isDraggingTrigger.current = false;
        }
        if (draggingOffset.current) {
            const vAtMouse = yToV(panelY, vMin, vMax, WAVE_H, viewRef.current);
            const finalO = clamp(vAtMouse - 2.5 + avgOffset, -5, 5);
            const snappedO = Math.round(finalO * 10) / 10;
            const ch = draggingOffset.current;
            setScope(p => ({ ...p, [ch]: { ...p[ch], offset: snappedO } }));
            draggingOffset.current = null;
        }
        
        if (isPanning.current) isPanning.current = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    }, [yToV, getActiveWaveScale]);

    // ─── Keyboard ───────────────────────────────────────────
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case '+': case '=': setView(p => ({ ...p, zoomX: clamp(p.zoomX * 1.2, 0.25, 20), zoomY: clamp(p.zoomY * 1.2, 0.25, 20) })); break;
            case '-': setView(p => ({ ...p, zoomX: clamp(p.zoomX / 1.2, 0.25, 20), zoomY: clamp(p.zoomY / 1.2, 0.25, 20) })); break;
            case 'r': case 'R': setView({ zoomX: 1, zoomY: 1, panX: 0, panY: 0 }); break;
            case ' ': e.preventDefault(); setScope(p => ({ ...p, runMode: p.runMode === 'run' ? 'stop' : 'run' })); break;
            case 'Enter': e.preventDefault(); samplesRef.current = []; singleFlashRef.current = performance.now(); setScope(p => ({ ...p, runMode: 'single' })); break;
            case 'c': case 'C': setScope(p => ({ ...p, cursorMode: p.cursorMode === 'off' ? 'time' : 'off' })); break;
        }
    }, []);

    // ─── Controls ───────────────────────────────────────────
    const updateCh = (ch: 'ch1' | 'ch2', vals: Partial<ChannelCfg>) => {
        setScope(p => ({
            ...p,
            activeCh: ch,
            [ch]: { ...p[ch], ...vals }
        }));
    };
    const resetView = () => setView({ zoomX: 1, zoomY: 1, panX: 0, panY: 0 });
    const zoomIn = () => setView(p => ({ ...p, zoomX: clamp(p.zoomX * 1.3, 0.25, 20), zoomY: clamp(p.zoomY * 1.3, 0.25, 20) }));
    const zoomOut = () => setView(p => ({ ...p, zoomX: clamp(p.zoomX / 1.3, 0.25, 20), zoomY: clamp(p.zoomY / 1.3, 0.25, 20) }));

    const compliance = useMemo(() => {
        const all = metrics.isoCANH && metrics.isoCANL && metrics.isoDiff;
        return { overall: all, label: all ? 'PASS' : 'FAIL', color: all ? '#00ff88' : '#ff4444' };
    }, [metrics.isoCANH, metrics.isoCANL, metrics.isoDiff]);

    // ═════════════════════════════════════════════════════════
    // Render
    // ═════════════════════════════════════════════════════════
    return (
        <div className="space-y-0">
            <div className="bg-[#0a0a12] rounded-xl border border-[#14142a] shadow-lg overflow-hidden">
                {/* Top Bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-[#0c0c16] border-b border-[#14142a]">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-300 tracking-wide">CAN-SCOPE</span>
                        <span className="text-[8px] text-gray-600 font-mono">CSO-2000 SERIES</span>
                        <span className="text-[8px] text-gray-700 font-mono border border-[#1a1a2e] px-1.5 py-0.5 rounded">ISO 11898</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5 mr-2">
                            <SmallBtn label="−" onClick={zoomOut} title="Zoom out" />
                            <button onClick={resetView} title="Reset view (R)"
                                className="px-2 py-0.5 text-[8px] font-mono text-gray-500 hover:text-white bg-[#0e0e18] border border-[#1a1a2e] transition-colors rounded">
                                {view.zoomX !== 1 || view.zoomY !== 1 ? `${view.zoomX.toFixed(1)}×${view.zoomY.toFixed(1)}` : '1:1'}
                            </button>
                            <SmallBtn label="+" onClick={zoomIn} title="Zoom in" />
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border"
                            style={{ borderColor: compliance.color + '40', backgroundColor: compliance.color + '08' }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: compliance.color, boxShadow: `0 0 4px ${compliance.color}` }} />
                            <span className="text-[8px] font-mono font-bold" style={{ color: compliance.color }}>ISO {compliance.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${scope.runMode === 'run' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : scope.runMode === 'single' ? 'bg-amber-400' : 'bg-red-400'}`} />
                            <span className="text-[8px] font-mono text-gray-500 uppercase">{scope.runMode === 'run' ? 'Acquiring' : scope.runMode === 'single' ? 'Armed' : 'Stopped'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row gap-0">
                    {/* Left Rail (Controls only) */}
                    <div className="xl:w-64 w-full p-2.5 xl:border-r border-[#14142a] flex flex-col gap-3 bg-[#06060c] overflow-y-auto max-h-[540px] custom-scrollbar shadow-inner">
                        <MetricGroup title="Acquire" icon="⚡">
                            <div className="grid grid-cols-2 gap-2 p-1">
                                <ScopeBtn label={scope.runMode === 'run' ? 'Stop' : 'Run'} active={scope.runMode === 'run'}
                                    color={scope.runMode === 'run' ? '#00ff9f' : '#ff003c'}
                                    onClick={() => setScope(p => ({ ...p, runMode: p.runMode === 'run' ? 'stop' : 'run' }))} />
                                <ScopeBtn label="Single" active={scope.runMode === 'single'} color="#bf00ff"
                                    onClick={() => { samplesRef.current = []; singleFlashRef.current = performance.now(); setScope(p => ({ ...p, runMode: 'single' })); }} />
                            </div>
                        </MetricGroup>

                        <MetricGroup title="CH1 CANH" icon="💠" color={C.ch1} active={scope.activeCh === 'ch1'}>
                            <div className="flex flex-col gap-2 p-1">
                                <ScopeBtn label={scope.ch1.enabled ? 'Enabled' : 'Disabled'} active={scope.ch1.enabled} color={C.ch1}
                                    onClick={() => updateCh('ch1', { enabled: !scope.ch1.enabled })} />
                                <Stepper label="V/div" value={`${scope.ch1.vdiv}V`}
                                    onUp={() => updateCh('ch1', { vdiv: stepOpt(VDIV_OPTIONS, scope.ch1.vdiv, 1) })}
                                    onDown={() => updateCh('ch1', { vdiv: stepOpt(VDIV_OPTIONS, scope.ch1.vdiv, -1) })} />
                                <Stepper label="Offset" value={`${scope.ch1.offset >= 0 ? '+' : ''}${scope.ch1.offset.toFixed(1)}V`}
                                    onUp={() => updateCh('ch1', { offset: Math.min(5, scope.ch1.offset + 0.5) })}
                                    onDown={() => updateCh('ch1', { offset: Math.max(-5, scope.ch1.offset - 0.5) })} />
                            </div>
                        </MetricGroup>

                        <MetricGroup title="CH2 CANL" icon="💠" color={C.ch2} active={scope.activeCh === 'ch2'}>
                            <div className="flex flex-col gap-2 p-1">
                                <ScopeBtn label={scope.ch2.enabled ? 'Enabled' : 'Disabled'} active={scope.ch2.enabled} color={C.ch2}
                                    onClick={() => updateCh('ch2', { enabled: !scope.ch2.enabled })} />
                                <Stepper label="V/div" value={`${scope.ch2.vdiv}V`}
                                    onUp={() => updateCh('ch2', { vdiv: stepOpt(VDIV_OPTIONS, scope.ch2.vdiv, 1) })}
                                    onDown={() => updateCh('ch2', { vdiv: stepOpt(VDIV_OPTIONS, scope.ch2.vdiv, -1) })} />
                                <Stepper label="Offset" value={`${scope.ch2.offset >= 0 ? '+' : ''}${scope.ch2.offset.toFixed(1)}V`}
                                    onUp={() => updateCh('ch2', { offset: Math.min(5, scope.ch2.offset + 0.5) })}
                                    onDown={() => updateCh('ch2', { offset: Math.max(-5, scope.ch2.offset - 0.5) })} />
                            </div>
                        </MetricGroup>

                        <MetricGroup title="Horizontal & Trigger" icon="🎯">
                            <div className="flex flex-col gap-3 p-1">
                                <Stepper label="Time/div" value={`${scope.tdiv}µs`}
                                    onUp={() => { 
                                        setScope(p => ({ ...p, tdiv: stepOpt(TDIV_OPTIONS, p.tdiv, 1) }));
                                        setView({ zoomX: 1, zoomY: 1, panX: 0, panY: 0 });
                                    }}
                                    onDown={() => { 
                                        setScope(p => ({ ...p, tdiv: stepOpt(TDIV_OPTIONS, p.tdiv, -1) }));
                                        setView({ zoomX: 1, zoomY: 1, panX: 0, panY: 0 });
                                    }} />
                                
                                <div className="space-y-1">
                                    <div className="text-[7px] font-mono text-gray-500 uppercase px-0.5">Trigger Mode</div>
                                    {(() => {
                                        const trigColors: Record<'auto' | 'SOF' | 'error' | 'ID', string> = {
                                            auto:  '#ffd000',   // yellow
                                            SOF:   '#00d4ff',   // cyan
                                            error: '#ff4444',   // red
                                            ID:    '#4488ff',   // blue
                                        };
                                        const buttonColor = trigColors[scope.triggerMode];
                                        return <ScopeBtn label={scope.triggerMode.toUpperCase()} active color={buttonColor}
                                            onClick={() => setScope(p => ({
                                                ...p, triggerMode: ({ auto: 'SOF', SOF: 'error', error: 'ID', ID: 'auto' } as const)[p.triggerMode],
                                            }))} />;
                                    })()}
                                </div>

                                <Stepper label="Trig Level" value={`${scope.triggerLevel.toFixed(1)}V`}
                                    onUp={() => setScope(p => ({ ...p, triggerLevel: clamp(p.triggerLevel + 0.1, 0, 5) }))}
                                    onDown={() => setScope(p => ({ ...p, triggerLevel: clamp(p.triggerLevel - 0.1, 0, 5) }))} />
                            </div>
                        </MetricGroup>

                        <MetricGroup title="Display" icon="🖥️">
                            <div className="flex flex-col gap-2 p-1">
                                <ScopeBtn label={scope.math ? 'Differential On' : 'Differential Off'} active={scope.math} color={C.diff}
                                    onClick={() => setScope(p => ({ ...p, math: !p.math }))} />
                                <ScopeBtn label={scope.cursorMode === 'off' ? 'Measurement Off' : 'Measurement On'} active={scope.cursorMode !== 'off'} color={C.cursor}
                                    onClick={() => setScope(p => ({ ...p, cursorMode: p.cursorMode === 'off' ? 'time' : 'off' }))} />
                                <ScopeBtn label={scope.persistence ? 'Persistence On' : 'Persistence Off'} active={scope.persistence} color="#8855ff"
                                    onClick={() => setScope(p => ({ ...p, persistence: !p.persistence }))} />
                            </div>
                        </MetricGroup>
                    </div>

                    <div className="flex-1 relative">
                        <canvas ref={canvasRef}
                            className="w-full cursor-crosshair touch-none focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/40"
                            style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
                            tabIndex={0} role="img"
                            aria-label="CAN bus physical layer oscilloscope — scroll to zoom, right-drag to pan"
                            onWheel={handleWheel}
                            onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
                            onContextMenu={e => e.preventDefault()} onKeyDown={handleKeyDown} />
                        <div className="absolute bottom-1.5 left-1.5 flex gap-1.5 pointer-events-none">
                            <Hint text="Scroll: Zoom" /><Hint text="Ctrl/Shift+Scroll: Axis" /><Hint text="Drag: Pan" /><Hint text="C: Cursors" />
                        </div>
                    </div>

                    {/* Right Rail (Metrics only) */}
                    <div className="xl:w-64 w-full p-2.5 xl:border-l border-[#14142a] flex flex-col gap-3 bg-[#06060c] overflow-y-auto max-h-[540px] custom-scrollbar shadow-inner">
                        <MetricGroup title="Signal Quality" icon="⚡" subTitle={metrics.isGated ? 'Gated' : undefined}>
                            <MetricRow label="CANH Vpp" value={`${metrics.ch1Vpp.toFixed(2)} V`} color={C.ch1} />
                            <MetricRow label="CANH Avg" value={`${metrics.ch1Avg.toFixed(2)} V`} color={C.ch1} />
                            <MetricRow label="CANL Vpp" value={`${metrics.ch2Vpp.toFixed(2)} V`} color={C.ch2} />
                            <MetricRow label="CANL Avg" value={`${metrics.ch2Avg.toFixed(2)} V`} color={C.ch2} />
                            <MetricRow label="Vdiff" value={`${metrics.vdiff.toFixed(2)} V`} color={C.diff} />
                        </MetricGroup>
                        <MetricGroup title="Edge Timing" icon="📐">
                            <MetricRow label="Rise" value={`${metrics.riseTime} ns`} />
                            <MetricRow label="Fall" value={`${metrics.fallTime} ns`} />
                            <MetricRow label="Symmetry" value={`${metrics.symmetry}%`}
                                status={metrics.symmetry > 80 ? 'pass' : metrics.symmetry > 60 ? 'warn' : 'fail'} />
                        </MetricGroup>
                        <MetricGroup title="Bus Status" icon="🔌">
                            <MetricRow label="Load" value={`${metrics.busLoad}%`}
                                status={metrics.busLoad < 70 ? 'pass' : metrics.busLoad < 85 ? 'warn' : 'fail'} />
                            <MetricRow label="Bit Rate" value={`~${metrics.bitRate} kbps`} />
                            
                            <div className="pt-2 mt-2 border-t border-white/5 space-y-1">
                                <div className="text-[7px] font-mono text-gray-500 uppercase px-0.5 mb-1.5">Compliance (ISO 11898)</div>
                                <MetricRow label="CANH Level" value={metrics.isoCANH ? 'VALID' : 'OUT-OF-SPEC'} 
                                    status={metrics.isoCANH ? 'pass' : 'fail'} />
                                <MetricRow label="CANL Level" value={metrics.isoCANL ? 'VALID' : 'OUT-OF-SPEC'} 
                                    status={metrics.isoCANL ? 'pass' : 'fail'} />
                                <MetricRow label="Differential" value={metrics.isoDiff ? 'VALID' : 'LOW-SWING!'} 
                                    status={metrics.isoDiff ? 'pass' : 'fail'} />
                            </div>
                        </MetricGroup>
                        <MetricGroup title="Eye Diagram" icon="👁">
                            <MetricRow label="Eye Width" value={`${metrics.eyeWidth}%`}
                                status={metrics.eyeWidth > 70 ? 'pass' : metrics.eyeWidth > 50 ? 'warn' : 'fail'} />
                            <MetricRow label="Eye Height" value={`${metrics.eyeHeight}%`}
                                status={metrics.eyeHeight > 60 ? 'pass' : metrics.eyeHeight > 40 ? 'warn' : 'fail'} />
                        </MetricGroup>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

const Hint: React.FC<{ text: string }> = ({ text }) => (
    <span className="text-[7px] font-mono text-gray-700 bg-black/50 px-1 py-0.5 rounded whitespace-nowrap">{text}</span>
);

const SmallBtn: React.FC<{ label: string; onClick: () => void; title: string }> = ({ label, onClick, title }) => (
    <button onClick={onClick} title={title}
        className="w-5 h-5 flex items-center justify-center text-[10px] font-mono text-gray-500 hover:text-white bg-[#0e0e18] border border-[#1a1a2e] rounded transition-colors hover:bg-[#14142a]">
        {label}
    </button>
);

const ScopeBtn: React.FC<{ label: string; active?: boolean; color?: string; onClick: () => void }> = ({ label, active, color, onClick }) => (
    <button onClick={onClick}
        className={`w-full px-2.5 py-1.5 rounded border text-[9px] font-mono font-bold tracking-tighter uppercase transition-all duration-200 active:scale-[0.97] group flex items-center justify-center gap-2 ${
            active ? 'border-opacity-100 shadow-[0_0_10px_-2px_rgba(0,0,0,0.5)]' : 'bg-[#0a0a12] border-[#1a1a2e] text-gray-600 border-dashed hover:border-gray-700'
        }`}
        style={{ 
            borderColor: active ? color : undefined, 
            color: active ? color : undefined,
            backgroundColor: active ? `${color}10` : undefined,
            boxShadow: active ? `inset 0 0 12px ${color}15, 0 0 5px ${color}10` : undefined
        }}>
        <div className={`w-1 h-1 rounded-full transition-all duration-300 ${active ? 'animate-pulse' : 'bg-gray-800'}`} style={{ backgroundColor: active ? color : undefined, boxShadow: active ? `0 0 4px ${color}` : undefined }} />
        {label}
    </button>
);

const Stepper: React.FC<{ label: string; value: string; onUp: () => void; onDown: () => void }> = ({ label, value, onUp, onDown }) => (
    <div className="flex flex-col gap-1 px-1">
        <span className="text-[7px] font-mono text-gray-500 uppercase tracking-widest">{label}</span>
        <div className="flex items-center bg-[#0d0d16] border border-[#1a1a2e] rounded-md overflow-hidden shadow-inner group-hover:border-[#2a2a4e] transition-colors">
            <button onClick={onDown} className="px-2 py-1 flex items-center justify-center text-gray-500 hover:text-white hover:bg-[#ffffff05] transition-all text-xs font-mono border-r border-[#1a1a2e]">˗</button>
            <div className="flex-1 py-1 px-1.5 flex items-center justify-center min-w-[60px]">
                <span className="text-[10px] font-mono font-bold text-gray-300 tabular-nums">{value}</span>
            </div>
            <button onClick={onUp} className="px-2 py-1 flex items-center justify-center text-gray-500 hover:text-white hover:bg-[#ffffff05] transition-all text-xs font-mono border-l border-[#1a1a2e]">+</button>
        </div>
    </div>
);

const MetricGroup: React.FC<{ title: string; icon: string; children: React.ReactNode; color?: string; subTitle?: string; active?: boolean }> = ({ title, icon, children, color, subTitle, active }) => (
    <div className={`w-full p-2.5 rounded-lg bg-[#0a0a14] border transition-all duration-300 ${active ? 'ring-1 ring-inset ring-white/10 ring-opacity-50' : ''}`} 
        style={{ 
            borderLeftColor: color, 
            borderLeftWidth: color ? '3px' : '1px',
            borderColor: active ? color : '#14142a',
            boxShadow: active ? `inset 0 0 15px ${color}10, 0 0 5px ${color}05` : undefined
        }}>
        <div className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
                {color ? (
                    <span className="text-[11px]" style={{ color: color }}>◆</span>
                ) : (
                    <span className="text-[11px]">{icon}</span>
                )}
                {title}
            </div>
            {subTitle && <span className="text-[7px] text-amber-500 font-bold bg-amber-500/10 px-1 rounded ring-1 ring-amber-500/20">{subTitle}</span>}
        </div>
        <div className="space-y-1">{children}</div>
    </div>
);

const MetricRow: React.FC<{ label: string; value: string; color?: string; status?: 'pass' | 'warn' | 'fail' }> = ({ label, value, color, status }) => (
    <div className="flex justify-between items-center py-0.5">
        <span className="text-[9px] font-mono text-gray-500">{label}</span>
        <div className="flex items-center gap-1.5">
            {status && <span className={`w-2 h-2 rounded-full shadow-sm ${status === 'pass' ? 'bg-emerald-400 shadow-emerald-400/20' : status === 'warn' ? 'bg-amber-400 shadow-amber-400/20' : 'bg-red-400 shadow-red-400/20'}`} />}
            <span className="text-[10px] font-mono font-bold tracking-tight" style={{ color: color || '#f3f4f6' }}>{value}</span>
        </div>
    </div>
);
