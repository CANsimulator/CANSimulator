import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

/* ═══════════════════════════════════════════════════════════════
   CAN-SCOPE CSO-2000 — Physical Layer Oscilloscope
   A CANoe.Scope–style diagnostic tool for CAN bus analysis.
   ISO 11898 compliant voltage thresholds, eye diagram,
   protocol decode, cursors, zoom/pan.
   ═══════════════════════════════════════════════════════════════ */

// ─── Layout Constants ───────────────────────────────────────
const CANVAS_W = 900;
const CANVAS_H = 620;
const M = { top: 28, right: 8, bottom: 4, left: 52 }; // margins
const PLOT_W = CANVAS_W - M.left - M.right;

// Panel heights (proportional)
const WAVE_H = 240;   // CANH/CANL waveform
const DIFF_H = 120;   // Differential voltage
const EYE_H = 130;    // Eye diagram
const DECODE_H = 32;  // Protocol decode strip
const GAP = 8;        // between panels

// Panel Y positions
const WAVE_Y = M.top;
const DIFF_Y = WAVE_Y + WAVE_H + GAP;
const EYE_Y = DIFF_Y + DIFF_H + GAP;
const DECODE_Y = EYE_Y + EYE_H + GAP;

// ─── ISO 11898 Thresholds ───────────────────────────────────
const ISO = {
    CANH_DOM_MIN: 2.75,  CANH_DOM_TYP: 3.5,   CANH_DOM_MAX: 4.5,
    CANL_DOM_MIN: 0.5,   CANL_DOM_TYP: 1.5,   CANL_DOM_MAX: 2.25,
    VDIFF_DOM_MIN: 1.5,  VDIFF_DOM_TYP: 2.0,
    VDIFF_REC_MAX: 0.5,
    V_REC: 2.5,          // Recessive level for both lines
    V_MIN: 0,   V_MAX: 5,
    DIFF_MIN: -1, DIFF_MAX: 3.5,
};

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
}

interface ViewState { zoomX: number; zoomY: number; panX: number; panY: number; }

interface Sample {
    canh: number; canl: number;
    isDominant: boolean;
    bitIndex: number; // which bit in the frame
    t: number;
}

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

// ─── Waveform Generator ─────────────────────────────────────
const BIT_TIME_SAMPLES = 8; // samples per bit period

function generateBitStream(): boolean[] {
    // SOF(1) + ID(11) + RTR(1) + IDE(1) + r0(1) + DLC(4) + Data(64) + CRC(15) + delim(1) + ACK(2) + EOF(7) + IFS(3)
    const bits: boolean[] = [];
    bits.push(true); // SOF dominant
    for (let i = 0; i < 11; i++) bits.push(Math.random() > 0.5); // ID
    bits.push(false); // RTR
    bits.push(false); bits.push(false); // IDE + r0
    bits.push(true); bits.push(false); bits.push(false); bits.push(false); // DLC=8
    for (let i = 0; i < 64; i++) bits.push(Math.random() > 0.5); // Data
    for (let i = 0; i < 15; i++) bits.push(Math.random() > 0.5); // CRC
    bits.push(false); // CRC delim
    bits.push(true);  // ACK
    bits.push(false); // ACK delim
    for (let i = 0; i < 7; i++) bits.push(false); // EOF
    for (let i = 0; i < 3; i++) bits.push(false); // IFS
    return bits;
}

let frameBits: boolean[] = generateBitStream();
let frameBitIndex = 0;
let globalSampleIndex = 0;

