import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Mail, Send } from 'lucide-react';
import { CyberButton } from '../components/ui/CyberButton';
import { sendContactEmail } from '../services/emailService';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

export const ContactPage: React.FC = () => {
    const { user } = useAuth();
    const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', subject: '', message: '' });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Sync user data after async auth init
    useEffect(() => {
        if (user) {
            setForm(prev => ({
                ...prev,
                name: prev.name || (user.name ?? ''),
                email: prev.email || (user.email ?? '')
            }));
        }
    }, [user]);

    const validate = (): boolean => {
        const errors: Record<string, string> = {};
        if (!form.name.trim()) errors.name = 'Name is required';
        
        if (!form.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            errors.email = 'Invalid email format';
        }

        if (!form.message.trim()) {
            errors.message = 'Message is required';
        } else if (form.message.length > 500) {
            errors.message = 'Message must be under 500 characters';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        
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
        <section id="contact" className="max-w-2xl mx-auto px-4 sm:px-6 py-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-panel p-10 space-y-8"
            >
                 <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyber-blue/10 border border-cyber-blue/20 mb-4">
                        <Mail className="text-cyber-blue" size={24} />
                    </div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black gradient-text tracking-tighter uppercase italic">CONTACT US</h2>
                    <p className="text-gray-400 mt-2 text-sm">Bug report? Feature request? We're listening.</p>
                </div>

                 {status === 'success' ? (
                    <div className="text-center py-10 space-y-4">
                        <div className="flex justify-center">
                            <div className="w-16 h-16 rounded-full bg-cyber-green/10 border border-cyber-green/20 flex items-center justify-center">
                                <CheckCircle2 size={32} className="text-cyber-green" />
                            </div>
                        </div>
                        <div>
                            <p className="text-cyber-green font-black uppercase tracking-[0.2em] text-sm">Message Sent!</p>
                            <p className="text-gray-400 text-xs mt-1">We'll get back to you within 24 hours.</p>
                        </div>
                        <button 
                            onClick={() => {
                                setStatus('idle');
                                setForm({ name: user?.name ?? '', email: user?.email ?? '', subject: '', message: '' });
                                setValidationErrors({});
                            }} 
                            className="text-[11px] font-bold text-gray-500 hover:text-cyber-blue uppercase tracking-widest transition-all hover:translate-y-[-1px]"
                        >
                            Send another message
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label htmlFor="contact-name" className="text-[11px] text-gray-500 uppercase font-mono">Name</label>
                                <input
                                    id="contact-name"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                                    className="w-full bg-dark-950 border border-white/10 rounded px-3 py-2 text-white focus:border-cyber-blue outline-none transition-colors"
                                    placeholder="Jane Doe"
                                />
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="contact-email" className="text-[11px] text-gray-500 uppercase font-mono">Email</label>
                                <input
                                    id="contact-email"
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
                             <label htmlFor="contact-subject" className="text-[11px] text-gray-500 uppercase font-mono">Subject</label>
                            <input
                                id="contact-subject"
                                value={form.subject}
                                onChange={(e) => setForm(p => ({ ...p, subject: e.target.value }))}
                                className="w-full bg-dark-950 border border-white/10 rounded px-3 py-2 text-white focus:border-cyber-blue outline-none transition-colors"
                                placeholder="Feature request: CAN matrix export"
                            />
                        </div>

                        <div className="space-y-1">
                             <label htmlFor="contact-message" className="text-[11px] text-gray-500 uppercase font-mono">Message</label>
                             <textarea
                                id="contact-message"
                                required
                                rows={5}
                                value={form.message}
                                onChange={(e) => setForm(p => ({ ...p, message: e.target.value.slice(0, 1000) }))}
                                className={cn(
                                    "w-full bg-dark-950/50 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all resize-none",
                                    validationErrors.message ? "border-cyber-pink/50 focus:border-cyber-pink" : "border-white/10 focus:border-cyber-blue"
                                )}
                                placeholder="Describe your issue or idea..."
                            />
                            <div className="flex justify-between items-center mt-1.5 px-1">
                                {validationErrors.message && (
                                     <p className="text-cyber-pink text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                                        <AlertCircle size={10} /> {validationErrors.message}
                                    </p>
                                )}
                                <div className="flex-1" />
                                 <span className={cn(
                                    "text-[11px] font-mono",
                                    form.message.length >= 500 ? "text-cyber-pink font-bold" : form.message.length >= 450 ? "text-yellow-400" : "text-gray-500"
                                )}>
                                    {form.message.length}/500
                                </span>
                            </div>
                        </div>

                        {error && (
                            <p className="text-cyber-pink text-xs font-mono">{error}</p>
                        )}

                         <CyberButton type="submit" isLoading={status === 'loading'} className="w-full">
                            <span className="flex items-center justify-center gap-2">
                                <Send size={16} />
                                SEND MESSAGE
                            </span>
                        </CyberButton>
                    </form>
                )}
            </motion.div>
        </section>
    );
};
