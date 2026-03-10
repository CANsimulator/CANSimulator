import React from 'react';

interface State {
    hasError: boolean;
    error: Error | null;
}

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center glass-panel m-4 border-cyber-pink/30">
                    <div className="text-4xl mb-4">⚠</div>
                    <h2 className="text-lg font-bold text-cyber-pink mb-2 uppercase tracking-wider">
                        Render Error
                    </h2>
                    <p className="text-gray-500 text-sm font-mono mb-6 max-w-sm">
                        {this.state.error?.message ?? 'An unexpected error occurred.'}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="cyber-button text-sm"
                    >
                        RETRY
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
