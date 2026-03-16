import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Check, Shield, Zap, ArrowRight } from 'lucide-react';
import { PRICING_PLANS } from '../../config/pricing';
export const PricingTeaser: React.FC = () => {

    // Find the free plan to show its capabilities
    const freePlan = PRICING_PLANS.find(plan => plan.id === 'free');

    // Get paid plans for the upgrade hint
    const paidPlans = PRICING_PLANS.filter(plan => plan.id !== 'free');

    return (
        <section className="relative py-24 overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[400px] bg-cyber-blue/5 dark:bg-cyber-blue/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-4xl mx-auto">

                    {/* Header */}
                    <div className="text-center mb-12">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-3xl md:text-5xl font-black mb-4 tracking-tighter"
                        >
                            <span className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">Start for Free.</span>
                            <br />
                            <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-cyber-blue dark:to-cyber-purple bg-clip-text text-transparent">Upgrade when you need to.</span>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-lg text-slate-600 dark:text-slate-400 font-medium max-w-2xl mx-auto"
                        >
                            Master the CAN and CAN FD protocols with zero hardware costs. Our generous free tier gives you everything you need to start simulating immediately.
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="bg-white dark:bg-slate-900 rounded-3xl p-1 shadow-xl border border-slate-200 dark:border-white/10"
                    >
                        <div className="bg-white dark:bg-slate-950/50 rounded-[22px] p-6 md:p-10 border border-slate-200 dark:border-white/5 flex flex-col md:flex-row gap-8 md:gap-12 items-center">

                            {/* Left Side: Free Tier Capabilities */}
                            <div className="flex-1 w-full relative">
                                <div className="absolute -top-4 -left-4 w-12 h-12 bg-green-100 dark:bg-cyber-green/10 rounded-full flex items-center justify-center border border-green-200 dark:border-green-500/20">
                                    <Shield className="w-5 h-5 text-green-600 dark:text-cyber-green" />
                                </div>

                                <h3 className="text-2xl font-bold mb-2 ml-10 text-slate-800 dark:text-white">Free Forever</h3>
                                <p className="text-slate-600 dark:text-slate-400 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800 ml-10">
                                    No credit card required. Instantly access the core features.
                                </p>

                                <ul className="space-y-4">
                                    {freePlan?.features.slice(0, 4).map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                                            <div className="mt-1 shrink-0 p-1 bg-green-100 dark:bg-cyber-green/20 rounded-full">
                                                <Check className="w-3 h-3 text-green-600 dark:text-cyber-green stroke-[3]" />
                                            </div>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="w-full md:w-px h-px md:h-64 bg-slate-200 dark:bg-slate-800 shrink-0" />

                            {/* Right Side: Upgrade Hint & CTA */}
                            <div className="flex-1 w-full bg-slate-50 dark:bg-slate-900/80 rounded-2xl p-6 md:p-8 border border-slate-200 dark:border-white/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 group-hover:opacity-20 transition-all duration-500">
                                    <Zap className="w-24 h-24 text-purple-500 dark:text-cyber-purple" />
                                </div>

                                <h4 className="text-lg font-bold mb-2 text-slate-800 dark:text-white relative z-10">Need more power?</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 relative z-10">
                                    Upgrade to {paidPlans.map(p => p.name).join(' or ')} for priority support, advanced bus analysis, and increased message limits.
                                </p>

                                <div className="space-y-3 relative z-10">
                                    <Link
                                        to="/pricing"
                                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white dark:bg-cyber-blue dark:hover:bg-cyber-blue/90 dark:text-slate-900 font-bold rounded-xl transition-all hover:scale-[1.02] shadow-xl shadow-blue-500/20 dark:shadow-cyber-blue/20"
                                    >
                                        View Pricing & Plans
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <p className="text-xs text-center text-slate-500 dark:text-slate-500 font-medium">
                                        Plans start at affordable rates for professionals
                                    </p>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
