import React, { useRef, useEffect } from 'react';
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

// Validation Helper Functions
export const validateCanId = (idStr: string) => {
    if (!idStr) return { isValid: false, message: 'CAN ID is required', type: 'error' as const };
    const num = parseInt(idStr, 16);
    if (isNaN(num)) return { isValid: false, message: 'Invalid hex format', type: 'error' as const };
    if (num > 0x1FFFFFFF) return { isValid: false, message: 'Max 0x1FFFFFFF (29-bit)', type: 'error' as const };
    if (num > 0x7FF) return { isValid: true, message: 'Extended ID (29-bit)', type: 'extended' as const };
    return { isValid: true, message: 'Standard ID (11-bit)', type: 'standard' as const };
};

export const validatePayloadPattern = (pattern: string) => {
    const trimmed = pattern.trim();
    if (!trimmed) return { isValid: false, message: 'Pattern is empty', type: 'info' as const };
    const bytes = trimmed.split(/\s+/);
    if (bytes.length > 8) {
        return { isValid: false, message: 'Max 8 bytes for Classical CAN', type: 'error' as const };
    }
    for (const b of bytes) {
        if (b.length !== 2) {
            return { isValid: false, message: `Incomplete byte "${b}" (must be 2 digits)`, type: 'error' as const };
        }
    }
    return { isValid: true, message: `${bytes.length} Byte${bytes.length > 1 ? 's' : ''} matched`, type: 'success' as const };
};

