import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  UserPlus, 
  Shield, 
  ShieldCheck, 
  Ban, 
  UserCheck, 
  Mail,
  Phone,
  Calendar,
  RefreshCw,
  Search,
  Users as UsersIcon,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EnrichedUser {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string;
  banned_until?: string;
  email_confirmed_at?: string;
  display_name?: string;
  phone?: string;
  profile_completed: boolean;
  roles: string[];
}

const Users = () => {
  const queryClient = useQueryClient();
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<EnrichedUser | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'moderator'>('admin');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Fetch users from edge function
  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['admin-all-users', page, pageSize],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list-users', page, pageSize },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { users: EnrichedUser[]; total: number };
    },
  });

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'moderator' }) => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'add-role', email, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      toast.success('Rôle ajouté avec succès');
      setShowAddRoleDialog(false);
      setNewAdminEmail('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'remove-role', userId, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      toast.success('Rôle supprimé');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'ban-user', userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      toast.success('Utilisateur bloqué');
      setShowBanDialog(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Unban user mutation
  const unbanUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'unban-user', userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      toast.success('Utilisateur débloqué');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const isBanned = (user: EnrichedUser) => {
    if (!user.banned_until) return false;
    return new Date(user.banned_until) > new Date();
  };

  const filteredUsers = usersData?.users?.filter((user) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(term) ||
      user.display_name?.toLowerCase().includes(term) ||
      user.phone?.includes(term)
    );
  }) ?? [];

  const getRoleBadges = (roles: string[]) => {
    if (roles.length === 0) return null;
    return roles.map((role) => {
      if (role === 'admin') {
        return (
          <Badge key={role} className="bg-destructive text-destructive-foreground">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        );
      }
      return (
        <Badge key={role} variant="secondary">
          <Shield className="w-3 h-3 mr-1" />
          Modérateur
        </Badge>
      );
    });
  };

  const handleBanClick = (user: EnrichedUser) => {
    setSelectedUser(user);
    setShowBanDialog(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground mt-1">
            {usersData?.users?.length ?? 0} utilisateurs inscrits
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={() => setShowAddRoleDialog(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Ajouter un administrateur
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par email, nom ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5" />
            Utilisateurs inscrits
          </CardTitle>
          <CardDescription>
            Liste des utilisateurs authentifiés via email (Magic Link)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement des utilisateurs...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun utilisateur trouvé
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Inscription</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Rôles</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className={isBanned(user) ? 'opacity-60 bg-destructive/5' : ''}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {user.display_name || 'Sans nom'}
                        </div>
                        <code className="text-xs text-muted-foreground">
                          {user.id.slice(0, 8)}...
                        </code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {user.phone.slice(0, -6)}** ** **
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        {format(new Date(user.created_at), 'dd MMM yyyy', { locale: fr })}
                      </div>
                      {user.last_sign_in_at && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Dernière connexion : {format(new Date(user.last_sign_in_at), 'dd/MM/yy HH:mm', { locale: fr })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isBanned(user) ? (
                        <Badge variant="destructive" className="gap-1">
                          <Ban className="w-3 h-3" />
                          Bloqué
                        </Badge>
                      ) : user.profile_completed ? (
                        <Badge variant="outline" className="text-primary border-primary">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Actif
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground border-muted-foreground">
                          Profil incomplet
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {getRoleBadges(user.roles)}
                        {user.roles.length === 0 && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {user.roles.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const roleToRemove = user.roles[0];
                              removeRoleMutation.mutate({ userId: user.id, role: roleToRemove });
                            }}
                            disabled={removeRoleMutation.isPending}
                            title="Retirer le rôle"
                          >
                            <Shield className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        )}
                        {isBanned(user) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unbanUserMutation.mutate(user.id)}
                            disabled={unbanUserMutation.isPending}
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Débloquer
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleBanClick(user)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Précédent
            </Button>
            <span className="flex items-center px-3 text-sm text-muted-foreground">
              Page {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={(usersData?.users?.length ?? 0) < pageSize}
            >
              Suivant
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Admin Dialog */}
      <Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un administrateur</DialogTitle>
            <DialogDescription>
              Entrez l'email d'un utilisateur existant pour lui attribuer un rôle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Email de l'utilisateur</label>
              <Input
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="email@example.com"
                type="email"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Rôle à attribuer</label>
              <Select value={newAdminRole} onValueChange={(v) => setNewAdminRole(v as 'admin' | 'moderator')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-destructive" />
                      Administrateur
                    </div>
                  </SelectItem>
                  <SelectItem value="moderator">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Modérateur
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRoleDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => addRoleMutation.mutate({ email: newAdminEmail, role: newAdminRole })}
              disabled={!newAdminEmail || addRoleMutation.isPending}
            >
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Confirmation Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Bloquer l'utilisateur
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir bloquer <strong>{selectedUser?.email}</strong> ?
              Cette action empêchera l'utilisateur de se connecter.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBanDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedUser && banUserMutation.mutate(selectedUser.id)}
              disabled={banUserMutation.isPending}
            >
              <Ban className="w-4 h-4 mr-2" />
              Bloquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
