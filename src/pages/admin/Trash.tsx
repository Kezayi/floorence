import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Trash2, RotateCcw, Flower2, MessageSquare, BookOpen, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditAction } from '@/lib/auditLogger';
import { ADMIN_PREFIX } from '@/lib/adminRoutes';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

type TrashKind = 'memorials' | 'guestbook_posts' | 'guestbook_templates';

interface PurgeTarget {
  kind: TrashKind;
  id: string;
  label: string;
}

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

const AdminTrash = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [purgeTarget, setPurgeTarget] = useState<PurgeTarget | null>(null);

  const memorialsQuery = useQuery({
    queryKey: ['admin-trash', 'memorials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memorials')
        .select('id, first_name, last_name, slug, deleted_at')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const postsQuery = useQuery({
    queryKey: ['admin-trash', 'guestbook_posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guestbook_posts')
        .select('id, author_name, content, deleted_at, memorial_id')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const templatesQuery = useQuery({
    queryKey: ['admin-trash', 'guestbook_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guestbook_templates')
        .select('id, content, category, tone, deleted_at')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-trash'] });
    queryClient.invalidateQueries({ queryKey: ['admin-memorials'] });
    queryClient.invalidateQueries({ queryKey: ['admin-memorials-count'] });
    queryClient.invalidateQueries({ queryKey: ['admin-guestbook-posts'] });
    queryClient.invalidateQueries({ queryKey: ['admin-guestbook-posts-count'] });
  };

  const restoreMutation = useMutation({
    mutationFn: async ({ kind, id }: { kind: TrashKind; id: string }) => {
      if (kind === 'memorials') {
        const { error } = await supabase
          .from('memorials')
          .update({ deleted_at: null, deleted_by: null, is_active: true })
          .eq('id', id);
        if (error) throw error;
        const { error: postsError } = await supabase
          .from('guestbook_posts')
          .update({ deleted_at: null, deleted_by: null })
          .eq('memorial_id', id)
          .not('deleted_at', 'is', null);
        if (postsError) throw postsError;
      } else if (kind === 'guestbook_posts') {
        const { error } = await supabase
          .from('guestbook_posts')
          .update({ deleted_at: null, deleted_by: null, is_hidden: false })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('guestbook_templates')
          .update({ deleted_at: null })
          .eq('id', id);
        if (error) throw error;
      }
      await logAuditAction('trash_restored', user?.id || '', user?.email || null, { kind, id });
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Élément restauré');
    },
    onError: () => toast.error('Erreur lors de la restauration'),
  });

  const purgeMutation = useMutation({
    mutationFn: async ({ kind, id }: { kind: TrashKind; id: string }) => {
      if (kind === 'memorials') {
        const { error: postsError } = await supabase.from('guestbook_posts').delete().eq('memorial_id', id);
        if (postsError) throw postsError;
        const { error: eventsError } = await supabase.from('memorial_events').delete().eq('memorial_id', id);
        if (eventsError) throw eventsError;
      }
      const { error } = await supabase.from(kind).delete().eq('id', id);
      if (error) throw error;
      await logAuditAction('trash_purged', user?.id || '', user?.email || null, { kind, id });
    },
    onSuccess: () => {
      invalidateAll();
      setPurgeTarget(null);
      toast.success('Suppression définitive effectuée');
    },
    onError: () => toast.error('Erreur lors de la suppression définitive'),
  });

  const renderActions = (kind: TrashKind, id: string, label: string) => (
    <div className="flex justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => restoreMutation.mutate({ kind, id })}
        disabled={restoreMutation.isPending}
      >
        <RotateCcw className="w-4 h-4 mr-1.5" />
        Restaurer
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setPurgeTarget({ kind, id, label })}
      >
        <Trash2 className="w-4 h-4 mr-1.5" />
        Supprimer définitivement
      </Button>
    </div>
  );

  const isLoading = memorialsQuery.isLoading || postsQuery.isLoading || templatesQuery.isLoading;

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Fil d'Ariane — Norme AAA Pilier 7B */}
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to={ADMIN_PREFIX} className="hover:text-foreground transition-colors">
          Administration
        </Link>
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="text-foreground">Corbeille</span>
      </nav>

      <header>
        <h1 className="text-2xl md:text-3xl font-serif">Corbeille</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Les éléments supprimés restent restaurables sans limite de temps. Ils sont invisibles du public.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="memorials">
          <TabsList>
            <TabsTrigger value="memorials" className="gap-2">
              <Flower2 className="w-4 h-4" aria-hidden="true" />
              Mémoriaux ({memorialsQuery.data?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-2">
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              Hommages ({postsQuery.data?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              Modèles ({templatesQuery.data?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="memorials" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Défunt</TableHead>
                  <TableHead>Mis en corbeille le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(memorialsQuery.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Aucun mémorial en corbeille.
                    </TableCell>
                  </TableRow>
                ) : (
                  (memorialsQuery.data ?? []).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {m.first_name} {m.last_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(m.deleted_at)}</TableCell>
                      <TableCell>
                        {renderActions('memorials', m.id, `${m.first_name} ${m.last_name}`)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="posts" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Auteur</TableHead>
                  <TableHead>Extrait</TableHead>
                  <TableHead>Mis en corbeille le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(postsQuery.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Aucun hommage en corbeille.
                    </TableCell>
                  </TableRow>
                ) : (
                  (postsQuery.data ?? []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.author_name}</TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">{p.content}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(p.deleted_at)}</TableCell>
                      <TableCell>{renderActions('guestbook_posts', p.id, p.author_name)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modèle</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Mis en corbeille le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(templatesQuery.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Aucun modèle en corbeille.
                    </TableCell>
                  </TableRow>
                ) : (
                  (templatesQuery.data ?? []).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="max-w-md truncate">{t.content}</TableCell>
                      <TableCell className="text-muted-foreground">{t.category}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(t.deleted_at)}</TableCell>
                      <TableCell>{renderActions('guestbook_templates', t.id, t.category)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      )}

      <AlertDialog open={!!purgeTarget} onOpenChange={(open) => !open && setPurgeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suppression définitive</AlertDialogTitle>
            <AlertDialogDescription>
              « {purgeTarget?.label} » sera effacé de façon irréversible, ainsi que les contenus liés. Cette
              action ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => purgeTarget && purgeMutation.mutate(purgeTarget)}
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminTrash;
