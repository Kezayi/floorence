import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import SortableTableHeader from '@/components/admin/SortableTableHeader';
import { useSortableTable } from '@/hooks/useSortableTable';
import { Search, GitMerge, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useServerPagination } from '@/hooks/useServerPagination';
import AdminPagination from '@/components/admin/AdminPagination';
import ExportCSVButton from '@/components/admin/ExportCSVButton';
import { logAuditAction } from '@/lib/auditLogger';

interface Memorial {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  death_date: string | null;
  birth_date: string | null;
  biography: string | null;
  photo_url: string | null;
  photos: string[] | null;
  is_active: boolean;
  merged_into: string | null;
  created_at: string;
  created_by: string;
}

interface Profile {
  user_id: string;
  display_name: string | null;
}

const Memorials = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemorial, setSelectedMemorial] = useState<Memorial | null>(null);
  const [targetMemorialId, setTargetMemorialId] = useState<string>('');
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    death_date: '',
    biography: '',
  });

  const pagination = useServerPagination(10);

  // Fetch total count with search filter
  const { data: countData } = useQuery({
    queryKey: ['admin-memorials-count', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('memorials')
        .select('*', { count: 'exact', head: true });

      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (countData !== undefined) {
      pagination.setTotalCount(countData);
    }
  }, [countData, pagination.setTotalCount]);

  // Reset to page 1 when search changes
  useEffect(() => {
    pagination.resetPage();
  }, [searchQuery]);

  const { data: memorials, isLoading } = useQuery({
    queryKey: ['admin-memorials', pagination.page, pagination.pageSize, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('memorials')
        .select('id, slug, first_name, last_name, death_date, birth_date, biography, photo_url, photos, is_active, merged_into, created_at, created_by')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.range(pagination.from, pagination.to);
      if (error) throw error;
      return data as Memorial[];
    },
  });

  // Fetch creator profiles
  const { data: profiles } = useQuery({
    queryKey: ['admin-memorial-profiles', memorials?.map(m => m.created_by)],
    queryFn: async () => {
      if (!memorials || memorials.length === 0) return [];
      const creatorIds = [...new Set(memorials.map(m => m.created_by))];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', creatorIds);
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!memorials && memorials.length > 0,
  });

  const getCreatorName = (createdBy: string) => {
    const profile = profiles?.find(p => p.user_id === createdBy);
    return profile?.display_name || 'Inconnu';
  };

  const { sortConfig, handleSort, sortedData } = useSortableTable(memorials, 'created_at', 'desc');

  // Fetch all memorials for merge target selection (without pagination)
  const { data: allMemorials } = useQuery({
    queryKey: ['admin-memorials-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memorials')
        .select('id, first_name, last_name, merged_into')
        .is('merged_into', null)
        .order('last_name', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: showMergeDialog,
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ sourceId, targetId }: { sourceId: string; targetId: string }) => {
      // Mark source as merged into target
      const { error: mergeError } = await supabase
        .from('memorials')
        .update({ merged_into: targetId, is_active: false })
        .eq('id', sourceId);

      if (mergeError) throw mergeError;

      // Move all guestbook posts to target memorial
      const { error: postsError } = await supabase
        .from('guestbook_posts')
        .update({ memorial_id: targetId })
        .eq('memorial_id', sourceId);

      if (postsError) throw postsError;

      // Log audit
      await logAuditAction(
        'memorial_merged',
        user?.id || '',
        user?.email || null,
        { source_memorial_id: sourceId, target_memorial_id: targetId }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-memorials'] });
      queryClient.invalidateQueries({ queryKey: ['admin-memorials-count'] });
      toast.success('Mémoriaux fusionnés avec succès');
      setShowMergeDialog(false);
      setSelectedMemorial(null);
      setTargetMemorialId('');
    },
    onError: () => {
      toast.error('Erreur lors de la fusion');
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: { id: string; first_name: string; last_name: string; birth_date: string | null; death_date: string | null; biography: string | null }) => {
      const originalMemorial = selectedMemorial;
      const { error } = await supabase
        .from('memorials')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          birth_date: data.birth_date || null,
          death_date: data.death_date || null,
          biography: data.biography || null,
        })
        .eq('id', data.id);

      if (error) throw error;

      // Log audit with changes
      await logAuditAction(
        'memorial_updated',
        user?.id || '',
        user?.email || null,
        {
          memorial_id: data.id,
          changes: {
            first_name: { old: originalMemorial?.first_name || '', new: data.first_name },
            last_name: { old: originalMemorial?.last_name || '', new: data.last_name },
            biography: { old: originalMemorial?.biography || '', new: data.biography || '' },
          },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-memorials'] });
      toast.success('Mémorial modifié avec succès');
      setShowEditDialog(false);
      setSelectedMemorial(null);
    },
    onError: () => {
      toast.error('Erreur lors de la modification');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete related guestbook posts
      const { error: postsError } = await supabase
        .from('guestbook_posts')
        .delete()
        .eq('memorial_id', id);

      if (postsError) throw postsError;

      // Then delete memorial events
      const { error: eventsError } = await supabase
        .from('memorial_events')
        .delete()
        .eq('memorial_id', id);

      if (eventsError) throw eventsError;

      // Finally delete the memorial
      const { error } = await supabase
        .from('memorials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log audit
      await logAuditAction(
        'memorial_deleted',
        user?.id || '',
        user?.email || null,
        { memorial_id: id, name: `${selectedMemorial?.first_name} ${selectedMemorial?.last_name}` }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-memorials'] });
      queryClient.invalidateQueries({ queryKey: ['admin-memorials-count'] });
      toast.success('Mémorial supprimé avec succès');
      setShowDeleteDialog(false);
      setSelectedMemorial(null);
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Erreur lors de la suppression');
    },
  });

  const handleMerge = (memorial: Memorial) => {
    setSelectedMemorial(memorial);
    setShowMergeDialog(true);
  };

  const handleEdit = (memorial: Memorial) => {
    setSelectedMemorial(memorial);
    setEditForm({
      first_name: memorial.first_name,
      last_name: memorial.last_name,
      birth_date: memorial.birth_date || '',
      death_date: memorial.death_date || '',
      biography: memorial.biography || '',
    });
    setShowEditDialog(true);
  };

  const handleDelete = (memorial: Memorial) => {
    setSelectedMemorial(memorial);
    setShowDeleteDialog(true);
  };

  const confirmMerge = () => {
    if (selectedMemorial && targetMemorialId) {
      mergeMutation.mutate({
        sourceId: selectedMemorial.id,
        targetId: targetMemorialId,
      });
    }
  };

  const confirmEdit = () => {
    if (selectedMemorial) {
      editMutation.mutate({
        id: selectedMemorial.id,
        ...editForm,
        birth_date: editForm.birth_date || null,
        death_date: editForm.death_date || null,
        biography: editForm.biography || null,
      });
    }
  };

  const confirmDelete = () => {
    if (selectedMemorial) {
      deleteMutation.mutate(selectedMemorial.id);
    }
  };

  // Find potential duplicates (same last name)
  const findDuplicates = (memorial: Memorial) => {
    return memorials?.filter(
      (m) =>
        m.id !== memorial.id &&
        m.last_name.toLowerCase() === memorial.last_name.toLowerCase() &&
        !m.merged_into
    );
  };

  const getPhotoUrl = (memorial: Memorial) => {
    if (memorial.photo_url) return memorial.photo_url;
    if (memorial.photos && memorial.photos.length > 0) return memorial.photos[0];
    return null;
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  const fetchAllMemorials = async () => {
    const { data, error } = await supabase
      .from('memorials')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Memorial[];
  };

  const memorialColumns: { key: keyof Memorial; label: string }[] = [
    { key: 'id', label: 'ID' },
    { key: 'slug', label: 'Slug' },
    { key: 'first_name', label: 'Prénom' },
    { key: 'last_name', label: 'Nom' },
    { key: 'death_date', label: 'Date de décès' },
    { key: 'is_active', label: 'Actif' },
    { key: 'merged_into', label: 'Fusionné dans' },
    { key: 'created_at', label: 'Date de création' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">Gestion des Mémoriaux</h1>
        <ExportCSVButton
          fetchData={fetchAllMemorials}
          columns={memorialColumns}
          filename={`memoriaux-${format(new Date(), 'yyyy-MM-dd')}`}
          label="Exporter les mémoriaux"
        />
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un défunt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground w-16">Photo</TableCell>
                <SortableTableHeader
                  label="Nom du défunt"
                  sortKey="last_name"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="Biographie"
                  sortKey="biography"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="min-w-[250px]"
                />
                <SortableTableHeader
                  label="Créateur"
                  sortKey="created_by"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="Date de création"
                  sortKey="created_at"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="Statut"
                  sortKey="is_active"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <TableCell className="font-medium text-muted-foreground">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData?.map((memorial) => {
                const duplicates = findDuplicates(memorial);
                const hasDuplicates = duplicates && duplicates.length > 0;
                const photoUrl = getPhotoUrl(memorial);

                return (
                  <TableRow key={memorial.id} className={memorial.merged_into ? 'opacity-50 bg-muted/30' : ''}>
                    <TableCell>
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={photoUrl || undefined} alt={`${memorial.first_name} ${memorial.last_name}`} />
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          {memorial.first_name[0]}{memorial.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{memorial.first_name} {memorial.last_name}</span>
                        {memorial.death_date && (
                          <span className="text-sm text-muted-foreground">
                            † {format(new Date(memorial.death_date), 'dd MMM yyyy', { locale: fr })}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {memorial.biography || <span className="italic">Aucune biographie</span>}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">{getCreatorName(memorial.created_by)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(memorial.created_at), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {memorial.merged_into ? (
                          <Badge variant="outline">Fusionné</Badge>
                        ) : memorial.is_active ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">En ligne</Badge>
                        ) : (
                          <Badge variant="secondary">Inactif</Badge>
                        )}
                        {hasDuplicates && !memorial.merged_into && (
                          <Badge variant="destructive" className="text-xs">
                            {duplicates.length} doublon{duplicates.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" asChild title="Voir">
                          <a href={`/memorial/${memorial.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(memorial)}
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(memorial)}
                          title="Supprimer"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {!memorial.merged_into && hasDuplicates && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMerge(memorial)}
                            title="Fusionner"
                          >
                            <GitMerge className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!sortedData || sortedData.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun mémorial trouvé.
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

      {/* Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fusionner les mémoriaux</DialogTitle>
            <DialogDescription>
              Le mémorial de {selectedMemorial?.first_name} {selectedMemorial?.last_name} sera
              fusionné dans le mémorial cible. Tous les messages seront transférés.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={targetMemorialId} onValueChange={setTargetMemorialId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez le mémorial cible" />
              </SelectTrigger>
              <SelectContent>
                {allMemorials
                  ?.filter((m) => m.id !== selectedMemorial?.id && !m.merged_into)
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.first_name} {m.last_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={confirmMerge}
              disabled={!targetMemorialId || mergeMutation.isPending}
            >
              Confirmer la fusion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le mémorial</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birth_date">Date de naissance</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={editForm.birth_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, birth_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="death_date">Date de décès</Label>
                <Input
                  id="death_date"
                  type="date"
                  value={editForm.death_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, death_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="biography">Biographie</Label>
              <Textarea
                id="biography"
                value={editForm.biography}
                onChange={(e) => setEditForm(prev => ({ ...prev, biography: e.target.value }))}
                rows={4}
              />
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
            <DialogTitle>Supprimer le mémorial</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le mémorial de{' '}
              <strong>{selectedMemorial?.first_name} {selectedMemorial?.last_name}</strong> ?
              Cette action supprimera également tous les hommages associés et est irréversible.
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

export default Memorials;
