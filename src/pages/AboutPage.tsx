import React from 'react';
import { motion } from 'framer-motion';

export const AboutPage: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto px-4 py-20 space-y-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4"
            >
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black gradient-text tracking-tighter uppercase italic">Engineering the Future of CAN</h1>
                <p className="text-xl text-gray-400 font-medium">High-fidelity Simulation for the Automotive Industry</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-panel p-8 space-y-4">
                    <h3 className="text-cyber-blue font-bold uppercase tracking-widest text-sm">Our Mission</h3>
                    <p className="text-gray-300 leading-relaxed text-sm">
                        CAN Simulator was founded to democratize access to high-fidelity automotive network testing. 
                        We believe that learning the intricacies of ISO 11898 and CAN FD shouldn't require 
                        expensive hardware or proprietary software.
                    </p>
                </div>
                <div className="glass-panel p-8 space-y-4">
                    <h3 className="text-cyber-purple font-bold uppercase tracking-widest text-sm">The Technology</h3>
                    <p className="text-gray-300 leading-relaxed text-sm font-mono">
                        {'>'} React 19 / TypeScript 5.9<br/>
                        {'>'} Real-time Bus Arbitration Simulation<br/>
                        {'>'} Eye Diagram Signal Analysis<br/>
                        {'>'} WCAG 2.1 AAA Accessibility
                    </p>
                </div>
            </div>

            <section className="glass-panel p-10 text-center space-y-6">
                <h2 className="text-2xl font-bold uppercase tracking-tight">Open Source & Community</h2>
                <p className="text-gray-400 max-w-2xl mx-auto text-sm">
                    This project is part of the suduli ecosystem. Join 5,000+ engineers worldwide learning 
                    about UDS and CAN protocols through our interactive simulators.
                </p>
                <div className="flex justify-center gap-4">
                    <a href="https://github.com/suduli/CANSimulator" target="_blank" rel="noreferrer" className="cyber-button">
                        View on GitHub
                    </a>
                </div>
            </section>
        </div>
    );
};
