import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRelationWithDeceased } from '@/lib/relationshipInference';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import SortableTableHeader from '@/components/admin/SortableTableHeader';
import { useSortableTable } from '@/hooks/useSortableTable';
import { Eye, EyeOff, RotateCcw, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useServerPagination } from '@/hooks/useServerPagination';
import AdminPagination from '@/components/admin/AdminPagination';
import ExportCSVButton from '@/components/admin/ExportCSVButton';
import { logAuditAction } from '@/lib/auditLogger';

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
  photos: string[] | null;
  memorial?: {
    first_name: string;
    last_name: string;
    slug: string;
  };
}

const Moderation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<GuestbookPost | null>(null);
  const [hideReason, setHideReason] = useState('');
  const [showHideDialog, setShowHideDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPhotosDialog, setShowPhotosDialog] = useState(false);
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
        .select(`
          id, author_name, content, relation_category, is_hidden, hidden_reason, 
          created_at, memorial_id, candle_count, flower_count, photos,
          memorial:memorials!guestbook_posts_memorial_fk(first_name, last_name, slug)
        `)
        .order('created_at', { ascending: false })
        .range(pagination.from, pagination.to);

      if (error) throw error;
      return data as GuestbookPost[];
    },
  });

  const { sortConfig, handleSort, sortedData } = useSortableTable(posts, 'created_at', 'desc');

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

      // Log audit
      await logAuditAction(
        'guestbook_post_hidden',
        user?.id || '',
        user?.email || null,
        { guestbook_post_id: postId, reason }
      );
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

      // Log audit
      await logAuditAction(
        'guestbook_post_restored',
        user?.id || '',
        user?.email || null,
        { guestbook_post_id: postId }
      );
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
      const originalPost = selectedPost;
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

      // Log audit with changes
      await logAuditAction(
        'guestbook_post_updated',
        user?.id || '',
        user?.email || null,
        {
          guestbook_post_id: data.id,
          changes: {
            author_name: { old: originalPost?.author_name || '', new: data.author_name },
            content: { old: originalPost?.content || '', new: data.content },
            candle_count: { old: originalPost?.candle_count || 0, new: data.candle_count },
            flower_count: { old: originalPost?.flower_count || 0, new: data.flower_count },
          },
        }
      );
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

      // Log audit
      await logAuditAction(
        'guestbook_post_deleted',
        user?.id || '',
        user?.email || null,
        { guestbook_post_id: id, author_name: selectedPost?.author_name || '' }
      );
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

  const handleViewPhotos = (post: GuestbookPost) => {
    setSelectedPost(post);
    setShowPhotosDialog(true);
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
        <h1 className="text-3xl font-bold text-foreground">Modération des Hommages</h1>
        <ExportCSVButton
          fetchData={fetchAllPosts}
          columns={postColumns}
          filename={`moderation-${format(new Date(), 'yyyy-MM-dd')}`}
          label="Exporter les messages"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHeader
                  label="Auteur"
                  sortKey="author_name"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <TableCell className="font-medium text-muted-foreground">Défunt</TableCell>
                <SortableTableHeader
                  label="Lien avec le défunt"
                  sortKey="relation_category"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="Hommage"
                  sortKey="content"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="min-w-[300px]"
                />
                <SortableTableHeader
                  label="Photos"
                  sortKey="photos"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="Date"
                  sortKey="created_at"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="Statut"
                  sortKey="is_hidden"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <TableCell className="font-medium text-muted-foreground">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData?.map((post) => (
                <TableRow key={post.id} className={post.is_hidden ? 'opacity-60 bg-muted/30' : ''}>
                  <TableCell className="font-medium">{post.author_name}</TableCell>
                  <TableCell className="font-medium">
                    {post.memorial ? `${post.memorial.first_name} ${post.memorial.last_name}` : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getRelationWithDeceased(post.relation_category)}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="line-clamp-2 text-sm">{post.content}</p>
                  </TableCell>
                  <TableCell>
                    {post.photos && post.photos.length > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewPhotos(post)}
                        className="flex items-center gap-1"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span>{post.photos.length}</span>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(post.created_at), 'dd MMM yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell>
                    {post.is_hidden ? (
                      <Badge variant="destructive">Masqué</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800 border-green-200">Visible</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {post.is_hidden ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => restoreMutation.mutate(post.id)}
                          disabled={restoreMutation.isPending}
                          title="Restaurer"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleHide(post)}
                          title="Masquer"
                        >
                          <EyeOff className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(post)}
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(post)}
                        title="Supprimer"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" asChild title="Voir le mémorial">
                        <a 
                          href={post.memorial?.slug ? `/memorial/${post.memorial.slug}` : `/memorial/${post.memorial_id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!sortedData || sortedData.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Aucun hommage à modérer.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

      {/* Hide Dialog */}
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

      {/* Photos Dialog */}
      <Dialog open={showPhotosDialog} onOpenChange={setShowPhotosDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Photos de l'hommage</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            {selectedPost?.photos?.map((photo, index) => (
              <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhotosDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Moderation;
