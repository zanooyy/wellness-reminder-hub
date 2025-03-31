
import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  bypassAuth: boolean; // New property to bypass auth
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Enable this to bypass authentication (for development)
const BYPASS_AUTH = true; 

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [bypassAuth, setBypassAuth] = useState(BYPASS_AUTH);
  const navigate = useNavigate();

  useEffect(() => {
    // If bypassing auth, set loading to false immediately
    if (bypassAuth) {
      setLoading(false);
      return;
    }

    // First set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", _event, session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Then check for existing session
    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          return;
        }
        
        console.log("Got session:", data.session);
        setSession(data.session);
        setUser(data.session?.user ?? null);
      } catch (err) {
        console.error("Session retrieval error:", err);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    return () => subscription.unsubscribe();
  }, [bypassAuth]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      if (bypassAuth) {
        // Simulate successful sign in when bypassing auth
        toast.success('Signed in successfully (Auth bypassed)');
        navigate('/dashboard');
        return;
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast.success('Signed in successfully');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Error signing in');
      console.error('Error signing in:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      if (bypassAuth) {
        // Simulate successful sign up when bypassing auth
        toast.success('Signed up and logged in successfully (Auth bypassed)');
        navigate('/dashboard');
        return;
      }
      
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Skip email verification
          emailRedirectTo: window.location.origin + '/login',
          data: {
            email: email,
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Auto sign in after sign up
        await signIn(email, password);
        toast.success('Signed up and logged in successfully!');
      } else {
        toast.success('Signed up successfully');
        navigate('/login');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error signing up');
      console.error('Error signing up:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      if (bypassAuth) {
        // Simulate sign out when bypassing auth
        toast.success('Signed out successfully (Auth bypassed)');
        navigate('/login');
        return;
      }
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      navigate('/login');
      toast.success('Signed out successfully');
    } catch (error: any) {
      toast.error(error.message || 'Error signing out');
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, bypassAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
