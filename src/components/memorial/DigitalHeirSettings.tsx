import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { UserPlus, ShieldCheck, AlertTriangle } from "lucide-react";

interface DigitalHeirSettingsProps {
  memorialId: string;
  currentHeirEmail?: string | null;
}

/**
 * Composant de désignation de l'héritier numérique.
 * 
 * Flux sécurisé :
 * - On stocke `heir_email` sur le mémorial (colonne existante).
 * - La résolution `heir_email → heir_user_id` se fait côté serveur
 *   (trigger ou edge function avec service_role) quand l'utilisateur
 *   correspondant se connecte.
 * - On ne tente PAS de lookup email côté client (profiles_public n'expose pas l'email).
 */
export const DigitalHeirSettings = ({ memorialId, currentHeirEmail }: DigitalHeirSettingsProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSetHeir = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !isValidEmail(trimmed)) {
      toast.error("Veuillez entrer une adresse email valide.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("memorials")
        .update({ heir_email: trimmed })
        .eq("id", memorialId);

      if (error) throw error;

      toast.success("Héritier numérique désigné avec succès.");
      setEmail("");
    } catch {
      toast.error("Erreur lors de la désignation de l'héritier.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-sm p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-foreground/70" />
        </div>
        <div>
          <h4 className="font-serif text-lg text-foreground">Héritier Numérique</h4>
          <p className="text-xs text-muted-foreground font-sans">
            Transmission de la gestion mémorielle
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground font-serif leading-relaxed">
        Désignez une personne de confiance pour gérer cet espace mémoriel
        en cas d'impossibilité de votre part. Cette personne recevra les
        mêmes droits de gestion que vous.
      </p>

      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="adresse@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-muted/30"
          disabled={loading}
        />
        <Button
          onClick={handleSetHeir}
          disabled={loading || !email.trim()}
          variant="outline"
          className="shrink-0 gap-2"
        >
          <UserPlus className="w-4 h-4" />
          {loading ? "Enregistrement…" : "Désigner"}
        </Button>
      </div>

      {currentHeirEmail && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-sm">
          <ShieldCheck className="w-4 h-4 text-foreground/50 shrink-0" />
          <span className="font-sans">
            Héritier actuel : <span className="text-foreground font-medium">{currentHeirEmail}</span>
          </span>
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-muted-foreground/70">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span className="font-sans italic">
          L'héritier désigné devra posséder un compte Floorence avec cette adresse email
          pour accéder aux droits de gestion.
        </span>
      </div>
    </div>
  );
};

export default DigitalHeirSettings;
