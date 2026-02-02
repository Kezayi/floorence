import { useState } from 'react';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, UserPlus, Trash2, Shield, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator';
  created_at: string;
}

const Users = () => {
  const queryClient = useQueryClient();
  const [searchEmail, setSearchEmail] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'moderator'>('moderator');

  const { data: userRoles, isLoading } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserRole[];
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'moderator' }) => {
      // Note: In production, you'd need an edge function to look up user by email
      // For now, we'll show an error explaining this limitation
      throw new Error('Pour ajouter un utilisateur, utilisez son ID utilisateur directement.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast.success('Rôle ajouté');
      setShowAddDialog(false);
      setNewUserEmail('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast.success('Rôle supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <Badge className="bg-red-500">
          <ShieldCheck className="w-3 h-3 mr-1" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Shield className="w-3 h-3 mr-1" />
        Modérateur
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">Gestion des utilisateurs</h1>
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Ajouter un rôle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs avec rôles administratifs</CardTitle>
        </CardHeader>
        <CardContent>
          {userRoles && userRoles.length > 0 ? (
            <div className="space-y-3">
              {userRoles.map((ur) => (
                <div
                  key={ur.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {ur.user_id.slice(0, 8)}...
                    </code>
                    {getRoleBadge(ur.role)}
                    <span className="text-sm text-muted-foreground">
                      Ajouté le {format(new Date(ur.created_at), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRoleMutation.mutate(ur.id)}
                    disabled={removeRoleMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Aucun utilisateur avec des rôles administratifs.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Ajouter un administrateur manuellement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Pour ajouter un rôle, exécutez cette requête SQL dans le backend :
          </p>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`INSERT INTO public.user_roles (user_id, role)
VALUES ('ID_UTILISATEUR', 'admin');
-- ou 'moderator' pour un modérateur`}
          </pre>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un rôle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Email de l'utilisateur</label>
              <Input
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Rôle</label>
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as 'admin' | 'moderator')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moderator">Modérateur</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => addRoleMutation.mutate({ email: newUserEmail, role: newUserRole })}
              disabled={!newUserEmail || addRoleMutation.isPending}
            >
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
