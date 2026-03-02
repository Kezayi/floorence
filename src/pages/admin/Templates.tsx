import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, BookOpen, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Template {
  id: string;
  content: string;
  category: string;
  tone: string;
  relation: string | null;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

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
  { value: "", label: "Toutes" },
  { value: "ami", label: "Ami" },
  { value: "collegue", label: "Collègue" },
  { value: "famille", label: "Famille" },
];

const AdminTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterTone, setFilterTone] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // New template form
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("solennel");
  const [newTone, setNewTone] = useState("sobre");
  const [newRelation, setNewRelation] = useState("");

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    // Admin RLS policy lets admins see all (including inactive)
    const { data, error } = await supabase
      .from("guestbook_templates")
      .select("*")
      .order("usage_count", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement des modèles");
      console.error(error);
    } else {
      setTemplates((data as Template[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = async () => {
    if (!newContent.trim()) {
      toast.error("Le contenu est obligatoire");
      return;
    }

    const { error } = await supabase.from("guestbook_templates").insert({
      content: newContent.trim(),
      category: newCategory,
      tone: newTone,
      relation: newRelation || null,
      is_active: true,
    });

    if (error) {
      toast.error("Erreur lors de la création");
      console.error(error);
      return;
    }

    toast.success("Modèle ajouté");
    setNewContent("");
    setNewRelation("");
    setDialogOpen(false);
    fetchTemplates();
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("guestbook_templates")
      .update({ is_active: !current })
      .eq("id", id);

    if (error) {
      toast.error("Erreur de mise à jour");
      return;
    }
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_active: !current } : t))
    );
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("guestbook_templates")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur de suppression");
      return;
    }
    toast.success("Modèle supprimé");
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const filtered = templates.filter((t) => {
    if (filterTone !== "all" && t.tone !== filterTone) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    return true;
  });

  const topUsed = [...templates].sort((a, b) => b.usage_count - a.usage_count).slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Bibliothèque de Modèles
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {templates.length} modèles • Utilisez <code className="bg-muted px-1 rounded text-xs">{`{{name}}`}</code> pour insérer le nom du défunt
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouveau modèle
        </Button>
      </div>

      {/* Top 5 most used */}
      {topUsed.some((t) => t.usage_count > 0) && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4" />
            Top modèles les plus utilisés
          </h3>
          <div className="space-y-2">
            {topUsed
              .filter((t) => t.usage_count > 0)
              .map((t, i) => (
                <div key={t.id} className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground w-5 text-right font-mono">{i + 1}.</span>
                  <span className="flex-1 truncate text-foreground">{t.content.slice(0, 80)}…</span>
                  <Badge variant="secondary" className="text-xs">{t.usage_count} utilisations</Badge>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {CATEGORY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTone} onValueChange={setFilterTone}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Ton" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les tons</SelectItem>
            {TONE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Contenu</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Ton</TableHead>
            <TableHead>Relation</TableHead>
            <TableHead className="text-right">Utilisations</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Chargement…
              </TableCell>
            </TableRow>
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Aucun modèle trouvé
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((t) => (
              <TableRow key={t.id} className={!t.is_active ? "opacity-50" : ""}>
                <TableCell className="font-serif text-sm max-w-xs">
                  <span className="line-clamp-2">{t.content}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs capitalize">{t.category}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs capitalize">{t.tone}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground capitalize">
                  {t.relation || "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">{t.usage_count}</TableCell>
                <TableCell>
                  <button
                    onClick={() => handleToggleActive(t.id, t.is_active ?? true)}
                    className={`text-xs px-2 py-1 rounded-sm transition-colors ${
                      t.is_active
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {t.is_active ? "Actif" : "Inactif"}
                  </button>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(t.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau modèle de condoléances</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Contenu du message</Label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder={`Ex: {{name}} restera à jamais dans nos cœurs…`}
                rows={4}
                className="w-full mt-1 p-3 border border-input rounded-md text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Utilisez <code className="bg-muted px-1 rounded">{`{{name}}`}</code> pour le nom du défunt
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Catégorie</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
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
                <Select value={newTone} onValueChange={setNewTone}>
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
                <Select value={newRelation} onValueChange={setNewRelation}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTemplates;
