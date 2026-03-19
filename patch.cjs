const fs = require('fs');

const FILE_PATH = 'e:/projects/UDS_Simulator/CAN-Simulator/src/components/can/VoltageScope.tsx';
let code = fs.readFileSync(FILE_PATH, 'utf8');

// 1. imports
if (!code.includes('useMediaQuery')) {
    code = code.replace(
      "import { isSOFTransition, isErrorFrame } from '../../services/can/trigger-logic';",
      "import { isSOFTransition, isErrorFrame } from '../../services/can/trigger-logic';\nimport { useMediaQuery } from '../../hooks/useMediaQuery';"
    );
}

// 2. add isCompact
if (!code.includes('const isCompact =')) {
    code = code.replace(
      "export const VoltageScope: React.FC = () => {\r\n    const canvasRef",
      "export const VoltageScope: React.FC = () => {\r\n    const isCompact = useMediaQuery('(max-width: 420px)');\r\n    const canvasRef"
    );
    if (code.indexOf('isCompact') === -1) {
       // fallback for unix line endings
       code = code.replace(
          "export const VoltageScope: React.FC = () => {\n    const canvasRef",
          "export const VoltageScope: React.FC = () => {\n    const isCompact = useMediaQuery('(max-width: 420px)');\n    const canvasRef"
        );
    }
}

// 3. update layout logical references inside draw
const drawFn = 'const draw = useCallback(() => {\n        const canvas = canvasRef.current;\n        if (!canvas) return;\n        const ctx = canvas.getContext(\'2d\');\n        if (!ctx) return;';

const drawFnWin = 'const draw = useCallback(() => {\r\n        const canvas = canvasRef.current;\r\n        if (!canvas) return;\r\n        const ctx = canvas.getContext(\'2d\');\r\n        if (!ctx) return;';

const drawReplacement = `const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const cw = canvas.clientWidth;
        
        // --- Mobile Layout Overrides ---
        const textScale = Math.max(1, 420 / Math.max(cw, 100));
        const L_CANVAS_W = 900;
        const L_CANVAS_H = isCompact ? 380 : 620;
        const L_M = { top: 28, right: 8, bottom: 4, left: isCompact ? 36 : 52 };
        const L_PLOT_W = L_CANVAS_W - L_M.left - L_M.right;
        const L_WAVE_H = isCompact ? 220 : 240;
        const L_DIFF_H = isCompact ? 100 : 120;
        const L_EYE_H = isCompact ? 0 : 130;
        const L_DECODE_H = isCompact ? 0 : 32;
        const L_GAP = isCompact ? 4 : 8;
        const L_WAVE_Y = L_M.top;
        const L_DIFF_Y = L_WAVE_Y + L_WAVE_H + L_GAP;
        const L_EYE_Y = L_DIFF_Y + L_DIFF_H + L_GAP;
        const L_DECODE_Y = L_EYE_Y + L_EYE_H + L_GAP;

        const CANVAS_W = L_CANVAS_W, CANVAS_H = L_CANVAS_H, M = L_M, PLOT_W = L_PLOT_W;
        const WAVE_H = L_WAVE_H, DIFF_H = L_DIFF_H, EYE_H = L_EYE_H, DECODE_H = L_DECODE_H, GAP = L_GAP;
        const WAVE_Y = L_WAVE_Y, DIFF_Y = L_DIFF_Y, EYE_Y = L_EYE_Y, DECODE_Y = L_DECODE_Y;

        const setFont = (size, family, weight = '') => {
            return \`\${weight} \${size * textScale}px \${family}\`.trim();
        };`;

if (!code.includes('Mobile Layout Overrides')) {
    code = code.replace(drawFn, drawReplacement).replace(drawFnWin, drawReplacement);
}

// remove duplicate cw declarations
code = code.replace(
  'const dpr = window.devicePixelRatio || 1;\r\n        const cw = canvas.clientWidth;\r\n        const ch = canvas.clientHeight;',
  'const dpr = window.devicePixelRatio || 1;\r\n        const ch = canvas.clientHeight;'
);
code = code.replace(
  'const dpr = window.devicePixelRatio || 1;\n        const cw = canvas.clientWidth;\n        const ch = canvas.clientHeight;',
  'const dpr = window.devicePixelRatio || 1;\n        const ch = canvas.clientHeight;'
);

// update fonts
code = code.replace(/ctx\.font = '([^0-9]*)([0-9\.]+)px ([^']+)';/g, (match, weight, size, family) => {
   return `ctx.font = setFont(${size}, '${family}', '${weight}'.trim());`;
});

// canvas height
code = code.replace(
  "style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}",
  "style={{ aspectRatio: `${CANVAS_W}/${isCompact ? 380 : 620}`, minHeight: '200px' }}"
);
code = code.replace(
  "style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}",
  "style={{ aspectRatio: `${CANVAS_W}/${isCompact ? 380 : 620}`, minHeight: '200px' }}"
);


// 4. Update the Control Strip to have a compact version
// We'll search for <div className="px-3 py-2 border-t border-[#14142a] bg-[#0c0c16] flex flex-col lg:flex-row gap-2 flex-wrap">
// and replace it with a ternary depending on isCompact.

