import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * GlobalErrorBoundary — Top-level crash guard.
 * Prevents white screens by catching any unhandled render error
 * and offering a clean recovery UI in French.
 */
class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[GlobalErrorBoundary] Crash intercepté:", error, errorInfo);
    console.error("[GlobalErrorBoundary] Stack composant:", errorInfo.componentStack);
  }

  handleBack = () => {
    // Try to go back in history; if no history, redirect to home
    if (window.history.length > 1) {
      this.setState({ hasError: false, error: null });
      window.history.back();
    } else {
      this.setState({ hasError: false, error: null });
      window.location.href = "/";
    }
  };

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[hsl(0,0%,98%)] px-4">
          <div className="text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-[hsl(0,0%,90%)] flex items-center justify-center mx-auto mb-6">
              <span style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '2.5rem', color: 'hsl(0,0%,45%)' }}>
                F
              </span>
            </div>
            <h1 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '1.75rem', fontWeight: 300, marginBottom: '0.75rem', color: 'hsl(0,0%,8%)' }}>
              Une erreur inattendue est survenue
            </h1>
            <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.875rem', color: 'hsl(0,0%,45%)', marginBottom: '2rem', lineHeight: 1.6 }}>
              Nous nous excusons pour ce désagrément. 
              Veuillez rafraîchir la page pour continuer à honorer la mémoire de vos proches.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={this.handleBack}
                style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: 'hsl(0,0%,8%)',
                  border: '1px solid hsl(0,0%,80%)',
                  cursor: 'pointer',
                  letterSpacing: '0.025em',
                }}
              >
                ← Retour
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'hsl(0,0%,8%)',
                  color: 'hsl(0,0%,98%)',
                  border: 'none',
                  cursor: 'pointer',
                  letterSpacing: '0.025em',
                }}
              >
                Rafraîchir la page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
