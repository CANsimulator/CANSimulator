import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { DemoFrame } from './types';
import { ReferencePlots } from '../ReferencePlots';
import { DEMO_FRAMES, CAN_CYCLE_US } from './protocolUtils';
import { type ScopeSync } from './WaveformViewer';

const hex = (v: number) => v.toString(16).toUpperCase().padStart(2, '0');
const bin = (v: number, bits: number) => v.toString(2).padStart(bits, '0');

// ── Interfaces ──────────────────────────────────────────────────────────────
interface Field {
    key: string;
    label: string;
    bits: number;
    color: string;
    desc: string;
    value: string | number;
}

// ── Sub-components ──────────────────────────────────────────────────────────

const FrameTable = React.memo(({ 
    frames, 
    selected, 
    onSelect, 
    onKeyDown, 
    selectable 
}: { 
    frames: typeof DEMO_FRAMES; 
    selected: number;
    onSelect: (idx: number) => void;
    onKeyDown: (e: React.KeyboardEvent, idx: number) => void;
    selectable?: boolean;
}) => (
    <div className="osc-dec-table">
        <div className="osc-row head">
            <span>#</span><span>Timestamp</span><span>Format</span>
            <span>CAN ID</span><span>DLC</span><span>Data · Payload</span>
            <span>CRC</span><span>Status</span>
        </div>
        {frames.map((fr, i) => {
            const frameCrc = Math.abs(fr.data.reduce((a, b) => a ^ b, 0xA5)) & 0x7FFF;
            const origIdx = DEMO_FRAMES.indexOf(fr);
            return (
                <button key={i}
                    type="button"
                    className={`osc-row ${origIdx === selected ? 'selected' : ''} focus-ring-cyber`}
                    onClick={() => selectable !== false && onSelect(origIdx)}
                    onKeyDown={(e) => selectable !== false && onKeyDown(e, origIdx)}
                    aria-label={`Frame ${origIdx + 1}: ${fr.id} ${fr.name}`}
                    aria-selected={origIdx === selected}
                >
                    <span className="osc-idx">{String(origIdx + 1).padStart(3, '0')}</span>
                    <span>{(fr.ts / 1000).toFixed(3)} ms</span>
                    <span>{fr.fmt === 'EXT' ? '29-bit' : '11-bit'}</span>
                    <span className="osc-fid">{fr.id}</span>
                    <span>{fr.dlc}</span>
                    <span className="osc-bytes">{fr.data.map(hex).join(' ')}</span>
                    <span>0x{frameCrc.toString(16).toUpperCase().padStart(4, '0')}</span>
                    <span className={`osc-st ${fr.status}`}>
                        {fr.status === 'ok' ? '✓ ACK' : fr.status === 'warn' ? '△ Warn' : '✕ CRC Err'}
                    </span>
                </button>
            );
        })}
    </div>
));

const FrameInspector = React.memo(({ 
    f, 
    fields, 
    selected, 
    totalBits, 
    crc, 
    hovField, 
    setHovField, 
    hov 
}: { 
    f: DemoFrame; 
    fields: Field[]; 
    selected: number; 
    totalBits: number; 
    crc: number; 
    hovField: string | null; 
    setHovField: (s: string | null) => void; 
    hov: Field | null | undefined; 
}) => (
    <div className="osc-inspector">
        <div className="osc-insp-header">
            <div className="osc-insp-hid">
                <div className="osc-insp-num">#{String(selected + 1).padStart(3, '0')}</div>
                <div className="osc-insp-id">{f.id}</div>
                <div className="osc-insp-name">{f.name}</div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
                <span className={`osc-pill ${f.status}`}>
                    <span className="osc-dot" />
                    {f.status === 'ok' ? 'Frame Valid' : f.status === 'warn' ? 'Warning' : 'CRC Error'}
                </span>
                <span className="osc-pill dim text-[10px]">{f.fmt === 'EXT' ? '29-bit EXT' : '11-bit STD'} · {f.dlc} B</span>
            </div>
        </div>
        <div className="osc-insp-section">
            <div className="osc-insp-sec-lbl">Frame Structure · {totalBits} bits</div>
            <div className="osc-insp-struct">
                {fields.map(fld => (
                    <button key={fld.key}
                        type="button"
                        className={`osc-insp-field ${hovField === fld.key ? 'hov' : ''} focus-ring-cyber`}
                        style={{ 
                            flex: fld.bits, 
                            minWidth: fld.bits < 3 ? 18 : 0, 
                            background: `color-mix(in srgb, ${fld.color} 20%, transparent)`, 
                            borderColor: `color-mix(in srgb, ${fld.color} 50%, transparent)`,
                            '--field-glow': `color-mix(in srgb, ${fld.color} 30%, transparent)`
                        } as React.CSSProperties}
                        onMouseEnter={() => setHovField(fld.key)}
                        onMouseLeave={() => setHovField(null)}
                        onFocus={() => setHovField(fld.key)}
                        onBlur={() => setHovField(null)}
                        aria-label={`${fld.label}: ${fld.desc}. Value: ${fld.value}`}
                    >
                        <span className="osc-insp-field-lbl" style={{ color: fld.color }}>{fld.label}</span>
                        <span className="osc-insp-field-bits">{fld.bits}b</span>
                    </button>
                ))}
            </div>
            {hov && (
                <div className="osc-insp-tooltip">
                    <span className="font-bold" style={{ color: hov.color }}>{hov.label}</span>
                    <span className="text-[var(--stroke-2)]">·</span>
                    <span>{hov.desc}</span>
                    <span className="text-[var(--stroke-2)]">·</span>
                    <span className="text-[var(--ink)]">{hov.value}</span>
                    <span className="text-[var(--stroke-2)]">·</span>
                    <span className="text-[var(--ink-faint)]">{hov.bits} bit{hov.bits > 1 ? 's' : ''}</span>
                </div>
            )}
        </div>
        <div className="osc-insp-section">
            <div className="osc-insp-sec-lbl">Payload · {f.dlc} bytes</div>
            <div className="osc-insp-bytes">
                {f.data.map((b, i) => (
                    <div key={i} className="osc-insp-byte">
                        <div className="osc-insp-byte-hex">{hex(b)}</div>
                        <div className="osc-insp-byte-bin">{bin(b, 8)}</div>
                        <div className="osc-insp-byte-dec">{b}</div>
                        <div className="osc-insp-byte-idx">D{i}</div>
                    </div>
                ))}
            </div>
        </div>
        <div className="osc-insp-section">
            <div className="osc-insp-sec-lbl">Field Summary</div>
            <div className="osc-insp-summary">
                {[
                    { k: 'Identifier', v: f.id, color: 'var(--ch2)' },
                    { k: 'Format',     v: f.fmt === 'EXT' ? 'Extended (29-bit)' : 'Standard (11-bit)' },
                    { k: 'Frame Type', v: 'Data Frame (RTR=0)' },
                    { k: 'DLC',        v: `${f.dlc} bytes` },
                    { k: 'Bit Rate',   v: '500 kbit/s' },
                    { k: 'CRC-15',     v: '0x' + crc.toString(16).toUpperCase().padStart(4, '0'), color: 'var(--f-indigo)' },
                    { k: 'ACK',        v: f.status === 'err' ? 'Missing — no receiver' : 'Acknowledged (rx=0)', color: f.status === 'err' ? 'var(--danger)' : 'var(--ok)' },
                    { k: 'Timestamp',  v: `${(f.ts / 1000).toFixed(3)} ms` },
                ].map(row => (
                    <div key={row.k} className="osc-insp-row">
                        <span className="osc-insp-row-k">{row.k}</span>
                        <span className="osc-insp-row-v" style={row.color ? { color: row.color } : {}}>{row.v}</span>
                    </div>
                ))}
            </div>
        </div>
    </div>
));

