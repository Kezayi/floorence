import { AlertCircle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "./button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  variant?: "default" | "network" | "notfound" | "permission";
}

const variants = {
  default: {
    icon: AlertCircle,
    defaultTitle: "Une erreur est survenue",
    defaultMessage: "Nous n'avons pas pu charger les données. Veuillez réessayer.",
  },
  network: {
    icon: WifiOff,
    defaultTitle: "Problème de connexion",
    defaultMessage: "Vérifiez votre connexion internet et réessayez.",
  },
  notfound: {
    icon: AlertCircle,
    defaultTitle: "Introuvable",
    defaultMessage: "La ressource demandée n'existe pas ou a été supprimée.",
  },
  permission: {
    icon: AlertCircle,
    defaultTitle: "Accès refusé",
    defaultMessage: "Vous n'avez pas les permissions nécessaires pour accéder à cette ressource.",
  },
};

const ErrorState = ({
  title,
  message,
  onRetry,
  variant = "default",
}: ErrorStateProps) => {
  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-destructive" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        {title || config.defaultTitle}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {message || config.defaultMessage}
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Réessayer
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
