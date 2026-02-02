import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Search, GitMerge, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useServerPagination } from '@/hooks/useServerPagination';
import AdminPagination from '@/components/admin/AdminPagination';

interface Memorial {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  death_date: string | null;
  is_active: boolean;
  merged_into: string | null;
  created_at: string;
}

const Memorials = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemorial, setSelectedMemorial] = useState<Memorial | null>(null);
  const [targetMemorialId, setTargetMemorialId] = useState<string>('');
  const [showMergeDialog, setShowMergeDialog] = useState(false);

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
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.range(pagination.from, pagination.to);
      if (error) throw error;
      return data as Memorial[];
    },
  });

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

  const handleMerge = (memorial: Memorial) => {
    setSelectedMemorial(memorial);
    setShowMergeDialog(true);
  };

  const confirmMerge = () => {
    if (selectedMemorial && targetMemorialId) {
      mergeMutation.mutate({
        sourceId: selectedMemorial.id,
        targetId: targetMemorialId,
      });
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

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-8">Gestion des mémoriaux</h1>

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

      <div className="space-y-4">
        {memorials?.map((memorial) => {
          const duplicates = findDuplicates(memorial);
          const hasDuplicates = duplicates && duplicates.length > 0;

          return (
            <Card key={memorial.id} className={memorial.merged_into ? 'opacity-50' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">
                      {memorial.first_name} {memorial.last_name}
                    </CardTitle>
                    {!memorial.is_active && (
                      <Badge variant="secondary">Inactif</Badge>
                    )}
                    {memorial.merged_into && (
                      <Badge variant="outline">Fusionné</Badge>
                    )}
                    {hasDuplicates && !memorial.merged_into && (
                      <Badge variant="destructive">
                        {duplicates.length} doublon{duplicates.length > 1 ? 's' : ''} potentiel{duplicates.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {memorial.death_date
                      ? format(new Date(memorial.death_date), 'dd MMM yyyy', { locale: fr })
                      : 'Date inconnue'}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`/memorial/${memorial.slug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Voir
                    </a>
                  </Button>
                  {!memorial.merged_into && hasDuplicates && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMerge(memorial)}
                    >
                      <GitMerge className="w-4 h-4 mr-2" />
                      Fusionner
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {memorials?.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucun mémorial trouvé.
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
    </div>
  );
};

export default Memorials;
