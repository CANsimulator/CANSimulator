import React from 'react';

export const LegalPage: React.FC<{ title: string }> = ({ title }) => {
    return (
        <div className="max-w-3xl mx-auto px-4 py-20 space-y-8">
            <h1 className="text-4xl font-black gradient-text tracking-tighter uppercase">{title}</h1>
            <div className="glass-panel p-8 space-y-6 text-gray-300 text-sm leading-relaxed font-mono">
                <p>[SECTION 1: DATA TRANSMISSION]</p>
                <p>All CAN frame data generated within this simulator stays within your local browser context unless explicitly shared via the export tools.</p>
                <p>[SECTION 2: DIAGNOSTIC SECURITY]</p>
                <p>This simulator does not provide real-world vehicle access and should not be used for illegal bypass of automotive security systems.</p>
                <p>[SECTION 3: LIMITATION OF LIABILITY]</p>
                <p>SUDULI RESEARCH is not responsible for any damage to physical ECU hardware if connected via third-party bridges.</p>
            </div>
        </div>
    );
};