export const CanTriggerMenu: React.FC<CanTriggerMenuProps> = ({ isOpen, state, setState, onClose }) => {
    const cfg = state.trig.canTrigger;
    const inputRef = useRef<HTMLInputElement>(null);

    // Interactive arming and feedback simulation states
    const [isArming, setIsArming] = React.useState(false);
    const [isArmedSuccess, setIsArmedSuccess] = React.useState(false);
    const [syncStep, setSyncStep] = React.useState('READY');

    // Reset arming states on tab switch for robust UI context
    useEffect(() => {
        setIsArming(false);
        setIsArmedSuccess(false);
        setSyncStep('READY');
    }, [cfg?.type]);

    // Auto-focus primary input element when trigger menu is active or when switching tabs
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 60);
            return () => clearTimeout(timer);
        }
    }, [isOpen, cfg?.type]);

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

    // Real-time validations
    const idValidation = validateCanId(cfg.targetID);
    const payloadValidation = validatePayloadPattern(cfg.payloadPattern);

    const isFormValid = cfg.type === 'Error' || 
        (cfg.type === 'ID' && idValidation.isValid) || 
        (cfg.type === 'Payload' && payloadValidation.isValid);

    // Simulated high-fidelity hardware arming sequence
    const handleArmTrigger = () => {
        if (!isFormValid || isArming || isArmedSuccess) return;
        setIsArming(true);
        setSyncStep('ESTABLISHING RX MASK...');
        
        setTimeout(() => {
            setSyncStep('SYNCING SIGNAL PATTERN...');
        }, 300);

        setTimeout(() => {
            setSyncStep('TRIGGER LOGIC ACTIVE.');
        }, 600);

        setTimeout(() => {
            setIsArming(false);
            setIsArmedSuccess(true);
            
            // Apply armed state: Shift sweep to 'Normal' to represent active arming on the scope sidebar!
            setState(st => ({
                ...st,
                trig: {
                    ...st.trig,
                    sweep: 'Normal'
                }
            }));
        }, 900);

        setTimeout(() => {
            setIsArmedSuccess(false);
            onClose(); // Auto-closes dialog after successfully displaying visual feedback
        }, 1700);
    };

    // Dynamic cyber colors for button glow/gradients matching active trigger categories
    const getThemeColors = () => {
        switch (cfg.type) {
            case 'Error':
                return {
                    grad: 'linear-gradient(90deg, #ff2a2a, #ff4c4c)',
                    border: '#ff2a2a',
                    glow: '0 0 15px rgba(255, 42, 42, 0.4)',
                };
            case 'Payload':
                return {
                    grad: 'linear-gradient(90deg, #bf00ff, #d64eff)',
                    border: '#bf00ff',
                    glow: '0 0 15px rgba(191, 0, 255, 0.4)',
                };
            case 'ID':
            default:
                return {
                    grad: 'linear-gradient(90deg, #06e8f9, #00f3ff)',
                    border: '#06e8f9',
                    glow: '0 0 15px rgba(6, 232, 249, 0.4)',
                };
        }
    };
    const colors = getThemeColors();

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: 15, scale: 0.95, filter: 'blur(4px)' }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="osc-trig-menu"
                    role="dialog"
                    aria-modal="true"
                    aria-label="CAN Protocol Trigger Configuration"
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
                            className="osc-trig-close focus-ring-cyber"
                            aria-label="Close menu"
                        >
                            <XIcon />
                        </button>
                    </div>

                    {/* Trigger Type Segmented Control */}
                    <div className="osc-trig-tabs" role="tablist">
                        {(['ID', 'Error', 'Payload'] as const).map(t => {
                            const isActive = cfg.type === t;
                            return (
                                <button
                                    key={t}
                                    role="tab"
                                    aria-selected={isActive}
                                    onClick={() => updateCfg({ type: t })}
                                    className={`osc-trig-tab focus-ring-cyber ${isActive ? 'active' : ''}`}
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
                                    initial={{ opacity: 0, y: 5 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    exit={{ opacity: 0, y: -5 }}
                                    className="osc-trig-field"
                                >
                                    <div className="flex items-center justify-between">
                                        <label htmlFor="can-id-input" className="osc-trig-lbl id">
                                            <TargetIcon /> Target CAN ID
                                        </label>
                                        
                                        {/* Status Badge */}
                                        <span 
                                            className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                                idValidation.isValid 
                                                    ? idValidation.type === 'extended' 
                                                        ? 'bg-[var(--ch2)]/20 text-[var(--ch2)] border border-[var(--ch2)]/30' 
                                                        : 'bg-[var(--ch1)]/20 text-[var(--ch1)] border border-[var(--ch1)]/30'
                                                    : 'bg-[var(--danger)]/20 text-[var(--danger)] border border-[var(--danger)]/30'
                                            }`}
                                        >
                                            {idValidation.message}
                                        </span>
                                    </div>
                                    <div className="osc-trig-input-wrap">
                                        <span className="osc-trig-pre">0x</span>
                                        <input
                                            id="can-id-input"
                                            ref={inputRef}
                                            type="text"
                                            value={cfg.targetID}
                                            onChange={e => updateCfg({ targetID: e.target.value.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 8) })}
                                            className="osc-trig-input"
                                            placeholder="0C9"
                                            aria-invalid={!idValidation.isValid}
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {cfg.type === 'Error' && (
                                <motion.div 
                                    key="error"
                                    initial={{ opacity: 0, y: 5 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    exit={{ opacity: 0, y: -5 }}
                                    className="osc-trig-field"
                                >
                                    <label className="osc-trig-lbl err">Protocol Fault</label>
                                    <div className="osc-trig-grid" role="group" aria-label="Error Type Selection">
                                        {(['Any', 'CRC', 'Form', 'Stuff'] as const).map(err => {
                                            const isSelected = cfg.errorType === err;
                                            return (
                                                <button
                                                    key={err}
                                                    type="button"
                                                    onClick={() => updateCfg({ errorType: err })}
                                                    className={`osc-trig-btn focus-ring-cyber ${isSelected ? 'active' : ''}`}
                                                    aria-pressed={isSelected}
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
                                    initial={{ opacity: 0, y: 5 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    exit={{ opacity: 0, y: -5 }}
                                    className="osc-trig-field"
                                >
                                    <div className="flex items-center justify-between">
                                        <label htmlFor="payload-pattern-input" className="osc-trig-lbl pay">
                                            <TargetIcon /> Data Pattern Match
                                        </label>
                                        
                                        {/* Status Badge */}
                                        <span 
                                            className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                                payloadValidation.isValid 
                                                    ? 'bg-[var(--chd)]/20 text-[var(--chd)] border border-[var(--chd)]/30' 
                                                    : payloadValidation.type === 'info' 
                                                        ? 'bg-[var(--ink-faint)]/20 text-[var(--ink-faint)] border border-[var(--ink-faint)]/30' 
                                                        : 'bg-[var(--danger)]/20 text-[var(--danger)] border border-[var(--danger)]/30'
                                            }`}
                                        >
                                            {payloadValidation.message}
                                        </span>
                                    </div>
                                    <input
                                        id="payload-pattern-input"
                                        ref={inputRef}
                                        type="text"
                                        value={cfg.payloadPattern}
                                        onChange={e => updateCfg({ payloadPattern: e.target.value.toUpperCase().replace(/[^0-9A-F\s]/g, '') })}
                                        className="osc-trig-input-pay focus:border-[var(--ch2)] focus:ring-1 focus:ring-[var(--ch2)]"
                                        placeholder="AA FF 00"
                                        aria-invalid={!payloadValidation.isValid}
                                    />
                                    <div className="osc-trig-hint">
                                        Enter space-separated hexadecimal bytes. Trigger fires when this exact sequence is detected in the data payload.
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Action Area & Live Hardware Feedback */}
                    <div className="osc-trig-footer" aria-live="polite" role="status">
                        {isArming ? (
                            <div className="osc-trig-status-anim">
                                <div className="osc-trig-progress-bar">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: '100%' }}
                                        transition={{ duration: 0.8, ease: 'easeInOut' }}
                                        className="osc-trig-progress-fill"
                                        style={{ background: colors.border, boxShadow: `0 0 10px ${colors.border}` }}
                                    />
                                </div>
                                <span className="osc-trig-status-text" style={{ color: colors.border }}>
                                    {syncStep}
                                </span>
                            </div>
                        ) : isArmedSuccess ? (
                            <motion.div 
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="osc-trig-status-success"
                            >
                                <span className="osc-trig-success-text">
                                    TRIGGER ARMED & READY ✓
                                </span>
                            </motion.div>
                        ) : (
                            <button
                                type="button"
                                disabled={!isFormValid}
                                onClick={handleArmTrigger}
                                className={`osc-trig-arm-btn focus-ring-cyber ${!isFormValid ? 'disabled' : ''}`}
                                style={{
                                    background: isFormValid ? colors.grad : undefined,
                                    borderColor: isFormValid ? colors.border : undefined,
                                    boxShadow: isFormValid ? colors.glow : undefined,
                                }}
                                aria-label="Arm selected CAN Protocol trigger condition"
                            >
                                Arm Protocol Trigger
                            </button>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};


