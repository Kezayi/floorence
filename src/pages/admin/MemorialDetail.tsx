import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Save, Loader2, Link2, Trash2, Check, X, Search, ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logAuditAction } from '@/lib/auditLogger';
import { useDebounce } from '@/hooks/useDebounce';
import { getGenderAwareRelation, getInverseRelation, inferGender } from '@/lib/relationshipInference';
import { validateChronologicalCoherence, isRelationBiologicallyVerified } from '@/lib/chronologicalValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Relation types for inter-memorial links (same as RequestLinkDialog)
const interMemorialRelations: Record<string, { value: string; label: string }[]> = {
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

const MemorialDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Edit form state
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    death_date: '',
    biography: '',
  });
  const [formLoaded, setFormLoaded] = useState(false);

  // New link form state
  const [showNewLinkDialog, setShowNewLinkDialog] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [linkRelationType, setLinkRelationType] = useState('');
  const debouncedLinkSearch = useDebounce(linkSearchQuery, 300);

  // Fetch memorial
  const { data: memorial, isLoading } = useQuery({
    queryKey: ['admin-memorial-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memorials')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Load form when memorial loads
  if (memorial && !formLoaded) {
    setEditForm({
      first_name: memorial.first_name,
      last_name: memorial.last_name,
      birth_date: memorial.birth_date || '',
      death_date: memorial.death_date || '',
      biography: memorial.biography || '',
    });
    setFormLoaded(true);
  }

  // Fetch relations for this memorial
  const { data: relations, isLoading: relationsLoading } = useQuery({
    queryKey: ['admin-memorial-relations', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memorial_relations')
        .select('*')
        .or(`memorial_id_1.eq.${id},memorial_id_2.eq.${id}`);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch names for related memorials
  const relatedIds = useMemo(() => {
    if (!relations) return [];
    const ids = new Set<string>();
    relations.forEach(r => {
      if (r.memorial_id_1 && r.memorial_id_1 !== id) ids.add(r.memorial_id_1);
      if (r.memorial_id_2 && r.memorial_id_2 !== id) ids.add(r.memorial_id_2);
    });
    return Array.from(ids);
  }, [relations, id]);

  const { data: relatedMemorials } = useQuery({
    queryKey: ['admin-related-memorials', relatedIds],
    queryFn: async () => {
      if (relatedIds.length === 0) return [];
      const { data, error } = await supabase
        .from('memorials')
        .select('id, first_name, last_name, slug, birth_date')
        .in('id', relatedIds);
      if (error) throw error;
      return data;
    },
    enabled: relatedIds.length > 0,
  });

  // Search memorials for new link
  const { data: searchResults } = useQuery({
    queryKey: ['admin-memorial-link-search', debouncedLinkSearch],
    queryFn: async () => {
      if (!debouncedLinkSearch || debouncedLinkSearch.length < 2) return [];
      const { data, error } = await supabase
        .from('memorials')
        .select('id, first_name, last_name, death_date, birth_date')
        .neq('id', id!)
        .or(`first_name.ilike.%${debouncedLinkSearch}%,last_name.ilike.%${debouncedLinkSearch}%`)
        .limit(8);
      if (error) throw error;
      return data;
    },
    enabled: debouncedLinkSearch.length >= 2,
  });

  const selectedTarget = useMemo(
    () => searchResults?.find(m => m.id === selectedTargetId),
    [searchResults, selectedTargetId]
  );

  const getRelatedName = (relatedId: string) => {
    const m = relatedMemorials?.find(rm => rm.id === relatedId);
    return m ? `${m.first_name} ${m.last_name}` : relatedId.slice(0, 8);
  };

  const getRelatedFirstName = (relatedId: string) => {
    return relatedMemorials?.find(rm => rm.id === relatedId)?.first_name || '';
  };

  const getRelatedBirthDate = (relatedId: string) => {
    return relatedMemorials?.find(rm => rm.id === relatedId)?.birth_date || null;
  };

  const getRelatedSlug = (relatedId: string) => {
    return relatedMemorials?.find(rm => rm.id === relatedId)?.slug;
  };

  // Chronological validation for new link
  const chronoValidation = useMemo(() => {
    if (!selectedTargetId || !linkRelationType) return null;
    const target = searchResults?.find(m => m.id === selectedTargetId);
    return validateChronologicalCoherence(
      memorial?.birth_date,
      target?.birth_date || null,
      linkRelationType
    );
  }, [selectedTargetId, linkRelationType, memorial?.birth_date, searchResults]);

  // Gender-aware relation label for new link preview
  const genderAwareRelationLabel = useMemo(() => {
    if (!linkRelationType || !memorial) return linkRelationType;
    return getGenderAwareRelation(linkRelationType, memorial.first_name);
  }, [linkRelationType, memorial]);

  // Save info mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('memorials')
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          birth_date: editForm.birth_date || null,
          death_date: editForm.death_date || null,
          biography: editForm.biography || null,
        })
        .eq('id', id!);
      if (error) throw error;

      await logAuditAction(
        'memorial_updated',
        user?.id || '',
        user?.email || null,
        { memorial_id: id }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-memorial-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-memorials'] });
      toast.success('Mémorial mis à jour');
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  // Create relation mutation
  const createLinkMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTargetId || !linkRelationType) return;

      // Chronological validation
      if (chronoValidation && !chronoValidation.isValid) {
        throw new Error(chronoValidation.message || 'Incohérence chronologique détectée.');
      }

      // Apply gender-aware relation type
      const finalRelationType = memorial ? getGenderAwareRelation(linkRelationType, memorial.first_name) : linkRelationType;

      // Check duplicate
      const { data: existing } = await supabase
        .from('memorial_relations')
        .select('id')
        .or(
          `and(memorial_id_1.eq.${id},memorial_id_2.eq.${selectedTargetId}),and(memorial_id_1.eq.${selectedTargetId},memorial_id_2.eq.${id})`
        );

      if (existing && existing.length > 0) {
        throw new Error('Un lien existe déjà entre ces deux mémoriaux.');
      }

      const { error } = await supabase.from('memorial_relations').insert({
        memorial_id_1: id!,
        memorial_id_2: selectedTargetId,
        relation_type: finalRelationType,
        requested_by: user?.id,
        status: 'accepted', // Admin creates directly as accepted
        is_demo: false,
      });
      if (error) throw error;

      await logAuditAction(
        'memorial_relation_created',
        user?.id || '',
        user?.email || null,
        { memorial_id_1: id, memorial_id_2: selectedTargetId, relation_type: linkRelationType }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-memorial-relations', id] });
      toast.success('Lien créé avec succès');
      setShowNewLinkDialog(false);
      setLinkSearchQuery('');
      setSelectedTargetId(null);
      setLinkRelationType('');
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur lors de la création du lien'),
  });

  // Delete relation mutation
  const deleteLinkMutation = useMutation({
    mutationFn: async (relationId: string) => {
      const { error } = await supabase
        .from('memorial_relations')
        .delete()
        .eq('id', relationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-memorial-relations', id] });
      toast.success('Lien supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  // Update relation status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ relationId, status }: { relationId: string; status: string }) => {
      const { error } = await supabase
        .from('memorial_relations')
        .update({ status })
        .eq('id', relationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-memorial-relations', id] });
      toast.success('Statut mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const photoUrl = memorial?.photo_url || (memorial?.photos && memorial.photos.length > 0 ? memorial.photos[0] : null);
  const fullName = memorial ? `${memorial.first_name} ${memorial.last_name}` : '';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!memorial) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Mémorial introuvable.</p>
        <Button variant="outline" onClick={() => navigate('/admin/memoriaux')} className="mt-4">
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/memoriaux')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <Avatar className="w-12 h-12">
            <AvatarImage src={photoUrl || undefined} alt={fullName} />
            <AvatarFallback className="bg-muted text-muted-foreground">
              {memorial.first_name[0]}{memorial.last_name[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{fullName}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {memorial.death_date && (
                <span>† {format(new Date(memorial.death_date), 'dd MMM yyyy', { locale: fr })}</span>
              )}
              {memorial.is_demo && (
                <Badge variant="outline" className="border-[hsl(var(--gesture-candle))] text-[hsl(var(--gesture-candle))] text-xs">Demo</Badge>
              )}
              <Badge variant="outline" className={memorial.is_active ? 'border-primary/30 text-primary' : ''}>
                {memorial.is_active ? 'En ligne' : 'Inactif'}
              </Badge>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={`/memorial/${memorial.slug}`} target="_blank" rel="noopener noreferrer" className="gap-2">
            <ExternalLink className="w-4 h-4" />
            Voir le mémorial
          </a>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informations Générales</TabsTrigger>
          <TabsTrigger value="lineages" className="gap-2">
            <Link2 className="w-4 h-4" />
            Lignages & Parenté
            {relations && relations.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{relations.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: General Info */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Modifier les informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  rows={5}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Lineages & Relations */}
        <TabsContent value="lineages">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Liens inter-défunts</CardTitle>
              <Button size="sm" onClick={() => setShowNewLinkDialog(true)} className="gap-2">
                <Link2 className="w-4 h-4" />
                Créer un lien
              </Button>
            </CardHeader>
            <CardContent>
              {relationsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : relations && relations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Défunt lié</TableHead>
                      <TableHead>Type de lien</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relations.map(relation => {
                      const otherId = relation.memorial_id_1 === id ? relation.memorial_id_2 : relation.memorial_id_1;
                      const otherSlug = otherId ? getRelatedSlug(otherId) : null;
                      const isSource = relation.memorial_id_1 === id;

                      // Gender-aware label
                      let displayRelationType: string;
                      if (isSource && memorial) {
                        displayRelationType = getGenderAwareRelation(relation.relation_type, memorial.first_name);
                      } else if (otherId) {
                        displayRelationType = getInverseRelation(relation.relation_type, memorial?.first_name || '');
                      } else {
                        displayRelationType = relation.relation_type;
                      }

                      // Verified badge
                      const otherBirthDate = otherId ? getRelatedBirthDate(otherId) : null;
                      const verified = isRelationBiologicallyVerified(
                        memorial?.birth_date,
                        otherBirthDate,
                        isSource ? displayRelationType : relation.relation_type
                      );

                      return (
                        <TableRow key={relation.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {otherId ? getRelatedName(otherId) : '—'}
                              </span>
                              {otherSlug && (
                                <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
                                  <a href={`/admin/memoriaux/${otherId}`} title="Voir les détails">
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {fullName} est <strong>{displayRelationType}</strong> de {otherId ? getRelatedName(otherId) : ''}
                              </span>
                              {verified && (
                                <Badge variant="outline" className="gap-1 text-[10px] border-primary/30 text-primary bg-primary/5">
                                  <ShieldCheck className="w-3 h-3" />
                                  Vérifié
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={relation.status === 'accepted' ? 'default' : relation.status === 'rejected' ? 'destructive' : 'secondary'}
                            >
                              {relation.status === 'accepted' ? 'Accepté' : relation.status === 'rejected' ? 'Rejeté' : 'En attente'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {relation.status === 'pending' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => updateStatusMutation.mutate({ relationId: relation.id, status: 'accepted' })}
                                    title="Accepter"
                                    className="text-primary h-8 w-8 p-0"
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => updateStatusMutation.mutate({ relationId: relation.id, status: 'rejected' })}
                                    title="Rejeter"
                                    className="text-destructive h-8 w-8 p-0"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteLinkMutation.mutate(relation.id)}
                                title="Supprimer le lien"
                                className="text-destructive h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Link2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucun lien inter-défunt pour ce mémorial.</p>
                  <p className="text-xs mt-1">Créez un Pont des Ancêtres en cliquant sur le bouton ci-dessus.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Link Dialog */}
      <Dialog open={showNewLinkDialog} onOpenChange={(v) => { setShowNewLinkDialog(v); if (!v) { setLinkSearchQuery(''); setSelectedTargetId(null); setLinkRelationType(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-[hsl(45,90%,50%)]" />
              Créer un lien — Pont des Ancêtres
            </DialogTitle>
            <DialogDescription>
              Reliez {fullName} à un autre défunt. Ce lien sera créé directement en tant qu'accepté.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Search target */}
            <div className="space-y-2">
              <Label>Défunt à relier</Label>
              {!selectedTarget ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom ou prénom..."
                      value={linkSearchQuery}
                      onChange={(e) => setLinkSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {searchResults && searchResults.length > 0 && (
                    <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      {searchResults.map(m => (
                        <button
                          key={m.id}
                          onClick={() => { setSelectedTargetId(m.id); setLinkSearchQuery(''); }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left border-b border-border last:border-0"
                        >
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {m.first_name[0]}{m.last_name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{m.first_name} {m.last_name}</p>
                            {m.death_date && (
                              <p className="text-xs text-muted-foreground">
                                † {format(new Date(m.death_date), 'dd MMM yyyy', { locale: fr })}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                  <span className="font-medium text-sm">{selectedTarget.first_name} {selectedTarget.last_name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTargetId(null)}>Changer</Button>
                </div>
              )}
            </div>

            {/* Relation type */}
            {selectedTargetId && (
              <div className="space-y-2">
                <Label>Type de lien</Label>
                <p className="text-xs text-muted-foreground">
                  {fullName} est <strong>{genderAwareRelationLabel || '___'}</strong> de {selectedTarget?.first_name} {selectedTarget?.last_name}
                </p>
                <Select value={linkRelationType} onValueChange={setLinkRelationType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez le lien familial" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {Object.entries(interMemorialRelations).map(([category, rels]) => (
                      <SelectGroup key={category}>
                        <SelectLabel className="text-xs text-muted-foreground">{category}</SelectLabel>
                        {rels.map(rel => (
                          <SelectItem key={rel.value} value={rel.value}>{rel.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Chronological validation alert */}
            {chronoValidation && !chronoValidation.isValid && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {chronoValidation.message}
                </AlertDescription>
              </Alert>
            )}

            {chronoValidation && chronoValidation.isValid && chronoValidation.isVerified && linkRelationType && (
              <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-md">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs text-primary">{chronoValidation.details}</span>
              </div>
            )}

            {chronoValidation && chronoValidation.isValid && !chronoValidation.isVerified && chronoValidation.details && linkRelationType && (
              <p className="text-xs text-muted-foreground italic">{chronoValidation.details}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewLinkDialog(false)}>Annuler</Button>
            <Button
              onClick={() => createLinkMutation.mutate()}
              disabled={!selectedTargetId || !linkRelationType || createLinkMutation.isPending || (chronoValidation !== null && !chronoValidation.isValid)}
              className="gap-2"
            >
              {createLinkMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Créer le lien
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemorialDetail;