type TabKey = 'Frames' | 'Errors' | 'Statistics' | 'Search' | 'Reference';

function makeFields(f: DemoFrame) {
    const crc = Math.abs(f.data.reduce((a, b) => a ^ b, 0xA5)) & 0x7FFF;
    return [
        { key: 'sof',   label: 'SOF',  bits: 1,         color: 'var(--ch1)',      desc: 'Start of Frame',          value: '1' },
        { key: 'id',    label: 'ID',   bits: f.fmt === 'EXT' ? 29 : 11, color: 'var(--ch2)', desc: f.fmt === 'EXT' ? '29-bit Ext ID' : '11-bit Std ID', value: f.id },
        { key: 'rtr',   label: 'RTR',  bits: 1,         color: 'var(--f-purp)',   desc: 'Remote TX Request',       value: '0' },
        { key: 'ide',   label: 'IDE',  bits: 1,         color: 'var(--f-pink)',   desc: 'ID Extension',            value: f.fmt === 'EXT' ? '1' : '0' },
        { key: 'r0',    label: 'r0',   bits: 1,         color: 'var(--ink-faint)',desc: 'Reserved',                value: '0' },
        { key: 'dlc',   label: 'DLC',  bits: 4,         color: 'var(--warn)',     desc: 'Data Length Code',        value: bin(f.dlc, 4) },
        { key: 'data',  label: 'DATA', bits: f.dlc * 8, color: 'var(--ok)',       desc: `Payload · ${f.dlc} bytes`, value: f.data.map(hex).join(' ') },
        { key: 'crc',   label: 'CRC',  bits: 15,        color: 'var(--f-indigo)', desc: 'CRC-15',                  value: '0x' + crc.toString(16).toUpperCase().padStart(4, '0') },
        { key: 'ack',   label: 'ACK',  bits: 1,         color: f.status === 'err' ? 'var(--danger)' : 'var(--ok)', desc: 'Acknowledgement', value: f.status === 'err' ? 'ERR' : '0' },
        { key: 'eof',   label: 'EOF',  bits: 7,         color: 'var(--ink-faint)',desc: 'End of Frame',            value: '1111111' },
    ];
}

interface ProtocolDecoderProps {
    selected: number;
    onSelect: (i: number) => void;
    syncRef?: React.MutableRefObject<ScopeSync>;
    setOscState?: React.Dispatch<React.SetStateAction<OscState>>;
    externalFilter?: { type: 'err' | 'warn'; timestamp: number; frameIdx?: number } | null;
    timebase: number;
}