function generateSample(prev: Sample | null): Sample {
    const bitPhase = globalSampleIndex % BIT_TIME_SAMPLES;
    if (bitPhase === 0) {
        frameBitIndex++;
        if (frameBitIndex >= frameBits.length) {
            frameBits = generateBitStream();
            frameBitIndex = 0;
        }
    }
    const isDominant = frameBits[frameBitIndex];

    const wasTransition = prev ? prev.isDominant !== isDominant : false;
    const edgePhase = bitPhase / BIT_TIME_SAMPLES;
    const n = () => (Math.random() - 0.5) * 0.06;
    const ringing = wasTransition && edgePhase < 0.4
        ? Math.sin(edgePhase * Math.PI * 6) * 0.15 * (1 - edgePhase * 2.5)
        : 0;
    const overshoot = wasTransition && edgePhase < 0.15 ? 0.12 : 0;

    const canh = isDominant ? ISO.CANH_DOM_TYP + n() + ringing + overshoot : ISO.V_REC + n() * 0.5 + ringing * 0.3;
    const canl = isDominant ? ISO.CANL_DOM_TYP + n() - ringing - overshoot : ISO.V_REC + n() * 0.5 - ringing * 0.3;

    const sample: Sample = { canh, canl, isDominant, bitIndex: frameBitIndex, t: globalSampleIndex };
    globalSampleIndex++;
    return sample;
}

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
    });

    const [view, setView] = useState<ViewState>({ zoomX: 1, zoomY: 1, panX: 0, panY: 0 });

    const [metrics, setMetrics] = useState({
        ch1Vpp: 0, ch1Avg: 0, ch1Min: 0, ch1Max: 0,
        ch2Vpp: 0, ch2Avg: 0, ch2Min: 0, ch2Max: 0,
        vdiff: 0, riseTime: 0, fallTime: 0,
        symmetry: 0, busLoad: 0, bitRate: 0,
        eyeWidth: 0, eyeHeight: 0,
        isoCANH: true, isoCANL: true, isoDiff: true,
    });

    const scopeRef = useRef(scope);
    const viewRef = useRef(view);
    useEffect(() => { scopeRef.current = scope; }, [scope]);
    useEffect(() => { viewRef.current = view; }, [view]);

    // ─── Coordinate transforms ──────────────────────────────
    const vToPanel = useCallback((v: number, vMin: number, vMax: number, panelH: number, vw: ViewState) => {
        const norm = (v - vMin) / (vMax - vMin);
        const baseY = (1 - norm) * panelH;
        return (baseY - panelH / 2) * vw.zoomY + panelH / 2 + vw.panY;
    }, []);

    const sToX = useCallback((i: number, total: number, vw: ViewState) => {
        const base = (i / Math.max(total - 1, 1)) * PLOT_W;
        return (base - PLOT_W / 2) * vw.zoomX + PLOT_W / 2 + vw.panX;
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

        // Background
        ctx.fillStyle = C.bg;
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

        // ── Helper: draw panel frame ──
        const drawPanel = (x: number, y: number, w: number, h: number, title: string, content: () => void) => {
            ctx.fillStyle = C.panelBg;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = C.panelBdr;
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
            // ISO 11898 threshold bands
            const cahDomTop = vToPanel(ISO.CANH_DOM_MAX, ISO.V_MIN, ISO.V_MAX, WAVE_H, vw);
            const cahDomBot = vToPanel(ISO.CANH_DOM_MIN, ISO.V_MIN, ISO.V_MAX, WAVE_H, vw);
            ctx.fillStyle = 'rgba(0,212,255,0.04)';
            ctx.fillRect(0, cahDomTop, PLOT_W, cahDomBot - cahDomTop);

            const calDomTop = vToPanel(ISO.CANL_DOM_MAX, ISO.V_MIN, ISO.V_MAX, WAVE_H, vw);
            const calDomBot = vToPanel(ISO.CANL_DOM_MIN, ISO.V_MIN, ISO.V_MAX, WAVE_H, vw);
            ctx.fillStyle = 'rgba(200,80,255,0.04)';
            ctx.fillRect(0, calDomTop, PLOT_W, calDomBot - calDomTop);

            // Recessive center
            const recY = vToPanel(ISO.V_REC, ISO.V_MIN, ISO.V_MAX, WAVE_H, vw);
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.setLineDash([2, 4]); ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(0, recY); ctx.lineTo(PLOT_W, recY); ctx.stroke();
            ctx.setLineDash([]);

            // ISO threshold labels
            const thresholds = [
                { v: ISO.CANH_DOM_MIN, label: 'CANH min 2.75V', color: C.ch1 },
                { v: ISO.CANL_DOM_MAX, label: 'CANL max 2.25V', color: C.ch2 },
            ];
            for (const th of thresholds) {
                const y = vToPanel(th.v, ISO.V_MIN, ISO.V_MAX, WAVE_H, vw);
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
            drawVAxis(WAVE_H, ISO.V_MIN, ISO.V_MAX, 'V', 1, vw);

            if (samples.length < 2) return;

            // Traces
            if (s.ch2.enabled) drawWaveform(samples, p => p.canl, ISO.V_MIN, ISO.V_MAX, WAVE_H, C.ch2, C.ch2Dim, vw);
            if (s.ch1.enabled) drawWaveform(samples, p => p.canh, ISO.V_MIN, ISO.V_MAX, WAVE_H, C.ch1, C.ch1Dim, vw);

            // Trigger level
            const trigY = vToPanel(s.triggerLevel, ISO.V_MIN, ISO.V_MAX, WAVE_H, vw);
            ctx.save();
            ctx.strokeStyle = C.trigger; ctx.setLineDash([3, 3]); ctx.lineWidth = 0.8; ctx.globalAlpha = 0.5;
            ctx.beginPath(); ctx.moveTo(0, trigY); ctx.lineTo(PLOT_W, trigY); ctx.stroke();
            ctx.setLineDash([]); ctx.globalAlpha = 1;
            ctx.fillStyle = C.trigger;
            ctx.beginPath(); ctx.moveTo(PLOT_W, trigY); ctx.lineTo(PLOT_W + 6, trigY - 4); ctx.lineTo(PLOT_W + 6, trigY + 4); ctx.fill();
            ctx.font = '600 8px monospace'; ctx.textAlign = 'left';
            ctx.fillText('T', PLOT_W + 8, trigY + 3);
            ctx.restore();

            // Cursors
            if (s.cursorMode === 'time') {
                const drawCur = (pos: number, color: string, label: string) => {
                    const tx = (pos * PLOT_W - PLOT_W / 2) * vw.zoomX + PLOT_W / 2 + vw.panX;
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
        drawPanel(M.left, DIFF_Y, PLOT_W, DIFF_H, 'VDIFF (CANH − CANL) — Differential', () => {
            // Threshold bands
            const domLineY = vToPanel(ISO.VDIFF_DOM_MIN, ISO.DIFF_MIN, ISO.DIFF_MAX, DIFF_H, vw);
            const topY = vToPanel(ISO.DIFF_MAX, ISO.DIFF_MIN, ISO.DIFF_MAX, DIFF_H, vw);
            ctx.fillStyle = 'rgba(0,255,136,0.03)';
            ctx.fillRect(0, topY, PLOT_W, domLineY - topY);

            const recLineY = vToPanel(ISO.VDIFF_REC_MAX, ISO.DIFF_MIN, ISO.DIFF_MAX, DIFF_H, vw);
            const botY = vToPanel(ISO.DIFF_MIN, ISO.DIFF_MIN, ISO.DIFF_MAX, DIFF_H, vw);
            ctx.fillStyle = 'rgba(255,208,0,0.03)';
            ctx.fillRect(0, recLineY, PLOT_W, botY - recLineY);

            drawGrid(PLOT_W, DIFF_H, 10, 4, vw);
            drawVAxis(DIFF_H, ISO.DIFF_MIN, ISO.DIFF_MAX, 'V', 0.5, vw);

            if (samples.length < 2) return;

            drawWaveform(samples, p => p.canh - p.canl, ISO.DIFF_MIN, ISO.DIFF_MAX, DIFF_H, C.diff, C.diffDim, vw);

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

        // ════════════════════════════════════════════
        // PANEL 3: Eye Diagram
        // ════════════════════════════════════════════
        drawPanel(M.left, EYE_Y, PLOT_W, EYE_H, 'Eye Diagram — Signal Integrity', () => {
            ctx.fillStyle = 'rgba(0,20,40,0.3)';
            ctx.fillRect(0, 0, PLOT_W, EYE_H);
            drawGrid(PLOT_W, EYE_H, 8, 4, { zoomX: 1, zoomY: 1, panX: 0, panY: 0 });

            const eyeData = eyeBufferRef.current;
            if (eyeData.length < 2) {
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Collecting bit transitions...', PLOT_W / 2, EYE_H / 2);
                return;
            }

            const noZoom: ViewState = { zoomX: 1, zoomY: 1, panX: 0, panY: 0 };
            ctx.globalAlpha = 0.04;
            for (const bitSamples of eyeData) {
                if (bitSamples.length < 2) continue;
                // CANH
                ctx.strokeStyle = C.ch1; ctx.lineWidth = 1;
                ctx.beginPath();
                for (let j = 0; j < bitSamples.length; j++) {
                    const x = (j / (bitSamples.length - 1)) * PLOT_W;
                    const y = vToPanel(bitSamples[j].canh, ISO.V_MIN, ISO.V_MAX, EYE_H, noZoom);
                    if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
                // CANL
                ctx.strokeStyle = C.ch2;
                ctx.beginPath();
                for (let j = 0; j < bitSamples.length; j++) {
                    const x = (j / (bitSamples.length - 1)) * PLOT_W;
                    const y = vToPanel(bitSamples[j].canl, ISO.V_MIN, ISO.V_MAX, EYE_H, noZoom);
                    if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.textAlign = 'right';
            ctx.fillText(`${eyeData.length} overlaid transitions`, PLOT_W - 8, EYE_H - 6);
        });

        // ════════════════════════════════════════════
        // PANEL 4: Protocol Decode Strip
        // ════════════════════════════════════════════
        drawPanel(M.left, DECODE_Y, PLOT_W, DECODE_H, '', () => {
            if (samples.length < 2) return;
            const bitsShown = new Map<number, { dom: boolean; x1: number; x2: number }>();
            for (let i = 0; i < samples.length; i++) {
                const x = sToX(i, samples.length, vw);
                const bi = samples[i].bitIndex;
                if (!bitsShown.has(bi)) {
                    bitsShown.set(bi, { dom: samples[i].isDominant, x1: x, x2: x });
                } else {
                    bitsShown.get(bi)!.x2 = x;
                }
            }
            ctx.font = '600 9px monospace'; ctx.textAlign = 'center';
            bitsShown.forEach((info) => {
                const midX = (info.x1 + info.x2) / 2;
                const w = Math.max(info.x2 - info.x1, 2);
                if (midX < -20 || midX > PLOT_W + 20) return;
                ctx.fillStyle = info.dom ? 'rgba(0,255,136,0.08)' : 'rgba(255,208,0,0.05)';
                ctx.fillRect(info.x1, 2, w, DECODE_H - 4);
                if (w > 8) {
                    ctx.fillStyle = info.dom ? C.dominant : C.recessive;
                    ctx.globalAlpha = 0.7;
                    ctx.fillText(info.dom ? 'D' : 'R', midX, DECODE_H / 2 + 3);
                    ctx.globalAlpha = 1;
                }
                ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.5;
                ctx.beginPath(); ctx.moveTo(info.x1, 0); ctx.lineTo(info.x1, DECODE_H); ctx.stroke();
            });
            ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '7px monospace'; ctx.textAlign = 'left';
            ctx.fillText('DECODE', 4, 9);
        });

        // ════════════════════════════════════════════
        // Header info bar
        // ════════════════════════════════════════════
        ctx.font = '600 9px monospace'; ctx.textAlign = 'left';
        let hx = M.left;
        if (s.ch1.enabled) { ctx.fillStyle = C.ch1; ctx.fillText(`CH1 ${s.ch1.vdiv}V/div CANH`, hx, 14); hx += 140; }
        if (s.ch2.enabled) { ctx.fillStyle = C.ch2; ctx.fillText(`CH2 ${s.ch2.vdiv}V/div CANL`, hx, 14); hx += 140; }
        if (s.math) { ctx.fillStyle = C.diff; ctx.fillText(`DIFF CH1−CH2`, hx, 14); }

        ctx.textAlign = 'right';
        ctx.fillStyle = C.axisText; ctx.fillText(`${s.tdiv}µs/div`, CANVAS_W - M.right - 4, 14);
        ctx.fillStyle = s.runMode === 'run' ? C.dominant : '#ff4444';
        ctx.fillText(s.runMode === 'run' ? '● RUN' : s.runMode === 'single' ? '● ARMED' : '■ STOP', CANVAS_W - M.right - 70, 14);
        ctx.fillStyle = C.trigger; ctx.globalAlpha = 0.6;
        ctx.fillText(`Trig: ${s.triggerMode} ${s.triggerLevel.toFixed(1)}V`, CANVAS_W - M.right - 130, 14);
        ctx.globalAlpha = 1;
        if (vw.zoomX !== 1 || vw.zoomY !== 1) {
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.textAlign = 'center';
            ctx.fillText(`Zoom ${vw.zoomX.toFixed(1)}×${vw.zoomY.toFixed(1)}`, CANVAS_W / 2, 14);
        }

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
        if (s.ch1.enabled) {
            const gy = vToPanel(2.5, ISO.V_MIN, ISO.V_MAX, WAVE_H, vw) + WAVE_Y;
            if (gy > WAVE_Y && gy < WAVE_Y + WAVE_H) {
                ctx.fillStyle = C.ch1;
                ctx.beginPath(); ctx.moveTo(M.left, gy); ctx.lineTo(M.left - 8, gy - 5); ctx.lineTo(M.left - 8, gy + 5); ctx.fill();
            }
        }
        if (s.ch2.enabled) {
            const gy = vToPanel(2.5, ISO.V_MIN, ISO.V_MAX, WAVE_H, vw) + WAVE_Y;
            if (gy > WAVE_Y && gy < WAVE_Y + WAVE_H) {
                ctx.fillStyle = C.ch2;
                ctx.beginPath(); ctx.moveTo(M.left, gy + 10); ctx.lineTo(M.left - 8, gy + 5); ctx.lineTo(M.left - 8, gy + 15); ctx.fill();
            }
        }

    }, [vToPanel, sToX]);

    // ─── Compute metrics ────────────────────────────────────
    const computeMetrics = useCallback(() => {
        const samples = samplesRef.current;
        if (samples.length < 10) return;

        const canh = samples.map(s => s.canh);
        const canl = samples.map(s => s.canl);
        const ch1Min = Math.min(...canh), ch1Max = Math.max(...canh);
        const ch2Min = Math.min(...canl), ch2Max = Math.max(...canl);
        const ch1Avg = canh.reduce((a, b) => a + b) / canh.length;
        const ch2Avg = canl.reduce((a, b) => a + b) / canl.length;
        const vdiff = ch1Avg - ch2Avg;

        let transitions = 0, riseSum = 0, fallSum = 0, riseCount = 0, fallCount = 0, domSamples = 0;
        for (let i = 1; i < samples.length; i++) {
            if (samples[i].isDominant) domSamples++;
            if (samples[i].isDominant !== samples[i - 1].isDominant) {
                transitions++;
                const dv = Math.abs(samples[i].canh - samples[i - 1].canh);
                if (samples[i].isDominant) { riseSum += dv; riseCount++; }
                else { fallSum += dv; fallCount++; }
            }
        }

        const riseTime = riseCount > 0 ? riseSum / riseCount * 20 : 0;
        const fallTime = fallCount > 0 ? fallSum / fallCount * 20 : 0;
        const symmetry = riseTime > 0 && fallTime > 0 ? Math.min(riseTime, fallTime) / Math.max(riseTime, fallTime) * 100 : 0;
        const busLoad = (domSamples / samples.length) * 100;
        const isoCANH = ch1Max <= ISO.CANH_DOM_MAX && (ch1Max >= ISO.CANH_DOM_MIN || ch1Avg > ISO.V_REC - 0.5);
        const isoCANL = ch2Min >= ISO.CANL_DOM_MIN && (ch2Min <= ISO.CANL_DOM_MAX || ch2Avg < ISO.V_REC + 0.5);
        const maxDiff = Math.max(...samples.map(s => s.canh - s.canl));
        const isoDiff = maxDiff >= ISO.VDIFF_DOM_MIN;

        setMetrics({
            ch1Vpp: ch1Max - ch1Min, ch1Avg, ch1Min, ch1Max,
            ch2Vpp: ch2Max - ch2Min, ch2Avg, ch2Min, ch2Max,
            vdiff, riseTime: Math.round(riseTime), fallTime: Math.round(fallTime),
            symmetry: Math.round(symmetry), busLoad: Math.round(busLoad),
            bitRate: Math.round(transitions * 5),
            eyeWidth: 85 + Math.round(Math.random() * 10),
            eyeHeight: Math.round((ch1Max - ch1Min) / 2 * 100),
            isoCANH, isoCANL, isoDiff,
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
                if (eyeBufferRef.current.length > 80) eyeBufferRef.current = eyeBufferRef.current.slice(-80);
            }
        }
    }, []);

    // ─── Animation loop ─────────────────────────────────────
    const tick = useCallback((time: number) => {
        const s = scopeRef.current;
        const interval = s.tdiv / 4;
        if (s.runMode !== 'stop' && time - lastTick.current > interval) {
            const prev = samplesRef.current.length > 0 ? samplesRef.current[samplesRef.current.length - 1] : null;
            samplesRef.current.push(generateSample(prev));
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
        if (e.button === 1 || e.button === 2) {
            isPanning.current = true;
            panOrigin.current = { x: e.clientX, y: e.clientY, vx: viewRef.current.panX, vy: viewRef.current.panY };
            e.currentTarget.setPointerCapture(e.pointerId); e.preventDefault();
        }
    }, []);
    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isPanning.current) return;
        const rect = canvasRef.current!.getBoundingClientRect();
        setView(p => ({
            ...p,
            panX: panOrigin.current.vx + (e.clientX - panOrigin.current.x) * (CANVAS_W / rect.width),
            panY: panOrigin.current.vy + (e.clientY - panOrigin.current.y) * (CANVAS_H / rect.height),
        }));
    }, []);
    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (isPanning.current) {
            isPanning.current = false;
            if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        }
    }, []);

    // ─── Keyboard ───────────────────────────────────────────
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case '+': case '=': setView(p => ({ ...p, zoomX: clamp(p.zoomX * 1.2, 0.25, 20), zoomY: clamp(p.zoomY * 1.2, 0.25, 20) })); break;
            case '-': setView(p => ({ ...p, zoomX: clamp(p.zoomX / 1.2, 0.25, 20), zoomY: clamp(p.zoomY / 1.2, 0.25, 20) })); break;
            case 'r': case 'R': setView({ zoomX: 1, zoomY: 1, panX: 0, panY: 0 }); break;
            case ' ': e.preventDefault(); setScope(p => ({ ...p, runMode: p.runMode === 'run' ? 'stop' : 'run' })); break;
            case 'Enter': e.preventDefault(); samplesRef.current = []; setScope(p => ({ ...p, runMode: 'single' })); break;
            case 'c': case 'C': setScope(p => ({ ...p, cursorMode: p.cursorMode === 'off' ? 'time' : 'off' })); break;
        }
    }, []);

    // ─── Controls ───────────────────────────────────────────
    const updateCh = (ch: 'ch1' | 'ch2', u: Partial<ChannelCfg>) => setScope(p => ({ ...p, [ch]: { ...p[ch], ...u } }));
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

                {/* Main: Canvas + Sidebar */}
                <div className="flex flex-col xl:flex-row">
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
                            <Hint text="Scroll: Zoom" /><Hint text="Ctrl/Shift+Scroll: Axis" /><Hint text="Right-drag: Pan" /><Hint text="C: Cursors" />
                        </div>
                    </div>

                    {/* Right Panel */}
                    <div className="xl:w-56 p-2 xl:border-l border-[#14142a] flex xl:flex-col gap-2 flex-wrap bg-[#08080f] overflow-y-auto max-h-[620px]">
                        <MetricGroup title="Signal Quality" icon="⚡">
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
                        </MetricGroup>
                        <MetricGroup title="ISO 11898 Compliance" icon="📋">
                            <ComplianceRow label="CANH Levels" pass={metrics.isoCANH} detail={`${metrics.ch1Min.toFixed(2)}–${metrics.ch1Max.toFixed(2)}V`} />
                            <ComplianceRow label="CANL Levels" pass={metrics.isoCANL} detail={`${metrics.ch2Min.toFixed(2)}–${metrics.ch2Max.toFixed(2)}V`} />
                            <ComplianceRow label="Differential" pass={metrics.isoDiff} detail={`Vdiff ${metrics.vdiff.toFixed(2)}V`} />
                        </MetricGroup>
                        <MetricGroup title="Eye Diagram" icon="👁">
                            <MetricRow label="Eye Width" value={`${metrics.eyeWidth}%`}
                                status={metrics.eyeWidth > 70 ? 'pass' : metrics.eyeWidth > 50 ? 'warn' : 'fail'} />
                            <MetricRow label="Eye Height" value={`${metrics.eyeHeight}%`}
                                status={metrics.eyeHeight > 60 ? 'pass' : metrics.eyeHeight > 40 ? 'warn' : 'fail'} />
                        </MetricGroup>
                    </div>
                </div>

                {/* Control Strip */}
                <div className="px-3 py-2 border-t border-[#14142a] bg-[#0c0c16] flex flex-col lg:flex-row gap-2 flex-wrap">
                    <CtrlGroup label="Acquire">
                        <ScopeBtn label={scope.runMode === 'run' ? 'Stop' : 'Run'} active={scope.runMode === 'run'}
                            color={scope.runMode === 'run' ? '#00ff88' : '#ff4444'}
                            onClick={() => setScope(p => ({ ...p, runMode: p.runMode === 'run' ? 'stop' : 'run' }))} />
                        <ScopeBtn label="Single" active={scope.runMode === 'single'} color="#ffd000"
                            onClick={() => { samplesRef.current = []; setScope(p => ({ ...p, runMode: 'single' })); }} />
                    </CtrlGroup>
                    <Sep />
                    <CtrlGroup label="CH1 CANH" color={C.ch1}>
                        <ScopeBtn label={scope.ch1.enabled ? 'ON' : 'OFF'} active={scope.ch1.enabled} color={C.ch1}
                            onClick={() => updateCh('ch1', { enabled: !scope.ch1.enabled })} />
                        <Stepper label="V/div" value={`${scope.ch1.vdiv}V`}
                            onUp={() => updateCh('ch1', { vdiv: stepOpt(VDIV_OPTIONS, scope.ch1.vdiv, 1) })}
                            onDown={() => updateCh('ch1', { vdiv: stepOpt(VDIV_OPTIONS, scope.ch1.vdiv, -1) })} />
                    </CtrlGroup>
                    <Sep />
                    <CtrlGroup label="CH2 CANL" color={C.ch2}>
                        <ScopeBtn label={scope.ch2.enabled ? 'ON' : 'OFF'} active={scope.ch2.enabled} color={C.ch2}
                            onClick={() => updateCh('ch2', { enabled: !scope.ch2.enabled })} />
                        <Stepper label="V/div" value={`${scope.ch2.vdiv}V`}
                            onUp={() => updateCh('ch2', { vdiv: stepOpt(VDIV_OPTIONS, scope.ch2.vdiv, 1) })}
                            onDown={() => updateCh('ch2', { vdiv: stepOpt(VDIV_OPTIONS, scope.ch2.vdiv, -1) })} />
                    </CtrlGroup>
                    <Sep />
                    <CtrlGroup label="Diff">
                        <ScopeBtn label="VDIFF" active={scope.math} color={C.diff}
                            onClick={() => setScope(p => ({ ...p, math: !p.math }))} />
                    </CtrlGroup>
                    <Sep />
                    <CtrlGroup label="Horizontal">
                        <Stepper label="Time/div" value={`${scope.tdiv}µs`}
                            onUp={() => setScope(p => ({ ...p, tdiv: stepOpt(TDIV_OPTIONS, p.tdiv, 1) }))}
                            onDown={() => setScope(p => ({ ...p, tdiv: stepOpt(TDIV_OPTIONS, p.tdiv, -1) }))} />
                    </CtrlGroup>
                    <Sep />
                    <CtrlGroup label="Trigger">
                        <ScopeBtn label={scope.triggerMode} active color={C.trigger}
                            onClick={() => setScope(p => ({
                                ...p, triggerMode: ({ auto: 'SOF', SOF: 'error', error: 'ID', ID: 'auto' } as const)[p.triggerMode],
                            }))} />
                        <Stepper label="Level" value={`${scope.triggerLevel.toFixed(1)}V`}
                            onUp={() => setScope(p => ({ ...p, triggerLevel: Math.min(5, p.triggerLevel + 0.5) }))}
                            onDown={() => setScope(p => ({ ...p, triggerLevel: Math.max(0, p.triggerLevel - 0.5) }))} />
                    </CtrlGroup>
                    <Sep />
                    <CtrlGroup label="Cursors">
                        <ScopeBtn label={scope.cursorMode === 'off' ? 'Off' : 'ΔT/ΔV'} active={scope.cursorMode !== 'off'} color={C.cursor}
                            onClick={() => setScope(p => ({ ...p, cursorMode: p.cursorMode === 'off' ? 'time' : 'off' }))} />
                    </CtrlGroup>
                    <Sep />
                    <CtrlGroup label="Persist">
                        <ScopeBtn label={scope.persistence ? 'ON' : 'OFF'} active={scope.persistence} color="#8855ff"
                            onClick={() => setScope(p => ({ ...p, persistence: !p.persistence }))} />
                    </CtrlGroup>
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════
const Hint: React.FC<{ text: string }> = ({ text }) => (
    <span className="text-[7px] font-mono text-gray-700 bg-black/50 px-1 py-0.5 rounded">{text}</span>
);
const SmallBtn: React.FC<{ label: string; onClick: () => void; title: string }> = ({ label, onClick, title }) => (
    <button onClick={onClick} title={title}
        className="w-5 h-5 flex items-center justify-center text-[10px] font-mono text-gray-500 hover:text-white bg-[#0e0e18] border border-[#1a1a2e] rounded transition-colors hover:bg-[#14142a]">
        {label}
    </button>
);
const CtrlGroup: React.FC<{ label: string; color?: string; children: React.ReactNode }> = ({ label, color, children }) => (
    <div className="flex flex-col gap-1">
        <span className="text-[7px] font-mono font-semibold uppercase tracking-widest" style={{ color: color || '#555' }}>{label}</span>
        <div className="flex items-center gap-1">{children}</div>
    </div>
);
const Sep: React.FC = () => <div className="hidden lg:block w-px self-stretch bg-[#14142a] mx-0.5" />;
const ScopeBtn: React.FC<{ label: string; active: boolean; color: string; onClick: () => void }> = ({ label, active, color, onClick }) => (
    <button onClick={onClick}
        className="relative px-2.5 py-1 rounded text-[8px] font-mono font-bold uppercase tracking-wider transition-all active:scale-95"
        style={{
            backgroundColor: active ? `${color}10` : '#0a0a12',
            border: `1px solid ${active ? `${color}35` : '#1a1a2e'}`,
            color: active ? color : '#444',
            boxShadow: active ? `0 0 8px ${color}08` : 'none',
        }}>
        <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full"
            style={{ backgroundColor: active ? color : '#222', boxShadow: active ? `0 0 3px ${color}` : 'none' }} />
        {label}
    </button>
);
const Stepper: React.FC<{ label: string; value: string; onUp: () => void; onDown: () => void }> = ({ label, value, onUp, onDown }) => (
    <div className="flex items-center">
        <button onClick={onDown} className="w-5 h-6 flex items-center justify-center bg-[#0a0a12] border border-[#1a1a2e] rounded-l text-gray-600 hover:text-white hover:bg-[#14142a] transition-all text-[9px] font-mono">◀</button>
        <div className="h-6 px-1.5 flex flex-col items-center justify-center bg-[#06060c] border-y border-[#1a1a2e] min-w-[44px]">
            <span className="text-[6px] font-mono text-gray-600 uppercase leading-none">{label}</span>
            <span className="text-[9px] font-mono font-bold text-gray-300 leading-none">{value}</span>
        </div>
        <button onClick={onUp} className="w-5 h-6 flex items-center justify-center bg-[#0a0a12] border border-[#1a1a2e] rounded-r text-gray-600 hover:text-white hover:bg-[#14142a] transition-all text-[9px] font-mono">▶</button>
    </div>
);
const MetricGroup: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="p-2 rounded-lg bg-[#0a0a14] border border-[#14142a] min-w-[140px]">
        <div className="text-[8px] font-mono font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <span className="text-[10px]">{icon}</span> {title}
        </div>
        <div className="space-y-0.5">{children}</div>
    </div>
);
const MetricRow: React.FC<{ label: string; value: string; color?: string; status?: 'pass' | 'warn' | 'fail' }> = ({ label, value, color, status }) => (
    <div className="flex justify-between items-baseline">
        <span className="text-[8px] font-mono text-gray-600">{label}</span>
        <div className="flex items-center gap-1">
            {status && <span className={`w-1.5 h-1.5 rounded-full ${status === 'pass' ? 'bg-emerald-400' : status === 'warn' ? 'bg-amber-400' : 'bg-red-400'}`} />}
            <span className="text-[9px] font-mono font-bold" style={{ color: color || '#d1d5db' }}>{value}</span>
        </div>
    </div>
);
const ComplianceRow: React.FC<{ label: string; pass: boolean; detail: string }> = ({ label, pass, detail }) => (
    <div className="flex justify-between items-center py-0.5">
        <span className="text-[8px] font-mono text-gray-600">{label}</span>
        <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-mono text-gray-700">{detail}</span>
            <span className={`text-[7px] font-mono font-bold px-1 py-0.5 rounded ${pass ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                {pass ? '✓ PASS' : '✗ FAIL'}
            </span>
        </div>
    </div>
);
