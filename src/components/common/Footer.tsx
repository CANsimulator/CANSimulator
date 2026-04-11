/**
 * Footer Component
 * Refined to match the udssimulator.com aesthetic.
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
    Eye,
    Heart
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useCookieConsent } from '../../context/CookieContext';
import { cn } from '../../utils/cn';
import { supabase } from '../../config/supabase';
import { BorderBeam } from '../ui/BorderBeam';

const Footer: React.FC = () => {
    useCookieConsent();
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
                const { data, error } = await supabase.rpc('track_page_visit', { p_visitor_id: visitorId });
                if (!error && data) {
                    setSiteStats(data as { total_views: number; unique_visitors: number });
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
        <footer className="relative mt-20 pt-1 border-t border-cyan-500/20 dark:border-cyan-500/10 bg-white/80 dark:bg-dark-950 backdrop-blur-xl overflow-hidden font-sans">
            {!shouldReduceMotion && <BorderBeam size={400} duration={12} delay={0} />}
            
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-cyan-500/10 dark:bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-purple-500/10 dark:bg-purple-500/5 blur-[120px] rounded-full pointer-events-none translate-y-1/2" />

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
                                    <div className="absolute inset-0 bg-cyan-500/40 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="relative w-12 h-12 rounded-xl border border-cyan-500/30 bg-white dark:bg-slate-900 flex items-center justify-center group-hover:border-cyan-400 group-hover:scale-105 transition-all duration-300 shadow-lg">
                                        <img
                                            src={logoUrl}
                                            alt="CAN Simulator"
                                            className="w-8 h-8"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">
                                        CAN<span className="text-cyan-600 dark:text-cyan-400">Sim</span>
                                    </span>
                                    <span className="text-[10px] font-mono text-cyan-600/60 dark:text-cyan-400/50 tracking-[0.2em] font-bold">INSTRUMENT_NODE</span>
                                </div>
                            </Link>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium opacity-80 border-l-2 border-cyan-500/20 pl-4">
                                High-fidelity CAN & CAN FD bus simulation. Professional tools for automotive communication engineering and UDS protocol validation.
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
                                    className="p-2.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-white dark:hover:bg-cyan-500/10 transition-all border border-slate-200 dark:border-white/5 hover:border-cyan-500/40 relative group"
                                    aria-label={social.label}
                                >
                                    <social.icon className="w-5 h-5 relative z-10" />
                                </a>
                            ))}
                        </motion.div>
                    </div>

                    {/* Navigation Clusters (mimicking udssimulator.com) */}
                    <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-4 gap-8">
                        {/* Column 2: ECOSYSTEM */}
                        <motion.div variants={itemVariants} className="space-y-6">
                            <h3 className="text-xs font-mono font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                                ECOSYSTEM
                            </h3>
                            <ul className="space-y-3">
                                {([
                                    { label: 'UDS Simulator', href: 'https://udssimulator.com' },
                                    { label: 'AI ASIL Analyser', href: 'https://github.com/suduli' },
                                    { label: 'CAnalyzerAI', href: 'https://github.com/suduli/CAnalyzerAI' },
                                    { label: 'CAN Metrics', to: '/metrics' }
                                ] as FooterLinkProps[]).map((l) => (
                                    <li key={l.label}>
                                        <FooterLink {...l} accent="cyan" />
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* Column 3: SIMULATOR */}
                        <motion.div variants={itemVariants} className="space-y-6">
                            <h3 className="text-xs font-mono font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                                SIMULATOR
                            </h3>
                            <ul className="space-y-3">
                                {([
                                    { label: 'ECU Simulator', to: '/simulator' },
                                    { label: 'Learn CAN', to: '/docs' },
                                    { label: 'Cluster View', to: '/simulator/cluster' },
                                    { label: 'vs Vector CANoe', to: '/compare' }
                                ] as FooterLinkProps[]).map((l) => (
                                    <li key={l.label}>
                                        <FooterLink {...l} accent="cyan" />
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* Column 4: SERVICES/UDS */}
                        <motion.div variants={itemVariants} className="space-y-6">
                            <h3 className="text-xs font-mono font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                                PROTOCOL
                            </h3>
                            <ul className="space-y-3">
                                {([
                                    { label: '0x10 Diagnostic', to: '/docs/0x10' },
                                    { label: '0x22 Read Data', to: '/docs/0x22' },
                                    { label: '0x27 Security', to: '/docs/0x27' },
                                    { label: '0x3E Tester Present', to: '/docs/0x3E' }
                                ] as FooterLinkProps[]).map((l) => (
                                    <li key={l.label}>
                                        <FooterLink {...l} accent="purple" />
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* Column 5: SUPPORT */}
                        <motion.div variants={itemVariants} className="space-y-6">
                            <h3 className="text-xs font-mono font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                SUPPORT
                            </h3>
                            <ul className="space-y-3">
                                {([
                                    { label: 'About Project', to: '/about' },
                                    { label: 'Privacy Policy', to: '/privacy-policy' },
                                    { label: 'Terms of Ops', to: '/terms' },
                                    { label: 'Donate', to: '/donate', accent: 'pink', icon: Heart }
                                ] as FooterLinkProps[]).map((l) => (
                                    <li key={l.label}>
                                        <FooterLink {...l} />
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Footer Bottom Bar (Styled as a diagnostic panel) */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-20 pt-8 border-t border-slate-300/40 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-8"
                >
                    <div className="flex flex-col sm:flex-row items-center gap-4 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-500 tracking-[0.1em] order-2 md:order-1">
                        <p className="uppercase">© {currentYear} SUDULI RESEARCH. ALL RIGHTS RESERVED.</p>
                    </div>

                    {/* Center Diagnostics Pill (Matches udssimulator.com) */}
                    {siteStats && (
                        <div className="flex items-center gap-4 bg-slate-100/80 dark:bg-white/5 px-6 py-2.5 rounded-full border border-slate-300/40 dark:border-white/10 shadow-inner order-1 md:order-2">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-mono text-[11px] font-bold">
                                <Activity className="w-3.5 h-3.5 text-cyan-500" />
                                <span className="opacity-50">DIAG_STATS:</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5" title="Total page views">
                                    <Eye className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                                    <span className="text-[11px] font-mono font-black text-slate-800 dark:text-white">{siteStats.total_views.toLocaleString()}</span>
                                </div>
                                <div className="w-px h-3 bg-slate-300 dark:bg-white/10" />
                                <div className="flex items-center gap-1.5" title="Unique visitors">
                                    <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    <span className="text-[11px] font-mono font-black text-slate-800 dark:text-white">{siteStats.unique_visitors.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-[10px] font-mono font-black uppercase tracking-widest text-slate-400 dark:text-white/30 order-3">
                        <span className="text-cyan-600/60 dark:text-cyan-400/40">REACT 19</span>
                        <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/10" />
                        <span className="text-purple-600/60 dark:text-purple-400/40">TS 5.9</span>
                        <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/10" />
                        <span className="text-emerald-600/60 dark:text-emerald-400/40">TAILWIND</span>
                    </div>
                </motion.div>
            </div>

            {/* Background Corner Brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500/20 pointer-events-none" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500/20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500/20 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/20 pointer-events-none" />
        </footer>
    );
};

// --- Helper Components ---

interface FooterLinkProps {
    label: string;
    to?: string;
    href?: string;
    accent?: 'cyan' | 'purple' | 'emerald' | 'pink';
    icon?: any;
}

const FooterLink: React.FC<FooterLinkProps> = ({ label, to, href, accent = 'cyan', icon: Icon }) => {
    const accentClasses = {
        cyan: "hover:text-cyan-600 dark:hover:text-cyan-400 group-hover:bg-cyan-500",
        purple: "hover:text-purple-600 dark:hover:text-purple-400 group-hover:bg-purple-500",
        emerald: "hover:text-emerald-600 dark:hover:text-emerald-400 group-hover:bg-emerald-500",
        pink: "hover:text-pink-600 dark:hover:text-pink-400 group-hover:bg-pink-500"
    };

    const linkContent = (
        <span className={cn(
            "text-sm text-slate-600 dark:text-slate-400 transition-colors flex items-center gap-2 group font-semibold",
            accentClasses[accent]
        )}>
            <span className={cn(
                "w-1 h-1 rounded-full bg-slate-200 dark:bg-white/10 transition-colors",
                accentClasses[accent].split(' ').pop()
            )} />
            {label}
            {Icon && <Icon className="w-3.5 h-3.5 ml-1 opacity-80" />}
        </span>
    );

    if (to) return <Link to={to}>{linkContent}</Link>;
    if (href) return <a href={href} target="_blank" rel="noopener noreferrer">{linkContent}</a>;
    return linkContent;
};

export default Footer;

