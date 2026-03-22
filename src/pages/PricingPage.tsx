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
        <section id="pricing" className="max-w-7xl mx-auto px-4 py-20 space-y-12">
            <div className="text-center space-y-4">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-5xl font-black gradient-text tracking-tighter"
                >
                    CHOOSE YOUR TIER
                </motion.h2>
                <p className="text-gray-400 max-w-xl mx-auto">
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
                                    <div className="absolute top-3 right-3 text-[10px] bg-cyber-blue text-dark-950 font-black px-2 py-0.5 rounded uppercase tracking-widest">
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
                                        <span className="text-gray-500 text-sm">/mo</span>
                                    )}
                                </div>
                            </div>

                            <ul className="space-y-2 flex-1">
                                {PLAN_FEATURES[planId].map((feat) => (
                                    <li key={feat} className="flex items-center gap-2 text-sm text-gray-300">
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
        </section>
    );
};
