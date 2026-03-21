import React, { useState } from 'react';
import { canSimulator } from '../../services/can/can-simulator';
import { CANFDHandler } from '../../services/can/can-fd-handler';
import { lengthToDlc } from '../../types/can';
import { CyberButton } from '../ui/CyberButton';
import { cn } from '../../utils/cn';
import { CANValidation } from '../../services/can/validation';

export const CANFrameBuilder: React.FC = () => {
    const [id, setId] = useState<string>('7DF');
    const [dataStr, setDataStr] = useState<string>('02 01 0D 00 00 00 00 00');
    const [isFD, setIsFD] = useState<boolean>(false);
    const [brs, setBrs] = useState<boolean>(true);
    const [errors, setErrors] = useState<{ msgId?: string; payload?: string; send?: string }>({});
    
    // Re-validate when FD mode changes
    React.useEffect(() => {
        const result = CANValidation.validateMsgId(id, isFD);
        setErrors(prev => ({ ...prev, msgId: result.error }));
    }, [isFD, id]);

    const parseBytes = (): Uint8Array =>
        new Uint8Array(
            dataStr.split(' ').filter(x => x.length > 0).map(x => parseInt(x, 16))
        );

    const handleSend = async (): Promise<void> => {
        try {
            const idValidation = CANValidation.validateMsgId(id, isFD); // In this UI, FD implies Extended ID
            const payloadValidation = CANValidation.validatePayload(dataStr, isFD);

            if (!idValidation.isValid || !payloadValidation.isValid) {
                setErrors({
                    msgId: idValidation.error,
                    payload: payloadValidation.error
                });
                return;
            }

            setErrors({});
            const numericId = parseInt(id, 16);
            const data = parseBytes();

            if (isFD) {
                await CANFDHandler.sendFD(numericId, data, brs);
            } else {
                await canSimulator.broadcast({
                    id: numericId,
                    dlc: Math.min(data.length, 8),
                    data: data.slice(0, 8),
                    type: 'STANDARD',
                    timestamp: Date.now(),
                });
            }
        } catch (err) {
            setErrors({ send: 'Failed to send frame. Check your inputs.' });
            console.error('Invalid frame data', err);
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
                    <label htmlFor="frame-msg-id" className="text-[10px] text-gray-500 uppercase font-mono cursor-pointer">Message ID (Hex)</label>
                    <input
                        id="frame-msg-id"
                        value={id}
                        onChange={e => {
                           const val = e.target.value.toUpperCase();
                           if (val && !/^[0-9A-F]*$/.test(val)) return;
                           const result = CANValidation.validateMsgId(val, isFD);
                           setErrors(prev => ({ ...prev, msgId: result.error, send: undefined }));
                           setId(val);
                        }}
                        className={cn(
                            "w-full bg-dark-950 border rounded px-3 py-2 text-cyber-blue font-mono outline-none transition-colors",
                            errors.msgId ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-cyber-blue"
                        )}
                        placeholder="7DF"
                        maxLength={isFD ? 8 : 3}
                    />
                    {errors.msgId && <p className="text-red-400 text-[10px] font-mono leading-tight">{errors.msgId}</p>}
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
                <label htmlFor="frame-payload" className="text-[10px] text-gray-500 uppercase font-mono cursor-pointer">Payload (Hex Bytes)</label>
                <textarea
                    id="frame-payload"
                    value={dataStr}
                    onChange={e => {
                        const val = e.target.value.toUpperCase();
                        const stripped = val.replace(/\s/g, '');
                        if (stripped && !/^[0-9A-F]*$/.test(stripped)) return;
                        
                        const result = CANValidation.validatePayload(val, isFD);
                        setErrors(prev => ({ ...prev, payload: result.error, send: undefined }));
                        setDataStr(val);
                    }}
                    rows={2}
                    className={cn(
                        "w-full bg-dark-950 border rounded px-3 py-2 text-gray-300 font-mono outline-none transition-colors resize-none",
                        errors.payload ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-cyber-blue"
                    )}
                    placeholder="01 02 03..."
                />
                {errors.payload && <p className="text-red-400 text-[10px] font-mono leading-tight">{errors.payload}</p>}
                <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-gray-600">LEN: {byteCount} BYTES</span>
                    <span className="text-gray-600">DLC: {lengthToDlc(byteCount)}</span>
                </div>
            </div>

            <div className="space-y-2">
                <CyberButton onClick={handleSend} variant={isFD ? 'secondary' : 'primary'} className="w-full">
                    {isFD ? 'SEND FD FRAME' : 'SEND CLASSIC FRAME'}
                </CyberButton>
                {errors.send && <p className="text-red-400 text-xs text-center font-mono animate-pulse">{errors.send}</p>}
            </div>
        </div>
    );
};
