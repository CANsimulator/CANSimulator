import React, { useState } from 'react';
import { canSimulator } from '../../services/can/can-simulator';
import { CANFDHandler } from '../../services/can/can-fd-handler';
import { lengthToDlc } from '../../types/can';
import { CyberButton } from '../ui/CyberButton';
import { cn } from '../../utils/cn';

export const CANFrameBuilder: React.FC = () => {
    const [id, setId] = useState<string>('7DF');
    const [dataStr, setDataStr] = useState<string>('02 01 0D 00 00 00 00 00');
    const [isFD, setIsFD] = useState<boolean>(false);
    const [brs, setBrs] = useState<boolean>(true);

    const parseBytes = (): Uint8Array =>
        new Uint8Array(
            dataStr.split(' ').filter(x => x.length > 0).map(x => parseInt(x, 16))
        );

    const handleSend = (): void => {
        try {
            const numericId = parseInt(id, 16);
            const data = parseBytes();

            if (isFD) {
                void CANFDHandler.sendFD(numericId, data, brs);
            } else {
                void canSimulator.broadcast({
                    id: numericId,
                    dlc: Math.min(data.length, 8),
                    data: data.slice(0, 8),
                    type: 'STANDARD',
                    timestamp: Date.now(),
                });
            }
        } catch {
            console.error('Invalid frame data');
        }
    };

    const byteCount = dataStr.split(' ').filter(x => x).length;

    return (
        <div className="glass-panel p-6 space-y-4 border-cyber-blue/30 relative overflow-hidden">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-cyber-blue uppercase tracking-tighter">Frame Builder</h3>
                <div className="flex bg-dark-950 p-1 rounded-md border border-white/5">
                    <button
                        onClick={() => setIsFD(false)}
                        className={cn('px-3 py-1 text-xs rounded transition-all', !isFD ? 'bg-cyber-blue text-dark-950 font-bold' : 'text-gray-500')}
                    >
                        CLASSIC
                    </button>
                    <button
                        onClick={() => setIsFD(true)}
                        className={cn('px-3 py-1 text-xs rounded transition-all', isFD ? 'bg-cyber-purple text-white font-bold' : 'text-gray-500')}
                    >
                        CAN FD
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase font-mono">Message ID (Hex)</label>
                    <input
                        value={id}
                        onChange={e => setId(e.target.value.toUpperCase())}
                        className="w-full bg-dark-950 border border-white/10 rounded px-3 py-2 text-cyber-blue font-mono focus:border-cyber-blue outline-none transition-colors"
                        placeholder="7DF"
                    />
                </div>
                {isFD && (
                    <div className="flex flex-col justify-end pb-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={brs} onChange={e => setBrs(e.target.checked)} className="accent-cyber-purple" />
                            <span className="text-[10px] text-cyber-purple uppercase font-mono">Bit Rate Switch (BRS)</span>
                        </label>
                    </div>
                )}
            </div>

            <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase font-mono">Payload (Hex Bytes)</label>
                <textarea
                    value={dataStr}
                    onChange={e => setDataStr(e.target.value.toUpperCase())}
                    rows={2}
                    className="w-full bg-dark-950 border border-white/10 rounded px-3 py-2 text-gray-300 font-mono focus:border-cyber-blue outline-none transition-colors resize-none"
                    placeholder="01 02 03..."
                />
                <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-gray-600">LEN: {byteCount} BYTES</span>
                    <span className="text-gray-600">DLC: {lengthToDlc(byteCount)}</span>
                </div>
            </div>

            <CyberButton onClick={handleSend} variant={isFD ? 'secondary' : 'primary'} className="w-full">
                {isFD ? 'SEND FD FRAME' : 'SEND CLASSIC FRAME'}
            </CyberButton>
        </div>
    );
};
