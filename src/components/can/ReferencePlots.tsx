import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { motion } from 'framer-motion';

// --- Types ---
interface DataPoint {
  time: number;
  canH: number;
  canL: number;
  diff: number;
  bits?: string;
}

// --- Signal Generation Logic ---
const generateData = (): DataPoint[] => {
  const bits = [0, 1, 0, 1, 1, 0, 0, 1]; // SOF, ID, etc.
  const bitRate = 500000; // 500 kbit/s
  const samplesPerBit = 20;
  const bitDuration = 2; // 2 µs
  const data: DataPoint[] = [];

  for (let i = 0; i < bits.length; i++) {
    const bit = bits[i];
    for (let j = 0; j < samplesPerBit; j++) {
      const time = i * bitDuration + (j / samplesPerBit) * bitDuration;
      
      // Target voltages
      const targetH = bit === 0 ? 3.5 : 2.5;
      const targetL = bit === 0 ? 1.5 : 2.5;
      
      // Simple transitions and noise
      const noise = (Math.random() - 0.5) * 0.04;
      
      data.push({
        time: parseFloat(time.toFixed(3)),
        canH: targetH + noise,
        canL: targetL + noise,
        diff: (targetH - targetL),
        bits: j === 0 ? (bit === 0 ? 'D' : 'R') : ''
      });
    }
  }
  return data;
};

// --- Themes ---
const THEME = {
  bg: '#0b0f10',
  grid: '#233038',
  text: '#e6f1f3',
  inkDim: '#9fb3bd',
  canH: '#00f3ff', // Neon Cyan
  canL: '#bf00ff', // Neon Purple
  diff: '#00ff9f', // Neon Green
  accent: '#ffd400',
  danger: '#ff4d3a',
};

interface ReferencePlotsProps {
  standalone?: boolean;
}

