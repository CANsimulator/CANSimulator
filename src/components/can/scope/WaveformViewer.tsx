import React, { useRef, useEffect, useCallback } from 'react';
import {
    Maximize2,
    Download,
    LayoutGrid,
    Clock,
    Settings2
} from 'lucide-react';
import {
    PANEL_H_PHYSICAL,
    PANEL_H_DIFF,
    PANEL_H_EYE,
    normToCanvasX,
    canvasXToNorm,
    clamp
} from '../../../utils/scope-math';
// import { ISO } from '../../../services/can/waveform-generator';
import type { Sample } from '../../../types/can';

interface ViewState {
    zoomX: number;
    zoomY: number;
    panX: number;
    panY: number;
}

interface WaveformViewerProps {
    samples: Sample[];
    view: ViewState;
    ch1: { enabled: boolean; vdiv: number; offset: number; color: string };
    ch2: { enabled: boolean; vdiv: number; offset: number; color: string };
    tdiv: number;
    cursorMode: 'off' | 'time';
    cursorA: number;
    cursorB: number;
    showDiff: boolean;
    showEye: boolean;
    onUpdateView: (view: ViewState | ((prev: ViewState) => ViewState)) => void;
    onUpdateCursors: (a: number, b: number) => void;
    onExportPNG: () => void;
    onResetView: () => void;
}

const CANVAS_W = 1000;
const MARGIN = { left: 52, right: 12, top: 40, bottom: 40 };

const CAN_FIELDS = [
    { name: 'SOF', color: '#ffffff', start: 0, end: 0 },
    { name: 'ARB ID', color: '#00d4ff', start: 1, end: 11 },
    { name: 'CTRL', color: '#888888', start: 12, end: 14 },
    { name: 'DLC', color: '#ffd000', start: 15, end: 18 },
    { name: 'DATA', color: '#00ff88', start: 19, end: 82 },
    { name: 'CRC', color: '#ff8800', start: 83, end: 97 },
    { name: 'ACK', color: '#c850ff', start: 98, end: 100 },
    { name: 'EOF', color: '#bf00ff', start: 101, end: 107 },
];

