import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRelationWithDeceased } from '@/lib/relationshipInference';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Eye, EyeOff, RotateCcw, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useServerPagination } from '@/hooks/useServerPagination';
import AdminPagination from '@/components/admin/AdminPagination';
import ExportCSVButton from '@/components/admin/ExportCSVButton';

interface GuestbookPost {
  id: string;
  author_name: string;
  content: string;
  relation_category: string;
  is_hidden: boolean;
  hidden_reason: string | null;
  created_at: string;
  memorial_id: string;
  candle_count: number;
  flower_count: number;
}

const Moderation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<GuestbookPost | null>(null);
  const [hideReason, setHideReason] = useState('');
  const [showHideDialog, setShowHideDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    author_name: '',
    content: '',
    candle_count: 0,
    flower_count: 0,
  });

  const pagination = useServerPagination(10);

  // Fetch total count
  const { data: countData } = useQuery({
    queryKey: ['admin-guestbook-posts-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('guestbook_posts')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (countData !== undefined) {
      pagination.setTotalCount(countData);
    }
  }, [countData, pagination.setTotalCount]);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin-guestbook-posts', pagination.page, pagination.pageSize],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guestbook_posts')
        .select('id, author_name, content, relation_category, is_hidden, hidden_reason, created_at, memorial_id, candle_count, flower_count')
        .order('created_at', { ascending: false })
        .range(pagination.from, pagination.to);

      if (error) throw error;
      return data as GuestbookPost[];
    },
  });

  const hideMutation = useMutation({
    mutationFn: async ({ postId, reason }: { postId: string; reason: string }) => {
      const { error } = await supabase
        .from('guestbook_posts')
        .update({
          is_hidden: true,
          hidden_at: new Date().toISOString(),
          hidden_by: user?.id,
          hidden_reason: reason,
        })
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-guestbook-posts'] });
      toast.success('Message masqué');
      setShowHideDialog(false);
      setHideReason('');
      setSelectedPost(null);
    },
    onError: () => {
      toast.error('Erreur lors du masquage');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('guestbook_posts')
        .update({
          is_hidden: false,
          hidden_at: null,
          hidden_by: null,
          hidden_reason: null,
        })
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-guestbook-posts'] });
      toast.success('Message restauré');
    },
    onError: () => {
      toast.error('Erreur lors de la restauration');
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: { id: string; author_name: string; content: string; candle_count: number; flower_count: number }) => {
      const { error } = await supabase
        .from('guestbook_posts')
        .update({
          author_name: data.author_name,
          content: data.content,
          candle_count: data.candle_count,
          flower_count: data.flower_count,
        })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-guestbook-posts'] });
      toast.success('Hommage modifié avec succès');
      setShowEditDialog(false);
      setSelectedPost(null);
    },
    onError: () => {
      toast.error('Erreur lors de la modification');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('guestbook_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-guestbook-posts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-guestbook-posts-count'] });
      toast.success('Hommage supprimé avec succès');
      setShowDeleteDialog(false);
      setSelectedPost(null);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const handleHide = (post: GuestbookPost) => {
    setSelectedPost(post);
    setShowHideDialog(true);
  };

  const handleEdit = (post: GuestbookPost) => {
    setSelectedPost(post);
    setEditForm({
      author_name: post.author_name,
      content: post.content,
      candle_count: post.candle_count,
      flower_count: post.flower_count,
    });
    setShowEditDialog(true);
  };

  const handleDelete = (post: GuestbookPost) => {
    setSelectedPost(post);
    setShowDeleteDialog(true);
  };

  const confirmHide = () => {
    if (selectedPost && hideReason.trim()) {
      hideMutation.mutate({ postId: selectedPost.id, reason: hideReason });
    }
  };

  const confirmEdit = () => {
    if (selectedPost) {
      editMutation.mutate({
        id: selectedPost.id,
        ...editForm,
      });
    }
  };

  const confirmDelete = () => {
    if (selectedPost) {
      deleteMutation.mutate(selectedPost.id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  const fetchAllPosts = async () => {
    const { data, error } = await supabase
      .from('guestbook_posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as GuestbookPost[];
  };

  const postColumns: { key: keyof GuestbookPost; label: string }[] = [
    { key: 'id', label: 'ID' },
    { key: 'author_name', label: 'Auteur' },
    { key: 'relation_category', label: 'Relation' },
    { key: 'content', label: 'Contenu' },
    { key: 'is_hidden', label: 'Masqué' },
    { key: 'hidden_reason', label: 'Raison' },
    { key: 'created_at', label: 'Date de création' },
    { key: 'memorial_id', label: 'ID Mémorial' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">Modération</h1>
        <ExportCSVButton
          fetchData={fetchAllPosts}
          columns={postColumns}
          filename={`moderation-${format(new Date(), 'yyyy-MM-dd')}`}
          label="Exporter les messages"
        />
      </div>

      <div className="space-y-4">
        {posts?.map((post) => (
          <Card key={post.id} className={post.is_hidden ? 'opacity-60' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{post.author_name}</CardTitle>
                  <Badge variant="secondary">{getRelationWithDeceased(post.relation_category)}</Badge>
                  {post.is_hidden && (
                    <Badge variant="destructive">Masqué</Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(post.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground mb-4">{post.content}</p>

              {post.hidden_reason && (
                <p className="text-sm text-muted-foreground italic mb-4">
                  Raison du masquage : {post.hidden_reason}
                </p>
              )}

              <div className="flex gap-2">
                {post.is_hidden ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restoreMutation.mutate(post.id)}
                    disabled={restoreMutation.isPending}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restaurer
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleHide(post)}
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    Masquer
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(post)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(post)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href={`/memorial/${post.memorial_id}`} target="_blank" rel="noopener noreferrer">
                  <Eye className="w-4 h-4 mr-2" />
                  Voir le mémorial
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {posts?.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucun message à modérer.
            </CardContent>
          </Card>
        )}
      </div>

      <AdminPagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalCount={pagination.totalCount}
        totalPages={pagination.totalPages}
        hasNextPage={pagination.hasNextPage}
        hasPreviousPage={pagination.hasPreviousPage}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />

      <Dialog open={showHideDialog} onOpenChange={setShowHideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masquer ce message</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Indiquez la raison du masquage (visible uniquement par les administrateurs) :
            </p>
            <Textarea
              value={hideReason}
              onChange={(e) => setHideReason(e.target.value)}
              placeholder="Raison du masquage..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHideDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmHide}
              disabled={!hideReason.trim() || hideMutation.isPending}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l'hommage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="author_name">Nom de l'auteur</Label>
              <Input
                id="author_name"
                value={editForm.author_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, author_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Message</Label>
              <Textarea
                id="content"
                value={editForm.content}
                onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="candle_count">Cierges</Label>
                <Input
                  id="candle_count"
                  type="number"
                  min="0"
                  value={editForm.candle_count}
                  onChange={(e) => setEditForm(prev => ({ ...prev, candle_count: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flower_count">Fleurs</Label>
                <Input
                  id="flower_count"
                  type="number"
                  min="0"
                  value={editForm.flower_count}
                  onChange={(e) => setEditForm(prev => ({ ...prev, flower_count: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={confirmEdit} disabled={editMutation.isPending}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'hommage</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer l'hommage de{' '}
              <strong>{selectedPost?.author_name}</strong> ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Moderation;
