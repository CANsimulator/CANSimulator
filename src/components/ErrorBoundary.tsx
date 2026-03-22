import React from 'react';

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
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    handleRetry = () => {
        if (this.state.retryCount >= 3) {
            window.location.reload();
            return;
        }
        this.setState(prev => ({ hasError: false, error: null, retryCount: prev.retryCount + 1 }));
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            const maxRetriesReached = this.state.retryCount >= 3;
            
            return (
                <div
                    role="alert"
                    aria-live="assertive"
                    className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center glass-panel m-4 border-cyber-pink/30"
                >
                    <span aria-hidden="true" className="text-4xl mb-4">⚠️</span>
                    <h2 className="text-white font-semibold text-lg mb-2">Something went wrong</h2>
                    <p className="text-gray-400 text-sm mb-6 max-w-sm">
                        An unexpected error occurred. {maxRetriesReached ? 'Please reload the page.' : 'Try again or reload if the problem persists.'}
                    </p>
                    <div className="flex gap-3">
                        {!maxRetriesReached && (
                            <button
                                onClick={this.handleRetry}
                                className="px-4 py-2 text-sm bg-cyber-blue/10 border border-cyber-blue/40 text-cyber-blue rounded-lg hover:bg-cyber-blue/20 transition-colors"
                            >
                                Try Again ({3 - this.state.retryCount} left)
                            </button>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 text-sm bg-white/5 border border-white/10 text-gray-300 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
