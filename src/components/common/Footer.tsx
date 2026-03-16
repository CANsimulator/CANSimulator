/**
 * Footer Component
 * Ported from UDS-SIMULATION and adapted for CAN-Simulator
 */
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Github, Linkedin, FileText, ArrowRight, Shield, Eye, Users } from 'lucide-react';
import { useCookieConsent } from '../../context/CookieContext';
import { supabase } from '../../config/supabase';

// Optional: Import modal if needed later
// const CookiePreferenceModal = lazy(() => import('./CookiePreferenceModal').then(m => ({ default: m.CookiePreferenceModal })));

const Footer: React.FC = () => {
    useCookieConsent();
    const [, setIsCookieSettingsOpen] = useState(false);
    const currentYear = new Date().getFullYear();
    const location = useLocation();
    const [siteStats, setSiteStats] = useState<{ total_views: number; unique_visitors: number } | null>(null);
    const trackedPaths = useRef(new Set<string>());

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
                // Silently fail if DB is down or RPC missing
            }
        };
        trackVisit();
    }, [location.pathname]);

    const projects = [
        {
            title: 'UDS Protocol Simulator',
            url: 'https://uds-simulator.com'
        },
        {
            title: 'CAnalyzerAI',
            url: 'https://github.com/suduli/CAnalyzerAI'
        }
    ];

    return (
        <>
            <footer className="relative mt-32 border-t border-gray-200 dark:border-white/10 bg-white/70 dark:bg-dark-950/40 backdrop-blur-xl overflow-hidden rounded-t-[2.5rem]">
                {/* Cyber Gradient Accent */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />

                {/* Ambient Background Glows */}
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-cyan-500/10 dark:bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/10 dark:bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />

                <div className="max-w-7xl mx-auto px-8 py-20 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-16 lg:gap-24">
                        {/* Brand Section */}
                        <div className="md:col-span-5 space-y-8">
                            <Link to="/" className="inline-flex items-center gap-3 group">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                                    <div className="relative p-2.5 rounded-xl shadow-xl shadow-cyan-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 border bg-light-100 border-light-200 dark:bg-dark-800 dark:border-dark-700">
                                        <div className="w-6 h-6 rounded bg-gradient-to-br from-cyber-blue to-cyber-purple flex items-center justify-center font-black text-black text-[10px]">C</div>
                                    </div>
                                </div>
                                <span className="text-2xl font-black text-gray-950 dark:text-white tracking-tighter uppercase italic">
                                    CAN<span className="text-cyan-600">Sim</span>
                                </span>
                            </Link>
                            <p className="text-gray-900 dark:text-gray-400 text-base leading-relaxed max-w-sm font-medium dark:font-normal opacity-90">
                                Engineering the future of automotive bus simulation. High-fidelity environments for CAN and CAN FD protocol development and education.
                            </p>
                            <div className="flex gap-4">
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
                                        className="p-3 rounded-xl bg-gray-100/80 dark:bg-white/5 text-gray-800 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-white hover:bg-white dark:hover:bg-cyan-500/20 transition-all border border-gray-200 dark:border-white/5 hover:border-cyan-300 dark:hover:border-cyan-500/30 hover:shadow-lg"
                                        aria-label={social.label}
                                    >
                                        <social.icon className="w-5 h-5" />
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Navigation Columns */}
                        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-12">
                            <div className="space-y-6">
                                <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                    Ecosystem
                                </h3>
                                <ul className="space-y-4">
                                    {projects.map((p) => (
                                        <li key={p.title}>
                                            <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-800 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors flex items-center gap-2 group font-semibold">
                                                {p.title}
                                                <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all font-bold" />
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                    Resources
                                </h3>
                                <ul className="space-y-4">
                                    <li>
                                        <a href="/docs" className="text-sm text-gray-800 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-semibold">
                                            Documentation
                                        </a>
                                    </li>
                                    <li>
                                        <Link to="/simulator" className="text-sm text-gray-800 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-semibold">
                                            CAN Simulator
                                        </Link>
                                    </li>
                                    <li>
                                        <a href="/docs/iso-11898" className="text-sm text-gray-800 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-semibold">
                                            Standard Specs
                                        </a>
                                    </li>
                                </ul>
                            </div>

                            <div className="space-y-6 col-span-2 sm:col-span-1">
                                <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Support
                                </h3>
                                <ul className="space-y-4">
                                    {[
                                        { label: 'About Us', to: '/about' },
                                        { label: 'Contact', to: '/contact' },
                                        { label: 'Privacy Policy', to: '/privacy-policy' },
                                        { label: 'Terms of Use', to: '/terms' }
                                    ].map((l) => (
                                        <li key={l.label}>
                                            <Link to={l.to} className="text-sm text-gray-800 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-2 font-semibold">
                                                {l.label}
                                            </Link>
                                        </li>
                                    ))}
                                    <li>
                                        <button
                                            onClick={() => setIsCookieSettingsOpen(true)}
                                            className="text-sm text-gray-800 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors flex items-center gap-2 font-semibold"
                                        >
                                            Cookie Settings
                                            <Shield className="w-3.5 h-3.5" />
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Footer Bottom Bar */}
                    <div className="mt-24 pt-10 border-t border-gray-200 dark:border-white/5 flex flex-col lg:flex-row justify-between items-center gap-8">
                        <div className="flex flex-col sm:flex-row items-center gap-6 text-xs text-gray-950 dark:text-gray-500 font-bold tracking-tight">
                            <p className="uppercase">© {currentYear} SUDULI RESEARCH. ALL RIGHTS RESERVED.</p>

                            {siteStats && (
                                <div className="flex items-center gap-4 bg-gray-100/50 dark:bg-white/5 px-4 py-2 rounded-full border border-gray-200 dark:border-white/10 shadow-sm relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent -translate-x-[150%] animate-[scan_2s_ease-in-out_infinite]" />
                                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-400 font-semibold" title="Total page views">
                                        <Eye className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-500" />
                                        <span>{siteStats.total_views.toLocaleString()}</span>
                                    </div>
                                    <div className="w-px h-3 bg-gray-300 dark:bg-white/10" />
                                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-400 font-semibold" title="Unique visitors">
                                        <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                        <span>{siteStats.unique_visitors.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-900/60 dark:text-white/50">
                            <span>React 19</span>
                            <span>TypeScript 5.9</span>
                            <span>Tailwind CSS</span>
                        </div>
                    </div>
                </div>

                {/* Background Decorative Pattern */}
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[120px] rounded-full -mr-32 -mb-32" />
            </footer>
        </>
    );
};

export default Footer;
