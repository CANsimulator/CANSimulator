import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
    Zap, 
    Activity, 
    Eye, 
    Minus,
    Plus,
    Crosshair,
    Maximize2,
    Cpu,
    Settings2,
    BarChart3,
    X,
    Clock,
    Target
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { normToCanvasX, canvasXToNorm, calculateVDiff } from '../../utils/scope-math';
import { 
    ISO, 
    BIT_TIME_SAMPLES, 
    type Sample, 
    type WaveState, 
    generateSample, 
    createInitialWaveState 
} from '../../services/can/waveform-generator';
import { useTheme } from '../../context/ThemeContext';

/* ═══════════════════════════════════════════════════════════════
   CAN-SCOPE CSO-2000 — Physical Layer Oscilloscope
   A CANoe.Scope–style diagnostic tool for CAN bus analysis.
   ISO 11898 compliant voltage thresholds, eye diagram,
   protocol decode, cursors, zoom/pan.
   ═══════════════════════════════════════════════════════════════ */

// ─── Layout Constants ───────────────────────────────────────
const CANVAS_W = 900;
const CANVAS_H = 540;
const M = { top: 28, right: 16, bottom: 4, left: 52 }; // margins (Updated: Right margin increased to 16px to prevent label clipping)
const PLOT_W = CANVAS_W - M.left - M.right;

// Panel heights (proportional)
const WAVE_H = 200;   // CANH/CANL waveform
const DIFF_H = 90;    // Differential voltage
const EYE_H = 100;    // Eye diagram
const DECODE_H = 36;  // Protocol decode strip (Increased from 28px to resolve #217)
const GAP = 8;        // between panels
const EYE_MAX_OVERLAYS = 200;

// Panel Y positions
const WAVE_Y = M.top;
const DIFF_Y = WAVE_Y + WAVE_H + GAP;
const EYE_Y = DIFF_Y + DIFF_H + GAP;
const DECODE_Y = EYE_Y + EYE_H + GAP;

// Panel 5: Status Bar
const STATUS_Y = DECODE_Y + DECODE_H + GAP;  // = 442 + 28 + 8 = 478
const STATUS_H = CANVAS_H - STATUS_Y;         // = 540 - 478 = 62

// ISO thresholds and types imported from waveform-generator service

// ─── Types ──────────────────────────────────────────────────
const VDIV_OPTIONS = [0.2, 0.5, 1, 2, 5] as const;
const TDIV_OPTIONS = [5, 10, 20, 50, 100, 200, 500] as const;

type VDiv = (typeof VDIV_OPTIONS)[number];
type TDiv = (typeof TDIV_OPTIONS)[number];
type RunMode = 'run' | 'stop' | 'single';
type TriggerMode = 'auto' | 'SOF' | 'error' | 'ID';
type CursorMode = 'off' | 'time';

interface ChannelCfg { 
    enabled: boolean; 
    vdiv: VDiv; 
    offset: number; 
    coupling: 'AC' | 'DC';
    bwLimit: boolean;
}

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

// Waveform generator moved to src/services/can/waveform-generator.ts

// Waveform generator moved to src/services/can/waveform-generator.ts

// ─── Helpers ────────────────────────────────────────────────
function stepOpt<T>(opts: readonly T[], cur: T, dir: 1 | -1): T {
    const i = opts.indexOf(cur);
    const nx = i + dir;
    return nx < 0 || nx >= opts.length ? cur : opts[nx];
}
function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

