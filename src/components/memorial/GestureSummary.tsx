import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GestureSummaryProps {
  totals: {
    ripCount: number;
    candleCount: number;
    flowerCount: number;
  };
  userHasPosted: boolean;
  onRIPClick: () => void;
  onCandleClick: () => void;
  onFlowerClick: () => void;
}

const GestureSummary = ({
  totals,
  userHasPosted,
  onRIPClick,
  onCandleClick,
  onFlowerClick,
}: GestureSummaryProps) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
        <span>Hommages reçus</span>
        <Tooltip>
          <TooltipTrigger>
            <Info className="w-4 h-4" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">
              Ces compteurs représentent la somme de tous les gestes 
              laissés par les visiteurs dans le livre d'or.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={onRIPClick}
          className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="text-2xl font-serif">{totals.ripCount.toLocaleString("fr-FR")}</span>
          <span className="text-xs font-sans">Repos en paix</span>
        </button>
        <button
          onClick={onCandleClick}
          disabled={!userHasPosted}
          className={`flex flex-col items-center gap-1 transition-colors ${!userHasPosted ? 'opacity-50 cursor-not-allowed' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <span className="text-2xl font-serif">{totals.candleCount.toLocaleString("fr-FR")}</span>
          <span className="text-xs font-sans">Cierges</span>
        </button>
        <button
          onClick={onFlowerClick}
          disabled={!userHasPosted}
          className={`flex flex-col items-center gap-1 transition-colors ${!userHasPosted ? 'opacity-50 cursor-not-allowed' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <span className="text-2xl font-serif">{totals.flowerCount.toLocaleString("fr-FR")}</span>
          <span className="text-xs font-sans">Fleurs</span>
        </button>
      </div>
      
      {!userHasPosted && (
        <p className="text-xs text-muted-foreground mt-2">
          <Info className="w-3 h-3 inline mr-1" />
          Publiez un message dans le livre d'or pour allumer des cierges ou déposer des fleurs.
        </p>
      )}
    </div>
  );
};

export default GestureSummary;
