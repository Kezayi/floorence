import { ExternalLink, Heart } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

interface ContributionLinkProps {
  deceasedName: string;
}

const ContributionLink = ({ deceasedName }: ContributionLinkProps) => {
  const { data: settings, isLoading } = useSystemSettings();

  // Don't render if settings not loaded or contributions disabled
  if (isLoading || !settings?.contribution_link_template.enabled) {
    return null;
  }

  const contributionUrl = settings.contribution_link_template.url;
  
  if (!contributionUrl) {
    return null;
  }

  return (
    <div className="bg-secondary p-6 text-center">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Heart className="w-5 h-5 text-primary" />
        <h3 className="text-lg">Contribuer aux obsèques</h3>
      </div>
      
      <p className="font-sans text-sm text-muted-foreground mb-4 max-w-md mx-auto">
        Soutenez la famille de {deceasedName} en contribuant aux frais d'obsèques.
        Les fonds sont versés directement aux bénéficiaires, sans aucun prélèvement.
      </p>
      
      <a
        href={contributionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-sans text-sm font-medium transition-all hover:bg-primary/90"
      >
        <span>Faire un don</span>
        <ExternalLink className="w-4 h-4" />
      </a>
      
      <p className="text-xs text-muted-foreground mt-4 font-sans">
        Vous serez redirigé vers un service de paiement externe sécurisé.
      </p>
    </div>
  );
};

export default ContributionLink;
