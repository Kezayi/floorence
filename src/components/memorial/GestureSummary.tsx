import { Info } from "lucide-react";
import GestureButton from "./GestureButton";
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
      
      <div className="grid grid-cols-3 gap-3">
        <GestureButton
          type="RIP"
          count={totals.ripCount}
          onClick={onRIPClick}
        />
        <GestureButton
          type="CANDLE"
          count={totals.candleCount}
          onClick={onCandleClick}
          disabled={!userHasPosted}
        />
        <GestureButton
          type="FLOWER"
          count={totals.flowerCount}
          onClick={onFlowerClick}
          disabled={!userHasPosted}
        />
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
