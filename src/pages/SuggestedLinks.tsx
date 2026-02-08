import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useUserSuggestedLinks } from "@/hooks/useSuggestedLinks";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Brain,
  ArrowRight,
  Info,
  ShieldCheck,
  Loader2,
  Link2,
  LogIn,
} from "lucide-react";
import type { SuggestedLink } from "@/hooks/useSuggestedLinks";

const SuggestionItem = ({
  suggestion,
  onValidate,
  onReject,
  isProcessing,
}: {
  suggestion: SuggestedLink;
  onValidate: () => void;
  onReject: () => void;
  isProcessing: boolean;
}) => (
  <Card className="border-border/50 bg-card/90">
    <CardContent className="p-5 space-y-4">
      {/* Relation chain */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          to={`/memorial/${suggestion.sourceSlug}`}
          className="font-serif font-medium text-foreground hover:text-primary transition-colors"
        >
          {suggestion.sourceName}
        </Link>
        <ArrowRight className="w-4 h-4 text-[hsl(45,90%,50%)] shrink-0" />
        <span className="font-serif font-semibold text-[hsl(45,90%,50%)]">
          {suggestion.suggestedRelation}
        </span>
        <ArrowRight className="w-4 h-4 text-[hsl(45,90%,50%)] shrink-0" />
        <Link
          to={`/memorial/${suggestion.targetSlug}`}
          className="font-serif font-medium text-foreground hover:text-primary transition-colors"
        >
          {suggestion.targetName}
        </Link>
      </div>

      {/* Explanation */}
      <div className="bg-muted/50 rounded-sm p-3">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-[hsl(45,90%,50%)]" />
          <p className="font-sans">
            Basé sur votre lien avec <strong>{suggestion.sourceName}</strong>, Floorence
            suggère que <strong>{suggestion.targetName}</strong> pourrait être votre{" "}
            <strong>{suggestion.suggestedRelation}</strong>. Confirmez-vous cette vérité ?
          </p>
        </div>
      </div>

      {/* Inference logic */}
      {suggestion.inferenceLogic && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Brain className="w-3 h-3 mt-0.5 shrink-0" />
          <span className="font-sans italic">{suggestion.inferenceLogic}</span>
        </div>
      )}

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {suggestion.createdByAi && (
          <Badge
            variant="outline"
            className="gap-1 border-[hsl(45,90%,50%)]/30 text-[hsl(45,70%,35%)] bg-[hsl(45,90%,50%)]/5 text-[10px]"
          >
            <Brain className="w-2.5 h-2.5" />
            Intelligence de Lignage
          </Badge>
        )}
        <Badge
          variant="outline"
          className="gap-1 border-primary/30 text-primary bg-primary/5 text-[10px]"
        >
          <ShieldCheck className="w-2.5 h-2.5" />
          En attente de validation
        </Badge>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={onValidate}
          disabled={isProcessing}
          className="gap-2"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Valider la Vérité
        </Button>
        <Button
          variant="outline"
          onClick={onReject}
          disabled={isProcessing}
          className="gap-2 text-muted-foreground"
        >
          <XCircle className="w-4 h-4" />
          Rejeter
        </Button>
      </div>
    </CardContent>
  </Card>
);

const SuggestedLinks = () => {
  const { user } = useAuth();
  const {
    suggestions,
    isLoading,
    validateSuggestion,
    rejectSuggestion,
    isValidating,
    isRejecting,
  } = useUserSuggestedLinks();

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-16 md:pt-20 flex items-center justify-center">
          <div className="text-center space-y-4">
            <LogIn className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl">Connexion requise</h2>
            <p className="text-muted-foreground text-sm">
              Connectez-vous pour voir les liens suggérés pour vos espaces mémoriels.
            </p>
            <Link to="/auth">
              <Button className="mt-2">Se connecter</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-16 md:pt-20 pb-20 md:pb-0">
        <section className="section-padding">
          <div className="container mx-auto max-w-3xl">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-[hsl(45,90%,50%)]/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[hsl(45,90%,50%)]" />
                </div>
                <h1 className="text-2xl md:text-3xl">Liens Potentiels Suggérés</h1>
              </div>
              <p className="text-muted-foreground font-sans text-sm ml-[52px]">
                L'Intelligence de Lignage de Floorence a détecté des liens potentiels
                autour de vos espaces mémoriels. Vous seul pouvez confirmer ces vérités.
              </p>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-4">
                {suggestions.map((suggestion) => (
                  <SuggestionItem
                    key={suggestion.id}
                    suggestion={suggestion}
                    onValidate={() => validateSuggestion(suggestion)}
                    onReject={() => rejectSuggestion(suggestion.id)}
                    isProcessing={isValidating || isRejecting}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Link2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Aucune suggestion en attente</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    L'Intelligence de Lignage analyse continuellement votre maillage familial.
                    De nouvelles suggestions apparaîtront ici dès qu'un lien potentiel sera détecté.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SuggestedLinks;