export const ReferencePlots: React.FC<ReferencePlotsProps> = ({ standalone = true }) => {
  const data = useMemo(() => generateData(), []);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: { opacity: 1, scale: 1 }
  };

  return (
    <motion.div 
      className={`p-6 space-y-12 text-[#e6f1f3] font-sans ${standalone ? 'bg-[#0b0f10] min-h-screen' : ''}`}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <div className="space-y-2 border-l-4 border-[#00f3ff] pl-6 py-2">
        <h1 className="text-3xl font-black tracking-tighter uppercase italic">
          CAN Bus Technical Reference
        </h1>
        <p className="text-[#9fb3bd] font-mono text-sm uppercase tracking-widest">
          Physical Layer Waveform Analysis · ISO 11898-2
        </p>
      </div>

      {/* Plot 1: CAN_H / CAN_L */}
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
            <span className="w-1.5 h-6 bg-[#00f3ff]" />
            1. Differential Line Waveforms (CAN_H & CAN_L)
          </h2>
          <div className="text-xs font-mono text-[#9fb3bd] bg-[#161f24] px-3 py-1 rounded-sm border border-[#233038]">
            SCALE: 1.0 V/DIV · 2.0 µS/BIT
          </div>
        </div>
        
        <div className="h-[400px] w-full bg-[#10161a] border border-[#233038] rounded-xl p-4 shadow-2xl relative overflow-hidden">
          {/* Decorative scanner line */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00f3ff05] to-transparent pointer-events-none" />
          
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} vertical={false} />
              <XAxis 
                dataKey="time" 
                label={{ value: 'Time (µs)', position: 'insideBottomRight', offset: -10, fill: THEME.text, fontSize: 12, fontFamily: 'JetBrains Mono' }}
                stroke={THEME.inkDim}
                tick={{ fill: THEME.inkDim, fontSize: 11, fontFamily: 'JetBrains Mono' }}
              />
              <YAxis 
                domain={[0, 5]} 
                ticks={[0, 1, 2, 3, 4, 5]}
                label={{ value: 'Voltage (V)', angle: -90, position: 'insideLeft', fill: THEME.text, fontSize: 12, fontFamily: 'JetBrains Mono' }}
                stroke={THEME.inkDim}
                tick={{ fill: THEME.inkDim, fontSize: 11, fontFamily: 'JetBrains Mono' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#161f24', border: '1px solid #233038', color: '#e6f1f3', fontFamily: 'JetBrains Mono', fontSize: 12 }}
                itemStyle={{ padding: '2px 0' }}
              />
              <Legend verticalAlign="top" align="right" iconType="rect" wrapperStyle={{ paddingBottom: 20, fontFamily: 'JetBrains Mono', fontSize: 12, textTransform: 'uppercase' }} />
              <Line 
                type="monotone" 
                dataKey="canH" 
                name="CAN High" 
                stroke={THEME.canH} 
                strokeWidth={2.5} 
                dot={false}
                activeDot={{ r: 4, stroke: THEME.canH, strokeWidth: 2, fill: '#0b0f10' }}
              />
              <Line 
                type="monotone" 
                dataKey="canL" 
                name="CAN Low" 
                stroke={THEME.canL} 
                strokeWidth={2.5} 
                dot={false}
                activeDot={{ r: 4, stroke: THEME.canL, strokeWidth: 2, fill: '#0b0f10' }}
              />
              {/* Reference line for V_rec */}
              <ReferenceLine y={2.5} stroke={THEME.inkDim} strokeDasharray="5 5" label={{ value: '2.5V (Recessive)', position: 'left', fill: THEME.inkDim, fontSize: 10, offset: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Plot 2: V_DIFF */}
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
            <span className="w-1.5 h-6 bg-[#00ff9f]" />
            2. Differential Voltage Waveform (V_diff)
          </h2>
          <div className="text-xs font-mono text-[#9fb3bd] bg-[#161f24] px-3 py-1 rounded-sm border border-[#233038]">
            V_diff = CAN_H - CAN_L
          </div>
        </div>

        <div className="h-[400px] w-full bg-[#10161a] border border-[#233038] rounded-xl p-4 shadow-2xl overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} vertical={false} />
              <XAxis 
                dataKey="time" 
                label={{ value: 'Time (µs)', position: 'insideBottomRight', offset: -10, fill: THEME.text, fontSize: 12, fontFamily: 'JetBrains Mono' }}
                stroke={THEME.inkDim}
                tick={{ fill: THEME.inkDim, fontSize: 11, fontFamily: 'JetBrains Mono' }}
              />
              <YAxis 
                domain={[-0.5, 3]} 
                ticks={[0, 0.5, 0.9, 2, 3]}
                label={{ value: 'Voltage (V)', angle: -90, position: 'insideLeft', fill: THEME.text, fontSize: 12, fontFamily: 'JetBrains Mono' }}
                stroke={THEME.inkDim}
                tick={{ fill: THEME.inkDim, fontSize: 11, fontFamily: 'JetBrains Mono' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#161f24', border: '1px solid #233038', color: '#e6f1f3', fontFamily: 'JetBrains Mono', fontSize: 12 }}
              />
              <Legend verticalAlign="top" align="right" iconType="rect" wrapperStyle={{ paddingBottom: 20, fontFamily: 'JetBrains Mono', fontSize: 12, textTransform: 'uppercase' }} />
              
              {/* Shading for Dominant state */}
              <Area 
                type="stepAfter" 
                dataKey="diff" 
                stroke="none" 
                fill={THEME.diff} 
                fillOpacity={0.08} 
              />
              
              <Line 
                type="monotone" 
                dataKey="diff" 
                name="V_diff" 
                stroke={THEME.diff} 
                strokeWidth={3} 
                dot={false}
                activeDot={{ r: 5, stroke: THEME.diff, strokeWidth: 2, fill: '#0b0f10' }}
              />
              
              {/* Thresholds */}
              <ReferenceLine y={0.9} stroke={THEME.danger} strokeDasharray="3 3" label={{ direction: 'left', value: '0.9V (DOM)', fill: THEME.danger, fontSize: 10, offset: 5, position: 'insideLeft' }} />
              <ReferenceLine y={0.5} stroke={THEME.accent} strokeDasharray="3 3" label={{ direction: 'left', value: '0.5V (REC)', fill: THEME.accent, fontSize: 10, offset: 5, position: 'insideLeft' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Footer info box */}
        <div className="p-4 bg-[#161f24] border border-[#233038] rounded-lg grid grid-cols-2 gap-8">
          <div className="space-y-1">
            <h4 className="text-[10px] font-black uppercase text-[#ffd400] tracking-widest">Dominant State (Bit 0)</h4>
            <p className="text-xs text-[#9fb3bd]">CAN_H drives to ~3.5V, CAN_L drives to ~1.5V. Resulting V_diff ≈ 2.0V.</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-[10px] font-black uppercase text-[#9fb3bd] tracking-widest">Recessive State (Bit 1)</h4>
            <p className="text-xs text-[#9fb3bd]">Both lines float to ~2.5V (terminated). Resulting V_diff ≈ 0V.</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
