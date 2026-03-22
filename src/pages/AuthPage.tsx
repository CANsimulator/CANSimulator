import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CyberButton } from '../components/ui/CyberButton';
import { useAuth } from '../context/AuthContext';
import { signUp } from '../services/authService';
import { useNavigate } from 'react-router-dom';

export const AuthPage: React.FC = () => {
    const { login, error: authError, rateLimitInfo, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [isLogin, setIsLogin] = useState(true);
    const [form, setForm] = useState({ email: '', password: '', displayName: '' });
    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [localError, setLocalError] = useState<string | null>(null);

    // If already authenticated, redirect to simulator
    React.useEffect(() => {
        if (isAuthenticated) {
            navigate('/simulator');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setLocalError(null);

        try {
            if (isLogin) {
                const success = await login({ email: form.email, password: form.password, rememberMe: false });
                if (!success) {
                    setStatus('idle');
                    // The error will be available in authError from context
                }
            } else {
                if (!form.displayName) {
                    setLocalError('Display name is required for registration.');
                    setStatus('idle');
                    return;
                }
                await signUp({ email: form.email, password: form.password, displayName: form.displayName });
                // Automatically log them in after sign up
                await login({ email: form.email, password: form.password, rememberMe: false });
            }
        } catch (error: any) {
            setLocalError(error.message || 'Authentication failed');
            setStatus('idle');
        }
    };

    const displayError = localError || authError?.message;

    return (
        <section className="max-w-md mx-auto px-4 py-20 min-h-[calc(100vh-140px)] flex flex-col justify-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel p-8 space-y-8 relative overflow-hidden"
            >
                {/* Decorative UI elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-blue/5 rounded-bl-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyber-purple/5 rounded-tr-[100px] pointer-events-none" />

                <div className="text-center relative z-10">
                    <h1 className="text-3xl font-black gradient-text tracking-tighter uppercase">
                        {isLogin ? 'SYSTEM LOGIN' : 'INITIALIZE USER'}
                    </h1>
                    <p className="text-gray-400 mt-2 text-sm">
                        {isLogin ? 'Enter your credentials to access the simulator.' : 'Create a new account to save your sessions.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    {!isLogin && (
                        <div className="space-y-1">
                            <label htmlFor="auth-name" className="text-[10px] text-gray-500 uppercase font-mono">Display Name</label>
                            <input
                                id="auth-name"
                                required={!isLogin}
                                value={form.displayName}
                                onChange={(e) => setForm(p => ({ ...p, displayName: e.target.value }))}
                                className="w-full bg-dark-950/50 border border-white/10 rounded px-3 py-2 text-white placeholder-gray-600 focus:border-cyber-blue outline-none transition-colors"
                                placeholder="Neo"
                            />
                        </div>
                    )}
                    
                    <div className="space-y-1">
                        <label htmlFor="auth-email" className="text-[10px] text-gray-500 uppercase font-mono">Email</label>
                        <input
                            id="auth-email"
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                            className="w-full bg-dark-950/50 border border-white/10 rounded px-3 py-2 text-white placeholder-gray-600 focus:border-cyber-blue outline-none transition-colors"
                            placeholder="user@grid.net"
                        />
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="auth-password" className="text-[10px] text-gray-500 uppercase font-mono">Password</label>
                        <input
                            id="auth-password"
                            type="password"
                            required
                            value={form.password}
                            onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                            className="w-full bg-dark-950/50 border border-white/10 rounded px-3 py-2 text-white placeholder-gray-600 focus:border-cyber-blue outline-none transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    {displayError && (
                        <div className="bg-cyber-pink/10 border border-cyber-pink/20 rounded p-3">
                            <p className="text-cyber-pink text-xs font-mono">{displayError}</p>
                            {isLogin && rateLimitInfo && rateLimitInfo.attemptsRemaining < 5 && (
                                <p className="text-gray-400 text-[10px] font-mono mt-1">
                                    Attempts remaining: {rateLimitInfo.attemptsRemaining}
                                </p>
                            )}
                        </div>
                    )}

                    <CyberButton 
                        type="submit" 
                        isLoading={status === 'loading'} 
                        className="w-full"
                    >
                        {isLogin ? 'AUTHENTICATE' : 'REGISTER'}
                    </CyberButton>

                    <div className="text-center pt-2">
                        <button 
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setLocalError(null);
                            }} 
                            className="text-xs text-gray-400 hover:text-cyber-blue transition-colors outline-none"
                        >
                            {isLogin ? "Don't have an account? Sign up." : 'Already registered? Log in.'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </section>
    );
};
