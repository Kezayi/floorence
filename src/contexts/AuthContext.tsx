import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sendMagicLink: (email: string) => Promise<{ error: Error | null; isNewUser?: boolean; magicLink?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle PKCE code exchange if present in URL (magic link redirect)
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      console.log('[AUTH] PKCE code detected in URL, exchanging for session...');
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          console.error('[AUTH] Code exchange failed:', error.message);
        } else {
          console.log('[AUTH] Code exchange successful, user:', data.session?.user?.email);
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
        }
      });
    }

    // Also handle hash fragment tokens (implicit flow fallback)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      console.log('[AUTH] Implicit flow tokens detected in URL hash');
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AUTH] State change:', event, session?.user?.email ?? 'no user');
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Send magic link via edge function
  const sendMagicLink = async (email: string): Promise<{ error: Error | null; isNewUser?: boolean; magicLink?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-magic-link', {
        body: { email },
      });

      if (error) {
        console.error('Error sending magic link:', error);
        return { error: new Error(error.message || "Erreur lors de l'envoi du lien") };
      }

      if (data?.error) {
        return { error: new Error(data.error) };
      }

      // Return magic link if in test mode
      return { 
        error: null, 
        isNewUser: data?.isNewUser,
        magicLink: data?.testMode ? data.magicLink : undefined
      };
    } catch (err: any) {
      console.error('Exception sending magic link:', err);
      return { error: new Error(err.message || "Une erreur est survenue") };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, sendMagicLink, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
