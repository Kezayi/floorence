import { useState, useMemo, useEffect } from "react";
import { Link2, Search, Loader2, ArrowRight, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemorials } from "@/contexts/MemorialsContext";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { getGenderAwareRelation } from "@/lib/relationshipInference";
import { validateChronologicalCoherence } from "@/lib/chronologicalValidation";

interface RequestLinkDialogProps {
  memorialId: string;
  memorialName: string;
}

// Relation types for deceased-to-deceased links
// Format: "[Source] est [label] de [Target]"
const interMemorialRelations = {
  "Famille directe": [
    { value: "Père", label: "le Père" },
    { value: "Mère", label: "la Mère" },
    { value: "Fils", label: "le Fils" },
    { value: "Fille", label: "la Fille" },
    { value: "Frère", label: "le Frère" },
    { value: "Sœur", label: "la Sœur" },
    { value: "Grand-père", label: "le Grand-père" },
    { value: "Grand-mère", label: "la Grand-mère" },
    { value: "Petit-fils", label: "le Petit-fils" },
    { value: "Petite-fille", label: "la Petite-fille" },
  ],
  "Famille élargie": [
    { value: "Oncle", label: "l'Oncle" },
    { value: "Tante", label: "la Tante" },
    { value: "Neveu", label: "le Neveu" },
    { value: "Nièce", label: "la Nièce" },
    { value: "Cousin", label: "le Cousin" },
    { value: "Cousine", label: "la Cousine" },
  ],
  "Alliés": [
    { value: "Époux", label: "l'Époux" },
    { value: "Épouse", label: "l'Épouse" },
    { value: "Beau-père", label: "le Beau-père" },
    { value: "Belle-mère", label: "la Belle-mère" },
    { value: "Gendre", label: "le Gendre" },
    { value: "Belle-fille", label: "la Belle-fille" },
  ],
};