const getInitialScopeParams = () => ({
    ch1: { enabled: true, vdiv: 1 as VDiv, offset: 0, coupling: 'DC' as const, bwLimit: false },
    ch2: { enabled: true, vdiv: 1 as VDiv, offset: 0, coupling: 'DC' as const, bwLimit: false },
    math: true,
    tdiv: 50 as TDiv,
    triggerLevel: 2.5,
    cursorMode: 'off' as CursorMode,
    cursorA: 0.3,
    cursorB: 0.7,
    persistence: false,
    activeCh: 'ch1' as 'ch1' | 'ch2',
});

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════
export const VoltageScope: React.FC = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const C = useMemo(() => ({
        bg:        isDark ? '#06060c' : '#ffffff',
        panelBg:   isDark ? '#08080f' : '#f8f9fa',
        panelBdr:  isDark ? '#14142a' : '#e5e7eb',
        gridFine:  isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)',
        gridMajor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)',
        axisText:  isDark ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.60)',
        ch1:       isDark ? '#00d4ff' : '#0077aa',  
        ch1Dim:    isDark ? 'rgba(0,212,255,0.12)' : 'rgba(0,119,170,0.12)',
        ch2:       isDark ? '#c850ff' : '#8822cc',  
        ch2Dim:    isDark ? 'rgba(200,80,255,0.12)' : 'rgba(136,34,204,0.12)',
        diff:      isDark ? '#00ff88' : '#00aa55',  
        diffDim:   isDark ? 'rgba(0,255,136,0.10)' : 'rgba(0,170,85,0.10)',
        trigger:   '#ffd000',
        cursor:    '#ff6b35',
        cursorB:   '#35b0ff',
        dominant:  'rgba(0,255,136,0.65)',
        recessive: '#ffd000',
    }), [isDark]);

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
    const miniEyeCanvasRef = useRef<HTMLCanvasElement>(null);
    /** Hover tracking (stored in ref for performance, read in draw loop) */
    const hoveredElementRef = useRef<'trigger' | 'ch1-offset' | 'ch2-offset' | 'cursor-A' | 'cursor-B' | 'none'>('none');
    const containerWidthRef = useRef<number>(CANVAS_W);
    const [announcement, setAnnouncement] = useState('');
    const needsRedraw = useRef(true);
    const lastFrameTime = useRef(0);
    const shouldReduceMotion = useReducedMotion() ?? false;
    const shouldReduceMotionRef = useRef(shouldReduceMotion);
    useEffect(() => { shouldReduceMotionRef.current = shouldReduceMotion; }, [shouldReduceMotion]);

    const [scope, setScope] = useState<ScopeState>({
        ...getInitialScopeParams(),
        triggerMode: 'auto',
        runMode: 'run',
    });

    const [view, setView] = useState<ViewState>({ zoomX: 1, zoomY: 1, panX: 0, panY: 0 });
    const [showShortcuts, setShowShortcuts] = useState(false);

    const [metrics, setMetrics] = useState({
        ch1Vpp: 0, ch1Avg: 0, ch1Min: 0, ch1Max: 0,
        ch2Vpp: 0, ch2Avg: 0, ch2Min: 0, ch2Max: 0,
        vdiff: 0, riseTime: 0, fallTime: 0,
        symmetry: 0, busLoad: 0, bitRate: 0,
        eyeWidth: 0, eyeHeight: 0,
        isoCANH: true, isoCANL: true, isoDiff: true,
        isGated: false,
        eyePending: true,
    });

    const scopeRef = useRef(scope);
    const viewRef = useRef(view);
    useEffect(() => { scopeRef.current = scope; needsRedraw.current = true; }, [scope]);
    useEffect(() => { viewRef.current = view; needsRedraw.current = true; }, [view]);

    // Accessibility announcements
    useEffect(() => {
        setAnnouncement(`ISO 11898 compliance: ${metrics.isoCANH && metrics.isoCANL && metrics.isoDiff ? 'PASS' : 'FAIL'}`);
    }, [metrics.isoCANH, metrics.isoCANL, metrics.isoDiff]);

    useEffect(() => {
        const modeLabel = scope.runMode === 'run' ? 'Acquiring' : scope.runMode === 'single' ? 'Armed for single capture' : 'Acquisition stopped';
        setAnnouncement(`Oscilloscope: ${modeLabel}`);
    }, [scope.runMode]);

    useEffect(() => {
        if (scope.cursorMode === 'time') {
            const dt = Math.abs(scope.cursorB - scope.cursorA) * (scope.tdiv / 20);
            setAnnouncement(`Cursors: Delta T = ${dt.toFixed(1)} microseconds`);
        }
    }, [scope.cursorA, scope.cursorB, scope.cursorMode, scope.tdiv]);

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
        const effectiveScaleX = Math.max(cw / CANVAS_W, 0.3);
        const fs = (size: number) => `${Math.round(size / effectiveScaleX)}px`;
        const lw = (width: number) => width / effectiveScaleX;
        const scaleX = cw / CANVAS_W;
        const scaleY = ch / CANVAS_H;
        ctx.scale(scaleX, scaleY);

        // Background persistence
        if (s.persistence && !requestClearRef.current) {
            ctx.fillStyle = isDark ? 'rgba(6,6,12,0.18)' : 'rgba(255,255,255,0.82)';
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
                ctx.lineWidth = lw(0.5);
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            }
            for (let i = 0; i <= rows; i++) {
                const by = (i / rows) * h;
                const y = (by - h / 2) * v.zoomY + h / 2 + v.panY;
                if (y < -1 || y > h + 1) continue;
                ctx.strokeStyle = i === rows / 2 ? C.gridMajor : C.gridFine;
                ctx.lineWidth = lw(0.5);
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }
        };

        // ── Helper: voltage axis ──
        const drawVAxis = (h: number, vMin: number, vMax: number, unit: string, step: number, v: ViewState) => {
            ctx.font = `${fs(12)} monospace`;
            ctx.textAlign = 'right';
            
            for (let val = vMin; val <= vMax; val += step) {
                const y = vToPanel(val, vMin, vMax, h, v);
                if (y < -5 || y > h + 5) continue;
                
                const label = `${val.toFixed(1)}${unit}`;
                
                // Text Halo for readability on top of grid/waves
                ctx.strokeStyle = isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)';
                ctx.lineWidth = lw(3);
                ctx.strokeText(label, -6, y + 3);

                ctx.fillStyle = C.axisText;
                ctx.fillText(label, -6, y + 3);
                
                ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
                ctx.lineWidth = lw(0.5);
                ctx.beginPath(); ctx.moveTo(-3, y); ctx.lineTo(0, y); ctx.stroke();
            }
        };

        // ── Helper: time axis ──
        const drawTimeAxis = (w: number, h: number, cols: number, tdiv: number, v: ViewState) => {
            ctx.font = `${fs(12)} monospace`;
            for (let i = 0; i <= cols; i++) {
                const bx = (i / cols) * w;
                const x = (bx - w / 2) * v.zoomX + w / 2 + v.panX;
                if (x < -20 || x > w + 20) continue;
                
                const timeVal = i * tdiv;
                const label = timeVal === 0 ? '0' : `${timeVal}µs`;
                
                if (x < 10) ctx.textAlign = 'left';
                else if (x > w - 10) ctx.textAlign = 'right';
                else ctx.textAlign = 'center';

                // Shadow/Halo
                ctx.strokeStyle = isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)';
                ctx.lineWidth = lw(3);
                ctx.strokeText(label, x < 10 ? x + 2 : x > w - 10 ? x - 2 : x, h - 6);

                ctx.fillStyle = C.axisText;
                ctx.fillText(label, x < 10 ? x + 2 : x > w - 10 ? x - 2 : x, h - 6);
            }
        };

        // ── Helper: draw panel frame ──
        const drawPanel = (x: number, y: number, w: number, h: number, title: string, content: () => void, bdrColor?: string) => {
            ctx.fillStyle = C.panelBg;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = bdrColor || C.panelBdr;
            ctx.lineWidth = lw(1);
            ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
            if (title) {
                ctx.fillStyle = isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.35)';
                ctx.font = `bold ${fs(12)} sans-serif`;
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
            ctx.lineWidth = lw(6);
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
                ctx.lineWidth = lw(2 - velocity * 0.8);
                ctx.globalAlpha = intensity;
                ctx.beginPath();
                ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
                ctx.lineTo(pts[i].x, pts[i].y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // White core
            ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)';
            ctx.lineWidth = lw(0.6);
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
            ctx.setLineDash([2, 4]); ctx.lineWidth = lw(0.5);
            ctx.beginPath(); ctx.moveTo(0, recY); ctx.lineTo(PLOT_W, recY); ctx.stroke();
            ctx.setLineDash([]);

            // ISO threshold labels (Relocated to right to avoid left-side markers/axis)
            const thresholds = [
                { v: ISO.CANH_DOM_MIN + (s.ch1.offset - avgOffset), label: 'CANH min 2.75V', color: C.ch1, scale: ch1 },
                { v: ISO.CANL_DOM_MAX + (s.ch2.offset - avgOffset), label: 'CANL max 2.25V', color: C.ch2, scale: ch2 },
            ];
            
            // Sort to handle overlap avoidance from top to bottom
            const activeThresholds = thresholds
                .map(th => ({ ...th, y: vToPanel(th.v, th.scale.vMin, th.scale.vMax, WAVE_H, vw) }))
                .filter(th => th.y >= 0 && th.y <= WAVE_H)
                .sort((a, b) => a.y - b.y);

            let lastLabelY = -50;
            for (const th of activeThresholds) {
                // Draw threshold line
                ctx.strokeStyle = th.color; ctx.globalAlpha = 0.2;
                ctx.setLineDash([1, 3]); ctx.lineWidth = lw(0.5);
                ctx.beginPath(); ctx.moveTo(0, th.y); ctx.lineTo(PLOT_W, th.y); ctx.stroke();
                ctx.setLineDash([]);

                // Overlap avoidance: minimum 16px vertical spacing between labels
                let textY = th.y - 4;
                if (textY < lastLabelY + 16) textY = lastLabelY + 16;
                // Clamp within panel
                textY = clamp(textY, 10, WAVE_H - 4);

                // Semi-transparent background pill for readability
                ctx.globalAlpha = 0.65; ctx.font = `${fs(10)} monospace`; ctx.fillStyle = th.color;
                ctx.textAlign = 'right';
                ctx.fillText(th.label, PLOT_W - 6, textY);
                lastLabelY = textY;
            }
            ctx.globalAlpha = 1;

            drawGrid(PLOT_W, WAVE_H, 10, 8, vw);
            drawVAxis(WAVE_H, vMin, vMax, 'V', activeVdiv, vw);
            drawTimeAxis(PLOT_W, WAVE_H, 10, s.tdiv, vw);

            // Channel Ground/Offset Indicators on the left side
            const drawGndMarker = (ch: 'ch1' | 'ch2', color: string, label: string) => {
                const cfg = s[ch];
                if (!cfg.enabled) return;
                const gy = vToPanel(2.5 + (cfg.offset - avgOffset), vMin, vMax, WAVE_H, vw);
                const isHovered = hoveredElementRef.current === `${ch}-offset`;
                
                ctx.save();
                ctx.fillStyle = color;
                ctx.globalAlpha = isHovered ? 1 : 0.7;
                
                if (isHovered) {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = color;
                }

                // Triangle pointer on the left
                ctx.beginPath();
                ctx.moveTo(0, gy);
                ctx.lineTo(8, gy - 6);
                ctx.lineTo(8, gy + 6);
                ctx.fill();
                
                ctx.fillStyle = isDark ? '#fff' : '#000';
                ctx.font = `bold ${fs(9)} monospace`;
                ctx.textAlign = 'center';
                ctx.fillText(label, 4, gy + 3);
                ctx.restore();
            };
            drawGndMarker('ch1', C.ch1, '1');
            drawGndMarker('ch2', C.ch2, '2');

            if (samples.length < 2) return;

            // Traces
            if (s.ch2.enabled) drawWaveform(samples, p => p.canl + (s.ch2.offset - avgOffset), ch2.vMin, ch2.vMax, WAVE_H, C.ch2, C.ch2Dim, vw);
            if (s.ch1.enabled) drawWaveform(samples, p => p.canh + (s.ch1.offset - avgOffset), ch1.vMin, ch1.vMax, WAVE_H, C.ch1, C.ch1Dim, vw);

            // Trigger level
            const trigY = vToPanel(s.triggerLevel, vMin, vMax, WAVE_H, vw);
            const isTrigHovered = hoveredElementRef.current === 'trigger';
            
            // Trigger mode color and label
            const trigColors: Record<'auto' | 'SOF' | 'error' | 'ID', string> = {
                auto:  '#ffd000',   // yellow — always armed
                SOF:   '#38bdf8',   // sky-400 — wait for Start Of Frame
                error: '#ff4444',   // red  — wait for error frame
                ID:    '#4488ff',   // blue — wait for specific ID
            };
            const trigColor = trigColors[s.triggerMode];
            const trigLabel = s.triggerMode === 'auto' ? 'T' : s.triggerMode.toUpperCase();
            
            ctx.save();
            ctx.strokeStyle = trigColor; ctx.setLineDash([4, 4]); 
            ctx.lineWidth = lw(isTrigHovered ? 1.5 : 0.8); 
            ctx.globalAlpha = isTrigHovered ? 1.0 : 0.6;
            
            if (isTrigHovered) {
                ctx.shadowBlur = 12;
                ctx.shadowColor = trigColor;
            }

            ctx.beginPath(); ctx.moveTo(0, trigY); ctx.lineTo(PLOT_W - 14, trigY); ctx.stroke();
            ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
            
            ctx.fillStyle = trigColor;
            // Left-pointing triangle fully inside panel bounds
            ctx.beginPath(); 
            ctx.moveTo(PLOT_W - 2, trigY); 
            ctx.lineTo(PLOT_W - (isTrigHovered ? 16 : 12), trigY - 7); 
            ctx.lineTo(PLOT_W - (isTrigHovered ? 16 : 12), trigY + 7); 
            ctx.fill();
            
            ctx.font = `bold ${fs(10)} monospace`; ctx.textAlign = 'right';
            ctx.fillStyle = isDark ? '#fff' : '#000';
            ctx.fillText(trigLabel, PLOT_W - (isTrigHovered ? 18 : 14), trigY + 3.5);
            ctx.restore();

            // Cursors
            if (s.cursorMode === 'time') {
                const drawCur = (pos: number, color: string, label: string) => {
                    const tx = normToCanvasX(pos, vw);
                    const isHovered = (label === 'A' && hoveredElementRef.current === 'cursor-A') || 
                                    (label === 'B' && hoveredElementRef.current === 'cursor-B');
                    
                    ctx.save();
                    ctx.strokeStyle = color; ctx.setLineDash([4, 2]); 
                    ctx.lineWidth = lw(isHovered ? 2 : 1); 
                    ctx.globalAlpha = isHovered ? 1 : 0.7;
                    
                    if (isHovered) {
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = color;
                    }

                    ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx, WAVE_H); ctx.stroke();
                    ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
                    
                    ctx.fillStyle = color; ctx.font = `700 ${fs(11)} monospace`; ctx.textAlign = 'center';
                    ctx.fillText(label, tx, 20);
                    ctx.restore();
                };
                drawCur(s.cursorA, C.cursor, 'A');
                drawCur(s.cursorB, C.cursorB, 'B');

                // Floating measurement box between cursors (Issue #239)
                if (samples.length > 2) {
                    const idxA = Math.floor(s.cursorA * (samples.length - 1));
                    const idxB = Math.floor(s.cursorB * (samples.length - 1));
                    const sA = samples[clamp(idxA, 0, samples.length - 1)];
                    const sB = samples[clamp(idxB, 0, samples.length - 1)];
                    const dt = Math.abs(idxB - idxA) * (s.tdiv / 20);
                    const dv = Math.abs((sA?.canh ?? 0) - (sB?.canh ?? 0));

                    const txA = normToCanvasX(s.cursorA, vw);
                    const txB = normToCanvasX(s.cursorB, vw);
                    const midX = (txA + txB) / 2;
                    const boxY = 32; 
                    const line1 = `ΔT = ${dt.toFixed(1)} µs`;
                    const line2 = `ΔV = ${dv.toFixed(2)} V`;

                    ctx.font = `700 ${fs(11)} monospace`;
                    const w1 = ctx.measureText(line1).width;
                    const w2 = ctx.measureText(line2).width;
                    const boxW = Math.max(w1, w2) + 16;
                    const boxH = 30;
                    const boxX = clamp(midX - boxW / 2, 4, PLOT_W - boxW - 4);

                    // Background pill
                    ctx.fillStyle = isDark ? 'rgba(10,10,30,0.85)' : 'rgba(255,255,255,0.95)';
                    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
                    ctx.lineWidth = 0.5;
                    const r = 4;
                    ctx.beginPath();
                    ctx.roundRect(boxX, boxY, boxW, boxH, r);
                    ctx.fill(); ctx.stroke();

                    // Text
                    ctx.fillStyle = C.cursor;
                    ctx.textAlign = 'left';
                    ctx.fillText(line1, boxX + 8, boxY + 11);
                    ctx.fillStyle = C.cursorB;
                    ctx.fillText(line2, boxX + 8, boxY + 24);
                }
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
                ctx.setLineDash([2, 2]); ctx.lineWidth = lw(0.6); ctx.globalAlpha = 0.3;
                ctx.strokeStyle = C.dominant;
                ctx.beginPath(); ctx.moveTo(0, domLineY); ctx.lineTo(PLOT_W, domLineY); ctx.stroke();
                ctx.strokeStyle = C.recessive;
                ctx.beginPath(); ctx.moveTo(0, recLineY); ctx.lineTo(PLOT_W, recLineY); ctx.stroke();
                ctx.setLineDash([]);
                ctx.font = `${fs(11)} monospace`; ctx.globalAlpha = 0.5; ctx.textAlign = 'right';
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
        const eyeTitle = `Eye Diagram — ${isEyeReady ? 'READY' : 'BUILDING'} (${eyeData.length}/${EYE_MAX_OVERLAYS}w)`;
        const eyeBdr = isEyeReady ? '#00ff8888' : '#ffd00088';

        drawPanel(M.left, EYE_Y, PLOT_W, EYE_H, eyeTitle, () => {
            ctx.fillStyle = isDark ? 'rgba(0,10,20,0.5)' : 'rgba(240,248,255,0.6)';
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
                ctx.fillStyle = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)';
                ctx.font = `600 ${fs(12)} sans-serif`; ctx.textAlign = 'center';
                ctx.fillText('COLLECTING TRANSITIONS...', PLOT_W / 2, EYE_H / 2 + 5);
                return;
            }

            const noZoom: ViewState = { zoomX: 1, zoomY: 1, panX: 0, panY: 0 };
            
            // Brightness boost: higher alpha when ready to clearly show eye opening
            // In light mode, we need much higher alpha for visibility on white background
            ctx.globalAlpha = isEyeReady ? (isDark ? 0.28 : 0.45) : (isDark ? 0.08 : 0.22);
            
            for (const bitSamples of eyeData) {
                if (bitSamples.length < 2) continue;
                // CANH
                if (s.ch1.enabled) {
                    ctx.strokeStyle = C.ch1; ctx.lineWidth = lw(1);
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
            ctx.font = `${fs(11)} monospace`; ctx.fillStyle = isEyeReady ? C.dominant : C.recessive; ctx.textAlign = 'right';
            ctx.fillText(isEyeReady ? 'SIGNAL STABLE' : 'INTEGRATING...', PLOT_W - 8, EYE_H - 6);

            // Synchronize Mini-Eye sidebar Diagram (Issue #216)
            const mCanv = miniEyeCanvasRef.current;
            if (mCanv && eyeData.length > 5) {
                const mctx = mCanv.getContext('2d');
                if (mctx) {
                    const mw = mCanv.width; const mh = mCanv.height;
                    mctx.clearRect(0, 0, mw, mh);
                    mctx.globalAlpha = isEyeReady ? 0.35 : 0.15;
                    mctx.lineWidth = lw(1);
                    const vRange = ISO.V_MAX - ISO.V_MIN;
                    for (const bit of eyeData) { 
                        if (bit.length < 2) continue;
                        if (s.ch1.enabled) {
                            mctx.strokeStyle = C.ch1; mctx.beginPath();
                            for (let j = 0; j < bit.length; j++) {
                                const mx = (j / (bit.length - 1)) * mw;
                                const my = (1 - (bit[j].canh - ISO.V_MIN) / vRange) * mh;
                                if (j === 0) mctx.moveTo(mx, my); else mctx.lineTo(mx, my);
                            }
                            mctx.stroke();
                        }
                        if (s.ch2.enabled) {
                            mctx.strokeStyle = C.ch2; mctx.beginPath();
                            for (let j = 0; j < bit.length; j++) {
                                const mx = (j / (bit.length - 1)) * mw;
                                const my = (1 - (bit[j].canl - ISO.V_MIN) / vRange) * mh;
                                if (j === 0) mctx.moveTo(mx, my); else mctx.lineTo(mx, my);
                            }
                            mctx.stroke();
                        }
                    }
                }
            }

            // Reference Labels — overlap-aware, fully inside panel
            ctx.save();
            ctx.font = `${fs(10)} monospace`; ctx.textAlign = 'right'; ctx.globalAlpha = 0.55;

            // Collect labels sorted top→bottom, then push down any that overlap
            type EyeLabel = { color: string; text: string; y: number };
            const eyeLabels: EyeLabel[] = [];
            if (s.ch1.enabled) {
                const yH = vToPanel(ISO.CANH_DOM_TYP, ISO.V_MIN, ISO.V_MAX, EYE_H, noZoom);
                eyeLabels.push({ color: C.ch1, text: 'CANH 3.5V', y: yH });
            }
            {
                const yR = vToPanel(ISO.V_REC, ISO.V_MIN, ISO.V_MAX, EYE_H, noZoom);
                eyeLabels.push({ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', text: 'REC 2.5V', y: yR });
            }
            if (s.ch2.enabled) {
                const yL = vToPanel(ISO.CANL_DOM_TYP, ISO.V_MIN, ISO.V_MAX, EYE_H, noZoom);
                eyeLabels.push({ color: C.ch2, text: 'CANL 1.5V', y: yL });
            }
            eyeLabels.sort((a, b) => a.y - b.y);

            let lastEyeLabelY = -50;
            for (const lbl of eyeLabels) {
                let ty = lbl.y - 3;
                if (ty < lastEyeLabelY + 13) ty = lastEyeLabelY + 13;
                ty = clamp(ty, 8, EYE_H - 4);
                ctx.fillStyle = lbl.color;
                ctx.fillText(lbl.text, PLOT_W - 6, ty);
                lastEyeLabelY = ty;
            }
            ctx.restore();
        }, eyeBdr);

        // ════════════════════════════════════════════
        // PANEL 4: Protocol Decode Strip
        // ════════════════════════════════════════════
        let frameCount = 0;
        if (samples.length >= 2) {
            for (let i = 1; i < samples.length; i++) {
                if (samples[i].bitIndex < samples[i - 1].bitIndex) {
                    frameCount++;
                }
            }
        }

        drawPanel(M.left, DECODE_Y, PLOT_W, DECODE_H, '', () => {
            if (samples.length < 2) return;
            
            // Highlighted wait state for better visibility
            if (!s.ch1.enabled && !s.ch2.enabled) {
                const tw = 130;
                ctx.fillStyle = 'rgba(0, 243, 255, 0.12)';
                ctx.fillRect(PLOT_W / 2 - tw / 2, 4, tw, DECODE_H - 8);
                ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
                ctx.strokeRect(PLOT_W / 2 - tw / 2, 4, tw, DECODE_H - 8);

                ctx.fillStyle = '#00f3ff';
                ctx.font = `bold ${fs(12)} monospace`; ctx.textAlign = 'center';
                ctx.fillText('WAITING FOR PROBE CONNECTION...', PLOT_W / 2, DECODE_H / 2 + 5);
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

            ctx.font = `bold ${fs(12)} monospace`; ctx.textAlign = 'center';

            regions.forEach((r) => {
                const w = Math.max(r.x2 - r.x1, 2);
                const midX = (r.x1 + r.x2) / 2;
                if (midX < -40 || midX > PLOT_W + 40) return;

                // Strip Background
                ctx.fillStyle = r.color;
                ctx.globalAlpha = 0.35;
                ctx.fillRect(r.x1, 4, w, DECODE_H - 8);

                // Strip Border
                ctx.strokeStyle = r.color;
                ctx.globalAlpha = 0.7;
                ctx.lineWidth = lw(1);
                ctx.strokeRect(r.x1, 4, w, DECODE_H - 8);

                // Label (show if wide enough to hold at least partial text)
                if (w > 14) {
                    ctx.globalAlpha = 1.0;
                    ctx.fillStyle = r.color;
                    // Clip label to strip width
                    ctx.save();
                    ctx.beginPath(); ctx.rect(r.x1 + 2, 0, w - 4, DECODE_H); ctx.clip();
                    ctx.fillText(r.name, midX, DECODE_H / 2 + 5);
                    ctx.restore();
                }
                ctx.globalAlpha = 1;
            });

            ctx.fillStyle = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'; ctx.font = `bold ${fs(11)} monospace`; ctx.textAlign = 'left';
            ctx.fillText('DECODE', 4, 13);

            // Frame count readout (right-aligned) - Keep this for now, though redundant with status bar
            ctx.fillStyle = frameCount > 0 ? (isDark ? 'rgba(0,255,136,0.5)' : 'rgba(0,180,100,0.6)') : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)');
            ctx.font = `${fs(11)} monospace`;
            ctx.textAlign = 'right';
            ctx.fillText(
                frameCount === 1 ? '1 frame' : `${frameCount} frames`,
                PLOT_W - 4,
                13
            );
        });

        // ════════════════════════════════════════════
        // STATUS BAR (Panel 5)
        // ════════════════════════════════════════════
        ctx.fillStyle = isDark ? '#070710' : '#f0f0f5';
        ctx.fillRect(M.left, STATUS_Y, PLOT_W, STATUS_H);
        ctx.strokeStyle = C.panelBdr;
        ctx.lineWidth = lw(0.5);
        ctx.strokeRect(M.left + 0.5, STATUS_Y + 0.5, PLOT_W - 1, STATUS_H - 1);

        const statusMidY = STATUS_Y + STATUS_H / 2 + 3;
        ctx.font = `600 ${fs(11)} monospace`;

        // Left: cursor measurement
        if (s.cursorMode === 'time' && samples.length > 2) {
            const idxA = Math.floor(s.cursorA * (samples.length - 1));
            const idxB = Math.floor(s.cursorB * (samples.length - 1));
            const sA = samples[clamp(idxA, 0, samples.length - 1)];
            const sB = samples[clamp(idxB, 0, samples.length - 1)];
            const dt = Math.abs(idxB - idxA) * (s.tdiv / 20);
            const dv = Math.abs(sA.canh - sB.canh);
            ctx.fillStyle = C.cursor;
            ctx.textAlign = 'left';
            ctx.fillText(`ΔT = ${dt.toFixed(1)} µs   ΔV = ${dv.toFixed(2)} V`, M.left + 12, statusMidY);
        } else {
            ctx.fillStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)';
            ctx.textAlign = 'left';
            ctx.fillText('Enable cursors (C) to measure', M.left + 12, statusMidY);
        }

        // Center: Frame info
        if (frameCount > 0) {
            ctx.fillStyle = C.dominant;
            ctx.textAlign = 'center';
            ctx.fillText(`${frameCount} CAN FRAME${frameCount > 1 ? 'S' : ''} DETECTED`, M.left + PLOT_W / 2, statusMidY);
        }

        // Right: sample info
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.4)';
        ctx.textAlign = 'right';
        ctx.fillText(`${samples.length} smp  ${s.tdiv}µs/div`, PLOT_W + M.left - 12, statusMidY);

        // ════════════════════════════════════════════
        // Header info bar
        // ════════════════════════════════════════════
        ctx.font = `600 ${fs(11)} monospace`; ctx.textAlign = 'left';
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
        ctx.fillStyle = isZoomed ? (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)');
        ctx.textAlign = 'center';
        ctx.fillText(
            isZoomed ? `${vw.zoomX.toFixed(1)}×${vw.zoomY.toFixed(1)}` : '1:1',
            CANVAS_W / 2,
            14
        );


        // Ground markers
        const { vMin, vMax, avgOffset } = getActiveWaveScale();
        let ch1gy = -1;
        if (s.ch1.enabled) {
            ch1gy = vToPanel(2.5 + (s.ch1.offset - avgOffset), vMin, vMax, WAVE_H, vw) + WAVE_Y;
            if (ch1gy > WAVE_Y && ch1gy < WAVE_Y + WAVE_H) {
                const isHovered = hoveredElementRef.current === 'ch1-offset';
                ctx.save();
                ctx.fillStyle = C.ch1;
                
                if (isHovered) {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = C.ch1;
                }

                ctx.beginPath(); 
                ctx.moveTo(M.left, ch1gy); 
                ctx.lineTo(M.left - (isHovered ? 12 : 8), ch1gy - 5); 
                ctx.lineTo(M.left - (isHovered ? 12 : 8), ch1gy + 5); 
                ctx.fill();
                ctx.restore();
            }
        }
        if (s.ch2.enabled) {
            const gy = vToPanel(2.5 + (s.ch2.offset - avgOffset), vMin, vMax, WAVE_H, vw) + WAVE_Y;
            // Requirement 17: offset CH2 marker by 12px below CH1 if they overlap
            const finalGy2 = (s.ch1.enabled && Math.abs(gy - ch1gy) < 2) ? ch1gy + 12 : gy;
            if (finalGy2 > WAVE_Y && finalGy2 < WAVE_Y + WAVE_H) {
                const isHovered = hoveredElementRef.current === 'ch2-offset';
                ctx.save();
                ctx.fillStyle = C.ch2;

                if (isHovered) {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = C.ch2;
                }

                ctx.beginPath(); 
                ctx.moveTo(M.left, finalGy2); 
                ctx.lineTo(M.left - (isHovered ? 12 : 8), finalGy2 - 5); 
                ctx.lineTo(M.left - (isHovered ? 12 : 8), finalGy2 + 5); 
                ctx.fill();
                ctx.restore();
            }
        }

        // ── Single capture flash overlay ──
        const flashAge = performance.now() - singleFlashRef.current;
        const FLASH_DURATION = 400; // ms
        if (singleFlashRef.current > 0 && flashAge < FLASH_DURATION) {
            const alpha = Math.max(0, 1 - flashAge / FLASH_DURATION) * 0.5;
            ctx.fillStyle = `rgba(191,0,255,${alpha.toFixed(3)})`;
            ctx.fillRect(M.left, WAVE_Y, PLOT_W, WAVE_H);
            ctx.fillStyle = isDark ? `rgba(255,255,255,${(alpha * 2).toFixed(3)})` : `rgba(0,0,0,${(alpha * 2).toFixed(3)})`;
            ctx.font = `700 ${fs(14)} monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('▶ ARMED', PLOT_W / 2 + M.left, WAVE_Y + WAVE_H / 2 + 5);
        }

    }, [vToPanel, sToX, C, isDark]);
    
    const MIN_EYE_SAMPLES = 100;

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
        
        const ch1Min = canh.reduce((min, v) => v < min ? v : min, canh[0] ?? 0);
        const ch1Max = canh.reduce((max, v) => v > max ? v : max, canh[0] ?? 0);
        const ch2Min = canl.reduce((min, v) => v < min ? v : min, canl[0] ?? 0);
        const ch2Max = canl.reduce((max, v) => v > max ? v : max, canl[0] ?? 0);
        
        const ch1Avg = canh.length > 0 ? canh.reduce((a, b) => a + b, 0) / canh.length : 0;
        const ch2Avg = canl.length > 0 ? canl.reduce((a, b) => a + b, 0) / canl.length : 0;

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
        const diffValues = samples.map(s => calculateVDiff(s.canh, s.canl, scopeVal.ch1.enabled, scopeVal.ch2.enabled));
        const maxDiff = diffValues.reduce((max, v) => v > max ? v : max, diffValues[0] ?? 0);
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

        // ── Compute real Eye Height from eye diagram data ──
        let eyeHeight = 0;
        const eyeWinsH = eyeBufferRef.current;
        if ((scopeVal.ch1.enabled || scopeVal.ch2.enabled) && eyeWinsH.length >= 10) {
            let canhSum = 0, canlSum = 0, validCount = 0;
            for (const win of eyeWinsH) {
                if (win.length < 2) continue;
                const centerIdx = Math.round(0.5 * (win.length - 1));
                canhSum += win[centerIdx].canh;
                canlSum += win[centerIdx].canl;
                validCount++;
            }
            if (validCount > 0) {
                const avgCANH = canhSum / validCount;
                const avgCANL = canlSum / validCount;
                const verticalGap = avgCANH - avgCANL;
                const voltRange = ISO.V_MAX - ISO.V_MIN; // 5.0
                eyeHeight = clamp(Math.round((verticalGap / voltRange) * 100), 0, 100);
            }
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
            eyeHeight,
            isoCANH: !!isoCANH, 
            isoCANL: !!isoCANL, 
            isoDiff: !!isoDiff, 
            isGated,
            eyePending: eyeWins.length < MIN_EYE_SAMPLES,
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
        const isAcquiring = s.runMode !== 'stop';

        // Throttle for reduced motion (Issue #243)
        const minFrameInterval = shouldReduceMotionRef.current ? 100 : 0; // 10fps
        if (time - lastFrameTime.current < minFrameInterval) {
            animRef.current = requestAnimationFrame(tick);
            return;
        }

        if (isAcquiring && time - lastTick.current > interval) {
            const prev = samplesRef.current.length > 0 ? samplesRef.current[samplesRef.current.length - 1] : null;
            const s = scopeRef.current;
            samplesRef.current.push(generateSample(prev, waveStateRef.current, s.ch1, s.ch2));
            const maxSamples = 200;
            if (samplesRef.current.length > maxSamples) samplesRef.current = samplesRef.current.slice(-maxSamples);
            if (s.runMode === 'single' && samplesRef.current.length >= maxSamples) {
                setScope(p => ({ ...p, runMode: 'stop' }));
            }
            lastTick.current = time;
            needsRedraw.current = true;
        }

        // Only draw if acquiring or dirty (Issue #241)
        if (isAcquiring || needsRedraw.current) {
            draw();
            needsRedraw.current = false;
            lastFrameTime.current = time;
        }
        
        animRef.current = requestAnimationFrame(tick);
    }, [draw]);

    useEffect(() => { animRef.current = requestAnimationFrame(tick); return () => cancelAnimationFrame(animRef.current); }, [tick]);
    useEffect(() => { const i1 = setInterval(computeMetrics, 500); const i2 = setInterval(updateEyeBuffer, 800); return () => { clearInterval(i1); clearInterval(i2); }; }, [computeMetrics, updateEyeBuffer]);

    // ResizeObserver to track container width for scale-independent text/lines (Issue #230)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                containerWidthRef.current = entry.contentRect.width || CANVAS_W;
            }
        });
        observer.observe(canvas);
        return () => observer.disconnect();
    }, []);

    // ─── Zoom ───────────────────────────────────────────────
    const handleWheel = useCallback((e: WheelEvent) => {
        // Prevent default here is now safe because we attach with { passive: false }
        e.preventDefault();
        const f = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        setView(p => {
            if (e.shiftKey) return { ...p, zoomY: clamp(p.zoomY * f, 0.25, 20) };
            if (e.ctrlKey) return { ...p, zoomX: clamp(p.zoomX * f, 0.25, 20) };
            return { ...p, zoomX: clamp(p.zoomX * f, 0.25, 20), zoomY: clamp(p.zoomY * f, 0.25, 20) };
        });
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    // ─── Pan ────────────────────────────────────────────────
    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
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
            
            // Left-click on empty canvas: start pan ONLY if Ctrl is held to prevent accidental shifts
            if (e.ctrlKey) {
                isPanning.current = true;
                panOrigin.current = { x: e.clientX, y: e.clientY, vx: viewRef.current.panX, vy: viewRef.current.panY };
                e.currentTarget.setPointerCapture(e.pointerId);
                e.currentTarget.style.cursor = 'grabbing';
            }
        }

        if (e.button === 1 || e.button === 2) {
            isPanning.current = true;
            panOrigin.current = { x: e.clientX, y: e.clientY, vx: viewRef.current.panX, vy: viewRef.current.panY };
            e.currentTarget.setPointerCapture(e.pointerId); e.preventDefault();
        }
    }, [vToPanel, getActiveWaveScale]);
    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (CANVAS_W / rect.width);
        const mouseY = (e.clientY - rect.top) * (CANVAS_H / rect.height);
        const vw = viewRef.current;

        // 1. Process Active Interactions
        if (isDraggingCursor.current) {
            const plotX = mouseX - M.left;
            const normPos = clamp(canvasXToNorm(plotX, vw), 0, 1);
            if (isDraggingCursor.current === 'A') setScope(p => ({ ...p, cursorA: normPos }));
            else setScope(p => ({ ...p, cursorB: normPos }));
            canvas.style.cursor = 'ew-resize';
            return;
        }

        if (isDraggingTrigger.current) {
            const { vMin, vMax } = getActiveWaveScale();
            const panelY = mouseY - WAVE_Y;
            const newV = clamp(Math.round(yToV(panelY, vMin, vMax, WAVE_H, vw) * 10) / 10, 0, 5);
            setScope(p => ({ ...p, triggerLevel: newV }));
            canvas.style.cursor = 'ns-resize';
            return;
        }

        if (draggingOffset.current) {
            const { vMin, vMax, avgOffset } = getActiveWaveScale();
            const panelY = mouseY - WAVE_Y;
            const newOffset = clamp(Math.round((yToV(panelY, vMin, vMax, WAVE_H, vw) - 2.5 + avgOffset) * 10) / 10, -5, 5);
            const ch = draggingOffset.current;
            setScope(p => ({ ...p, [ch]: { ...p[ch], offset: newOffset } }));
            canvas.style.cursor = 'ns-resize';
            return;
        }

        if (isPanning.current) {
            setView(p => ({
                ...p,
                panX: panOrigin.current.vx + (e.clientX - panOrigin.current.x) * (CANVAS_W / rect.width),
                panY: panOrigin.current.vy + (e.clientY - panOrigin.current.y) * (CANVAS_H / rect.height),
            }));
            canvas.style.cursor = 'grabbing';
            return;
        }

        // 2. Hover Effect for Markers (only reached if no active interaction)
        const { vMin, vMax, avgOffset } = getActiveWaveScale();
        const trigY = vToPanel(scopeRef.current.triggerLevel, vMin, vMax, WAVE_H, vw);
        const isNearTrigLine = mouseX > M.left - 20 && mouseX < CANVAS_W && Math.abs(mouseY - (WAVE_Y + trigY)) < 24;
        
        let hovered: typeof hoveredElementRef.current = 'none';

        if (scopeRef.current.cursorMode === 'time') {
            const curAX = M.left + normToCanvasX(scopeRef.current.cursorA, vw);
            const curBX = M.left + normToCanvasX(scopeRef.current.cursorB, vw);
            if (Math.abs(mouseX - curAX) < 12) hovered = 'cursor-A';
            else if (Math.abs(mouseX - curBX) < 12) hovered = 'cursor-B';
        }

        if (hovered === 'none') {
            if (isNearTrigLine) {
                hovered = 'trigger';
            } else if (mouseX < M.left + 30) {
                const g1y = vToPanel(2.5 + (scopeRef.current.ch1.offset - avgOffset), vMin, vMax, WAVE_H, vw) + WAVE_Y;
                const g2y = vToPanel(2.5 + (scopeRef.current.ch2.offset - avgOffset), vMin, vMax, WAVE_H, vw) + WAVE_Y;
                if (Math.abs(mouseY - g1y) < 24) hovered = 'ch1-offset';
                else if (Math.abs(mouseY - g2y) < 24) hovered = 'ch2-offset';
            }
        }

        hoveredElementRef.current = hovered;

        // 3. Update Cursor
        if (hovered === 'cursor-A' || hovered === 'cursor-B') {
            canvas.style.cursor = 'ew-resize';
        } else if (hovered === 'trigger' || hovered === 'ch1-offset' || hovered === 'ch2-offset') {
            canvas.style.cursor = 'ns-resize';
        } else if (e.ctrlKey) {
            canvas.style.cursor = 'grab';
        } else {
            canvas.style.cursor = 'crosshair';
        }
    }, [yToV, vToPanel, getActiveWaveScale]);
    useEffect(() => {
        if (canvasRef.current) canvasRef.current.style.cursor = 'crosshair';
    }, []);

    // Global keyboard listener for immediate cursor feedback (Resolves #220)
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Control' && canvasRef.current && hoveredElementRef.current === 'none' && !isPanning.current) {
                canvasRef.current.style.cursor = 'grab';
            }
        };
        const handleGlobalKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Control' && canvasRef.current && hoveredElementRef.current === 'none' && !isPanning.current) {
                canvasRef.current.style.cursor = 'crosshair';
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown, { passive: true });
        window.addEventListener('keyup', handleGlobalKeyUp, { passive: true });
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
            window.removeEventListener('keyup', handleGlobalKeyUp);
        };
    }, []);
    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
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

    const resetScope = useCallback(() => {
        setScope(p => ({
            ...p,
            ...getInitialScopeParams(),
            // Preserve operational state
            runMode: p.runMode,
            triggerMode: p.triggerMode,
        }));
    }, []);

    // ─── Keyboard ───────────────────────────────────────────
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case '+': case '=': setView(p => ({ ...p, zoomX: clamp(p.zoomX * 1.2, 0.25, 20), zoomY: clamp(p.zoomY * 1.2, 0.25, 20) })); break;
            case '-': setView(p => ({ ...p, zoomX: clamp(p.zoomX / 1.2, 0.25, 20), zoomY: clamp(p.zoomY / 1.2, 0.25, 20) })); break;
            case 'r': case 'R': 
                if (e.shiftKey) {
                    e.preventDefault();
                    resetScope();
                } else {
                    setView({ zoomX: 1, zoomY: 1, panX: 0, panY: 0 });
                }
                break;
            case ' ': e.preventDefault(); setScope(p => ({ ...p, runMode: p.runMode === 'run' ? 'stop' : 'run' })); break;
            case 'Enter': e.preventDefault(); samplesRef.current = []; singleFlashRef.current = performance.now(); setScope(p => ({ ...p, runMode: 'single' })); break;
            case 'c': case 'C': setScope(p => ({ ...p, cursorMode: p.cursorMode === 'off' ? 'time' : 'off' })); break;
            case 'Escape': setShowShortcuts(false); break;
        }
    }, [resetScope]);

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

    const exportPNG = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.toBlob(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const now = new Date();
            const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
            a.href = url;
            a.download = `can-scope-${ts}.png`;
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/png');
    }, []);

    const exportCSV = useCallback(() => {
        const samples = samplesRef.current;
        if (samples.length === 0) return;
        const header = 'index,canh,canl,isDominant,bitIndex\n';
        const rows = samples.map((s, i) =>
            `${i},${s.canh.toFixed(4)},${s.canl.toFixed(4)},${s.isDominant ? 1 : 0},${s.bitIndex}`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();
        const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        a.href = url;
        a.download = `can-samples-${ts}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    const [isControlsOpen, setIsControlsOpen] = useState(false);
    const [isMetricsOpen, setIsMetricsOpen] = useState(false);

    const compliance = useMemo(() => {
        const all = metrics.isoCANH && metrics.isoCANL && metrics.isoDiff;
        return { overall: all, label: all ? 'PASS' : 'FAIL', color: all ? '#22c55e' : '#ff4444' };
    }, [metrics.isoCANH, metrics.isoCANL, metrics.isoDiff]);

    // ═════════════════════════════════════════════════════════
    // Render
    // ═════════════════════════════════════════════════════════
    return (
        <div className="space-y-0">
            <div className="bg-white dark:bg-[#0a0a12] rounded-xl border border-black/10 dark:border-[#14142a] shadow-lg overflow-hidden transition-colors">
                {/* Top Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3 md:py-2 bg-gray-50 dark:bg-[#0c0c16] border-b border-black/5 dark:border-[#14142a] gap-3 md:gap-0 transition-colors">
                    <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                        {/* Mobile Toggle for Controls */}
                        <button 
                            onClick={() => setIsControlsOpen(!isControlsOpen)}
                            className="xl:hidden w-10 h-10 flex items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-light-600 dark:text-gray-400 hover:text-cyan-500 transition-colors"
                            aria-label="Toggle Controls"
                            aria-expanded={isControlsOpen}
                        >
                            <Settings2 size={18} />
                        </button>

                        <span className="text-sm font-bold text-light-700 dark:text-gray-200 tracking-wide uppercase">CAN-Scope</span>
                        <div className="flex items-center gap-2">
                             <span className="text-[10px] sm:text-[11px] text-light-500 dark:text-gray-500 font-mono transition-colors">CSO-2000 SERIES</span>
                            <span className="text-[10px] sm:text-[11px] text-light-600 dark:text-gray-600 font-mono border border-black/10 dark:border-[#1a1a2e] px-2 py-0.5 rounded transition-colors bg-white/50 dark:bg-black/20">ISO 11898</span>
                        </div>
                    </div>
                    <div className="flex items-center flex-wrap gap-2 sm:gap-4">
                        <div className="flex items-center gap-1">
                            <SmallBtn 
                                icon={<span className="text-[10px] font-bold">RST</span>} 
                                onClick={resetScope} 
                                title="Reset scope parameters (Shift+R)" 
                            />
                            <SmallBtn icon={<Minus size={14} />} onClick={zoomOut} title="Zoom out" />
                            <button onClick={resetView} title="Center Waveform (R)"
                                className="px-4 py-2 text-[11px] font-mono font-black text-white bg-cyan-600 hover:bg-cyan-500 border border-cyan-400/50 transition-all rounded flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(6,182,212,0.3)] active:scale-95">
                                <Target size={14} className="animate-pulse" />
                                <span className="hidden sm:inline">CENTER WAVEFORM</span>
                                <span className="sm:hidden">{view.zoomX.toFixed(1)}x</span>
                            </button>
                            <SmallBtn icon={<Plus size={14} />} onClick={zoomIn} title="Zoom in" />
                            <button
                                onClick={() => setShowShortcuts(p => !p)}
                                title="Keyboard shortcuts"
                                className="w-11 h-11 flex items-center justify-center text-[13px] font-mono font-black text-light-500 dark:text-gray-500 hover:text-dark-950 dark:hover:text-white bg-white dark:bg-[#0e0e18] border border-black/10 dark:border-[#1a1a2e] rounded transition-colors shadow-sm"
                                aria-label="Show keyboard shortcuts"
                                aria-expanded={showShortcuts}
                            >
                                ?
                            </button>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={exportPNG}
                                    disabled={scope.runMode === 'run'}
                                    title={scope.runMode === 'run' ? 'Stop acquisition to export' : 'Save waveform as PNG'}
                                    className="w-11 h-11 flex items-center justify-center text-light-500 dark:text-gray-500 hover:text-dark-950 dark:hover:text-white bg-white dark:bg-[#0e0e18] border border-black/10 dark:border-[#1a1a2e] rounded transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                                    aria-label="Export PNG"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                                        <polyline points="21 15 16 10 5 21"/>
                                    </svg>
                                </button>
                                <button
                                    onClick={exportCSV}
                                    disabled={scope.runMode === 'run'}
                                    title={scope.runMode === 'run' ? 'Stop acquisition to export' : 'Export samples as CSV'}
                                    className="w-11 h-11 flex items-center justify-center text-[10px] font-mono font-black text-light-500 dark:text-gray-500 hover:text-dark-950 dark:hover:text-white bg-white dark:bg-[#0e0e18] border border-black/10 dark:border-[#1a1a2e] rounded transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                                    aria-label="Export CSV"
                                >
                                    CSV
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 dark:bg-white/5 rounded-lg border shadow-lg transition-all hidden sm:flex backdrop-blur-md"
                                 style={{ borderColor: `${compliance.color}60`, boxShadow: `0 0 15px ${compliance.color}15` }}>
                                <div className="relative flex items-center justify-center w-2.5 h-2.5">
                                    <div className={`absolute inset-0 rounded-full blur-[2px] ${shouldReduceMotion ? '' : 'animate-pulse'}`} 
                                         style={{ backgroundColor: compliance.color }} />
                                    <div className="relative w-1.5 h-1.5 rounded-full" 
                                         style={{ backgroundColor: compliance.color, boxShadow: `0 0 8px ${compliance.color}` }} />
                                </div>
                                <span className="text-[10px] font-mono font-black uppercase tracking-widest" style={{ color: compliance.color }}>
                                    ISO {compliance.label}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-black/5 dark:bg-white/5 rounded-md min-w-[90px] justify-center">
                                <div className={`w-2 h-2 rounded-full ${scope.runMode === 'run' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : scope.runMode === 'single' ? 'bg-amber-400' : 'bg-red-400'}`} />
                                <span className="text-[10px] font-mono text-light-500 dark:text-gray-500 uppercase tracking-tighter font-bold">
                                    {scope.runMode === 'run' ? 'Acquiring' : scope.runMode === 'single' ? 'Armed' : 'Stopped'}
                                </span>
                            </div>

                            {/* Mobile Toggle for Metrics */}
                            <button 
                                onClick={() => setIsMetricsOpen(!isMetricsOpen)}
                                className="xl:hidden w-10 h-10 flex items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-light-600 dark:text-gray-400 hover:text-purple-500 transition-colors"
                                aria-label="Toggle Metrics"
                                aria-expanded={isMetricsOpen}
                            >
                                <BarChart3 size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row gap-0 relative">
                    {/* Left Rail (Controls) */}
                    {/* On mobile/tablet, this is a slide-in drawer. On XL, it's a fixed sidebar. */}
                    <AnimatePresence>
                        {(isControlsOpen || true) && (
                            <motion.div 
                                initial={typeof window !== 'undefined' && window.innerWidth < 1280 ? { x: -300 } : false}
                                animate={{ x: 0 }}
                                exit={{ x: -300 }}
                                className={cn(
                                    "xl:w-64 w-80 p-3 xl:border-r border-black/5 dark:border-[#14142a] flex flex-col gap-3 bg-gray-100/50 dark:bg-[#06060c] overflow-y-visible xl:overflow-y-auto custom-scrollbar shadow-inner transition-colors shrink-0 xl:min-h-0",
                                    "fixed inset-y-0 left-0 z-50 xl:relative xl:z-0 xl:inset-auto xl:translate-x-0 order-2 xl:order-1",
                                    !isControlsOpen && "hidden xl:flex"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2 xl:hidden">
                                     <span className="text-xs font-black text-light-500 dark:text-gray-400 uppercase tracking-[0.2em]">Scope Controls</span>
                                     <button onClick={() => setIsControlsOpen(false)} className="p-2 -mr-2"><X size={16} /></button>
                                </div>

                                <MetricGroup title="Acquire" icon={<Zap size={11} />}>
                                    <div className="grid grid-cols-2 gap-2">
                                        <ScopeBtn label={scope.runMode === 'run' ? 'Stop' : 'Run'} active={scope.runMode === 'run'}
                                            color={scope.runMode === 'run' ? '#00ff9f' : '#ff003c'}
                                            onClick={() => setScope(p => ({ ...p, runMode: p.runMode === 'run' ? 'stop' : 'run' }))} />
                                        <ScopeBtn label="Single" active={scope.runMode === 'single'} color="#bf00ff"
                                            onClick={() => { samplesRef.current = []; singleFlashRef.current = performance.now(); setScope(p => ({ ...p, runMode: 'single' })); }} />
                                    </div>
                                </MetricGroup>

                                <MetricGroup title="CH1 CANH" icon={<Activity size={11} />} color={C.ch1} active={scope.activeCh === 'ch1'}>
                                    <div className="flex flex-col gap-2.5">
                                        <ScopeBtn label={scope.ch1.enabled ? 'Enabled' : 'Disabled'} active={scope.ch1.enabled} color={C.ch1}
                                            onClick={() => updateCh('ch1', { enabled: !scope.ch1.enabled })} />
                                        
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <button 
                                                onClick={() => updateCh('ch1', { coupling: scope.ch1.coupling === 'DC' ? 'AC' : 'DC' })}
                                                className={cn(
                                                    "px-2 py-1.5 rounded text-[9px] font-mono font-black transition-all border",
                                                    scope.ch1.coupling === 'DC' 
                                                        ? "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-light-600 dark:text-gray-400"
                                                        : "bg-amber-500/10 border-amber-500/30 text-amber-500"
                                                )}
                                            >
                                                {scope.ch1.coupling}
                                            </button>
                                            <button 
                                                onClick={() => updateCh('ch1', { bwLimit: !scope.ch1.bwLimit })}
                                                className={cn(
                                                    "px-2 py-1.5 rounded text-[9px] font-mono font-black transition-all border",
                                                    !scope.ch1.bwLimit
                                                        ? "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-light-600 dark:text-gray-400"
                                                        : "bg-blue-500/10 border-blue-500/30 text-blue-500"
                                                )}
                                                title="Limit bandwidth to 20MHz to reduce high-frequency noise"
                                            >
                                                BW {scope.ch1.bwLimit ? '20M' : 'FULL'}
                                            </button>
                                        </div>

                                        <Stepper label="V/div" value={`${scope.ch1.vdiv}V`}
                                            onUp={() => updateCh('ch1', { vdiv: stepOpt(VDIV_OPTIONS, scope.ch1.vdiv, 1) })}
                                            onDown={() => updateCh('ch1', { vdiv: stepOpt(VDIV_OPTIONS, scope.ch1.vdiv, -1) })} />
                                        <Stepper label="Offset" value={`${scope.ch1.offset >= 0 ? '+' : ''}${scope.ch1.offset.toFixed(1)}V`}
                                            onUp={() => updateCh('ch1', { offset: Math.min(5, scope.ch1.offset + 0.5) })}
                                            onDown={() => updateCh('ch1', { offset: Math.max(-5, scope.ch1.offset - 0.5) })} />
                                    </div>
                                </MetricGroup>

                                <MetricGroup title="CH2 CANL" icon={<Activity size={11} />} color={C.ch2} active={scope.activeCh === 'ch2'}>
                                    <div className="flex flex-col gap-2.5">
                                        <ScopeBtn label={scope.ch2.enabled ? 'Enabled' : 'Disabled'} active={scope.ch2.enabled} color={C.ch2}
                                            onClick={() => updateCh('ch2', { enabled: !scope.ch2.enabled })} />
                                        
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <button 
                                                onClick={() => updateCh('ch2', { coupling: scope.ch2.coupling === 'DC' ? 'AC' : 'DC' })}
                                                className={cn(
                                                    "px-2 py-1.5 rounded text-[9px] font-mono font-black transition-all border",
                                                    scope.ch2.coupling === 'DC' 
                                                        ? "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-light-600 dark:text-gray-400"
                                                        : "bg-amber-500/10 border-amber-500/30 text-amber-500"
                                                )}
                                            >
                                                {scope.ch2.coupling}
                                            </button>
                                            <button 
                                                onClick={() => updateCh('ch2', { bwLimit: !scope.ch2.bwLimit })}
                                                className={cn(
                                                    "px-2 py-1.5 rounded text-[9px] font-mono font-black transition-all border",
                                                    !scope.ch2.bwLimit
                                                        ? "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-light-600 dark:text-gray-400"
                                                        : "bg-blue-500/10 border-blue-500/30 text-blue-500"
                                                )}
                                                title="Limit bandwidth to 20MHz to reduce high-frequency noise"
                                            >
                                                BW {scope.ch2.bwLimit ? '20M' : 'FULL'}
                                            </button>
                                        </div>

                                        <Stepper label="V/div" value={`${scope.ch2.vdiv}V`}
                                            onUp={() => updateCh('ch2', { vdiv: stepOpt(VDIV_OPTIONS, scope.ch2.vdiv, 1) })}
                                            onDown={() => updateCh('ch2', { vdiv: stepOpt(VDIV_OPTIONS, scope.ch2.vdiv, -1) })} />
                                        <Stepper label="Offset" value={`${scope.ch2.offset >= 0 ? '+' : ''}${scope.ch2.offset.toFixed(1)}V`}
                                            onUp={() => updateCh('ch2', { offset: Math.min(5, scope.ch2.offset + 0.5) })}
                                            onDown={() => updateCh('ch2', { offset: Math.max(-5, scope.ch2.offset - 0.5) })} />
                                    </div>
                                </MetricGroup>

                                <MetricGroup title="Time & Trigger" icon={<Crosshair size={11} />}>
                                    <div className="flex flex-col gap-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Stepper label="Time/div" value={`${scope.tdiv}µs`}
                                                onUp={() => { 
                                                    setScope(p => ({ ...p, tdiv: stepOpt(TDIV_OPTIONS, p.tdiv, 1) }));
                                                    setView({ zoomX: 1, zoomY: 1, panX: 0, panY: 0 });
                                                }}
                                                onDown={() => { 
                                                    setScope(p => ({ ...p, tdiv: stepOpt(TDIV_OPTIONS, p.tdiv, -1) }));
                                                    setView({ zoomX: 1, zoomY: 1, panX: 0, panY: 0 });
                                                }} />
                                            
                                            <button 
                                                onClick={resetView}
                                                className="h-10 px-2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 text-[10px] font-mono font-black flex items-center justify-center gap-1.5 hover:bg-cyan-500/20 active:scale-95 transition-all"
                                                title="Center view and reset zoom (R)"
                                            >
                                                <Target size={12} />
                                                <span>CENTER</span>
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-1.5 px-0.5">
                                            <div className="text-[10px] font-black text-light-500 dark:text-gray-500 uppercase tracking-widest">Trigger Mode</div>
                                            <div className="flex bg-black/5 dark:bg-white/5 p-0.5 rounded-lg border border-black/10 dark:border-white/10"
                                                role="radiogroup" aria-label="Trigger source mode selection">
                                                {([
                                                    { mode: 'auto',  label: 'AUTO',  color: '#ffd000' },
                                                    { mode: 'SOF',   label: 'SOF',   color: '#38bdf8' },
                                                    { mode: 'error', label: 'ERR',   color: '#ff4444' },
                                                    { mode: 'ID',    label: 'ID',    color: '#4488ff' },
                                                ] as const).map(({ mode, label }) => {
                                                    const active = scope.triggerMode === mode;
                                                    return (
                                                        <button key={mode}
                                                            onClick={() => setScope(prev => ({ ...prev, triggerMode: mode }))}
                                                            className={`flex-1 px-3 py-1.5 text-[10px] font-mono font-bold transition-all rounded-md relative ${
                                                                active 
                                                                    ? 'bg-white dark:bg-[#1a1a2e] text-purple-600 dark:text-purple-400 shadow-sm' 
                                                                    : 'text-light-400 dark:text-gray-500 hover:text-light-600 dark:hover:text-gray-300'
                                                            }`}
                                                            role="radio"
                                                            aria-checked={active}
                                                            title={`Set trigger mode to ${mode.toUpperCase()}`}
                                                        >
                                                            {label}
                                                            {active && (
                                                                <motion.div layoutId="trig-active" className="absolute inset-x-0.5 bottom-0.5 h-0.5 bg-purple-500 rounded-full" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <Stepper label="Trig Level" value={`${scope.triggerLevel.toFixed(1)}V`}
                                            onUp={() => setScope(p => ({ ...p, triggerLevel: clamp(p.triggerLevel + 0.1, 0, 5) }))}
                                            onDown={() => setScope(p => ({ ...p, triggerLevel: clamp(p.triggerLevel - 0.1, 0, 5) }))} />
                                    </div>
                                </MetricGroup>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Overlay for mobile drawers */}
                    {(isControlsOpen || isMetricsOpen) && (
                        <div 
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 xl:hidden"
                            onClick={() => { setIsControlsOpen(false); setIsMetricsOpen(false); }}
                        />
                    )}

                    <div className="flex-1 relative bg-[#050508] flex flex-col min-w-0 order-1 xl:order-2">
                        {/* Integrated Control Tab Bar (Resolves #218) */}
                        <div className="flex items-stretch h-11 bg-gray-100/80 dark:bg-[#0b0b14]/80 backdrop-blur-md border-b border-black/5 dark:border-white/5 overflow-x-auto custom-scrollbar-none">
                            <ScopeToggle label="DIFF MATH" active={scope.math} color={C.diff} icon={<Maximize2 size={13}/>}
                                onClick={() => setScope(p => ({ ...p, math: !p.math }))} />
                            <ScopeToggle label="CURSORS" active={scope.cursorMode !== 'off'} color={C.cursor} icon={<Crosshair size={13}/>}
                                onClick={() => setScope(p => ({ ...p, cursorMode: p.cursorMode === 'off' ? 'time' : 'off' }))} />
                            <ScopeToggle label="PERSISTENCE" active={scope.persistence} color="#8855ff" icon={<Zap size={13}/>}
                                onClick={() => setScope(p => ({ ...p, persistence: !p.persistence }))} />
                            
                            <div className="flex-1 border-r border-black/5 dark:border-white/5" />

                            <div className="flex items-center px-4 gap-3 border-l border-black/5 dark:border-white/5">
                                <div className="flex items-center gap-1.5 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-help" title="Hardware Sample Rate">
                                    <Cpu size={12} className="text-light-500 dark:text-gray-400" />
                                    <span className="text-[10px] font-mono text-light-500 dark:text-gray-400 font-bold uppercase tracking-widest leading-none">1.2 MS/s</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative flex-1">
                        <canvas ref={canvasRef}
                            className="w-full touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
                            style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
                            tabIndex={0} role="img"
                            aria-label="CAN bus physical layer oscilloscope - scroll to zoom, right-click or Ctrl+left-click drag to pan"
                            onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
                            onContextMenu={e => e.preventDefault()} onKeyDown={handleKeyDown} />
                        <div className="absolute bottom-2 right-2 pointer-events-none opacity-40">
                            <span className="text-[9px] font-mono text-gray-600 uppercase tracking-tighter">? for shortcuts</span>
                        </div>

                        {showShortcuts && (
                            <div
                                className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                                onClick={() => setShowShortcuts(false)}
                            >
                                <div
                                    className="bg-[#0c0c18] border border-white/10 rounded-xl shadow-2xl p-5 max-w-xs w-full mx-4"
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[12px] font-mono font-black text-gray-200 uppercase tracking-widest">Keyboard Shortcuts</span>
                                        <button onClick={() => setShowShortcuts(false)} className="text-gray-500 hover:text-gray-200 text-lg leading-none">×</button>
                                    </div>
                                    <div className="space-y-2">
                                        {[
                                            { keys: ['SCRL'],          action: 'Zoom X+Y' },
                                            { keys: ['SHIFT', 'SCRL'], action: 'Zoom Y axis' },
                                            { keys: ['CTRL', 'DRAG'],  action: 'Pan view' },
                                            { keys: ['R'],             action: 'Reset view' },
                                            { keys: ['SHIFT', 'R'],    action: 'Reset scope params' },
                                            { keys: ['C'],             action: 'Toggle cursors' },
                                            { keys: ['SPACE'],         action: 'Run / Stop' },
                                            { keys: ['ENTER'],         action: 'Single capture' },
                                        ].map(({ keys, action }) => (
                                            <div key={action} className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-1">
                                                    {keys.map((k, i) => (
                                                        <React.Fragment key={k}>
                                                            {i > 0 && <span className="text-[9px] text-gray-600">+</span>}
                                                            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 rounded">{k}</kbd>
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                                <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">{action}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        </div>
                    </div>

                    {/* Right Rail (Metrics) */}
                    <AnimatePresence>
                        {(isMetricsOpen || true) && (
                            <motion.div 
                                initial={typeof window !== 'undefined' && window.innerWidth < 1280 ? { x: 300 } : false}
                                animate={{ x: 0 }}
                                exit={{ x: 300 }}
                                className={cn(
                                    "xl:w-64 w-80 p-3 xl:border-l border-black/5 dark:border-[#14142a] flex flex-col gap-3 bg-gray-100/50 dark:bg-[#06060c] overflow-y-visible xl:overflow-y-auto custom-scrollbar shadow-inner transition-colors shrink-0 xl:min-h-0",
                                    "fixed inset-y-0 right-0 z-50 xl:relative xl:z-0 xl:inset-auto xl:translate-x-0 order-3 xl:order-3",
                                    !isMetricsOpen && "hidden xl:flex"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2 xl:hidden">
                                     <span className="text-xs font-black text-light-500 dark:text-gray-400 uppercase tracking-[0.2em]">Signal Metrics</span>
                                     <button onClick={() => setIsMetricsOpen(false)} className="p-2 -mr-2"><X size={16} /></button>
                                </div>

                                <MetricGroup 
                                    title="Physical Layer" 
                                    icon={<Activity size={12} />} 
                                    status={metrics.isoCANH && metrics.isoCANL ? 'pass' : 'fail'}
                                    active
                                    role="region"
                                    aria-label={`Physical Layer Metrics: ${metrics.isoCANH && metrics.isoCANL ? 'PASS' : 'FAIL'}`}
                                >
                                    <div className="grid grid-cols-1 gap-0.5">
                                        <MetricRow label="CH1 Amplitude" value={`${metrics.ch1Vpp.toFixed(2)} V`} status={metrics.isoCANH ? 'pass' : 'fail'} isPrimary />
                                        <MetricRow label="CH2 Amplitude" value={`${metrics.ch2Vpp.toFixed(2)} V`} status={metrics.isoCANL ? 'pass' : 'fail'} isPrimary />
                                        <MetricRow label="CH1 Avg (Rec)" value={`${metrics.ch1Avg.toFixed(2)} V`} />
                                        <MetricRow label="CH2 Avg (Rec)" value={`${metrics.ch2Avg.toFixed(2)} V`} />
                                    </div>
                                </MetricGroup>

                                <MetricGroup 
                                    title="Protocol Timing" 
                                    icon={<Clock size={12} />}
                                    role="region"
                                    aria-label="Protocol Timing Metrics"
                                >
                                    <div className="grid grid-cols-1 gap-0.5">
                                        <MetricRow label="Bit Rate" value={`${(metrics.bitRate/1000).toFixed(0)} kbps`} isPrimary />
                                        <MetricRow label="Bus Load" value={`${metrics.busLoad.toFixed(1)}%`} status={metrics.busLoad > 85 ? 'fail' : metrics.busLoad > 65 ? 'warn' : 'pass'} />
                                        <MetricRow label="Rise Time" value={`${metrics.riseTime.toFixed(0)} ns`} status={metrics.riseTime > 350 ? 'fail' : metrics.riseTime > 250 ? 'warn' : 'pass'} />
                                        <MetricRow label="Fall Time" value={`${metrics.fallTime.toFixed(0)} ns`} />
                                    </div>
                                </MetricGroup>

                                <MetricGroup 
                                    title="Signal Integrity" 
                                    icon={<Target size={12} />} 
                                    status={metrics.isoDiff ? 'pass' : 'fail'}
                                    role="region"
                                    aria-label={`Signal Integrity Metrics: ${metrics.isoDiff ? 'PASS' : 'FAIL'}`}
                                >
                                    <div className="grid grid-cols-1 gap-0.5">
                                        <MetricRow label="Diff Amplitude" value={`${metrics.vdiff.toFixed(2)} V`} status={metrics.isoDiff ? 'pass' : 'fail'} isPrimary />
                                        <MetricRow label="Symmetry" value={`${metrics.symmetry.toFixed(1)}%`} />
                                        <MetricRow label="Eye Height" value={`${metrics.eyeHeight.toFixed(2)} V`} status={metrics.isoDiff ? 'pass' : 'fail'} />
                                    </div>
                                </MetricGroup>

                                <MetricGroup 
                                    title="Eye Map" 
                                    icon={<Eye size={11} />} 
                                    status={metrics.eyePending ? 'pending' : (metrics.eyeWidth < 50 || metrics.eyeHeight < 40) ? 'fail' : 'pass'}
                                    role="region"
                                    aria-label="Eye Diagram Metrics"
                                >
                                    <div className="space-y-2">
                                        <div className="relative group/eyemap">
                                            <canvas ref={miniEyeCanvasRef} width={220} height={60} 
                                                className="w-full h-14 bg-black/40 rounded-lg border border-white/5 shadow-inner transition-all group-hover/eyemap:border-white/10" />
                                            {metrics.eyePending && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                                                    <span className="text-[9px] font-mono text-cyan-400 animate-pulse uppercase tracking-widest font-black">Syncing...</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 gap-0.5">
                                            <MetricRow label="Eye Opening" 
                                                value={metrics.eyePending ? "..." : `${metrics.eyeWidth}%`} isPrimary
                                                status={metrics.eyePending ? 'pending' : (metrics.eyeWidth > 70 ? 'pass' : metrics.eyeWidth > 50 ? 'warn' : 'fail')} />
                                            <MetricRow label="Vertical" 
                                                value={metrics.eyePending ? "..." : `${metrics.eyeHeight}%`}
                                                status={metrics.eyePending ? 'pending' : (metrics.eyeHeight > 60 ? 'pass' : metrics.eyeHeight > 40 ? 'warn' : 'fail')} />
                                        </div>
                                    </div>
                                </MetricGroup>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </div>

            {/* Accessibility Live Region (Issue #240) */}
            <div 
                role="status" 
                aria-live="polite" 
                aria-atomic="true" 
                className="sr-only"
                style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}
            >
                {announcement}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════


const SmallBtn: React.FC<{ icon: React.ReactNode; onClick: () => void; title: string }> = ({ icon, onClick, title }) => {
    return (
        <button onClick={onClick} title={title}
            className="w-11 h-11 flex items-center justify-center text-[14px] font-mono text-light-600 dark:text-gray-400 hover:text-dark-950 dark:hover:text-white bg-gray-100 dark:bg-[#0e0e18] border border-black/10 dark:border-[#1a1a2e] rounded transition-colors hover:bg-gray-200 dark:hover:bg-[#14142a]">
            {icon}
        </button>
    );
};

const ScopeBtn: React.FC<{ label: string; active?: boolean; color?: string; onClick: () => void }> = ({ label, active, color, onClick }) => {
    const shouldReduceMotion = useReducedMotion();
    return (
        <button onClick={onClick}
            className={`w-full px-3 py-3 rounded border text-[12px] font-mono font-bold tracking-tight uppercase transition-all duration-200 active:scale-[0.97] group flex items-center justify-center gap-2 ${
                active ? 'border-opacity-100 shadow-[0_0_10px_-2px_rgba(0,0,0,0.5)]' : 'bg-gray-50 dark:bg-[#0a0a12] border-black/5 dark:border-[#1a1a2e] text-light-400 dark:text-gray-600 border-dashed hover:border-light-600 dark:hover:border-gray-700'
            }`}
            style={{ 
                borderColor: active ? color : undefined, 
                color: active ? color : undefined,
                backgroundColor: active ? `${color}10` : undefined,
                boxShadow: active ? `inset 0 0 12px ${color}15, 0 0 5px ${color}10` : undefined
            }}>
            <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${active && !shouldReduceMotion ? 'animate-pulse' : 'bg-gray-300 dark:bg-gray-800'}`} style={{ backgroundColor: active ? color : undefined, boxShadow: active ? `0 0 4px ${color}` : undefined }} />
            {label}
        </button>
    );
};

const ScopeToggle: React.FC<{ label: string; active?: boolean; color: string; icon: React.ReactNode; onClick: () => void }> = ({ label, active, color, icon, onClick }) => {
    return (
        <button onClick={onClick}
            className={`px-5 flex items-center gap-2.5 font-mono text-[11px] font-black uppercase tracking-widest transition-all border-r border-black/5 dark:border-white/5 relative group select-none ${
                active ? 'text-dark-950 dark:text-white' : 'text-light-400 dark:text-gray-600 hover:text-light-600 dark:hover:text-gray-400'
            }`}>
            {active && (
                <div className="absolute inset-x-0 -bottom-px h-0.5 bg-current" style={{ color }} />
            )}
            <div className={`transition-all duration-300 p-1 rounded-sm ${active ? 'bg-current shadow-[0_0_12px_rgba(0,0,0,0.2)]' : 'bg-black/5 dark:bg-white/5'}`} style={{ color: active ? color : undefined }}>
                {React.cloneElement(icon as React.ReactElement<any>, { size: 12, className: active ? 'text-black' : 'text-inherit' })}
            </div>
            {label}
        </button>
    );
};

const Stepper: React.FC<{ label: string; value: string; onUp: () => void; onDown: () => void }> = ({ label, value, onUp, onDown }) => {
    return (
        <div className="flex flex-col gap-1 px-1">
            <span className="text-[10px] font-sans font-medium text-light-400 dark:text-gray-500 uppercase tracking-widest">{label}</span>
            <div className="flex items-center bg-gray-100 dark:bg-[#0d0d16] border border-black/5 dark:border-[#1a1a2e] rounded-md shadow-inner group-hover:border-black/10 dark:group-hover:border-[#2a2a4e] transition-colors">
                <button onClick={onDown} className="w-11 h-11 flex items-center justify-center text-light-500 dark:text-gray-500 hover:text-dark-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-[#ffffff05] transition-all text-sm font-mono border-r border-black/5 dark:border-[#1a1a2e]">
                    <Minus size={14} aria-hidden="true" />
                </button>
                <div className="flex-1 py-1 px-1.5 flex items-center justify-center min-w-[60px]">
                    <span className="text-[12px] font-mono font-bold text-dark-950 dark:text-gray-300 tabular-nums">{value}</span>
                </div>
                <button onClick={onUp} className="w-11 h-11 flex items-center justify-center text-light-500 dark:text-gray-500 hover:text-dark-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-[#ffffff05] transition-all text-sm font-mono border-l border-black/5 dark:border-[#1a1a2e]">
                    <Plus size={14} aria-hidden="true" />
                </button>
            </div>
        </div>
    );
};

const MetricGroup: React.FC<{ 
    title: string; 
    icon: React.ReactNode; 
    children: React.ReactNode; 
    color?: string; 
    subTitle?: string; 
    active?: boolean;
    status?: 'pass' | 'warn' | 'fail' | 'pending';
    hardwareId?: string;
    role?: string;
    'aria-label'?: string;
}> = ({ title, icon, children, color, subTitle, active, status = 'pass', hardwareId, role, 'aria-label': ariaLabel }) => {
    const isCritical = status === 'fail';
    const isWarning = status === 'warn';
    const isPending = status === 'pending';
    const shouldReduceMotion = useReducedMotion();
    
    return (
        <div className={`w-full p-2.5 rounded-xl border relative overflow-hidden transition-all duration-500 ${
            isCritical ? 'bg-red-500/8 dark:bg-red-950/15 border-red-500/60 shadow-[0_0_24px_rgba(239,68,68,0.18)]' :
            isWarning ? 'bg-amber-500/5 dark:bg-amber-950/10 border-amber-500/40' :
            'bg-gray-50 dark:bg-[#080810] border-black/5 dark:border-[#1a1a2e]'
        }`}
            style={{
                borderLeftColor: isCritical ? '#ef4444' : isWarning ? '#f59e0b' : color,
                borderLeftWidth: isCritical ? '4px' : '3px',
                borderTopColor: isCritical ? 'rgba(239,68,68,0.4)' : undefined,
                borderTopWidth: isCritical ? '1px' : undefined,
                boxShadow: active ? `inset 0 0 15px ${color}10, 0 0 5px ${color}05` : undefined
            }}
            role={role}
            aria-label={ariaLabel}
        >
            
            {/* Fail-state Scanlines Overlay */}
            {isCritical && !shouldReduceMotion && (
                <motion.div 
                    className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.07]"
                    style={{ 
                        backgroundImage: `linear-gradient(rgba(239, 68, 68, 0.1) 50%, transparent 50%)`,
                        backgroundSize: '100% 4px'
                    }}
                    animate={{ y: [0, 4] }}
                    transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                />
            )}

            <div className="text-[10px] font-sans font-black text-light-500 dark:text-gray-400 uppercase tracking-[0.15em] mb-2.5 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-1.5">
                    <span className="text-[12px] opacity-80 flex items-center" style={{ color: isCritical ? '#ef4444' : isWarning ? '#f59e0b' : color }} aria-hidden="true">
                        {icon}
                    </span>
                    {title}
                </div>
                <div className="flex items-center gap-2">
                    {hardwareId && (
                        <span className="text-[9px] font-mono text-light-400 dark:text-gray-600 opacity-60 border border-current px-1 rounded-sm">
                            {hardwareId}
                        </span>
                    )}
                    {subTitle && (
                        <span className="text-[9px] text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded ring-1 ring-amber-500/20" role="status">
                            {subTitle}
                        </span>
                    )}
                </div>
            </div>
            <div className="space-y-1 relative z-10">{children}</div>
            
            {/* Pending Sync Blue Pulse */}
            {isPending && !shouldReduceMotion && (
                <motion.div 
                    className="absolute inset-0 bg-blue-500 opacity-0 pointer-events-none"
                    animate={{ opacity: [0, 0.05, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                />
            )}
        </div>
    );
};

const MetricRow: React.FC<{ 
    label: string; 
    value: string; 
    color?: string; 
    status?: 'pass' | 'warn' | 'fail' | 'pending';
    isPrimary?: boolean;
}> = ({ label, value, color, status, isPrimary }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const shouldReduceMotion = useReducedMotion();
    
    const StatusBadge = React.memo(() => {
        if (!status) return null;
        
        const config = {
            pass: { bg: 'bg-emerald-500/10 ring-emerald-500/30', dot: 'bg-emerald-400 shadow-[0_0_8px_#10b981]', text: 'text-emerald-500' },
            warn: { bg: 'bg-amber-500/10 ring-amber-500/30', dot: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]', text: 'text-amber-500' },
            fail: { bg: 'bg-red-500/15 ring-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.2)]', dot: 'bg-red-400 shadow-[0_0_10px_#ef4444]', text: 'text-red-400' },
            pending: { bg: 'bg-blue-500/10 ring-blue-500/30', dot: 'bg-blue-400', text: 'text-blue-500' }
        }[status];

        return (
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ring-1 ring-inset ${config.bg}`}>
                <motion.div
                    className={`w-1.5 h-1.5 rounded-full ${config.dot}`}
                    animate={
                        shouldReduceMotion ? {} :
                        status === 'fail' ? { opacity: [1, 0.4, 1], scale: [1, 1.25, 1] } :
                        status === 'pending' ? { scale: [1, 1.4, 1] } : {}
                    }
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    aria-label={`Status: ${status}`}
                />
                <span className={`font-black uppercase tracking-[0.05em] text-[8.5px] ${config.text}`}>
                    {status}
                </span>
            </div>
        );
    });

    return (
        <div className={`flex justify-between items-center py-2 transition-colors ${isPrimary ? 'border-b border-black/5 dark:border-white/5 pb-2.5 mb-1' : ''}`}>
            <span className={`font-sans transition-colors uppercase tracking-tight ${isPrimary ? 'text-[10px] font-black text-light-500 dark:text-gray-400' : 'text-[10px] font-medium text-light-400 dark:text-gray-500'}`}>
                {label}
            </span>
            <div className="flex items-center gap-3">
                <StatusBadge />
                <span 
                    className={`font-mono font-black tracking-tighter tabular-nums transition-all ${isPrimary ? 'text-[14px]' : 'text-[12px]'}`} 
                    style={{ color: color || (isDark ? '#f8fafc' : '#0f172a') }}
                >
                    {value}
                </span>
            </div>
        </div>
    );
};
