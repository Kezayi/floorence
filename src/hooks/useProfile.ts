import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  profile_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateData {
  display_name?: string;
  phone?: string;
  avatar_url?: string;
  profile_completed?: boolean;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        // Profile might not exist yet for existing users
        if (fetchError.code === 'PGRST116') {
          // Create profile for existing user
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              display_name: user.email?.split('@')[0] || 'Utilisateur',
              profile_completed: false,
            })
            .select()
            .single();

          if (createError) {
            throw createError;
          }
          setProfile(newProfile);
        } else {
          throw fetchError;
        }
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: ProfileUpdateData): Promise<{ success: boolean; error?: Error }> => {
    if (!user || !profile) {
      return { success: false, error: new Error('No user or profile found') };
    }

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Refresh profile data
      await fetchProfile();
      return { success: true };
    } catch (err) {
      console.error('Error updating profile:', err);
      return { success: false, error: err as Error };
    }
  };

  const completeProfile = async (data: { display_name: string; phone?: string }): Promise<{ success: boolean; error?: Error }> => {
    return updateProfile({
      ...data,
      profile_completed: true,
    });
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    completeProfile,
    refetch: fetchProfile,
    isProfileComplete: profile?.profile_completed ?? false,
  };
};
