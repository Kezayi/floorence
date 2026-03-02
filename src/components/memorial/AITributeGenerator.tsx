import { useState } from "react";
import { Feather, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AITributeGeneratorProps {
  defuntName: string;
  onGenerated: (text: string) => void;
}

const AITributeGenerator = ({ defuntName, onGenerated }: AITributeGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [relation, setRelation] = useState("");
  const [souvenir, setSouvenir] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");

  const handleGenerate = async () => {
    if (!relation.trim() || !souvenir.trim()) {
      toast.error("Veuillez remplir les deux champs");
      return;
    }

    setLoading(true);
    setPreview("");

    try {
      const { data, error } = await supabase.functions.invoke("generate-tribute", {
        body: { defuntName, relation: relation.trim(), souvenir: souvenir.trim() },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setPreview(data.tribute || "");
    } catch (err) {
      console.error("AI tribute error:", err);
      toast.error("Impossible de générer le texte. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const handleUse = () => {
    onGenerated(preview);
    setOpen(false);
    setRelation("");
    setSouvenir("");
    setPreview("");
    toast.success("Texte inséré — vous pouvez le personnaliser avant de publier");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-sans text-muted-foreground hover:text-foreground bg-white border border-[hsl(0,0%,82%)] rounded-sm hover:bg-muted/40 transition-colors"
      >
        <Feather className="w-4 h-4" />
        Aide-moi à rédiger
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white border-[hsl(0,0%,85%)] text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[hsl(var(--gesture-candle))]" />
              Assistant mémoriel
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              L'IA vous aide à trouver les mots justes pour honorer {defuntName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Relation input */}
            <div>
              <label className="block text-sm font-sans text-foreground mb-1.5">
                Votre lien avec le défunt
              </label>
              <input
                type="text"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                placeholder="Ex : collègue, voisin, ami d'enfance…"
                maxLength={100}
                className="w-full p-3 bg-white border border-[hsl(0,0%,75%)] rounded-sm text-foreground placeholder:text-muted-foreground font-serif text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-colors"
              />
            </div>

            {/* Memory input */}
            <div>
              <label className="block text-sm font-sans text-foreground mb-1.5">
                Un souvenir ou une qualité
              </label>
              <input
                type="text"
                value={souvenir}
                onChange={(e) => setSouvenir(e.target.value)}
                placeholder="Ex : sa sagesse, son rire communicatif…"
                maxLength={200}
                className="w-full p-3 bg-white border border-[hsl(0,0%,75%)] rounded-sm text-foreground placeholder:text-muted-foreground font-serif text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-colors"
              />
            </div>

            {/* Generate button */}
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={loading || !relation.trim() || !souvenir.trim()}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rédaction en cours…
                </>
              ) : (
                <>
                  <Feather className="w-4 h-4 mr-2" />
                  Générer un hommage
                </>
              )}
            </Button>

            {/* Preview */}
            {preview && (
              <div className="bg-[hsl(0,0%,97%)] border border-[hsl(0,0%,90%)] rounded-sm p-4 animate-fade-in">
                <p className="text-xs font-sans text-muted-foreground uppercase tracking-wider mb-2">
                  Proposition
                </p>
                <p className="font-serif text-sm text-foreground italic leading-relaxed">
                  &ldquo;{preview}&rdquo;
                </p>
                <p className="text-xs text-muted-foreground mt-3 font-sans">
                  Vous pourrez modifier ce texte avant de le publier.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="bg-white border-[hsl(0,0%,75%)] text-foreground hover:bg-muted"
            >
              Annuler
            </Button>
            {preview && (
              <Button
                onClick={handleUse}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Utiliser ce texte
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AITributeGenerator;
