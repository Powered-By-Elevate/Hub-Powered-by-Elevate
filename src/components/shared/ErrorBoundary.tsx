import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F8F7F4',
          padding: 20,
        }}>
          <div style={{
            maxWidth: 480,
            background: '#fff',
            border: '1px solid #E5E3DC',
            borderRadius: 14,
            padding: '2rem',
            textAlign: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ margin: '0 0 8px', color: '#1A1916', fontSize: 20 }}>Something went wrong</h2>
            <p style={{ color: '#6B6860', fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
              The page encountered an unexpected error. You can try again or reload the page.
            </p>
            {this.state.error?.message && (
              <details style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 8,
                padding: '10px 12px',
                marginBottom: 20,
                textAlign: 'left',
              }}>
                <summary style={{ fontSize: 12, fontWeight: 600, color: '#991B1B', cursor: 'pointer' }}>
                  Error details
                </summary>
                <pre style={{
                  fontSize: 11,
                  color: '#7F1D1D',
                  margin: '8px 0 0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>{this.state.error.message}</pre>
              </details>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '8px 16px',
                  borderRadius: 7,
                  border: '1px solid #E5E3DC',
                  background: '#F8F7F4',
                  color: '#1A1916',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >Try again</button>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '8px 16px',
                  borderRadius: 7,
                  border: 'none',
                  background: '#1B3F6E',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >Reload page</button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}