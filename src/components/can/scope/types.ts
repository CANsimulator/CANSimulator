export interface OscChannel {
    on: boolean;
    vpd: number;
    off: number;
}

export interface OscState {
    running: boolean;
    timebase: number;
    axisOffsetY: number;
    channels: {
        h: OscChannel;
        l: OscChannel;
        d: OscChannel;
    };
    trig: {
        source: 'CH1' | 'CH2' | 'DIFF';
        mode: 'Edge' | 'Pulse' | 'Level';
        level: number;
        sweep: 'Auto' | 'Normal' | 'Single';
    };
}

export interface OscMeas {
    vppH: number;
    vppL: number;
    vppD: number;
    freq: number;
    rmsD: number;
    rise: number;
    fall: number;
}

export interface DemoFrame {
    id: string;
    fmt: 'STD' | 'EXT';
    dlc: number;
    data: number[];
    ts: number;
    status: 'ok' | 'warn' | 'err';
    name: string;
}

export type SignalType = 'can' | 'sine' | 'square' | 'noisy';
export type LayoutType = 'standard' | 'knobs';
export type ThemeType = 'industrial' | 'phosphor' | 'light';
export type DensityType = 'comfortable' | 'compact';
