import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export type AppRole = 'admin' | 'moderator';

interface UseAdminRoleResult {
  isAdmin: boolean;
  isModerator: boolean;
  isAdminOrMod: boolean;
  loading: boolean;
  roles: AppRole[];
}

export const useAdminRole = (): UseAdminRoleResult => {
  const { user, loading: authLoading } = useAuth();

  const { data: roles = [], isLoading: roleLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    enabled: !!user && !authLoading,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes (roles rarely change)
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!user) return [];

      const [adminResult, modResult] = await Promise.all([
        supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' })
      ]);

      const fetchedRoles: AppRole[] = [];
      if (adminResult.data) fetchedRoles.push('admin');
      if (modResult.data) fetchedRoles.push('moderator');
      return fetchedRoles;
    },
  });

  const isLoading = authLoading || roleLoading;

  return {
    isAdmin: roles.includes('admin'),
    isModerator: roles.includes('moderator'),
    isAdminOrMod: roles.includes('admin') || roles.includes('moderator'),
    loading: isLoading,
    roles,
  };
};
