/**
 * Landing Page - Welcome to CAN Protocol Simulator
 * A visually stunning introduction to the simulator
 */

import { lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from '../context/ThemeContext';
import { cn } from '../utils/cn';
import { useIsMobile } from '../hooks/useIsMobile';

// Dynamically imported components to reduce LCP / initial load footprint
const Particles = lazy(() => import('../components/magicui/Particles'));
const Meteors = lazy(() => import('../components/magicui/Meteors').then(m => ({ default: m.Meteors })));
const Marquee = lazy(() => import('../components/magicui/Marquee'));
const ShinyButton = lazy(() => import('../components/magicui/ShinyButton'));
const ShineBorder = lazy(() => import('../components/magicui/ShineBorder'));
const CyberStatCard = lazy(() => import('../components/ui/CyberStatCard').then(m => ({ default: m.CyberStatCard })));
const PricingTeaser = lazy(() => import('../components/ui/PricingTeaser').then(m => ({ default: m.PricingTeaser })));

import {
    Sparkles,
    Shield,
    Zap,
    ArrowRight,
    Cpu,
    Activity,
    Network,
    GraduationCap,
    TestTube
} from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { useABTest } from '../hooks/useABTest';
import { trackCTAClick, trackConversion } from '../utils/analytics';


export const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const isMobile = useIsMobile();
    const prefersReducedMotion = useReducedMotion();

    // Reduced-motion-safe animation props
    const fadeUp = prefersReducedMotion
        ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
        : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };
    const fadeScale = prefersReducedMotion
        ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
        : { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } };

    // Analytics tracking
    useAnalytics('landing_page');

    // A/B testing for primary CTA
    const ctaTest = useABTest({
        testName: 'hero_cta_button',
        variants: {
            A: { text: 'Launch Simulator', color: 'from-cyber-blue to-blue-600', link: '/simulator' },
            B: { text: 'Try It Now', color: 'from-cyber-green to-green-600', link: '/simulator' }
        }
    });

    const handleCTAClick = (button: string, location: string) => {
        trackCTAClick(button, location);
        trackConversion('landing_page');
        ctaTest.trackVariantEvent('cta_click', { button, location });
    };

    const features = [
        {
            icon: Cpu,
            title: 'CAN FD Support',
            description: 'Simulate high-speed data transmission up to 64 bytes with Flexible Data Rate',
            gradient: 'from-cyber-purple to-purple-800',
            accent: isDark ? 'cyber-purple' : 'purple-900'
        },
        {
            icon: Activity,
            title: 'Bus Arbitration',
            description: 'Visualize message priority and bit-wise arbitration in real-time',
            gradient: 'from-cyber-blue to-blue-800',
            accent: isDark ? 'cyber-blue' : 'blue-900'
        },
        {
            icon: TestTube,
            title: 'Error Injection',
            description: 'Test robust behavior with simulated bit errors, CRC errors, and ACK failures',
            gradient: 'from-cyber-green to-green-800',
            accent: isDark ? 'cyber-green' : 'green-950'
        },
        {
            icon: Network,
            title: 'Multi-Node Network',
            description: 'Complex network simulation with multiple ECUs communicating simultaneously',
            gradient: 'from-cyber-pink to-pink-800',
            accent: isDark ? 'cyber-pink' : 'rose-950'
        },
        {
            icon: GraduationCap,
            title: 'Embedded Learning',
            description: 'Interactive guides for understanding bit-stuffing, framing, and timing',
            gradient: 'from-amber-600 to-orange-800',
            accent: isDark ? 'yellow-400' : 'amber-900'
        },
        {
            icon: Zap,
            title: 'Modern Architecture',
            description: 'Built with React 19, TypeScript 5.9, and microsecond precision timing',
            gradient: 'from-indigo-600 to-violet-900',
            accent: isDark ? 'indigo-400' : 'indigo-900'
        }
    ];

    const stats = [
        { label: 'Protocols Supported', value: 'CAN / FD', icon: Cpu },
        { label: 'Standard Compliant', value: 'ISO 11898', icon: Shield },
        { label: 'Hardware Cost', value: '$0', icon: Zap }
    ];

    const glassSurface = isDark
        ? "bg-white/5 hover:bg-white/10"
        : "bg-white/80 hover:bg-white/95 shadow-[0_12px_32px_rgba(15,23,42,0.08)]";

    return (
        <div className="min-h-screen bg-light-50 dark:bg-dark-900 selection:bg-cyber-blue/30 relative">
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className={cn(
                    "absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyber-blue/5 dark:bg-cyber-blue/10 blur-[120px] rounded-full",
                    !prefersReducedMotion && "animate-float-slow"
                )} />
                <div className={cn(
                    "absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyber-purple/5 dark:bg-cyber-purple/10 blur-[150px] rounded-full",
                    !prefersReducedMotion && "animate-float"
                )} />
            </div>

            <div className="cyber-grid opacity-20 dark:opacity-40" />

            {!isMobile && !prefersReducedMotion && (
                <Suspense fallback={null}>
                    <Particles
                        className="absolute inset-0 z-0 opacity-40 dark:opacity-100"
                        quantity={50}
                        staticity={30}
                        ease={50}
                        refresh={theme === 'dark'}
                    />
                </Suspense>
            )}

            <div className="scanline" aria-hidden="true" />

            <div className="relative z-10 font-sans">
                <div id="landing-hero-container" className="overflow-hidden relative">
                    {/* Hero Section */}
                    <div className="container mx-auto px-4 py-16 md:py-24 lg:py-32">
                        <div className="text-center max-w-7xl mx-auto">
                            <motion.div
                                {...fadeScale}
                                transition={prefersReducedMotion ? undefined : { delay: 0.2 }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 dark:bg-cyber-blue/10 border border-blue-500/20 dark:border-cyber-blue/30 mb-8"
                            >
                                <span className={cn("text-sm font-black flex items-center gap-2", isDark ? "text-cyber-blue" : "text-blue-900")}>
                                    <Sparkles size={14} className={isDark ? "text-cyber-blue" : "text-blue-900"} aria-hidden="true" />
                                    Next-Gen Bus Simulation
                                </span>
                            </motion.div>
                            
                            {!isMobile && !prefersReducedMotion && (
                                <Suspense fallback={null}>
                                    <Meteors number={15} className="opacity-35 dark:opacity-90 bg-slate-100 dark:bg-slate-500/30" />
                                </Suspense>
                            )}

                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black mb-10 leading-[0.85] tracking-tighter uppercase italic">
                                <span className={cn("gradient-text", !prefersReducedMotion && "animate-gradient-shift")}>
                                    MASTER THE
                                </span>
                                <br />
                                <span className="text-dark-900 dark:text-white">
                                    CAN BUS GRID
                                </span>
                            </h1>

                             <motion.p
                                 {...fadeUp}
                                 transition={prefersReducedMotion ? undefined : { duration: 0.6, delay: 0.1 }}
                                 className="text-2xl sm:text-3xl text-light-800 dark:text-gray-300 mb-12 max-w-4xl mx-auto font-black leading-tight tracking-tight italic"
                             >
                                 Why invest in expensive hardware interfaces? Simulate complex{' '}
                                 <span className={isDark ? "text-cyber-blue font-black" : "text-blue-900 font-extrabold"}>CAN and CAN FD</span> networks instantly in your browser. Engineering-grade fidelity at $0 cost.
                             </motion.p>

                             <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                                <div className="w-full sm:w-[240px]">
                                    <Suspense fallback={<div className="w-full h-14 bg-white/10 backdrop-blur rounded-lg animate-pulse" />}>
                                        <ShinyButton 
                                            onClick={() => {
                                                handleCTAClick(ctaTest.value.text, 'hero');
                                                navigate(ctaTest.value.link);
                                            }}
                                            className="w-full h-14 text-sm font-black tracking-widest shadow-neon-cyan active:scale-95 transition-transform uppercase italic"
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                {ctaTest.value.text}
                                                <ArrowRight size={18} strokeWidth={3} />
                                            </div>
                                        </ShinyButton>
                                    </Suspense>
                                </div>

                                 <motion.button
                                    onClick={() => window.open("https://github.com/suduli", "_blank", "noopener,noreferrer")}
                                    whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                                    whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                                    className="w-full sm:w-[240px] h-14 flex items-center justify-center bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-cyber-blue/30 text-dark-900 dark:text-cyber-blue font-black text-sm uppercase tracking-widest rounded-lg hover:border-cyber-blue transition-all duration-300 shadow-sm"
                                >
                                    GitHub Repository
                                </motion.button>
                            </div>
                        </div>
                    </div>

                    {/* Tech Marquee */}
                    <section aria-label="Supported Protocols" className="py-12 relative z-10 overflow-hidden border-y border-gray-200 dark:border-white/5 bg-white/50 dark:bg-dark-950/20 backdrop-blur-sm">
                        <Suspense fallback={null}>
                            <Marquee pauseOnHover className="[--duration:25s]">
                                {[
                                    'CAN 2.0A', 'CAN 2.0B', 'CAN FD', 'ISO 11898-1', 'SAE J1939', 'ISO 15765-2'
                                ].map((tech) => (
                                    <div key={tech} className="mx-12 text-5xl font-black text-gray-300 dark:text-white/10 italic tracking-tighter uppercase whitespace-nowrap hover:text-cyber-blue dark:hover:text-white/30 transition-all duration-500">
                                        {tech}
                                    </div>
                                ))}
                            </Marquee>
                        </Suspense>
                    </section>

                    {/* Stats Section */}
                    <section aria-label="Simulator Statistics" className="container mx-auto px-4 py-24 relative z-10">
                        <ul className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto" role="list">
                            {stats.map((stat, index) => (
                                <li key={stat.label}>
                                    <Suspense fallback={<div className="h-[260px] w-full rounded-3xl bg-white/5 animate-pulse" />}>
                                        <CyberStatCard
                                            value={stat.value}
                                            label={stat.label}
                                            icon={stat.icon}
                                            delay={0.2 + index * 0.15}
                                        />
                                    </Suspense>
                                </li>
                            ))}
                        </ul>
                    </section>

                     {/* Features Section */}
                    <section aria-label="Core Capabilities" className="container mx-auto px-4 py-12 md:py-20 lg:py-32 relative z-10">
                        <div className="text-center mb-12 sm:mb-20">
                            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black mb-8 italic gradient-text tracking-tighter uppercase leading-[0.9]">
                                ENGINEERING GRADE<br />CAPABILITIES
                            </h2>
                            <p className="text-xl sm:text-2xl font-black text-light-600 dark:text-gray-400 max-w-3xl mx-auto leading-tight italic">
                                High-precision simulation catering to automotive engineers and students alike.
                            </p>
                        </div>

                        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto" role="list">
                             {features.map((feature, index) => {
                                 const featureLinks: Record<string, string> = {
                                     'CAN FD Support': '/simulator',
                                     'Bus Arbitration': '/arbitration',
                                     'Error Injection': '/errors',
                                     'Multi-Node Network': '/physical',
                                     'Embedded Learning': '/signals',
                                     'Modern Architecture': '/contact'
                                 };
                                 const link = featureLinks[feature.title] || '/simulator';

                                  return (
                                     <li key={feature.title} className="h-full">
                                         <div 
                                             onClick={() => navigate(link)}
                                             role="button"
                                             tabIndex={0}
                                             onKeyDown={(e) => e.key === 'Enter' && navigate(link)}
                                             className={cn(
                                                 "cyber-glass p-8 md:p-10 group cursor-pointer rounded-[3rem] border-2 transition-all duration-500 block h-full",
                                                 isDark ? "border-white/5" : `border-gray-100`,
                                                 `hover:border-cyber-blue/40`,
                                                 glassSurface,
                                             )}
                                         >
                                             <motion.div
                                                 initial={prefersReducedMotion ? undefined : { opacity: 0, y: 30 }}
                                                 whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                                                 viewport={{ once: true }}
                                                 transition={prefersReducedMotion ? undefined : { delay: index * 0.1 }}
                                             >
                                                 <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-xl mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                                                     <feature.icon size={40} strokeWidth={2.5} className="text-white" />
                                                 </div>
                                                 <h3 className="text-3xl font-black text-dark-900 dark:text-white mb-4 tracking-tighter uppercase italic">{feature.title}</h3>
                                                 <p className="text-lg font-bold text-light-500 dark:text-gray-400 leading-snug">{feature.description}</p>
                                             </motion.div>
                                         </div>
                                     </li>
                                 );
                             })}
                        </ul>
                    </section>

                     {/* Bus Trace Preview Section */}
                    <section className="container mx-auto px-4 py-12 md:py-20 lg:py-32 relative z-10">
                        <motion.div
                            initial={prefersReducedMotion ? undefined : { opacity: 0 }}
                            whileInView={prefersReducedMotion ? undefined : { opacity: 1 }}
                            viewport={{ once: true }}
                            className="max-w-6xl mx-auto"
                        >
                            <Suspense fallback={<div className="w-full bg-white/5 animate-pulse rounded-[3.5rem] h-96"></div>}>
                                <ShineBorder
                                    borderRadius={56}
                                    borderWidth={2}
                                    duration={12}
                                    color={['#00f3ff', '#bd00ff', '#00ff9f']}
                                    className="w-full max-w-none p-0 bg-transparent"
                                >
                                    <div className={cn("cyber-glass p-6 sm:p-10 lg:p-16 rounded-[3.5rem] border-0 w-full", glassSurface)}>
                                        <div className="text-center mb-12 sm:mb-16">
                                            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-light-600 dark:text-white tracking-tighter uppercase italic leading-[0.9]">
                                                BUS TRACE ANALYTICS
                                            </h2>
                                            <p className="text-xl sm:text-2xl font-black text-light-400 dark:text-gray-400 italic">
                                                Microsecond precision trace analysis with real-time arbitration visualization.
                                            </p>
                                        </div>

                                        <div className="bg-dark-950 rounded-[2.5rem] p-6 sm:p-10 border border-white/10 shadow-3xl relative overflow-hidden font-mono">
                                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                                                <div className="flex gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                                </div>
                                                <div className="text-[11px] text-gray-500 uppercase tracking-widest flex items-center gap-4">
                                                    <span>NODE_COUNT: 04</span>
                                                    <span>BUS_LOAD: 12.4%</span>
                                                    <span>V1.2.0-CANFD</span>
                                                </div>
                                            </div>

                                            <div className="space-y-4 text-xs sm:text-sm" role="list" aria-label="Real-time bus frame trace">
                                                {[
                                                    { time: '0.000142', id: '123', type: 'CAN', dlc: '8', data: '01 02 03 04 05 06 07 08', color: 'text-cyber-blue' },
                                                    { time: '0.000284', id: '7DF', type: 'CAN', dlc: '8', data: '02 01 0D 00 00 00 00 00', color: 'text-cyber-purple' },
                                                    { time: '0.000612', id: '1A2', type: 'FD', dlc: '64', data: 'AA BB CC DD EE FF ...', color: 'text-cyber-green' },
                                                    { time: '0.000845', id: 'ERR', type: '!!', dlc: '0', data: 'STUFF_ERROR_DETECTED', color: 'text-red-500' },
                                                ].map((row, i) => (
                                                    <motion.div
                                                        key={i}
                                                        role="listitem"
                                                        initial={{ opacity: 0, x: -10 }}
                                                        whileInView={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.1 }}
                                                        className="grid grid-cols-4 sm:grid-cols-6 gap-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors px-4 rounded-xl"
                                                    >
                                                        <span className="text-gray-500" aria-label={`Timestamp: ${row.time}`}>{row.time}</span>
                                                        <span className={`${row.color} font-black`} aria-label={`CAN ID: ${row.id}`}>{row.id}</span>
                                                        <span className="text-gray-400 hidden sm:block">{row.type}</span>
                                                        <span className="text-gray-400 hidden sm:block">L:{row.dlc}</span>
                                                        <span className="col-span-2 text-gray-300 truncate" aria-label={`Payload: ${row.data}`}>{row.data}</span>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </ShineBorder>
                            </Suspense>
                        </motion.div>
                    </section>

                    <PricingTeaser />

                     {/* Final CTA */}
                    <section className="container mx-auto px-4 py-12 md:py-20 lg:py-32 relative z-10">
                        <motion.div
                            initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.95 }}
                            whileInView={prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className={cn(
                                "max-w-5xl mx-auto text-center cyber-glass p-8 md:p-14 lg:p-20 rounded-[4rem] border-2 border-transparent hover:border-cyber-blue/30 transition-all duration-700 shadow-3xl",
                                isDark ? "bg-white/5" : "bg-white shadow-2xl",
                            )}
                        >
                            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-10 text-dark-900 dark:text-white tracking-tighter uppercase italic leading-[0.85]">
                                READY TO<br />SIMULATE?
                            </h2>
                            <p className="text-2xl sm:text-3xl font-black text-light-600 dark:text-gray-400 mb-12 sm:mb-16 max-w-3xl mx-auto italic leading-tight">
                                Join thousands of engineers mastering the automotive grid.
                            </p>
 
                            <div className="flex flex-col items-center gap-8">
                                <ShinyButton 
                                    onClick={() => navigate('/simulator')}
                                    className="px-8 py-5 sm:px-16 sm:py-8 text-xl sm:text-2xl lg:text-3xl font-black rounded-[2rem] shadow-neon-blue uppercase italic"
                                >
                                    <span className="flex items-center gap-4 sm:gap-6">GET STARTED NOW <ArrowRight size={28} className="sm:w-9 sm:h-9" strokeWidth={4} /></span>
                                </ShinyButton>
                                
                                <p className="text-lg font-bold text-gray-500 italic">
                                    Have specific requirements? <Link to="/contact" className="text-cyber-blue hover:text-cyber-blue/80 transition-colors underline decoration-2 underline-offset-4">Get in touch with us</Link>
                                </p>
                            </div>
                        </motion.div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
