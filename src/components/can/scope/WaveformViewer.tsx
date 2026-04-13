import React, { useRef, useEffect, useCallback } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';
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

const CANVAS_W = 900;
const CANVAS_H = 600; // Increased to fit panel stack
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

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        // Reset
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

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
            ctx.fillStyle = '#64748b';
            ctx.font = 'bold 9px JetBrains Mono';
            ctx.textAlign = 'left';
            ctx.fillText(panel.label.toUpperCase(), MARGIN.left + 5, py + 12);

            // ── Waveforms for current panel ──
            if (samples.length > 2) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(MARGIN.left, py, CANVAS_W - MARGIN.left - MARGIN.right, ph);
                ctx.clip();

                const drawWave = (color: string, getY: (s: Sample) => number, alpha = 1) => {
                    ctx.shadowBlur = alpha > 0.5 ? 8 : 0;
                    ctx.shadowColor = color;
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 1.5;
                    ctx.globalAlpha = alpha;
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

                // Background
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = reg.color;
                ctx.fillRect(reg.x1, stripY, w, stripH);
                
                // Borders
                ctx.globalAlpha = 0.6;
                ctx.strokeStyle = reg.color;
                ctx.lineWidth = 1;
                ctx.strokeRect(reg.x1 + 0.5, stripY + 0.5, w - 1, stripH - 1);

                // Label
                if (w > 25) {
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '900 9px JetBrains Mono, monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    // Shadow for readability
                    ctx.shadowBlur = 4;
                    ctx.shadowColor = 'rgba(0,0,0,0.8)';
                    ctx.fillText(reg.name, reg.x1 + w/2, stripY + stripH/2);
                    ctx.shadowBlur = 0;
                }
            });

            ctx.restore();
        }

    }, [samples, view, ch1, ch2, cursorMode, cursorA, cursorB, showDiff, showEye, sToX, vToY]);

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
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-[2px] h-3 bg-[#00f3ff] shadow-[0_0_4px_#00f3ff]" />
                        <span className="text-[10px] font-mono font-black text-white/30 uppercase tracking-widest">CH1: <span className="text-white/80">{ch1.vdiv}V/div</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-[2px] h-3 bg-[#bd00ff] shadow-[0_0_4px_#bd00ff]" />
                        <span className="text-[10px] font-mono font-black text-white/30 uppercase tracking-widest">CH2: <span className="text-white/80">{ch2.vdiv}V/div</span></span>
                    </div>
                    <div className="flex items-center gap-2 border-l border-white/5 pl-6">
                        <Clock size={12} className="text-[#00ff9f]/60" />
                        <span className="text-[10px] font-mono font-black text-white/30 uppercase tracking-widest">Time: <span className="text-white/80">{tdiv}µs/div</span></span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={onResetView} className={cn(
                        "flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-white/40 hover:text-[#00f3ff] hover:bg-white/[0.08] text-[9px] font-mono font-black uppercase tracking-widest transition-all !rounded-none"
                    )}>
                        <Maximize2 size={11} />
                        Auto-Scale
                    </button>
                    <div className="w-px h-4 bg-white/5 mx-2" />
                    <button onClick={onExportPNG} className="flex items-center gap-2 px-3 py-1.5 bg-[#00f3ff]/5 border border-[#00f3ff]/20 text-[#00f3ff]/80 hover:bg-[#00f3ff]/15 text-[9px] font-mono font-black uppercase tracking-widest transition-all !rounded-none">
                        <Download size={11} />
                        Export .IMG
                    </button>
                </div>
            </div>

            {/* Canvas Container */}
            <div className="relative flex-1 min-h-[500px] glass-panel !rounded-none overflow-y-auto no-scrollbar group mx-2 bg-black border-white/10">
                <canvas 
                    ref={canvasRef}
                    width={CANVAS_W}
                    height={CANVAS_H}
                    onWheel={handleWheel}
                    onPointerDown={handlePointerDown}
                    className="w-full cursor-crosshair opacity-90 group-hover:opacity-100 transition-opacity"
                />
                
                {/* Floating Modes */}
                <div className="absolute top-4 right-4 flex flex-col gap-1.5">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-white/10 text-white/30 hover:text-[#00f3ff] hover:bg-white/[0.05] backdrop-blur-md text-[8px] font-mono font-black tracking-[0.2em] transition-all !rounded-none">
                        <LayoutGrid size={11} />
                        VECTOR MAP
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-white/10 text-white/30 hover:text-[#00ff9f] hover:bg-white/[0.05] backdrop-blur-md text-[8px] font-mono font-black tracking-[0.2em] transition-all !rounded-none">
                        <Settings2 size={11} />
                        AUTO CALIB
                    </button>
                </div>

                {/* Status Overlay */}
                <div className="absolute bottom-4 left-4 flex items-center gap-6 text-[8px] font-mono font-black uppercase tracking-[0.2em] text-white/20">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-white/20 animate-pulse" />
                        <span>Buffer: Stable</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#00ff9f]/40">
                        <div className="w-1 h-1 bg-[#00ff9f]" />
                        <span>ISO PHY PASS</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
