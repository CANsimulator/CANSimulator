import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { CyberButton } from '../components/ui/CyberButton';
import { BorderBeam } from '../components/ui/BorderBeam';
import { PLANS, type PlanId } from '../services/razorpayService';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

const PLAN_FEATURES: Record<PlanId, string[]> = {
    free: [
        '399 frames / month',
        'CAN Classic & FD Simulator',
        'Real-time Bus Monitor',
        'Arbitration Visualizer',
        'Community support',
    ],
    pro: [
        '5,000 frames / month',
        'Everything in Free',
        'Signal Decoder + Recharts',
        'PDF Export',
        'Email support',
    ],
    team: [
        '25,000 frames / month',
        'Everything in Pro',
        'Multi-node virtual network',
        'Error injection suite',
        'Priority support',
    ],
};

export const PricingPage: React.FC = () => {
    const { user } = useAuth();

    return (
        <section id="pricing" className="max-w-7xl mx-auto px-4 pt-20 pb-12 space-y-12 flex-1 flex flex-col justify-center">
            <div className="text-center space-y-4">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl sm:text-5xl font-black gradient-text tracking-tighter"
                >
                    CHOOSE YOUR TIER
                </motion.h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto font-medium">
                    From individual learners to embedded teams — pick a plan and start simulating CAN frames in your browser, no hardware needed.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(Object.keys(PLANS) as PlanId[]).map((planId, i) => {
                    const plan = PLANS[planId];
                    const isPopular = planId === 'pro';
                    const isCurrentPlan = user?.currentPlan === planId;

                    return (
                        <motion.div
                            key={planId}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className={cn(
                                "relative glass-panel p-8 flex flex-col gap-6 overflow-hidden",
                                isPopular && "border-cyber-blue/60 shadow-neon"
                            )}
                        >
                            {isPopular && (
                                <>
                                    <div className="absolute top-3 right-3 text-[11px] bg-cyber-blue text-dark-950 font-black px-2 py-0.5 rounded uppercase tracking-widest">
                                        Popular
                                    </div>
                                    <BorderBeam duration={4} />
                                </>
                            )}

                            <div>
                                <h3 className="text-xl font-black uppercase tracking-wider text-white">
                                    {plan.name}
                                </h3>
                                <div className="mt-2 flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-cyber-blue">
                                        {plan.priceInr === 0 ? 'FREE' : `₹${plan.priceInr}`}
                                    </span>
                                    {plan.priceInr > 0 && (
                                        <span className="text-gray-700 dark:text-gray-400 text-sm font-bold">/mo</span>
                                    )}
                                </div>
                            </div>

                            <ul className="space-y-2 flex-1">
                                {PLAN_FEATURES[planId].map((feat) => (
                                    <li key={feat} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 font-semibold dark:font-medium">
                                        <Check size={14} className="text-cyber-green shrink-0" aria-hidden="true" />
                                        {feat}
                                    </li>
                                ))}
                            </ul>

                            <CyberButton
                                variant={isCurrentPlan ? 'ghost' : isPopular ? 'primary' : 'outline'}
                                disabled={isCurrentPlan || plan.priceInr === 0}
                                className="w-full"
                            >
                                {isCurrentPlan ? 'CURRENT PLAN' : plan.priceInr === 0 ? 'GET STARTED' : 'UPGRADE'}
                            </CyberButton>
                        </motion.div>
                    );
                })}
            </div>

            {/* FAQ Section to fill purposeful space */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="pt-24 border-t border-black/5 dark:border-white/5 space-y-12"
            >
                <div className="text-center space-y-2">
                    <h3 className="text-3xl font-black uppercase tracking-tight text-gray-950 dark:text-white">
                        PRICING <span className="text-cyber-purple">FAQ</span>
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium tracking-tight uppercase">Everything you need to know about starting your simulation projects</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto px-4">
                    {[
                        { q: "Can I cancel anytime?", a: "Yes, our monthly plans are subscription-based and can be canceled at any time from your dashboard." },
                        { q: "Do I need hardware?", a: "No. Everything is simulated in our high-fidelity virtual environment. Ideal for remote developers." },
                        { q: "What's a 'frame' in billing?", a: "A frame is a single CAN message transmitted on the virtual bus. Receiving frames is always free." },
                        { q: "Is there a student discount?", a: "We offer educational grants for students and academic and nonprofit institutions. Contact us to learn more." }
                    ].map((item, idx) => (
                        <div key={idx} className="space-y-3">
                            <h4 className="text-sm font-black text-gray-950 dark:text-cyber-blue uppercase tracking-wider">{item.q}</h4>
                            <p className="text-sm text-gray-700 dark:text-gray-400 font-medium leading-relaxed">{item.a}</p>
                        </div>
                    ))}
                </div>
            </motion.div>
        </section>
    );
};