const originalControlsStart = `<div className="px-3 py-2 border-t border-[#14142a] bg-[#0c0c16] flex flex-col lg:flex-row gap-2 flex-wrap">`;

const compactControls = `{isCompact ? (
                    <div className="px-3 py-3 border-t border-[#14142a] bg-[#0c0c16] flex flex-col gap-3">
                        <button 
                            className={\`w-full h-12 rounded flex items-center justify-center font-mono font-bold text-lg transition-colors border \${scope.runMode === 'run' ? 'bg-[#ff4444]/10 text-[#ff4444] border-[#ff4444]/30 hover:bg-[#ff4444]/20' : 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/30 hover:bg-[#00ff88]/20'}\`}
                            onClick={() => setScope(p => ({ ...p, runMode: p.runMode === 'run' ? 'stop' : 'run' }))}
                        >
                            {scope.runMode === 'run' ? 'STOP ACQUISITION' : 'RUN ACQUISITION'}
                        </button>
                        
                        <div className="flex gap-2">
                            <div className="flex-1 flex flex-col gap-1">
                                <span className="text-[10px] uppercase font-mono text-gray-400">CH1 V/div</span>
                                <div className="flex">
                                    <button onClick={() => updateCh('ch1', { vdiv: stepOpt(VDIV_OPTIONS, scope.ch1.vdiv, -1) })} className="w-11 h-11 bg-[#0a0a12] border border-[#1a1a2e] rounded-l flex items-center justify-center text-lg active:bg-[#14142a]">◀</button>
                                    <div className="flex-1 h-11 bg-[#06060c] border-y border-[#1a1a2e] flex items-center justify-center font-mono text-sm">{scope.ch1.vdiv}V</div>
                                    <button onClick={() => updateCh('ch1', { vdiv: stepOpt(VDIV_OPTIONS, scope.ch1.vdiv, 1) })} className="w-11 h-11 bg-[#0a0a12] border border-[#1a1a2e] rounded-r flex items-center justify-center text-lg active:bg-[#14142a]">▶</button>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col gap-1">
                                <span className="text-[10px] uppercase font-mono text-gray-400">T/div</span>
                                <div className="flex">
                                    <button onClick={() => setScope(p => ({ ...p, tdiv: stepOpt(TDIV_OPTIONS, p.tdiv, -1) }))} className="w-11 h-11 bg-[#0a0a12] border border-[#1a1a2e] rounded-l flex items-center justify-center text-lg active:bg-[#14142a]">◀</button>
                                    <div className="flex-1 h-11 bg-[#06060c] border-y border-[#1a1a2e] flex items-center justify-center font-mono text-sm">{scope.tdiv}µs</div>
                                    <button onClick={() => setScope(p => ({ ...p, tdiv: stepOpt(TDIV_OPTIONS, p.tdiv, 1) }))} className="w-11 h-11 bg-[#0a0a12] border border-[#1a1a2e] rounded-r flex items-center justify-center text-lg active:bg-[#14142a]">▶</button>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-mono text-gray-400">Trigger Level (V)</span>
                            <div className="flex gap-2 h-11">
                                <button className="px-4 bg-[#0a0a12] border border-[#1a1a2e] rounded font-mono text-sm font-bold active:bg-[#14142a]" style={{ color: C.trigger }} onClick={() => setScope(p => ({ ...p, triggerMode: ({ auto: 'SOF', SOF: 'error', error: 'ID', ID: 'auto' })[p.triggerMode] }))}>
                                   {scope.triggerMode}
                                </button>
                                <input 
                                    type="number" 
                                    step="0.1" 
                                    className="flex-1 bg-[#06060c] border border-[#1a1a2e] rounded px-3 font-mono text-sm text-center focus:outline-none focus:border-[#ffd000]"
                                    value={scope.triggerLevel.toFixed(1)}
                                    onChange={(e) => setScope(p => ({ ...p, triggerLevel: parseFloat(e.target.value) || 0 }))}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="px-3 py-2 border-t border-[#14142a] bg-[#0c0c16] flex flex-col lg:flex-row gap-2 flex-wrap">`;

// Also we need to close the ternary at the end of the div.
// Original ends with </div> just before </div></div>
if (!code.includes('STOP ACQUISITION')) {
    code = code.replace(originalControlsStart, compactControls);
}

// We need to find the end of the <div className="px-3 py-2..."> block and add the closing braces.
// In the original:
//                     <CtrlGroup label="Persist">
//                         <ScopeBtn label={scope.persistence ? 'ON' : 'OFF'} active={scope.persistence} color="#8855ff"
//                             onClick={() => setScope(p => ({ ...p, persistence: !p.persistence }))} />
//                     </CtrlGroup>
//                 </div>
//             </div>

const controlsEnd1 = `</CtrlGroup>\r\n                </div>`;
const controlsEnd2 = `</CtrlGroup>\n                </div>`;

const compactControlsEnd = `</CtrlGroup>\r\n                </div>\r\n                )}`;

if (code.includes(compactControls) && !code.includes(compactControlsEnd)) {
    code = code.replace(controlsEnd1, compactControlsEnd);
    code = code.replace(controlsEnd2, compactControlsEnd);
}

// Write the transformed code back
fs.writeFileSync(FILE_PATH, code);
console.log('Successfully patched VoltageScope.tsx');
