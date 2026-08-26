import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, BookOpen, BarChart3, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ADMIN_PREFIX } from "@/lib/adminRoutes";

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

const AdminTemplates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTone, setFilterTone] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("guestbook_templates")
      .select("*")
      .is("deleted_at", null)
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

  const handleToggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("guestbook_templates")
      .update({ is_active: !current })
      .eq("id", id);

    if (error) {
      toast.error("Erreur de mise à jour");
      return;
    }
    toast.success(!current ? "Modèle activé" : "Modèle désactivé");
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_active: !current } : t))
    );
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("guestbook_templates")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", deleteTarget.id);

    if (error) {
      toast.error("Erreur de suppression");
      return;
    }
    toast.success("Modèle placé dans la corbeille — restaurable à tout moment");
    setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    setDeleteTarget(null);
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
        <Button onClick={() => navigate(`${ADMIN_PREFIX}/modeles/new`)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouveau modèle
        </Button>
      </div>

      {/* Top 5 most used */}
      {!loading && topUsed.some((t) => t.usage_count > 0) && (
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
            <TableHead className="w-[45%]">Contenu</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Ton</TableHead>
            <TableHead>Relation</TableHead>
            <TableHead className="text-right">Utilisations</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                <TableCell><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
              </TableRow>
            ))
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                Aucun modèle trouvé. Cliquez sur « Nouveau modèle » pour en créer un.
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
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {t.is_active ? "Actif" : "Inactif"}
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`${ADMIN_PREFIX}/modeles/${t.id}`)}
                      title="Modifier"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(t)}
                      className="text-destructive hover:text-destructive"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le modèle « {deleteTarget?.content.slice(0, 60)}… » sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminTemplates;
