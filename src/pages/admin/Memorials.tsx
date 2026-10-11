import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ADMIN_PREFIX } from '@/lib/adminRoutes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeSearchInput } from '@/lib/sanitizeSearch';
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
import { Search, GitMerge, ExternalLink, Pencil, Trash2, AlertCircle, RefreshCw, MessageSquare, Flame, Flower2, Link2 } from 'lucide-react';
import AdminSearchHeader, { useAdminFilters } from '@/components/admin/AdminSearchHeader';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useServerPagination } from '@/hooks/useServerPagination';
import AdminPagination from '@/components/admin/AdminPagination';
import ExportCSVButton from '@/components/admin/ExportCSVButton';
import { logAuditAction } from '@/lib/auditLogger';
import RelationCategoryBadge from '@/components/admin/RelationCategoryBadge';

/**
 * Heatmap dot: bleu froid → rouge ardent selon le score d'humanité.
 * Strictement Back-Office — jamais exposé côté Front-Office.
 */
const HumanityHeatDot = ({ score }: { score: number }) => {
  const normalized = Math.min(1, score / 100);
  const hue = Math.round(220 - normalized * 220);
  const saturation = 70 + normalized * 20;
  const lightness = 55 - normalized * 10;
  const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const glowSize = 2 + normalized * 8;

  return (
    <div className="flex items-center gap-2" title={`Indice d'Humanité : ${score}`}>
      <div
        className="w-3.5 h-3.5 rounded-full shrink-0 transition-all duration-500"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 ${glowSize}px ${color}`,
        }}
      />
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>
        {score}
      </span>
    </div>
  );
};

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
  is_demo: boolean;
  merged_into: string | null;
  created_at: string;
  created_by: string;
  creator_relation: string | null;
  humanity_index?: number;
}

interface Profile {
  user_id: string;
  display_name: string | null;
}

const Memorials = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { filters, updateFilter } = useAdminFilters();
  const searchQuery = filters.debouncedSearch;
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

  // Fetch total count with search + status filter
  const { data: countData } = useQuery({
    queryKey: ['admin-memorials-count', searchQuery, filters.status],
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      let query = supabase
        .from('memorials')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      if (searchQuery) {
        const safe = sanitizeSearchInput(searchQuery);
        query = query.or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`);
      }
      if (filters.status === 'demo') query = query.eq('is_demo', true);
      if (filters.status === 'real') query = query.or('is_demo.eq.false,is_demo.is.null');

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
  }, [searchQuery, filters.status]);

  const { data: memorials, isLoading, error: memorialsError, refetch: refetchMemorials } = useQuery({
    queryKey: ['admin-memorials', pagination.page, pagination.pageSize, searchQuery, filters.status],
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: 'always',
    queryFn: async () => {
      let query = supabase
        .from('memorials')
        .select('id, slug, first_name, last_name, death_date, birth_date, biography, photo_url, photos, is_active, is_demo, merged_into, created_at, created_by, creator_relation')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (searchQuery) {
        const safe = sanitizeSearchInput(searchQuery);
        query = query.or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`);
      }
      if (filters.status === 'demo') query = query.eq('is_demo', true);
      if (filters.status === 'real') query = query.or('is_demo.eq.false,is_demo.is.null');

      const { data, error } = await query.range(pagination.from, pagination.to);
      if (error) {
        console.error('Supabase memorials query error:', error);
        throw new Error(`Erreur Supabase : ${error.message} (code: ${error.code})`);
      }
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
        .from('profiles_public')
        .select('user_id, display_name')
        .in('user_id', creatorIds);
      if (error) {
        console.error('Profiles query error:', error);
        return [];
      }
      return data as Profile[];
    },
    enabled: !!memorials && memorials.length > 0,
  });

  // Fetch gesture stats (hommage counts) for displayed memorials
  const { data: gestureStats } = useQuery({
    queryKey: ['admin-memorial-gesture-stats', memorials?.map(m => m.id)],
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!memorials || memorials.length === 0) return {};
      const memorialIds = memorials.map(m => m.id);
      const { data, error } = await supabase
        .rpc('get_memorial_gesture_stats', { p_memorial_ids: memorialIds });
      if (error) {
        console.error('Gesture stats error:', error);
        return {};
      }
      const stats: Record<string, { postCount: number; candles: number; flowers: number }> = {};
      (data || []).forEach((row: { memorial_id: string; post_count: number; total_candles: number; total_flowers: number }) => {
        stats[row.memorial_id] = {
          postCount: row.post_count,
          candles: row.total_candles,
          flowers: row.total_flowers,
        };
      });
      return stats;
    },
    enabled: !!memorials && memorials.length > 0,
  });

  // Fetch humanity index for displayed memorials
  const { data: humanityData } = useQuery({
    queryKey: ['admin-humanity-index', memorials?.map(m => m.id)],
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!memorials || memorials.length === 0) return {};
      const { data, error } = await supabase
        .from('backoffice_humanity_index' as any)
        .select('memorial_id, humanity_index')
        .in('memorial_id', memorials.map(m => m.id));
      if (error) {
        console.error('Humanity index error:', error);
        return {};
      }
      const map: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        map[row.memorial_id] = Number(row.humanity_index) || 0;
      });
      return map;
    },
    enabled: !!memorials && memorials.length > 0,
  });

  const getHumanityIndex = (memorialId: string) => humanityData?.[memorialId] ?? 0;

  const getStats = (memorialId: string) => gestureStats?.[memorialId] || { postCount: 0, candles: 0, flowers: 0 };

  const getCreatorName = (createdBy: string) => {
    const profile = profiles?.find(p => p.user_id === createdBy);
    return profile?.display_name || 'Inconnu';
  };

  const memorialsWithIndex = useMemo(() => {
    if (!memorials) return [];
    return memorials.map(m => ({ ...m, humanity_index: getHumanityIndex(m.id) }));
  }, [memorials, humanityData]);

  const { sortConfig, handleSort, sortedData } = useSortableTable(memorialsWithIndex, 'created_at', 'desc');

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
      // M2.5B — fusion exclusivement via la RPC serveur (contrôles Admin,
      // confirmation familiale, verrous et journalisation côté base).
      const { error } = await supabase.rpc('admin_merge_memorial', {
        source_id: sourceId,
        master_id: targetId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-memorials'] });
      queryClient.invalidateQueries({ queryKey: ['admin-memorials-count'] });
      toast.success('Mémoriaux fusionnés avec succès');
      setShowMergeDialog(false);
      setSelectedMemorial(null);
      setTargetMemorialId('');
    },
    onError: (error: { message?: string }) => {
      toast.error('Erreur lors de la fusion', { description: error?.message });
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

  // Suppression réversible (Norme AAA — Pilier 7A) : mise en corbeille, jamais de purge immédiate
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const now = new Date().toISOString();

      // Les hommages liés suivent le mémorial en corbeille
      const { error: postsError } = await supabase
        .from('guestbook_posts')
        .update({ deleted_at: now, deleted_by: user?.id ?? null })
        .eq('memorial_id', id)
        .is('deleted_at', null);

      if (postsError) throw postsError;

      const { error } = await supabase
        .from('memorials')
        .update({ deleted_at: now, deleted_by: user?.id ?? null, is_active: false, is_published: false })
        .eq('id', id);

      if (error) throw error;

      // Log audit
      await logAuditAction(
        'memorial_soft_deleted',
        user?.id || '',
        user?.email || null,
        { memorial_id: id, name: `${selectedMemorial?.first_name} ${selectedMemorial?.last_name}` }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-memorials'] });
      queryClient.invalidateQueries({ queryKey: ['admin-memorials-count'] });
      queryClient.invalidateQueries({ queryKey: ['admin-trash'] });
      toast.success('Mémorial placé dans la corbeille — restaurable à tout moment');
      setShowDeleteDialog(false);
      setSelectedMemorial(null);
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Erreur lors de la mise en corbeille');
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
        (m.last_name ?? '').toLowerCase() === (memorial.last_name ?? '').toLowerCase() &&
        !m.merged_into
    );
  };

  const getPhotoUrl = (memorial: Memorial) => {
    if (memorial.photo_url) return memorial.photo_url;
    if (memorial.photos && memorial.photos.length > 0) return memorial.photos[0];
    return null;
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div className="h-9 w-64 bg-muted rounded animate-pulse" />
          <div className="h-10 w-44 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 bg-muted rounded" />
                <div className="h-3 w-52 bg-muted rounded" />
              </div>
              <div className="h-6 w-16 bg-muted rounded-full" />
              <div className="h-8 w-8 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (memorialsError) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-8">Gestion des Mémoriaux</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Erreur de chargement
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mb-2">
              Impossible de charger les mémoriaux.
            </p>
            <code className="text-xs bg-muted px-3 py-1.5 rounded text-destructive mb-6 max-w-lg break-all">
              {memorialsError.message}
            </code>
            <Button variant="outline" onClick={() => refetchMemorials()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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

      <AdminSearchHeader
        placeholder="Rechercher un défunt par nom ou prénom…"
        showStatus
        filters={filters}
        onChange={(f) => {
          Object.entries(f).forEach(([k, v]) => {
            if (filters[k as keyof typeof filters] !== v) {
              updateFilter(k as keyof typeof filters, v);
            }
          });
        }}
      />

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
                  label="Lien avec le défunt"
                  sortKey="creator_relation"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <TableCell className="font-medium text-muted-foreground">Hommages</TableCell>
                <SortableTableHeader
                  label="Humanité"
                  sortKey="humanity_index"
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
                const stats = getStats(memorial.id);

                return (
                  <TableRow
                    key={memorial.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${memorial.merged_into ? 'opacity-50 bg-muted/30' : ''}`}
                    onClick={() => navigate(`${ADMIN_PREFIX}/memoriaux/${memorial.id}`)}
                  >
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
                        <span className="font-medium text-primary underline-offset-4 hover:underline">
                          {memorial.first_name} {memorial.last_name}
                        </span>
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
                    <TableCell className="text-sm">
                      {memorial.creator_relation ? (
                        <RelationCategoryBadge relation={memorial.creator_relation} showCategory />
                      ) : (
                        <span className="text-muted-foreground italic">Non renseigné</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground" title="Messages">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {stats.postCount}
                        </span>
                        <span className="flex items-center gap-1 text-[hsl(var(--gesture-candle))]" title="Cierges">
                          <Flame className="w-3.5 h-3.5" />
                          {stats.candles}
                        </span>
                        <span className="flex items-center gap-1 text-[hsl(var(--gesture-flower))]" title="Fleurs">
                          <Flower2 className="w-3.5 h-3.5" />
                          {stats.flowers}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <HumanityHeatDot score={memorial.humanity_index ?? 0} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(memorial.created_at), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {memorial.merged_into ? (
                          <Badge variant="outline">Fusionné</Badge>
                        ) : memorial.is_active ? (
                          <Badge variant="outline" className="border-primary/30 text-primary">En ligne</Badge>
                        ) : (
                          <Badge variant="secondary">Inactif</Badge>
                        )}
                        {memorial.is_demo && (
                          <Badge variant="outline" className="border-[hsl(var(--gesture-candle))] text-[hsl(var(--gesture-candle))] text-xs">
                            Demo
                          </Badge>
                        )}
                        {hasDuplicates && !memorial.merged_into && (
                          <Badge variant="destructive" className="text-xs">
                            {duplicates.length} doublon{duplicates.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" asChild title="Voir le mémorial">
                          <a href={`/memorial/${memorial.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`${ADMIN_PREFIX}/memoriaux/${memorial.id}`)}
                          title="Gérer les liaisons"
                        >
                          <Link2 className="w-4 h-4 text-[hsl(45,90%,50%)]" />
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
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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
