import { Info, Flame, Flower2, FlaskConical } from "lucide-react";
import { CrossIcon } from "./MemorialIcons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMonetization } from "@/hooks/useMonetization";

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
  const { data: monetization, isLoading: isLoadingSettings } = useMonetization();
  const isMonetized = monetization?.isMonetized ?? false;
  const candlePrice = monetization?.prices?.['cierge'] ?? 500;
  const flowerPrice = monetization?.prices?.['fleur'] ?? 500;
  
  const hasCandleFervor = totals.candleCount > 5;
  const hasFlowerFervor = totals.flowerCount > 5;

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
      
      {isLoadingSettings ? (
        <div className="flex items-center justify-center py-4">
          <span className="text-xs text-muted-foreground animate-pulse">Chargement...</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={onRIPClick}
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <CrossIcon size={20} className="text-foreground mb-0.5" />
              <span className="text-2xl font-serif">{totals.ripCount.toLocaleString("fr-FR")}</span>
              <span className="text-xs font-sans">RIP</span>
            </button>
            <button
              onClick={onCandleClick}
              disabled={!userHasPosted}
              className={`flex flex-col items-center gap-1 transition-colors ${!userHasPosted ? 'opacity-50 cursor-not-allowed' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Flame size={20} className={`text-gesture-candle mb-0.5 ${hasCandleFervor ? 'animate-flicker' : ''}`} />
              <span className={`text-2xl font-serif ${hasCandleFervor ? 'text-gesture-candle' : ''}`}>
                {totals.candleCount.toLocaleString("fr-FR")}
              </span>
               <span className="text-xs font-sans">Cierges</span>
               {userHasPosted && (
                 <span className="text-[10px] text-muted-foreground">
                   {isMonetized ? `${candlePrice} XAF` : 'Offert'}
                 </span>
               )}
            </button>
            <button
              onClick={onFlowerClick}
              disabled={!userHasPosted}
              className={`flex flex-col items-center gap-1 transition-colors ${!userHasPosted ? 'opacity-50 cursor-not-allowed' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Flower2 size={20} className={`text-gesture-flower mb-0.5 ${hasFlowerFervor ? 'animate-flicker' : ''}`} />
              <span className={`text-2xl font-serif ${hasFlowerFervor ? 'text-gesture-flower' : ''}`}>
                {totals.flowerCount.toLocaleString("fr-FR")}
              </span>
              <span className="text-xs font-sans">Fleurs</span>
              {userHasPosted && (
                <span className="text-[10px] text-muted-foreground">
                  {isMonetized ? `${flowerPrice} XAF` : 'Offert'}
                </span>
              )}
            </button>
          </div>

          {/* Mode Test LAB badge */}
          {isMonetized && (
            <div className="flex items-center justify-center mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-sans font-semibold uppercase tracking-wider rounded-full bg-accent/20 text-accent-foreground border border-accent/30">
                <FlaskConical className="w-3 h-3" />
                Mode Test LAB — DigitechAfrica
              </span>
            </div>
          )}
        </>
      )}
      
      {!userHasPosted && (
        <p className="text-xs text-muted-foreground mt-6 pt-4 border-t border-border">
          <Info className="w-3 h-3 inline mr-1" />
          Publiez un message dans le livre d'or pour allumer des cierges ou déposer des fleurs.
        </p>
      )}
    </div>
  );
};

export default GestureSummary;
