import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface State {
    hasError: boolean;
    error: Error | null;
    retryCount: number;
}

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, retryCount: 0 };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary caught]', error, info);
        // TODO: reportError(error, { componentStack: info.componentStack });
    }

    handleRetry = () => {
        if (this.state.retryCount >= 3) {
            window.location.reload();
            return;
        }
        this.setState(prev => ({ 
            hasError: false, 
            error: null, 
            retryCount: prev.retryCount + 1 
        }));
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            const maxRetriesReached = this.state.retryCount >= 3;
            
            return (
                <div
                    role="alert"
                    aria-live="assertive"
                    className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center glass-panel m-4 border-cyber-pink/30 rounded-2xl transition-all"
                >
                    <AlertTriangle className="w-12 h-12 mb-4 text-cyber-pink animate-pulse" aria-hidden="true" />
                    <h2 className="text-white font-mono font-black text-lg mb-2 uppercase tracking-wider">
                        Something went wrong
                    </h2>
                     <p className="text-gray-400 font-mono text-[12px] mb-6 max-w-sm uppercase tracking-tight opacity-80 leading-relaxed font-bold">
                        An unexpected error occurred. {maxRetriesReached ? 'Please reload the page.' : 'Try again or reload if the problem persists.'}
                    </p>
                    
                    <div className="flex gap-3">
                        {!maxRetriesReached && (
                             <button
                                onClick={this.handleRetry}
                                className="px-5 py-2.5 text-[11px] font-mono font-black uppercase tracking-widest bg-cyber-blue/10 border border-cyber-blue/40 text-cyber-blue rounded-lg hover:bg-cyber-blue/20 transition-all active:scale-95 shadow-[0_0_15px_rgba(0,243,255,0.1)] min-h-[44px]"
                            >
                                Try Again ({3 - this.state.retryCount} left)
                            </button>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="px-5 py-2.5 text-[11px] font-mono font-black uppercase tracking-widest bg-white/5 border border-white/10 text-gray-300 rounded-lg hover:bg-white/10 transition-all active:scale-95 min-h-[44px]"
                        >
                            Reload Page
                        </button>
                    </div>

                     <div className="mt-8 pt-4 border-t border-white/5 w-full max-w-xs">
                        <p className="text-[11px] font-mono text-gray-500 uppercase font-black">
                            Error Ref: {Math.random().toString(36).slice(7).toUpperCase()} | Stack: Subsystem Failure
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <React.Fragment key={this.state.retryCount}>
                {this.props.children}
            </React.Fragment>
        );
    }
}
