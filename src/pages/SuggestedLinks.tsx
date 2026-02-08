import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useUserSuggestedLinks } from "@/hooks/useSuggestedLinks";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Brain,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Link2,
  LogIn,
  TreePine,
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
  <Card className="border-border/50 bg-card/90 overflow-hidden group hover:shadow-md transition-shadow duration-300">
    {/* Golden top accent bar */}
    <div className="h-1 bg-gradient-to-r from-[hsl(45,90%,50%)] via-[hsl(40,85%,55%)] to-[hsl(45,90%,50%)]" />
    <CardContent className="p-5 space-y-4">
      {/* AI Label */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-[hsl(45,90%,50%)]/15 flex items-center justify-center">
          <Brain className="w-3.5 h-3.5 text-[hsl(45,90%,50%)]" />
        </div>
        <span className="text-xs font-medium text-[hsl(45,70%,35%)] tracking-wide uppercase">
          Intelligence Floorence
        </span>
      </div>

      {/* Relation chain */}
      <div className="flex items-center gap-2 flex-wrap py-1">
        <Link
          to={suggestion.sourceShareToken ? `/m/${suggestion.sourceShareToken}` : `/memorial/${suggestion.sourceSlug}`}
          className="font-serif font-semibold text-lg text-foreground hover:text-primary transition-colors"
        >
          {suggestion.sourceName}
        </Link>
        <ArrowRight className="w-5 h-5 text-[hsl(45,90%,50%)] shrink-0" />
        <span className="font-serif font-bold text-lg text-[hsl(45,80%,40%)]">
          {suggestion.suggestedRelation}
        </span>
        <ArrowRight className="w-5 h-5 text-[hsl(45,90%,50%)] shrink-0" />
        <Link
          to={suggestion.targetShareToken ? `/m/${suggestion.targetShareToken}` : `/memorial/${suggestion.targetSlug}`}
          className="font-serif font-semibold text-lg text-foreground hover:text-primary transition-colors"
        >
          {suggestion.targetName}
        </Link>
      </div>

      {/* Dynamic explanation text */}
      <div className="bg-[hsl(45,90%,50%)]/5 border border-[hsl(45,90%,50%)]/15 rounded-md p-4">
        <p className="font-sans text-sm text-foreground/90 leading-relaxed">
          <span className="text-[hsl(45,70%,35%)] font-medium">Intelligence Floorence :</span>{" "}
          Suite au lien de parenté établi autour de{" "}
          <strong>{suggestion.sourceName}</strong>, il apparaît que{" "}
          <strong>{suggestion.targetName}</strong> est probablement{" "}
          <strong className="text-[hsl(45,80%,40%)]">{suggestion.suggestedRelation}</strong>{" "}
          de <strong>{suggestion.sourceName}</strong>.{" "}
          <span className="italic text-muted-foreground">
            Confirmez-vous ce lien de sang ?
          </span>
        </p>
      </div>

      {/* Inference logic */}
      {suggestion.inferenceLogic && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-sm px-3 py-2">
          <TreePine className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[hsl(45,70%,40%)]" />
          <span className="font-sans">
            <strong>Logique :</strong> {suggestion.inferenceLogic}
          </span>
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
          En attente de validation humaine
        </Badge>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-border/30">
        <Button
          onClick={onValidate}
          disabled={isProcessing}
          className="gap-2 bg-gradient-to-r from-[hsl(45,80%,45%)] to-[hsl(40,75%,50%)] hover:from-[hsl(45,85%,40%)] hover:to-[hsl(40,80%,45%)] text-white shadow-sm"
          size="lg"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Confirmer la Vérité
        </Button>
        <Button
          variant="ghost"
          onClick={onReject}
          disabled={isProcessing}
          className="gap-2 text-muted-foreground hover:text-destructive"
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(45,90%,50%)] to-[hsl(40,80%,45%)] flex items-center justify-center shadow-md">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-serif">Liens Potentiels Suggérés</h1>
                  {suggestions.length > 0 && (
                    <Badge className="mt-1 bg-[hsl(45,90%,50%)]/15 text-[hsl(45,70%,35%)] border-[hsl(45,90%,50%)]/30 text-xs">
                      {suggestions.length} vérité{suggestions.length > 1 ? "s" : ""} en attente
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-muted-foreground font-sans text-sm ml-[52px]">
                L'Intelligence de Lignage de Floorence a détecté des liens potentiels
                autour de vos espaces mémoriels. <strong>Vous seul pouvez confirmer ces vérités</strong>.
              </p>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[hsl(45,90%,50%)]" />
                <p className="text-sm text-muted-foreground">Analyse du maillage en cours…</p>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-5">
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
