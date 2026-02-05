import { useEffect, useState, useCallback } from 'react';
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

  const fetchRoles = useCallback(async () => {
    if (!user) {
      setRoles([]);
      setRoleLoading(false);
      return;
    }

    try {
      // Use RPC function for faster and more reliable role check
      const { data: isAdmin } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      
      const { data: isMod } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'moderator'
      });

      const fetchedRoles: AppRole[] = [];
      if (isAdmin) fetchedRoles.push('admin');
      if (isMod) fetchedRoles.push('moderator');
      
      setRoles(fetchedRoles);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setRoles([]);
    } finally {
      setRoleLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Wait for auth to complete before checking roles
    if (authLoading) {
      setRoleLoading(true);
      return;
    }
    
    fetchRoles();
  }, [user, authLoading, fetchRoles]);

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
