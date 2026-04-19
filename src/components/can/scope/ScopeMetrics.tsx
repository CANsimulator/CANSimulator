import React, { useMemo } from 'react';
import type { OscMeas } from './types';

interface RightRailProps {
    meas: OscMeas;
    running: boolean;
}

const INTEGRITY_CELLS = Array.from({ length: 72 }, (_, i) => {
    const r = ((i * 2654435761) >>> 0) / 0xFFFFFFFF;
    const cls = r > 0.97 ? 'err' : r > 0.9 ? 'warn' : '';
    const o = 0.35 + ((i * 1234567) % 100) / 153;
    return { cls, o };
});

export const ScopeMetrics: React.FC<RightRailProps> = ({ meas, running }) => {
    const uptime = useMemo(() => '35:26:57', []);

    return (
        <div className="osc-rightrail">
            {/* Hardware Health */}
            <div className="osc-panel">
                <div className="osc-panel-h">
                    <span className="osc-t">Hardware Health</span>
                    <span className={`osc-pill live ${running ? 'ok' : 'dim'}`}>
                        <span className="osc-dot" />Live
                    </span>
                </div>
                <div className="osc-panel-b">
                    <div>
                        <div className="osc-health-row">
                            <span className="osc-k">CAN_H Level</span>
                            <span className="osc-v">
                                <span className="osc-pill ok">Pass</span>
                                <span>3.49 V</span>
                            </span>
                        </div>
                        <div className="osc-health-row">
                            <span className="osc-k">CAN_L Level</span>
                            <span className="osc-v">
                                <span className="osc-pill ok">Pass</span>
                                <span>1.48 V</span>
                            </span>
                        </div>
                        <div className="osc-health-row">
                            <span className="osc-k">Differential</span>
                            <span className="osc-v">
                                <span className="osc-pill ok">Pass</span>
                                <span>2.01 V</span>
                            </span>
                        </div>
                        <div className="osc-health-row">
                            <span className="osc-k">Term. R (120Ω)</span>
                            <span className="osc-v">
                                <span className="osc-pill ok">Pass</span>
                                <span>118.4 Ω</span>
                            </span>
                        </div>
                        <div className="osc-health-row">
                            <span className="osc-k">Common Mode</span>
                            <span className="osc-v">
                                <span className="osc-pill warn">Drift</span>
                                <span>+62 mV</span>
                            </span>
                        </div>
                    </div>
                    <div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-faint)', textTransform: 'uppercase', marginBottom: 4 }}>
                            Bus Uptime
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                            <span className="osc-uptime">{uptime}</span>
                            <span className="osc-uptime-unit">h:m:s</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Signal Metrics */}
            <div className="osc-panel">
                <div className="osc-panel-h">
                    <span className="osc-t">Signal Metrics</span>
                    <span className="osc-pill dim">DIFF</span>
                </div>
                <div className="osc-panel-b">
                    <div className="osc-meas-grid">
                        <MeasCell label="Vpp · CH1" value={meas.vppH.toFixed(2)} unit="V" color="var(--ch1)" />
                        <MeasCell label="Vpp · CH2" value={meas.vppL.toFixed(2)} unit="V" color="var(--ch2)" />
                        <MeasCell label="Vpp · DIFF" value={meas.vppD.toFixed(2)} unit="V" color="var(--chd)" />
                        <MeasCell label="RMS · DIFF" value={meas.rmsD.toFixed(2)} unit="V" />
                        <MeasCell label="Bit Rate" value="500" unit="kbit/s" />
                        <MeasCell label="Frame Freq" value={(meas.freq / 1000).toFixed(1)} unit="kHz" />
                        <MeasCell label="Rise" value={meas.rise.toFixed(0)} unit="ns" />
                        <MeasCell label="Fall" value={meas.fall.toFixed(0)} unit="ns" />
                    </div>
                </div>
            </div>

            {/* Integrity Map */}
            <div className="osc-panel">
                <div className="osc-panel-h">
                    <span className="osc-t">Integrity Map · 60 s</span>
                    <span className="osc-pill ok">98.7%</span>
                </div>
                <div className="osc-panel-b">
                    <div className="osc-integrity-grid">
                        {INTEGRITY_CELLS.map((c, i) => (
                            <div
                                key={i}
                                className={`osc-cell ${c.cls}`}
                                style={{ opacity: c.o }}
                            />
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)', marginTop: 4 }}>
                        <span>−60s</span><span>now</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MeasCell: React.FC<{ label: string; value: string; unit: string; color?: string }> = ({ label, value, unit, color }) => (
    <div className="osc-meas-cell">
        <span className="osc-k">
            {color && <span className="osc-sw" style={{ background: color }} />}
            {label}
        </span>
        <span className="osc-v">
            {value}<span className="osc-u">{unit}</span>
        </span>
    </div>
);
