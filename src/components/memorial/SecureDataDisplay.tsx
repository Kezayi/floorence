import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Lock } from "lucide-react";
import { Link } from "react-router-dom";

interface SecureDataDisplayProps {
  /** Content visible only to authenticated users */
  children: ReactNode;
  /** Fallback for anonymous visitors (defaults to a "connect to see" prompt) */
  fallback?: ReactNode;
  /** If true, shows a blurred preview instead of hiding completely */
  blurPreview?: boolean;
}

/**
 * SecureDataDisplay — Privacy-first wrapper
 * 
 * Gates detailed/sensitive data (relation links, family names, inferred connections)
 * behind authentication. Anonymous visitors see a redacted prompt or blurred preview.
 */
const SecureDataDisplay = ({ children, fallback, blurPreview = false }: SecureDataDisplayProps) => {
  const { user } = useAuth();

  if (user) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (blurPreview) {
    return (
      <div className="relative">
        <div className="blur-sm select-none pointer-events-none" aria-hidden="true">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-sm">
          <Link
            to="/auth"
            className="flex items-center gap-2 px-4 py-2 text-sm font-sans text-primary hover:underline underline-offset-4"
          >
            <Lock className="w-3.5 h-3.5" />
            Connectez-vous pour voir les détails
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-3 px-4 bg-muted/30 border border-border/50 rounded-sm">
      <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
      <p className="text-sm text-muted-foreground font-sans">
        <Link to="/auth" className="text-primary hover:underline underline-offset-4">
          Connectez-vous
        </Link>
        {" "}pour accéder aux informations détaillées.
      </p>
    </div>
  );
};

export default SecureDataDisplay;