export const ProtocolDecoder: React.FC<ProtocolDecoderProps> = React.memo(({ 
    selected, 
    onSelect, 
    syncRef, 
    setOscState,
    externalFilter,
    timebase
}) => {
    const [tab, setTab] = useState<TabKey>('Frames');
    const [hovField, setHovField] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeChip, setActiveChip] = useState<string | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Handle external filter requests (e.g. from Integrity Map)
    useEffect(() => {
        if (!externalFilter) return;

        // If specific frame index is provided, jump to it directly
        if (externalFilter.frameIdx !== undefined) {
            handleFrameSelect(externalFilter.frameIdx);
            return;
        }

        if (externalFilter.type === 'err') {
            setTab('Errors');
            // Find first error frame
            const firstErr = DEMO_FRAMES.find(fr => fr.status === 'err');
            if (firstErr) {
                handleFrameSelect(DEMO_FRAMES.indexOf(firstErr));
            }
        } else if (externalFilter.type === 'warn') {
            setTab('Search');
            setActiveChip('Errors'); 
            // Find first warn frame
            const firstWarn = DEMO_FRAMES.find(fr => fr.status === 'warn');
            if (firstWarn) {
                handleFrameSelect(DEMO_FRAMES.indexOf(firstWarn));
            }
        }
    }, [externalFilter]);

    const f = DEMO_FRAMES[selected] ?? DEMO_FRAMES[0];
    const fields = useMemo(() => makeFields(f), [f]);
    const totalBits = useMemo(() => fields.reduce((s, x) => s + x.bits, 0), [fields]);
    const crc = useMemo(() => Math.abs(f.data.reduce((a, b) => a ^ b, 0xA5)) & 0x7FFF, [f]);
    const hov = useMemo(() => hovField ? fields.find(x => x.key === hovField) : null, [hovField, fields]);

    const errorFrames = useMemo(() => DEMO_FRAMES.filter(fr => fr.status !== 'ok'), []);

    const stats = useMemo(() => {
        const total = DEMO_FRAMES.length;
        const okCount = DEMO_FRAMES.filter(fr => fr.status === 'ok').length;
        const warnCount = DEMO_FRAMES.filter(fr => fr.status === 'warn').length;
        const errCount = DEMO_FRAMES.filter(fr => fr.status === 'err').length;
        const stdCount = DEMO_FRAMES.filter(fr => fr.fmt === 'STD').length;
        const extCount = DEMO_FRAMES.filter(fr => fr.fmt === 'EXT').length;
        const avgDlc = DEMO_FRAMES.reduce((s, fr) => s + fr.dlc, 0) / total;
        const totalBytes = DEMO_FRAMES.reduce((s, fr) => s + fr.dlc, 0);
        const idMap: Record<string, number> = {};
        DEMO_FRAMES.forEach(fr => { idMap[fr.id] = (idMap[fr.id] ?? 0) + 1; });
        const idDist = Object.entries(idMap).sort((a, b) => b[1] - a[1]);
        const duration = (DEMO_FRAMES[DEMO_FRAMES.length - 1].ts - DEMO_FRAMES[0].ts) / 1000;
        const busLoad = ((totalBytes * 8 * 1.2) / (500_000 * duration / 1000) * 100).toFixed(1);
        return { total, okCount, warnCount, errCount, stdCount, extCount, avgDlc, totalBytes, idDist, duration, busLoad };
    }, []);

    const QUICK_CHIPS = useMemo(() => [
        { label: 'All',     filter: (_fr: DemoFrame) => true },
        { label: 'STD',     filter: (fr: DemoFrame) => fr.fmt === 'STD' },
        { label: 'EXT',     filter: (fr: DemoFrame) => fr.fmt === 'EXT' },
        { label: 'Errors',  filter: (fr: DemoFrame) => fr.status !== 'ok' },
        { label: 'Engine',  filter: (fr: DemoFrame) => fr.name.toLowerCase().includes('engine') },
        { label: 'UDS',     filter: (fr: DemoFrame) => fr.name.toLowerCase().includes('uds') || fr.name.toLowerCase().includes('ecu') },
    ], []);

    const searchResults = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const chipFn = activeChip ? QUICK_CHIPS.find(c => c.label === activeChip)?.filter : null;
        return DEMO_FRAMES.filter(fr => {
            const textMatch = !q || (
                fr.id.toLowerCase().includes(q) ||
                fr.name.toLowerCase().includes(q) ||
                fr.data.map(hex).join(' ').toLowerCase().includes(q) ||
                fr.fmt.toLowerCase().includes(q) ||
                fr.status.toLowerCase().includes(q)
            );
            const chipMatch = !chipFn || chipFn(fr);
            return textMatch && chipMatch;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, activeChip]);

    const handleFrameSelect = useCallback((idx: number) => {
        onSelect(idx);
        const fr = DEMO_FRAMES[idx];
        if (syncRef && fr) {
            syncRef.current.markedTs = fr.ts;
            const targetPhase = fr.ts / CAN_CYCLE_US;
            // Center the frame at 25% of the screen width
            // Screen width in cycles is timebase / CAN_CYCLE_US
            const screenWidthInCycles = timebase / CAN_CYCLE_US;
            const viewWidthInCycles = screenWidthInCycles / syncRef.current.zoom;
            syncRef.current.pan = targetPhase - syncRef.current.scroll - (0.25 * viewWidthInCycles);
            
            setOscState?.((s: OscState) => ({ ...s, running: false }));
        }
    }, [onSelect, syncRef, timebase, setOscState]);

    const handleRowKeyDown = useCallback((e: React.KeyboardEvent, idx: number) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleFrameSelect(idx);
        }
    }, [handleFrameSelect]);



    return (
        <div className="osc-decoder">
            <div className="osc-dec-wrap">
                {/* Header */}
                <div className="osc-dec-head">
                    <span className="osc-t">CAN Protocol Decoder</span>
                    {(['Frames', 'Errors', 'Statistics', 'Search', 'Reference'] as TabKey[]).map(t => (
                        <button 
                            key={t} 
                            className={`osc-dec-tab ${tab === t ? 'active' : ''} focus-ring-cyber`} 
                            onClick={() => setTab(t)}
                            role="tab"
                            aria-selected={tab === t}
                        >
                            {t}
                        </button>
                    ))}
                    <div className="osc-r">
                        <span className="osc-dec-stat">ISO 11898-2 · <b>500 kbit/s</b></span>
                        <span className="osc-dec-stat">Frames <b>{DEMO_FRAMES.length}</b></span>
                        <span className="osc-dec-stat">Errors <b className="text-[var(--danger)]">{stats.errCount + stats.warnCount}</b></span>
                        <span className="osc-dec-stat">Load <b>{stats.busLoad}%</b></span>
                    </div>
                </div>

                {/* ── FRAMES tab ───────────────────────────────────────────── */}
                {tab === 'Frames' && (
                    <div className="osc-dec-body">
                        <FrameTable 
                            frames={DEMO_FRAMES} 
                            selected={selected} 
                            onSelect={handleFrameSelect} 
                            onKeyDown={handleRowKeyDown}
                        />
                        <FrameInspector 
                            f={f} 
                            fields={fields} 
                            selected={selected} 
                            totalBits={totalBits} 
                            crc={crc} 
                            hovField={hovField} 
                            setHovField={setHovField} 
                            hov={hov}
                        />
                    </div>
                )}

                {/* ── ERRORS tab ───────────────────────────────────────────── */}
                {tab === 'Errors' && (
                    <div className="osc-dec-body full">
                        <div className="osc-err-wrap">
                            {/* Table */}
                            <div className="osc-err-table">
                                <div className="osc-row head">
                                    <span>#</span>
                                    <span>Timestamp</span>
                                    <span>CAN ID</span>
                                    <span>Name</span>
                                    <span>Error Type</span>
                                    <span>Data · Payload</span>
                                    <span>Action</span>
                                </div>

                                {errorFrames.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center flex-1 gap-2 p-8 text-[var(--ok)] font-mono text-[13px]">
                                        <span className="text-[24px]">✓</span>
                                        <span>No errors detected on bus</span>
                                    </div>
                                ) : errorFrames.map((fr, i) => {
                                    const origIdx = DEMO_FRAMES.indexOf(fr);
                                    const isWarn = fr.status === 'warn';
                                    return (
                                        <button key={i}
                                            type="button"
                                            className={`osc-row ${origIdx === selected ? 'selected' : ''} focus-ring-cyber`}
                                            onClick={() => handleFrameSelect(origIdx)}
                                            onKeyDown={(e) => handleRowKeyDown(e, origIdx)}
                                            aria-label={`Error Frame ${origIdx + 1}: ${fr.id}`}
                                            aria-selected={origIdx === selected}
                                        >
                                            <span className="osc-idx">{String(origIdx + 1).padStart(3, '0')}</span>
                                            <span>{(fr.ts / 1000).toFixed(3)} ms</span>
                                            <span className="osc-fid">{fr.id}</span>
                                            <span className="osc-truncate">{fr.name}</span>
                                            <span className={`osc-etype ${fr.status}`}>
                                                {isWarn ? '△  Unexpected payload' : '✕  CRC / No ACK'}
                                            </span>
                                            <span className="osc-bytes">{fr.data.map(hex).join(' ')}</span>
                                            <span className="osc-act">Click to inspect →</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Legend footer */}
                            <div className="osc-err-legend">
                                <span><span className="osc-text-danger">✕  CRC Err</span> — CRC-15 mismatch or missing ACK slot</span>
                                <span><span className="osc-text-warn">△  Warn</span> — Unexpected payload length or format</span>
                                <span className="ml-auto osc-text-ink">
                                    Total anomalies: <b>{errorFrames.length}</b>
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STATISTICS tab ───────────────────────────────────────── */}
                {tab === 'Statistics' && (
                    <div className="osc-dec-body full">
                        <StatisticsTab stats={stats} />
                    </div>
                )}

                {/* ── REFERENCE tab ────────────────────────────────────────── */}
                {tab === 'Reference' && (
                    <div className="osc-dec-body full no-scroll overflow-y-auto">
                        <ReferencePlots standalone={false} />
                    </div>
                )}
                {tab === 'Search' && (
                    <div className="osc-dec-body full">
                        <div className="osc-search-wrap">
                            {/* Search bar row */}
                            <div className="osc-search-bar">
                                <label>Search</label>
                                <input
                                    ref={searchInputRef}
                                    className="osc-search-input"
                                    type="text"
                                    placeholder="ID, name, hex data, format, status…"
                                    value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); setActiveChip(null); }}
                                    autoFocus
                                />
                                {searchQuery && (
                                    <button className="osc-search-clear" onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}>✕</button>
                                )}
                                <div className="osc-search-chips">
                                    {QUICK_CHIPS.map(c => (
                                        <button
                                            key={c.label}
                                            className={`osc-search-chip ${activeChip === c.label || (!activeChip && c.label === 'All') ? 'active' : ''} focus-ring-cyber`}
                                            onClick={() => { setActiveChip(c.label === 'All' ? null : c.label); setSearchQuery(''); }}
                                        >{c.label}</button>
                                    ))}
                                </div>
                                <span className="osc-search-count">
                                    {searchResults.length} / {DEMO_FRAMES.length} frames
                                </span>
                            </div>

                            {/* Full-width results table */}
                            {searchResults.length > 0 ? (
                                <div className="osc-search-table">
                                    <div className="osc-row head">
                                        <span>#</span>
                                        <span>Timestamp</span>
                                        <span>Format</span>
                                        <span>CAN ID</span>
                                        <span>DLC</span>
                                        <span>Data · Payload</span>
                                        <span>CRC</span>
                                        <span>Status</span>
                                    </div>
                                    {searchResults.map((fr, i) => {
                                        const frameCrc = Math.abs(fr.data.reduce((a, b) => a ^ b, 0xA5)) & 0x7FFF;
                                        const origIdx = DEMO_FRAMES.indexOf(fr);
                                        return (
                                            <button key={i}
                                                type="button"
                                                className={`osc-row ${origIdx === selected ? 'selected' : ''} focus-ring-cyber`}
                                                onClick={() => handleFrameSelect(origIdx)}
                                                onKeyDown={(e) => handleRowKeyDown(e, origIdx)}
                                                aria-label={`Result ${origIdx + 1}: ${fr.id}`}
                                                aria-selected={origIdx === selected}
                                            >
                                                <span className="osc-idx">{String(origIdx + 1).padStart(3, '0')}</span>
                                                <span>{(fr.ts / 1000).toFixed(3)} ms</span>
                                                <span>{fr.fmt === 'EXT' ? '29-bit EXT' : '11-bit STD'}</span>
                                                <span className="osc-fid">{fr.id}</span>
                                                <span>{fr.dlc}</span>
                                                <span className="osc-bytes">{fr.data.map(hex).join(' ')}</span>
                                                <span>0x{frameCrc.toString(16).toUpperCase().padStart(4, '0')}</span>
                                                <span className={`osc-st ${fr.status}`}>
                                                    {fr.status === 'ok' ? '✓ ACK' : fr.status === 'warn' ? '△ Warn' : '✕ CRC Err'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="osc-search-empty">
                                    <div className="osc-search-empty-icon">⊘</div>
                                    <div>No frames match <b>"{searchQuery || activeChip}"</b></div>
                                    <div className="osc-search-empty-sub">Try a different ID, hex byte, or clear the filter</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

// ── Statistics Tab ────────────────────────────────────────────────────────────

type ChartType = 'area' | 'line' | 'bar' | 'pie';

interface StatsData {
    total: number; okCount: number; warnCount: number; errCount: number;
    stdCount: number; extCount: number; avgDlc: number; totalBytes: number;
    idDist: [string, number][]; duration: number; busLoad: string;
}

// Deterministic time-series seeds (no Math.random at module scope)
const BL_SEED = Array.from({ length: 30 }, (_, i) =>
    10 + 5 * Math.sin(i * 0.5) + 3 * Math.cos(i * 0.8 + 1));
const FR_SEED = Array.from({ length: 30 }, (_, i) =>
    5 + 2.5 * Math.sin(i * 0.4 + 0.5) + 1.5 * Math.cos(i * 0.6));

const DLC_DIST = (() => {
    const m: Record<number, number> = {};
    DEMO_FRAMES.forEach(f => { m[f.dlc] = (m[f.dlc] || 0) + 1; });
    return [1, 2, 3, 4, 5, 6, 7, 8].map(d => ({ label: String(d), v: m[d] || 0 }));
})();

const STATUS_DIST = [
    { label: 'Valid',   v: DEMO_FRAMES.filter(f => f.status === 'ok').length,   color: 'var(--ok)' },
    { label: 'Warning', v: DEMO_FRAMES.filter(f => f.status === 'warn').length, color: 'var(--warn)' },
    { label: 'Error',   v: DEMO_FRAMES.filter(f => f.status === 'err').length,  color: 'var(--danger)' },
];

function mkPath(pts: { x: number; y: number }[]) {
    return pts.reduce((s, p, i) => {
        if (i === 0) return `M${p.x},${p.y}`;
        const q = pts[i - 1], mx = (p.x + q.x) / 2;
        return s + ` C${mx},${q.y} ${mx},${p.y} ${p.x},${p.y}`;
    }, '');
}

function arcPath(cx: number, cy: number, R: number, r: number, a0: number, a1: number) {
    const cos = Math.cos, sin = Math.sin, lg = a1 - a0 > Math.PI ? 1 : 0;
    return `M${cx + R * cos(a0)},${cy + R * sin(a0)} A${R},${R} 0 ${lg} 1 ${cx + R * cos(a1)},${cy + R * sin(a1)}`
        + ` L${cx + r * cos(a1)},${cy + r * sin(a1)} A${r},${r} 0 ${lg} 0 ${cx + r * cos(a0)},${cy + r * sin(a0)} Z`;
}

// Shared chart size hook
function useElemSize(ref: React.RefObject<HTMLDivElement | null>) {
    const [sz, setSz] = useState({ w: 0, h: 0 });
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const upd = () => setSz({ w: el.offsetWidth, h: el.offsetHeight });
        upd();
        const obs = new ResizeObserver(upd);
        obs.observe(el);
        return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return sz;
}

const GC = 'rgba(255,255,255,.06)';   // grid colour
const TC = 'rgba(255,255,255,.28)';   // tick label colour
const MONO = "'JetBrains Mono',monospace";

// ── Time-series chart (area + line) ──────────────────────────────────────────
const TimeSeriesChart: React.FC<{
    series: number[]; color: string; maxVal: number; unit: string; filled: boolean; label: string;
}> = ({ series, color, maxVal, unit, filled, label }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { w, h } = useElemSize(ref);
    const PL = 48, PR = 16, PT = 18, PB = 30;
    const iw = Math.max(1, w - PL - PR), ih = Math.max(1, h - PT - PB);
    const n = series.length;
    const pts = series.map((v, i) => ({
        x: PL + (i / (n - 1)) * iw,
        y: PT + (1 - Math.min(Math.max(v, 0), maxVal) / maxVal) * ih,
    }));
    const line = mkPath(pts);
    const area = line + ` L${pts[n - 1].x},${PT + ih} L${PL},${PT + ih} Z`;
    const gid = `sg-${label.replace(/\W/g, '')}`;
    const ySteps = [0, 25, 50, 75, 100];
    const xTicks = [0, 7, 14, 21, 29];

    return (
        <div ref={ref} className="osc-absolute osc-inset-0">
            {w > 0 && (
                <svg width={w} height={h}>
                    <defs>
                        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity=".45" />
                            <stop offset="100%" stopColor={color} stopOpacity=".02" />
                        </linearGradient>
                    </defs>
                    {/* Y grid */}
                    {ySteps.map(p => {
                        const y = PT + (1 - p / 100) * ih;
                        const v = (p / 100) * maxVal;
                        return (
                            <g key={p}>
                                <line x1={PL} y1={y} x2={PL + iw} y2={y} stroke={GC} />
                                <text x={PL - 6} y={y + 4} fill={TC} fontSize={9} textAnchor="end" fontFamily={MONO}>
                                    {v.toFixed(0)}{unit === ' fps' ? '' : '%'}
                                </text>
                            </g>
                        );
                    })}
                    {/* X grid */}
                    {xTicks.map(i => {
                        const x = PL + (i / (n - 1)) * iw;
                        return (
                            <g key={i}>
                                <line x1={x} y1={PT} x2={x} y2={PT + ih} stroke={GC} />
                                <text x={x} y={PT + ih + 18} fill={TC} fontSize={9} textAnchor="middle" fontFamily={MONO}>
                                    {i === 29 ? 'now' : `-${29 - i}s`}
                                </text>
                            </g>
                        );
                    })}
                    {/* Border box */}
                    <rect x={PL} y={PT} width={iw} height={ih} fill="none" stroke="rgba(255,255,255,.08)" />
                    {/* Area fill */}
                    {filled && <path d={area} fill={`url(#${gid})`} />}
                    {/* Line */}
                    <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
                    {/* Latest value */}
                    {pts.length > 0 && (() => {
                        const lp = pts[n - 1];
                        const val = series[n - 1].toFixed(1);
                        return (
                            <>
                                <circle cx={lp.x} cy={lp.y} r={7} fill={color} fillOpacity=".2" />
                                <circle cx={lp.x} cy={lp.y} r={3} fill={color} />
                                <rect x={lp.x - 28} y={lp.y - 20} width={56} height={16} rx={3}
                                    fill="rgba(0,0,0,.7)" stroke={color} strokeWidth="1" strokeOpacity=".6" />
                                <text x={lp.x} y={lp.y - 8} fill={color} fontSize={10} textAnchor="middle"
                                    fontFamily={MONO} fontWeight="bold">{val}{unit}</text>
                            </>
                        );
                    })()}
                    {/* Y-axis label */}
                    <text x={10} y={PT + ih / 2} fill={TC} fontSize={9} textAnchor="middle" fontFamily={MONO}
                        transform={`rotate(-90, 10, ${PT + ih / 2})`}>{label}</text>
                </svg>
            )}
        </div>
    );
};

// ── Bar chart (DLC distribution) ──────────────────────────────────────────────
const BarChart: React.FC<{ data: { label: string; v: number }[]; color: string }> = ({ data, color }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { w, h } = useElemSize(ref);
    const PL = 40, PR = 16, PT = 18, PB = 32;
    const iw = Math.max(1, w - PL - PR), ih = Math.max(1, h - PT - PB);
    const maxV = Math.max(...data.map(d => d.v), 1);
    const bw = iw / data.length;
    const BP = Math.max(4, bw * 0.18);
    const ySteps = Array.from({ length: maxV + 1 }, (_, i) => i);

    return (
        <div ref={ref} className="osc-absolute osc-inset-0">
            {w > 0 && (
                <svg width={w} height={h}>
                    {/* Y grid */}
                    {ySteps.map(v => {
                        const y = PT + (1 - v / maxV) * ih;
                        return (
                            <g key={v}>
                                <line x1={PL} y1={y} x2={PL + iw} y2={y} stroke={GC} strokeDasharray={v === 0 ? '' : '3,3'} />
                                <text x={PL - 6} y={y + 4} fill={TC} fontSize={9} textAnchor="end" fontFamily={MONO}>{v}</text>
                            </g>
                        );
                    })}
                    {/* Border */}
                    <rect x={PL} y={PT} width={iw} height={ih} fill="none" stroke="rgba(255,255,255,.08)" />
                    {/* Bars */}
                    {data.map((d, i) => {
                        const bh = (d.v / maxV) * ih;
                        const bx = PL + i * bw + BP;
                        const by = PT + ih - bh;
                        const barW = bw - BP * 2;
                        return (
                            <g key={i}>
                                {/* Background track */}
                                <rect x={bx} y={PT} width={barW} height={ih} fill={color} fillOpacity=".06" rx={2} />
                                {/* Value bar */}
                                {d.v > 0 && (
                                    <rect x={bx} y={by} width={barW} height={bh} fill={color} fillOpacity=".85" rx={2} />
                                )}
                                {/* Value label */}
                                {d.v > 0 && (
                                    <text x={bx + barW / 2} y={by - 5} fill={color} fontSize={10}
                                        textAnchor="middle" fontFamily={MONO} fontWeight="bold">{d.v}</text>
                                )}
                                {/* X label */}
                                <text x={bx + barW / 2} y={PT + ih + 18} fill={TC} fontSize={9}
                                    textAnchor="middle" fontFamily={MONO}>{d.label}</text>
                            </g>
                        );
                    })}
                    {/* X axis label */}
                    <text x={PL + iw / 2} y={h - 2} fill={TC} fontSize={9} textAnchor="middle" fontFamily={MONO}>
                        DLC (bytes)
                    </text>
                    {/* Y axis label */}
                    <text x={10} y={PT + ih / 2} fill={TC} fontSize={9} textAnchor="middle" fontFamily={MONO}
                        transform={`rotate(-90, 10, ${PT + ih / 2})`}>Frames</text>
                </svg>
            )}
        </div>
    );
};

// ── Donut pie chart (status) ──────────────────────────────────────────────────
const DonutChart: React.FC<{ data: { label: string; v: number; color: string }[] }> = ({ data }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { w, h } = useElemSize(ref);
    const total = data.reduce((s, d) => s + d.v, 0);
    const cx = w * 0.38, cy = h / 2;
    const R = Math.min(cx, cy) * 0.72, r = R * 0.55;

    let angle = -Math.PI / 2;
    const segs = data.map(d => {
        const sweep = total > 0 ? (d.v / total) * Math.PI * 2 : 0;
        const s = { ...d, a0: angle, a1: angle + sweep };
        angle += sweep;
        return s;
    });

    return (
        <div ref={ref} className="osc-absolute osc-inset-0">
            {w > 0 && (
                <svg width={w} height={h}>
                    {/* Donut segments */}
                    {segs.map((s, i) => (
                        s.v > 0 && (
                            <path key={i} d={arcPath(cx, cy, R, r, s.a0, s.a1)}
                                fill={s.color} fillOpacity=".88"
                                stroke="var(--bg)" strokeWidth="2" />
                        )
                    ))}
                    {/* Center total */}
                    <text x={cx} y={cy - 10} fill="var(--ink)" fontSize={22} fontWeight="bold"
                        textAnchor="middle" fontFamily={MONO}>{total}</text>
                    <text x={cx} y={cy + 8} fill={TC} fontSize={10}
                        textAnchor="middle" fontFamily={MONO}>frames</text>
                    {/* Legend on right */}
                    {segs.map((s, i) => {
                        const lx = w * 0.62, ly = cy - (segs.length - 1) * 22 + i * 44;
                        const pct = total > 0 ? Math.round(s.v / total * 100) : 0;
                        return (
                            <g key={i}>
                                <rect x={lx} y={ly - 10} width={12} height={12} rx={2} fill={s.color} fillOpacity=".88" />
                                <text x={lx + 18} y={ly} fill="var(--ink-dim)" fontSize={11} fontFamily={MONO}>{s.label}</text>
                                <text x={lx + 18} y={ly + 14} fill={s.color} fontSize={13} fontFamily={MONO} fontWeight="bold">
                                    {s.v} <tspan fontSize={10} fill={TC}>({pct}%)</tspan>
                                </text>
                            </g>
                        );
                    })}
                </svg>
            )}
        </div>
    );
};

// ── SVG toolbar icons ─────────────────────────────────────────────────────────
const IconArea = () => <svg viewBox="0 0 24 24"><polyline points="2 18 8 10 14 14 22 6" /><line x1="2" y1="18" x2="22" y2="18" /></svg>;
const IconLine = () => <svg viewBox="0 0 24 24"><polyline points="2 20 7 10 12 14 17 6 22 10" /></svg>;
const IconBar  = () => <svg viewBox="0 0 24 24"><rect x="3" y="12" width="4" height="9" rx="1" /><rect x="10" y="7" width="4" height="14" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" /></svg>;
const IconPie  = () => <svg viewBox="0 0 24 24"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>;

// ── Main StatisticsTab ────────────────────────────────────────────────────────
const StatisticsTab: React.FC<{ stats: StatsData }> = ({ stats }) => {
    const [chartType, setChartType] = useState<ChartType>('area');
    const [series, setSeries] = useState<number[]>(BL_SEED.slice());
    const [animKey, setAnimKey] = useState(0);

    // Live-update time series
    useEffect(() => {
        if (chartType !== 'area' && chartType !== 'line') return;
        const base = chartType === 'area' ? 12 : 5;
        const amp  = chartType === 'area' ? 5  : 2.5;
        const id = setInterval(() => {
            setSeries(prev => [...prev.slice(1), Math.max(0, base + (Math.random() - 0.5) * amp * 2)]);
        }, 900);
        return () => clearInterval(id);
    }, [chartType]);

    const handleChart = (type: ChartType) => {
        setChartType(type);
        setSeries(type === 'line' ? FR_SEED.slice() : BL_SEED.slice());
        setAnimKey(k => k + 1);
    };

    const CHART_BTNS: { type: ChartType; icon: React.ReactNode; label: string }[] = [
        { type: 'area', icon: <IconArea />, label: 'Bus Load' },
        { type: 'line', icon: <IconLine />, label: 'Frame Rate' },
        { type: 'bar',  icon: <IconBar />,  label: 'DLC Dist.' },
        { type: 'pie',  icon: <IconPie />,  label: 'Status' },
    ];

    return (
        <div className="osc-stats-wrap">
            {/* ── Left metrics panel ─────────────────────────────────────── */}
            <div className="osc-stats-left">
                {/* Frame Counts */}
                <div className="osc-stat-section">
                    <div className="osc-stat-sec-lbl">Frame Counts</div>
                    {[
                        { k: 'Total Frames',  v: String(stats.total),                                                         cls: 'osc-stat-v-ink',    pct: 100 },
                        { k: 'Valid (ACK)',    v: String(stats.okCount),                                                       cls: 'osc-stat-v-ok',     pct: (stats.okCount / stats.total) * 100 },
                        { k: 'Warnings',      v: String(stats.warnCount),                                                     cls: 'osc-stat-v-warn',   pct: (stats.warnCount / stats.total) * 100 },
                        { k: 'Errors',        v: String(stats.errCount),                                                      cls: 'osc-stat-v-danger', pct: (stats.errCount / stats.total) * 100 },
                        { k: 'Error Rate',    v: `${((stats.errCount / stats.total) * 100).toFixed(1)} %`,                    cls: stats.errCount > 0 ? 'osc-stat-v-danger' : 'osc-stat-v-ok', pct: 0 },
                    ].map(r => (
                        <div key={r.k}>
                            <div className="osc-stat-kv">
                                <span className="osc-stat-k">{r.k}</span>
                                <span className={`osc-stat-v ${r.cls}`}>{r.v}</span>
                            </div>
                            {r.pct > 0 && (
                                <div className="osc-stat-bar">
                                    <div className={`osc-stat-bar-fill ${r.cls.replace('-v-', '-bg-')}`} style={{ width: `${r.pct}%` }} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Bus Utilisation */}
                <div className="osc-stat-section">
                    <div className="osc-stat-sec-lbl">Bus Utilisation</div>
                    {[
                        { k: 'Bit Rate',       v: '500 kbit/s',                       cls: 'osc-stat-v-ink' },
                        { k: 'Bus Load',       v: `${stats.busLoad} %`,               cls: 'osc-stat-v-accent' },
                        { k: 'Capture Window', v: `${stats.duration.toFixed(2)} ms`,  cls: 'osc-stat-v-ink' },
                        { k: 'Total Bytes',    v: `${stats.totalBytes} B`,            cls: 'osc-stat-v-ink' },
                        { k: 'Avg DLC',        v: `${stats.avgDlc.toFixed(1)} B`,     cls: 'osc-stat-v-ink' },
                    ].map(r => (
                        <div key={r.k} className="osc-stat-kv">
                            <span className="osc-stat-k">{r.k}</span>
                            <span className={`osc-stat-v ${r.cls}`}>{r.v}</span>
                        </div>
                    ))}
                    <div className="osc-stat-bar osc-mt-6 osc-h-5">
                        <div className="osc-stat-bar-fill osc-bg-accent" style={{ width: `${stats.busLoad}%` }} />
                    </div>
                </div>

                {/* Frame Format */}
                <div className="osc-stat-section">
                    <div className="osc-stat-sec-lbl">Frame Format</div>
                    <div className="osc-stat-kv">
                        <span className="osc-stat-k">Standard (11-bit)</span>
                        <span className="osc-stat-v osc-stat-v-ch2">
                            {stats.stdCount} ({((stats.stdCount / stats.total) * 100).toFixed(0)}%)
                        </span>
                    </div>
                    <div className="osc-stat-kv">
                        <span className="osc-stat-k">Extended (29-bit)</span>
                        <span className="osc-stat-v osc-stat-v-ch1">
                            {stats.extCount} ({((stats.extCount / stats.total) * 100).toFixed(0)}%)
                        </span>
                    </div>
                    <div className="osc-stat-format-bar">
                        <div className="osc-bg-ch2 osc-br-3" style={{ flex: stats.stdCount }} />
                        <div className="osc-bg-ch1 osc-br-3" style={{ flex: stats.extCount }} />
                    </div>
                </div>

                {/* ID Distribution */}
                <div className="osc-stat-section">
                    <div className="osc-stat-sec-lbl">ID Frequency</div>
                    {stats.idDist.map(([id, cnt]) => (
                        <div key={id}>
                            <div className="osc-stat-kv">
                                <span className="osc-stat-k osc-stat-v-ch2">{id}</span>
                                <span className="osc-stat-v">{cnt} fr.</span>
                            </div>
                            <div className="osc-stat-bar">
                                <div className="osc-stat-bar-fill osc-bg-ch2"
                                    style={{ width: `${(cnt / stats.total) * 100}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Right chart panel ──────────────────────────────────────── */}
            <div className="osc-stats-right">
                {/* Toolbar */}
                <div className="osc-chart-toolbar">
                    <span className="osc-chart-toolbar-lbl">Chart</span>
                    {CHART_BTNS.map(({ type, icon, label }) => (
                        <button key={type}
                            className={`osc-chart-btn ${chartType === type ? 'active' : ''}`}
                            onClick={() => handleChart(type)}
                        >{icon}{label}</button>
                    ))}
                    <div className="osc-chart-toolbar-sep" />
                    <span className="osc-font-meta">
                        {chartType === 'area' ? 'Bus Load % · last 30 s' :
                         chartType === 'line' ? 'Frame Rate (fps) · last 30 s' :
                         chartType === 'bar'  ? 'DLC distribution · captured frames' :
                                                'Frame status breakdown'}
                    </span>
                </div>

                {/* Chart body */}
                <div className="osc-chart-body">
                    <div key={animKey} className="osc-chart-slide">
                        {chartType === 'area' && <TimeSeriesChart series={series} color="var(--chd)" maxVal={25} unit="%" filled label="Bus Load %" />}
                        {chartType === 'line' && <TimeSeriesChart series={series} color="var(--ch2)" maxVal={12} unit=" fps" filled={false} label="fps" />}
                        {chartType === 'bar'  && <BarChart data={DLC_DIST} color="var(--ch1)" />}
                        {chartType === 'pie'  && <DonutChart data={STATUS_DIST} />}
                    </div>
                </div>

                {/* Footer legend */}
                <div className="osc-chart-footer">
                    {(chartType === 'area' || chartType === 'line') && (
                        <>
                            <div className="osc-chart-leg">
                                <div className="osc-chart-leg-sw" style={{ background: chartType === 'area' ? 'var(--chd)' : 'var(--ch2)' }} />
                                {chartType === 'area' ? 'Bus Load' : 'Frame Rate'}
                            </div>
                            <span className="osc-stat-v-ink osc-opacity-50">1 s intervals · 30 s window</span>
                            <div className="osc-chart-live"><div className="osc-chart-live-dot" />Live</div>
                        </>
                    )}
                    {chartType === 'bar' && (
                        <>
                            <div className="osc-chart-leg">
                                <div className="osc-chart-leg-sw osc-bg-ch1 osc-br-2" style={{ height: 10, width: 10 }} />
                                Frames per DLC value
                            </div>
                            <span className="osc-stat-v-ink osc-opacity-50">{DEMO_FRAMES.length} total frames captured</span>
                        </>
                    )}
                    {chartType === 'pie' && STATUS_DIST.map(s => (
                        <div key={s.label} className="osc-chart-leg">
                            <div className="osc-chart-leg-dot" style={{ background: s.color }} />
                            {s.label}: {s.v}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
