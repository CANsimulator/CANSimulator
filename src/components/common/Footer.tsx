/**
 * Footer Component
 * Refined to match the CAN Simulator aesthetic.
 * Cyber-Technical "Diagnostic" interface.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
    Github, 
    Linkedin, 
    FileText, 
    Activity, 
    Users, 
    Eye
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { supabase } from '../../config/supabase';
import { BorderBeam } from '../ui/BorderBeam';

const Footer: React.FC = () => {
    const logoUrl = `${import.meta.env.BASE_URL}branding/can-simulator-logo-d-icon.svg`;
    const currentYear = new Date().getFullYear();
    const location = useLocation();
    const [siteStats, setSiteStats] = useState<{ total_views: number; unique_visitors: number } | null>(null);
    const trackedPaths = useRef(new Set<string>());
    const shouldReduceMotion = useReducedMotion();

    useEffect(() => {
        if (trackedPaths.current.has(location.pathname)) return;
        trackedPaths.current.add(location.pathname);

        let visitorId = localStorage.getItem('can_visitor_id');
        if (!visitorId) {
            visitorId = crypto.randomUUID();
            localStorage.setItem('can_visitor_id', visitorId);
        }

        const trackVisit = async () => {
            try {
                if (supabase) {
                    const { data, error } = await supabase.rpc('track_page_visit', { p_visitor_id: visitorId });
                    if (!error && data) {
                        setSiteStats(data as { total_views: number; unique_visitors: number });
                    }
                }
            } catch {
                // Silently fail
            }
        };
        trackVisit();
    }, [location.pathname]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { 
                staggerChildren: 0.05,
                delayChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <footer className="relative mt-20 pt-1 border-t border-cyber-blue/20 bg-white/80 dark:bg-dark-950 backdrop-blur-xl overflow-hidden font-sans">
            {!shouldReduceMotion && <BorderBeam size={400} duration={12} delay={0} />}
            
            <div className="max-w-7xl mx-auto px-6 md:px-8 py-20 relative z-10">
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8"
                >
                    {/* Column 1: Brand & Identity */}
                    <div className="lg:col-span-3 space-y-6">
                        <motion.div variants={itemVariants} className="space-y-4">
                            <Link to="/" className="inline-flex items-center gap-4 group">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-cyber-blue/40 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="relative w-12 h-12 rounded-xl border border-cyber-blue/30 bg-white dark:bg-dark-900 flex items-center justify-center group-hover:border-cyber-blue group-hover:scale-105 transition-all duration-300">
                                        <img
                                            src={logoUrl}
                                            alt="CAN Simulator"
                                            className="w-8 h-8"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">
                                        CAN<span className="text-cyber-blue">SIM</span>
                                    </span>
                                    <span className="text-[10px] font-mono text-cyber-blue/60 tracking-[0.2em] font-bold">INSTRUMENT_NODE</span>
                                </div>
                            </Link>
                            <p className="text-slate-600 dark:text-gray-400 text-sm leading-relaxed font-bold opacity-80 border-l-2 border-cyber-blue pl-4 italic">
                                Professional tools for automotive communication engineering and UDS protocol validation.
                            </p>
                        </motion.div>

                        <motion.div variants={itemVariants} className="flex gap-4">
                            {[
                                { icon: Github, url: 'https://github.com/suduli', label: 'GitHub' },
                                { icon: Linkedin, url: 'https://www.linkedin.com/in/suduli/', label: 'LinkedIn' },
                                { icon: FileText, url: 'https://suduli.github.io/Suduli_Resume/', label: 'Resume' }
                            ].map((social) => (
                                <a
                                    key={social.label}
                                    href={social.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-cyber-blue hover:bg-white dark:hover:bg-cyber-blue/10 transition-all border border-transparent hover:border-cyber-blue/40"
                                    aria-label={social.label}
                                >
                                    <social.icon className="w-5 h-5" />
                                </a>
                            ))}
                        </motion.div>
                    </div>

                    {/* Navigation Columns */}
                    <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-4 gap-8">
                        <motion.div variants={itemVariants} className="space-y-6">
                            <h3 className="text-xs font-black text-dark-950 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2 italic">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyber-blue shadow-[0_0_8px_rgba(0,243,255,0.8)]" />
                                ECOSYSTEM
                            </h3>
                            <ul className="space-y-3">
                                <FooterItem label="UDS Simulator" href="https://udssimulator.com" />
                                <FooterItem label="Network Map" to="/contact" />
                                <FooterItem label="Fault Analysis" to="/errors" />
                                <FooterItem label="Performance" to="/simulator" />
                            </ul>
                        </motion.div>

                        <motion.div variants={itemVariants} className="space-y-6">
                            <h3 className="text-xs font-black text-dark-950 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2 italic">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyber-purple shadow-[0_0_8px_rgba(191,0,255,0.8)]" />
                                SIMULATOR
                            </h3>
                            <ul className="space-y-3">
                                <FooterItem label="ECU Simulation" to="/simulator" />
                                <FooterItem label="Bit-Level Ctrl" to="/inspector" />
                                <FooterItem label="Signal Matrix" to="/signals" />
                                <FooterItem label="Pricing" to="/pricing" />
                            </ul>
                        </motion.div>

                        <motion.div variants={itemVariants} className="space-y-6">
                            <h3 className="text-xs font-black text-dark-950 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2 italic">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyber-emerald shadow-[0_0_8px_rgba(0,255,159,0.8)]" />
                                PROTOCOL
                            </h3>
                            <ul className="space-y-3">
                                <FooterItem label="ISO 11898-1" to="/physical" />
                                <FooterItem label="Arbitration" to="/arbitration" />
                                <FooterItem label="ISO 15765-2" to="/generations" />
                                <FooterItem label="ISO 14229-1" to="/about" />
                            </ul>
                        </motion.div>

                        <motion.div variants={itemVariants} className="space-y-6">
                            <h3 className="text-xs font-black text-dark-950 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2 italic">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyber-pink shadow-[0_0_8px_rgba(255,0,111,0.8)]" />
                                SUPPORT
                            </h3>
                            <ul className="space-y-3">
                                <FooterItem label="About Us" to="/about" />
                                <FooterItem label="Contact" to="/contact" />
                                <FooterItem label="Privacy" to="/privacy-policy" />
                                <FooterItem label="Terms" to="/terms" />
                            </ul>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Footer Bottom */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-20 pt-8 border-t border-dark-900/10 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-8"
                >
                    <div className="text-[10px] font-black text-gray-500 tracking-widest uppercase italic">
                        © {currentYear} SUDULI RESEARCH. ALL RIGHTS RESERVED.
                    </div>

                    {siteStats && (
                        <div className="flex items-center gap-6 bg-gray-100 dark:bg-white/5 px-6 py-2.5 rounded-full border border-gray-200 dark:border-white/10">
                            <div className="flex items-center gap-2 text-[10px] font-black text-cyber-blue">
                                <Activity size={12} />
                                DEPLOY_ONLINE
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <Eye size={12} className="text-gray-500" />
                                    <span className="text-[10px] font-mono font-black text-dark-950 dark:text-white">{siteStats.total_views}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Users size={12} className="text-gray-500" />
                                    <span className="text-[10px] font-mono font-black text-dark-950 dark:text-white">{siteStats.unique_visitors}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-4 text-[10px] font-black text-gray-400 dark:text-white/20 tracking-widest uppercase">
                        <span>R19.1</span>
                        <span>TS5.9</span>
                        <span>VITE7</span>
                    </div>
                </motion.div>
            </div>
        </footer>
    );
};

const FooterItem = ({ label, to, href }: { label: string; to?: string; href?: string }) => {
    const content = (
        <span className="text-[11px] font-black text-gray-500 hover:text-cyber-blue transition-colors uppercase tracking-widest flex items-center gap-2 group">
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-white/10 group-hover:bg-cyber-blue transition-colors" />
            {label}
        </span>
    );

    if (to) return <Link to={to}>{content}</Link>;
    if (href) return <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
    return content;
};

export default Footer;
