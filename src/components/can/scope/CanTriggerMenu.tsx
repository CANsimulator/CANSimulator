import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OscState } from './types';

type SetState = React.Dispatch<React.SetStateAction<OscState>>;

interface CanTriggerMenuProps {
    isOpen: boolean;
    state: OscState;
    setState: SetState;
    onClose: () => void;
}

const XIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const TargetIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
    </svg>
);

export const CanTriggerMenu: React.FC<CanTriggerMenuProps> = ({ isOpen, state, setState, onClose }) => {
    const cfg = state.trig.canTrigger;
    if (!cfg) return null;

    const updateCfg = (patch: Partial<typeof cfg>) => {
        setState(s => ({
            ...s,
            trig: {
                ...s.trig,
                canTrigger: { ...s.trig.canTrigger!, ...patch }
            }
        }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: 15, scale: 0.95, filter: 'blur(4px)' }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="osc-trig-menu"
                >
                    {/* Header */}
                    <div className="osc-trig-header">
                        <div>
                            <div className="osc-trig-title-wrap">
                                <div className="osc-trig-dot" />
                                <span className="osc-trig-title">
                                    CAN Protocol Trigger
                                </span>
                            </div>
                            <div className="osc-trig-sub">
                                Advanced Pattern Detection
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="osc-trig-close"
                            aria-label="Close menu"
                        >
                            <XIcon />
                        </button>
                    </div>

                    {/* Trigger Type Segmented Control */}
                    <div className="osc-trig-tabs">
                        {(['ID', 'Error', 'Payload'] as const).map(t => {
                            const isActive = cfg.type === t;
                            return (
                                <button
                                    key={t}
                                    onClick={() => updateCfg({ type: t })}
                                    className={`osc-trig-tab ${isActive ? 'active' : ''}`}
                                >
                                    {t}
                                </button>
                            );
                        })}
                    </div>

                    {/* Configuration Area */}
                    <div className="osc-trig-body">
                        
                        <AnimatePresence mode="wait">
                            {cfg.type === 'ID' && (
                                <motion.div 
                                    key="id"
                                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                                    className="osc-trig-field"
                                >
                                    <label className="osc-trig-lbl id">
                                        <TargetIcon /> Target CAN ID
                                    </label>
                                    <div className="osc-trig-input-wrap">
                                        <span className="osc-trig-pre">0x</span>
                                        <input
                                            type="text"
                                            value={cfg.targetID}
                                            onChange={e => updateCfg({ targetID: e.target.value.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 8) })}
                                            className="osc-trig-input"
                                            placeholder="0C9"
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {cfg.type === 'Error' && (
                                <motion.div 
                                    key="error"
                                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                                    className="osc-trig-field"
                                >
                                    <label className="osc-trig-lbl err">Protocol Fault</label>
                                    <div className="osc-trig-grid">
                                        {(['Any', 'CRC', 'Form', 'Stuff'] as const).map(err => {
                                            const isSelected = cfg.errorType === err;
                                            return (
                                                <button
                                                    key={err}
                                                    onClick={() => updateCfg({ errorType: err })}
                                                    className={`osc-trig-btn ${isSelected ? 'active' : ''}`}
                                                >
                                                    {err === 'Any' ? 'ANY ERROR' : `${err.toUpperCase()} ERR`}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}

                            {cfg.type === 'Payload' && (
                                <motion.div 
                                    key="payload"
                                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                                    className="osc-trig-field"
                                >
                                    <label className="osc-trig-lbl pay">
                                        <TargetIcon /> Data Pattern Match
                                    </label>
                                    <input
                                        type="text"
                                        value={cfg.payloadPattern}
                                        onChange={e => updateCfg({ payloadPattern: e.target.value.toUpperCase().replace(/[^0-9A-F\s]/g, '') })}
                                        className="osc-trig-input-pay"
                                        placeholder="AA FF 00"
                                    />
                                    <div className="osc-trig-hint">
                                        Enter space-separated hexadecimal bytes. Trigger fires when this exact sequence is detected in the data payload.
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