const RequestLinkDialog = ({ memorialId, memorialName }: RequestLinkDialogProps) => {
  const { user } = useAuth();
  const { memorials } = useMemorials();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemorialId, setSelectedMemorialId] = useState<string | null>(null);
  const [relationType, setRelationType] = useState("");
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Source memorial from context
  const sourceMemorial = useMemo(
    () => memorials.find((m) => m.id === memorialId),
    [memorials, memorialId]
  );
  const sourceFirstName = sourceMemorial?.name.split(" ")[0] || memorialName.split(" ")[0];

  // Filter memorials for search (exclude current memorial)
  const searchResults = useMemo(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) return [];
    const query = debouncedSearch.toLowerCase();
    return memorials
      .filter(
        (m) =>
          m.id !== memorialId &&
          m.name.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [memorials, debouncedSearch, memorialId]);

  const selectedMemorial = useMemo(
    () => memorials.find((m) => m.id === selectedMemorialId),
    [memorials, selectedMemorialId]
  );

  // Gender-aware relation label
  const genderAwareLabel = useMemo(() => {
    if (!relationType) return "";
    return getGenderAwareRelation(relationType, sourceFirstName);
  }, [relationType, sourceFirstName]);

  // Chronological validation — fetch raw birth dates via supabase
  const [sourceBirthDate, setSourceBirthDate] = useState<string | null>(null);
  const [targetBirthDate, setTargetBirthDate] = useState<string | null>(null);

  // Fetch birth dates when dialog opens and memorial is selected
  useEffect(() => {
    if (!open) return;
    supabase.from('memorials').select('birth_date').eq('id', memorialId).single()
      .then(({ data }) => setSourceBirthDate(data?.birth_date || null));
  }, [open, memorialId]);

  useEffect(() => {
    if (!selectedMemorialId) { setTargetBirthDate(null); return; }
    supabase.from('memorials').select('birth_date').eq('id', selectedMemorialId).single()
      .then(({ data }) => setTargetBirthDate(data?.birth_date || null));
  }, [selectedMemorialId]);

  const chronoValidation = useMemo(() => {
    if (!relationType || !selectedMemorialId) return null;
    return validateChronologicalCoherence(sourceBirthDate, targetBirthDate, relationType);
  }, [relationType, selectedMemorialId, sourceBirthDate, targetBirthDate]);

  const handleSubmit = async () => {
    if (!user || !selectedMemorialId || !relationType) return;

    // Block if chronologically invalid
    if (chronoValidation && !chronoValidation.isValid) {
      toast.error(chronoValidation.message || "Incohérence chronologique détectée.");
      return;
    }

    // Apply gender-aware relation type
    const finalRelationType = getGenderAwareRelation(relationType, sourceFirstName);

    setLoading(true);
    try {
      // Check for duplicate
      const { data: existing } = await supabase
        .from("memorial_relations")
        .select("id")
        .or(
          `and(memorial_id_1.eq.${memorialId},memorial_id_2.eq.${selectedMemorialId}),and(memorial_id_1.eq.${selectedMemorialId},memorial_id_2.eq.${memorialId})`
        );

      if (existing && existing.length > 0) {
        toast.error("Une demande de liaison existe déjà entre ces deux mémoriaux.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("memorial_relations").insert({
        memorial_id_1: memorialId,
        memorial_id_2: selectedMemorialId,
        relation_type: finalRelationType,
        requested_by: user.id,
        status: "pending",
        is_demo: false,
      });

      if (error) {
        console.error("Error creating link request:", error);
        toast.error("Erreur lors de l'envoi de la demande");
        return;
      }

      toast.success("Demande de liaison envoyée ! Le propriétaire sera notifié.");
      setOpen(false);
      setSearchQuery("");
      setSelectedMemorialId(null);
      setRelationType("");
    } catch (err) {
      console.error("Error:", err);
      toast.error("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearchQuery("");
    setSelectedMemorialId(null);
    setRelationType("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) handleReset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Link2 className="w-4 h-4" />
          Relier à un Ancêtre
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-[hsl(45,90%,50%)]" />
            Relier deux mémoriaux
          </DialogTitle>
          <DialogDescription>
            Créez un lien familial entre {memorialName} et un autre défunt pour enrichir le maillage communautaire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Search target memorial */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              1. Rechercher le mémorial à relier
            </Label>
            {!selectedMemorial ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Tapez le nom du défunt..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    {searchResults.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedMemorialId(m.id);
                          setSearchQuery("");
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left border-b border-border last:border-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {m.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{m.name}</p>
                          {m.deathDate && (
                            <p className="text-xs text-muted-foreground">
                              Décédé(e) le {new Date(m.deathDate).toLocaleDateString("fr-FR")}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {debouncedSearch.length >= 2 && searchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Aucun mémorial trouvé pour "{debouncedSearch}"
                  </p>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {selectedMemorial.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <span className="font-medium text-sm">{selectedMemorial.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedMemorialId(null)}>
                  Changer
                </Button>
              </div>
            )}
          </div>

          {/* Visual link preview */}
          {selectedMemorial && (
            <div className="flex items-center justify-center gap-3 py-2">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary mx-auto">
                  {memorialName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 max-w-[80px] truncate">{memorialName}</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <ArrowRight className="w-5 h-5 text-[hsl(45,90%,50%)]" />
                <span className="text-[10px] text-[hsl(45,90%,50%)] font-medium">
                  {genderAwareLabel || "..."}
                </span>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground mx-auto">
                  {selectedMemorial.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 max-w-[80px] truncate">{selectedMemorial.name}</p>
              </div>
            </div>
          )}

          {/* Step 2: Select relation type */}
          {selectedMemorial && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                2. Quel est le lien entre eux ?
              </Label>
              <p className="text-xs text-muted-foreground">
                {memorialName} est <span className="font-medium">{genderAwareLabel ? genderAwareLabel : "___"}</span> de {selectedMemorial.name}
              </p>
              <Select value={relationType} onValueChange={setRelationType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez le lien familial" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {Object.entries(interMemorialRelations).map(([category, relations]) => (
                    <SelectGroup key={category}>
                      <SelectLabel className="text-xs text-muted-foreground font-sans">
                        {category}
                      </SelectLabel>
                      {relations.map((rel) => (
                        <SelectItem key={rel.value} value={rel.value}>
                          {rel.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Chronological validation */}
          {chronoValidation && !chronoValidation.isValid && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {chronoValidation.message}
              </AlertDescription>
            </Alert>
          )}

          {chronoValidation && chronoValidation.isValid && chronoValidation.isVerified && relationType && (
            <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-md">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-primary">{chronoValidation.details}</span>
            </div>
          )}

          {/* Info notice */}
          {selectedMemorial && relationType && chronoValidation?.isValid !== false && (
            <div className="bg-muted/50 border border-border rounded-lg p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">📬 Notification envoyée</p>
              <p>
                Le propriétaire du mémorial de {selectedMemorial.name} recevra une notification pour 
                valider ce lien. Le Pont des Ancêtres apparaîtra dans le graphe communautaire une fois accepté.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedMemorialId || !relationType || (chronoValidation !== null && !chronoValidation.isValid)}
            className="gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Envoi..." : "Envoyer la demande"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RequestLinkDialog;
