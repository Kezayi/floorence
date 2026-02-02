import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sendOtp: (email: string) => Promise<{ error: Error | null; isNewUser?: boolean }>;
  verifyOtp: (email: string, code: string) => Promise<{ error: Error | null; verificationUrl?: string; isNewUser?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
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

  // Custom OTP: Call our generate-otp edge function
  const sendOtp = async (email: string): Promise<{ error: Error | null; isNewUser?: boolean }> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-otp', {
        body: { email },
      });

      if (error) {
        console.error('Error sending OTP:', error);
        return { error: new Error(error.message || "Erreur lors de l'envoi du code") };
      }

      if (data?.error) {
        return { error: new Error(data.error) };
      }

      return { error: null, isNewUser: data?.isNewUser };
    } catch (err: any) {
      console.error('Exception sending OTP:', err);
      return { error: new Error(err.message || "Une erreur est survenue") };
    }
  };

  // Custom OTP: Call our verify-otp edge function
  const verifyOtp = async (email: string, code: string): Promise<{ error: Error | null; verificationUrl?: string; isNewUser?: boolean }> => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { email, code },
      });

      if (error) {
        console.error('Error verifying OTP:', error);
        return { error: new Error(error.message || "Erreur lors de la vérification") };
      }

      if (data?.error) {
        return { error: new Error(data.error) };
      }

      return { 
        error: null, 
        verificationUrl: data?.verificationUrl,
        isNewUser: data?.isNewUser 
      };
    } catch (err: any) {
      console.error('Exception verifying OTP:', err);
      return { error: new Error(err.message || "Une erreur est survenue") };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, sendOtp, verifyOtp, signOut }}>
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