export const WaveformViewer: React.FC<WaveformViewerProps> = ({
    samples,
    view,
    ch1,
    ch2,
    tdiv,
    cursorMode,
    cursorA,
    cursorB,
    showDiff,
    showEye,
    onUpdateView,
    onUpdateCursors,
    onExportPNG,
    onResetView
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const sToX = useCallback((idx: number, total: number, vw: ViewState) => {
        const norm = idx / (total - 1 || 1);
        return normToCanvasX(norm, vw);
    }, []);

    const vToY = useCallback((v: number, vdiv: number, offset: number, panelY: number, panelH: number, vw: ViewState) => {
        const pixelsPerVolt = (panelH / 8) / vdiv;
        const normY = (panelH / 2) - (v + offset - 2.5) * pixelsPerVolt;
        return panelY + (normY * vw.zoomY + vw.panY);
    }, []);

    const dynamicCanvasH = (MARGIN.top + MARGIN.bottom + 
        PANEL_H_PHYSICAL + 
        (showDiff ? PANEL_H_DIFF + 20 : 0) + 
        (showEye ? PANEL_H_EYE + 20 : 0) + 
        40 // Decoder strip height
    );

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        // Reset
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, CANVAS_W, dynamicCanvasH);

        // Calculate panel vertical offsets
        let currentY = MARGIN.top;
        const panels = [
            { type: 'physical', label: 'CANH / CANL — Physical Layer', h: PANEL_H_PHYSICAL, active: true },
            { type: 'diff', label: 'VDIFF (CANH - CANL) — Differential', h: PANEL_H_DIFF, active: showDiff },
            { type: 'eye', label: 'Eye Diagram — PERSISTENCE', h: PANEL_H_EYE, active: showEye }
        ].filter(p => p.active);

        panels.forEach((panel) => {
            const py = currentY;
            const ph = panel.h;

            // ── Grid ──
            ctx.strokeStyle = '#1e1e2d';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]);
            
            const cols = 10;
            const rows = 8;
            const colW = (CANVAS_W - MARGIN.left - MARGIN.right) / cols;
            const rowH = ph / rows;

            ctx.beginPath();
            for (let i = 0; i <= cols; i++) {
                const x = MARGIN.left + i * colW;
                ctx.moveTo(x, py);
                ctx.lineTo(x, py + ph);
            }
            for (let i = 0; i <= rows; i++) {
                const y = py + i * rowH;
                ctx.moveTo(MARGIN.left, y);
                ctx.lineTo(CANVAS_W - MARGIN.right, y);
            }
            ctx.stroke();
            ctx.setLineDash([]);

            // ── Panel Label ──
            ctx.fillStyle = '#94a3b8';
            ctx.font = '500 11px Outfit, system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(panel.label, MARGIN.left + 6, py - 8);

            // ── Waveforms for current panel ──
            if (samples.length > 2) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(MARGIN.left, py, CANVAS_W - MARGIN.left - MARGIN.right, ph);
                ctx.clip();

                const drawWave = (color: string, getY: (s: Sample) => number, alpha = 1) => {
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 1.25;
                    ctx.globalAlpha = alpha;
                    ctx.lineJoin = 'round';
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    for (let i = 0; i < samples.length; i++) {
                        const x = MARGIN.left + sToX(i, samples.length, view);
                        const y = getY(samples[i]);
                        if (x < MARGIN.left - 20 || x > CANVAS_W - MARGIN.right + 20) continue;
                        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                };

                if (panel.type === 'physical') {
                    if (ch1.enabled) drawWave(ch1.color, s => vToY(s.canh, ch1.vdiv, ch1.offset, py, ph, view));
                    if (ch2.enabled) drawWave(ch2.color, s => vToY(s.canl, ch2.vdiv, ch2.offset, py, ph, view));
                } else if (panel.type === 'diff') {
                    drawWave('#00ff9f', s => vToY(s.canh - s.canl, ch1.vdiv, 0, py, ph, view));
                } else if (panel.type === 'eye') {
                    // Logic to find bit transitions and overlay them
                    // For brevity, we simulate by overlaying multiple "chunks" of the buffer
                    const bitWidth = samples.length / 100; // Simulated bit width
                    for (let trace = 0; trace < 10; trace++) {
                        const offset = Math.floor(trace * samples.length / 12);
                        ctx.globalAlpha = 0.15;
                        ctx.strokeStyle = '#00f3ff';
                        ctx.beginPath();
                        for (let i = 0; i < bitWidth * 4; i++) {
                            const si = (offset + i) % samples.length;
                            const x = MARGIN.left + (i / (bitWidth * 4)) * (CANVAS_W - MARGIN.left - MARGIN.right);
                            const y = vToY(samples[si].canh - samples[si].canl, 1, 0, py, ph, { ...view, zoomX: 1, panX: 0 });
                            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                        }
                        ctx.stroke();
                    }
                }
                ctx.restore();
            }

            // ── Cursors (Global overlay per panel) ──
            if (cursorMode === 'time') {
                const drawCursor = (pos: number) => {
                    const x = MARGIN.left + normToCanvasX(pos, view);
                    if (x < MARGIN.left || x > CANVAS_W - MARGIN.right) return;
                    ctx.strokeStyle = '#00f3ff';
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath();
                    ctx.moveTo(x, py); ctx.lineTo(x, py + ph);
                    ctx.stroke();
                    ctx.setLineDash([]);
                };
                drawCursor(cursorA);
                drawCursor(cursorB);
            }

            currentY += ph + 20; // Space between panels
        });

        // ── Decoder Strip (BOTTOM OVERLAY) ──
        const stripY = currentY - 10;
        const stripH = 34;
        ctx.fillStyle = '#050508';
        ctx.fillRect(MARGIN.left, stripY, CANVAS_W - MARGIN.left - MARGIN.right, stripH);
        
        if (samples.length > 2) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(MARGIN.left, stripY, CANVAS_W - MARGIN.left - MARGIN.right, stripH);
            ctx.clip();
            
            // 1. Identify and group regions
            const regions: { x1: number, x2: number, name: string, color: string }[] = [];
            let current: any = null;

            for (let i = 0; i < samples.length; i++) {
                const x = MARGIN.left + sToX(i, samples.length, view);
                const bi = samples[i].bitIndex;
                const field = CAN_FIELDS.find(f => bi >= f.start && bi <= f.end);
                
                if (field) {
                    if (!current || current.name !== field.name) {
                        if (current) regions.push(current);
                        current = { x1: x, x2: x, name: field.name, color: field.color };
                    }
                    current.x2 = x;
                } else if (current) {
                    regions.push(current);
                    current = null;
                }
            }
            if (current) regions.push(current);

            // 2. Render regions
            regions.forEach(reg => {
                const w = reg.x2 - reg.x1;
                if (w <= 0) return;

                // Subtle tinted background
                ctx.globalAlpha = 0.12;
                ctx.fillStyle = reg.color;
                ctx.fillRect(reg.x1, stripY, w, stripH);

                // Thin top accent bar (real logic analyzers use this)
                ctx.globalAlpha = 0.9;
                ctx.fillStyle = reg.color;
                ctx.fillRect(reg.x1, stripY, w, 2);

                // Label
                if (w > 28) {
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = reg.color;
                    ctx.font = '600 10px Outfit, system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(reg.name, reg.x1 + w / 2, stripY + stripH / 2 + 1);
                }
            });

            ctx.restore();
        }

    }, [samples, view, ch1, ch2, cursorMode, cursorA, cursorB, showDiff, showEye, sToX, vToY, dynamicCanvasH]);

    useEffect(() => { draw(); }, [draw]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        onUpdateView(p => ({
            ...p,
            zoomX: clamp(p.zoomX * delta, 0.5, 50),
            zoomY: e.shiftKey ? clamp(p.zoomY * delta, 0.5, 10) : p.zoomY
        }));
    }, [onUpdateView]);

    const handlePointerDown = (e: React.PointerEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = (e.clientX - rect.left) * (CANVAS_W / rect.width);
        if (cursorMode === 'time') {
            const curAX = MARGIN.left + normToCanvasX(cursorA, view);
            if (Math.abs(x - curAX) < 15) {
                const moveHandler = (me: PointerEvent) => {
                    const nx = (me.clientX - rect.left) * (CANVAS_W / rect.width) - MARGIN.left;
                    onUpdateCursors(clamp(canvasXToNorm(nx, view), 0, 1), cursorB);
                };
                const upHandler = () => {
                    window.removeEventListener('pointermove', moveHandler);
                    window.removeEventListener('pointerup', upHandler);
                };
                window.addEventListener('pointermove', moveHandler);
                window.addEventListener('pointerup', upHandler);
                return;
            }
        }
    };

    return (
        <div ref={containerRef} className="flex flex-col gap-4 w-full h-full relative">
            {/* Header / Info Bar */}
            <div className="flex items-center justify-between px-4 py-2 glass-panel !rounded-none border-white/5 mx-2 mt-2 bg-white/[0.01]">
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#00f3ff]" />
                        <span className="text-[11px] font-outfit text-white/50">CH1</span>
                        <span className="text-[11px] font-mono tabular-nums text-white/80">{ch1.vdiv} V/div</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#bd00ff]" />
                        <span className="text-[11px] font-outfit text-white/50">CH2</span>
                        <span className="text-[11px] font-mono tabular-nums text-white/80">{ch2.vdiv} V/div</span>
                    </div>
                    <div className="flex items-center gap-2 border-l border-white/10 pl-5">
                        <Clock size={12} className="text-white/40" />
                        <span className="text-[11px] font-outfit text-white/50">Time</span>
                        <span className="text-[11px] font-mono tabular-nums text-white/80">{tdiv} µs/div</span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={onResetView} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-white/60 hover:text-[#00f3ff] hover:bg-white/[0.08] text-[11px] font-outfit font-medium transition-colors">
                        <Maximize2 size={11} />
                        Auto-scale
                    </button>
                    <button onClick={onExportPNG} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00f3ff]/5 border border-[#00f3ff]/20 text-[#00f3ff]/90 hover:bg-[#00f3ff]/15 text-[11px] font-outfit font-medium transition-colors ml-2">
                        <Download size={11} />
                        Export PNG
                    </button>
                </div>
            </div>

            {/* Canvas Container */}
            <div className="relative flex-1 glass-panel !rounded-none overflow-y-auto custom-scrollbar mx-2 bg-[#0a0a0f] border-white/10 flex items-start justify-center">
                <canvas 
                    ref={canvasRef}
                    width={CANVAS_W}
                    height={dynamicCanvasH}
                    onWheel={handleWheel}
                    onPointerDown={handlePointerDown}
                    className="w-full cursor-crosshair opacity-90 group-hover:opacity-100 transition-opacity"
                />
                
                {/* Floating Modes */}
                <div className="absolute top-3 right-3 flex flex-col gap-1">
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/70 border border-white/10 text-white/50 hover:text-[#00f3ff] hover:bg-white/[0.05] backdrop-blur-md text-[10px] font-outfit font-medium transition-colors">
                        <LayoutGrid size={11} />
                        Vector map
                    </button>
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/70 border border-white/10 text-white/50 hover:text-[#00ff9f] hover:bg-white/[0.05] backdrop-blur-md text-[10px] font-outfit font-medium transition-colors">
                        <Settings2 size={11} />
                        Auto-calibrate
                    </button>
                </div>

                {/* Status Overlay */}
                <div className="absolute bottom-3 left-3 flex items-center gap-4 text-[10px] font-outfit text-white/40">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-white/40 animate-pulse" />
                        <span>Buffer stable</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#00ff9f]/70">
                        <div className="w-1 h-1 rounded-full bg-[#00ff9f]" />
                        <span>ISO 11898 PHY pass</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
