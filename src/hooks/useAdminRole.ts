import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'moderator';

interface UseAdminRoleResult {
  isAdmin: boolean;
  isModerator: boolean;
  isAdminOrMod: boolean;
  loading: boolean;
  roles: AppRole[];
}

export const useAdminRole = (): UseAdminRoleResult => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching roles:', error);
          setRoles([]);
        } else {
          setRoles((data || []).map(r => r.role as AppRole));
        }
      } catch (err) {
        console.error('Error fetching roles:', err);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user]);

  return {
    isAdmin: roles.includes('admin'),
    isModerator: roles.includes('moderator'),
    isAdminOrMod: roles.includes('admin') || roles.includes('moderator'),
    loading,
    roles,
  };
};
