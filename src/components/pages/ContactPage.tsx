import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CyberButton } from '../ui/CyberButton';
import { sendContactEmail } from '../../services/emailService';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';

export const ContactPage: React.FC = () => {
    const { user } = useAuth();
    const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', subject: '', message: '' });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setError(null);

        // Persist to Supabase
        if (supabase) {
            await supabase.from('contact_submissions').insert({
                name: form.name,
                email: form.email,
                subject: form.subject,
                message: form.message,
                user_id: user?.id ?? null,
            });
        }

        // Send email via API
        const result = await sendContactEmail({
            from: form.email,
            name: form.name,
            subject: form.subject || 'CAN Simulator Contact',
            message: form.message,
        });

        if (result.success) {
            setStatus('success');
        } else {
            setStatus('error');
            setError(result.error ?? 'Unknown error. Please try again.');
        }
    };

    return (
        <section id="contact" className="max-w-2xl mx-auto px-4 py-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-panel p-10 space-y-8"
            >
                <div className="text-center">
                    <h2 className="text-4xl font-black gradient-text tracking-tighter">CONTACT US</h2>
                    <p className="text-gray-400 mt-2 text-sm">Bug report? Feature request? We're listening.</p>
                </div>

                {status === 'success' ? (
                    <div className="text-center py-10 space-y-3">
                        <div className="text-5xl">✅</div>
                        <p className="text-cyber-green font-bold uppercase tracking-widest text-sm">Message Sent!</p>
                        <p className="text-gray-400 text-sm">We'll get back to you within 24 hours.</p>
                        <button onClick={() => setStatus('idle')} className="text-xs text-gray-500 hover:text-cyber-blue transition-colors">Send another message</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] text-gray-500 uppercase font-mono">Name</label>
                                <input
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                                    className="w-full bg-dark-950 border border-white/10 rounded px-3 py-2 text-white focus:border-cyber-blue outline-none transition-colors"
                                    placeholder="Jane Doe"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-gray-500 uppercase font-mono">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                                    className="w-full bg-dark-950 border border-white/10 rounded px-3 py-2 text-white focus:border-cyber-blue outline-none transition-colors"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase font-mono">Subject</label>
                            <input
                                value={form.subject}
                                onChange={(e) => setForm(p => ({ ...p, subject: e.target.value }))}
                                className="w-full bg-dark-950 border border-white/10 rounded px-3 py-2 text-white focus:border-cyber-blue outline-none transition-colors"
                                placeholder="Feature request: CAN matrix export"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase font-mono">Message</label>
                            <textarea
                                required
                                rows={5}
                                value={form.message}
                                onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))}
                                className="w-full bg-dark-950 border border-white/10 rounded px-3 py-2 text-white focus:border-cyber-blue outline-none transition-colors resize-none"
                                placeholder="Describe your issue or idea..."
                            />
                        </div>

                        {error && (
                            <p className="text-cyber-pink text-xs font-mono">{error}</p>
                        )}

                        <CyberButton type="submit" isLoading={status === 'loading'} className="w-full">
                            SEND MESSAGE
                        </CyberButton>
                    </form>
                )}
            </motion.div>
        </section>
    );
};
