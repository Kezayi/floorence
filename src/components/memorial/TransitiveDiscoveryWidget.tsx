import { Sparkles, Check, X, ShieldCheck, ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTransitiveSuggestions } from "@/hooks/useTransitiveSuggestions";
import type { TransitiveSuggestion } from "@/lib/transitiveInference";

interface TransitiveDiscoveryWidgetProps {
  memorialId: string;
  memorialName: string;
}

const SuggestionCard = ({
  suggestion,
  onConfirm,
  onIgnore,
}: {
  suggestion: TransitiveSuggestion;
  onConfirm: () => void;
  onIgnore: () => void;
}) => (
  <div className="p-4 bg-card/90 rounded-sm border border-border/50 space-y-3">
    {/* Relation chain */}
    <div className="flex items-center gap-2 flex-wrap text-sm">
      <span className="font-serif font-medium">{suggestion.xName}</span>
      <ArrowRight className="w-3 h-3 text-[hsl(45,90%,50%)] shrink-0" />
      <span className="font-serif font-semibold text-[hsl(45,90%,50%)]">
        {suggestion.genderedRelation}
      </span>
      <ArrowRight className="w-3 h-3 text-[hsl(45,90%,50%)] shrink-0" />
      <span className="font-serif font-medium">{suggestion.yName}</span>
    </div>

    {/* Reason */}
    <div className="flex items-start gap-2 text-xs text-muted-foreground">
      <Info className="w-3 h-3 mt-0.5 shrink-0" />
      <span className="font-sans italic">{suggestion.reason}</span>
    </div>

    {/* Badges */}
    <div className="flex items-center gap-2 flex-wrap">
      <Badge
        variant="outline"
        className={
          suggestion.confidence === "high"
            ? "border-primary/30 text-primary bg-primary/5 text-[10px]"
            : "border-[hsl(45,90%,50%)]/30 text-[hsl(45,70%,35%)] bg-[hsl(45,90%,50%)]/5 text-[10px]"
        }
      >
        {suggestion.confidence === "high" ? "Confiance élevée" : "Confiance moyenne"}
      </Badge>
      {suggestion.chronoVerified && (
        <Badge
          variant="outline"
          className="gap-1 border-primary/30 text-primary bg-primary/5 text-[10px]"
        >
          <ShieldCheck className="w-2.5 h-2.5" />
          Vérifié
        </Badge>
      )}
    </div>

    {/* Actions */}
    <div className="flex items-center gap-2 pt-1">
      <Button
        size="sm"
        onClick={onConfirm}
        className="gap-1.5 text-xs"
      >
        <Check className="w-3.5 h-3.5" />
        Confirmer et Lier
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onIgnore}
        className="gap-1.5 text-xs text-muted-foreground"
      >
        <X className="w-3.5 h-3.5" />
        Ignorer
      </Button>
    </div>
  </div>
);

const TransitiveDiscoveryWidget = ({
  memorialId,
  memorialName,
}: TransitiveDiscoveryWidgetProps) => {
  const {
    suggestions,
    confirmSuggestion,
    ignoreSuggestion,
    isLoading,
  } = useTransitiveSuggestions(memorialId);

  if (isLoading || suggestions.length === 0) return null;

  return (
    <Card className="border-[hsl(45,90%,50%)]/20 bg-[hsl(45,90%,50%)]/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-serif">
          <Sparkles className="w-5 h-5 text-[hsl(45,90%,50%)]" />
          Découverte de parenté
        </CardTitle>
        <p className="text-xs text-muted-foreground font-sans">
          L'intelligence de lignage a détecté des liens potentiels par transitivité autour de {memorialName}.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {suggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.pairKey}
            suggestion={suggestion}
            onConfirm={() => confirmSuggestion(suggestion)}
            onIgnore={() => ignoreSuggestion(suggestion.pairKey)}
          />
        ))}
      </CardContent>
    </Card>
  );
};

export default TransitiveDiscoveryWidget;
