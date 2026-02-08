import { Component, ReactNode } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * MemorialErrorBoundary — Catches render errors in a memorial page
 * and shows a graceful fallback instead of a white screen.
 */
class MemorialErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[MemorialErrorBoundary] Crash intercepté:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1 pt-20 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto px-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <span className="font-serif text-3xl text-muted-foreground">F</span>
              </div>
              <h1 className="text-2xl font-serif mb-3">
                Une erreur est survenue
              </h1>
              <p className="text-muted-foreground mb-6 font-sans text-sm">
                L'espace mémoriel n'a pas pu être affiché correctement.
                Veuillez réessayer ou revenir à l'accueil.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => this.setState({ hasError: false, error: null })}
                  className="btn-ghost"
                >
                  Réessayer
                </button>
                <Link to="/" className="btn-memorial">
                  Retour à l'accueil
                </Link>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      );
    }

    return this.props.children;
  }
}

export default MemorialErrorBoundary;
