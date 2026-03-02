import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ADMIN_PREFIX } from "@/lib/adminRoutes";
import { ArrowLeft } from "lucide-react";

const TONE_OPTIONS = [
  { value: "sobre", label: "Sobre" },
  { value: "poetique", label: "Poétique" },
  { value: "religieux", label: "Religieux" },
];

const CATEGORY_OPTIONS = [
  { value: "solennel", label: "Solennel" },
  { value: "familial", label: "Familial" },
  { value: "religieux", label: "Religieux" },
];

const RELATION_OPTIONS = [
  { value: "_none", label: "Toutes" },
  { value: "ami", label: "Ami" },
  { value: "collegue", label: "Collègue" },
  { value: "famille", label: "Famille" },
];

interface TemplateFormProps {
  templateId?: string; // If provided, edit mode
}

const TemplateForm = ({ templateId }: TemplateFormProps) => {
  const navigate = useNavigate();
  const isEdit = !!templateId;

  const [content, setContent] = useState("");
  const [category, setCategory] = useState("solennel");
  const [tone, setTone] = useState("sobre");
  const [relation, setRelation] = useState("_none");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (!templateId) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("guestbook_templates")
        .select("*")
        .eq("id", templateId)
        .single();
      if (error || !data) {
        toast.error("Modèle introuvable");
        navigate(`${ADMIN_PREFIX}/modeles`);
        return;
      }
      setContent(data.content);
      setCategory(data.category);
      setTone(data.tone);
      setRelation(data.relation || "_none");
      setFetching(false);
    };
    load();
  }, [templateId, navigate]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Le contenu est obligatoire");
      return;
    }
    setLoading(true);

    const payload = {
      content: content.trim(),
      category,
      tone,
      relation: relation === "_none" ? null : relation,
      is_active: true,
    };

    const { error } = isEdit
      ? await supabase.from("guestbook_templates").update(payload).eq("id", templateId!)
      : await supabase.from("guestbook_templates").insert(payload);

    setLoading(false);
    if (error) {
      toast.error(isEdit ? "Erreur de mise à jour" : "Erreur lors de la création");
      console.error(error);
      return;
    }

    toast.success(isEdit ? "Modèle mis à jour" : "Modèle ajouté avec succès");
    navigate(`${ADMIN_PREFIX}/modeles`);
  };

  if (fetching) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-32 bg-muted rounded" />
        <div className="flex gap-3">
          <div className="h-10 w-40 bg-muted rounded" />
          <div className="h-10 w-40 bg-muted rounded" />
          <div className="h-10 w-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`${ADMIN_PREFIX}/modeles`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">
          {isEdit ? "Modifier le modèle" : "Nouveau modèle de condoléances"}
        </h1>
      </div>

      <div className="space-y-4 bg-card border border-border rounded-lg p-6">
        <div>
          <Label>Contenu du message</Label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Ex: {{name}} restera à jamais dans nos cœurs…`}
            rows={5}
            className="w-full mt-1 p-3 border border-input rounded-md text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Utilisez <code className="bg-muted px-1 rounded">{`{{name}}`}</code> pour insérer automatiquement le nom du défunt lors de l'affichage.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Catégorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ton</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Relation</Label>
            <Select value={relation} onValueChange={setRelation}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => navigate(`${ADMIN_PREFIX}/modeles`)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Créer le modèle"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TemplateForm;
