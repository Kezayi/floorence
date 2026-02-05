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
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchRoles = async () => {
      // Wait for auth to complete
      if (authLoading) {
        return;
      }
      
      if (!user) {
        if (isMounted) {
          setRoles([]);
          setRoleLoading(false);
        }
        return;
      }

      try {
        // Use RPC function for faster and more reliable role check
        const [adminResult, modResult] = await Promise.all([
          supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
          supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' })
        ]);

        if (isMounted) {
          const fetchedRoles: AppRole[] = [];
          if (adminResult.data) fetchedRoles.push('admin');
          if (modResult.data) fetchedRoles.push('moderator');
          setRoles(fetchedRoles);
        }
      } catch (err) {
        console.error('Error fetching roles:', err);
        if (isMounted) {
          setRoles([]);
        }
      } finally {
        if (isMounted) {
          setRoleLoading(false);
        }
      }
    };

    fetchRoles();
    
    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  // Loading is true while auth OR role check is in progress
  const isLoading = authLoading || roleLoading;

  return {
    isAdmin: roles.includes('admin'),
    isModerator: roles.includes('moderator'),
    isAdminOrMod: roles.includes('admin') || roles.includes('moderator'),
    loading: isLoading,
    roles,
  };
};
