import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

interface SubscriptionInfo {
  status: string | null;
  plan: string | null;
  trialEndDate: string | null;
  subscriptionEndDate: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscription: SubscriptionInfo | null;
  isExpired: boolean;
  isSuperAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: { school_name?: string; school_address?: string; school_phone?: string }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const checkSubscriptionExpiry = (sub: SubscriptionInfo | null) => {
    if (!sub) return false;
    
    const now = new Date();
    
    // Check if trial has expired
    if (sub.status === 'trial' && sub.trialEndDate) {
      const trialEnd = new Date(sub.trialEndDate);
      if (now > trialEnd) return true;
    }
    
    // Check if subscription has expired
    if (sub.status === 'expired') return true;
    
    if (sub.status === 'active' && sub.subscriptionEndDate) {
      const subEnd = new Date(sub.subscriptionEndDate);
      if (now > subEnd) return true;
    }
    
    return false;
  };

  const checkSuperAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'super_admin')
      .maybeSingle();
    
    setIsSuperAdmin(!!data);
    return !!data;
  };

  const fetchSubscription = async (userId: string) => {
    // First check if user is super admin
    const isAdmin = await checkSuperAdminRole(userId);
    
    const { data } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_plan, trial_end_date, subscription_end_date')
      .eq('id', userId)
      .single();
    
    if (data) {
      const subInfo: SubscriptionInfo = {
        status: data.subscription_status,
        plan: data.subscription_plan,
        trialEndDate: data.trial_end_date,
        subscriptionEndDate: data.subscription_end_date,
      };
      setSubscription(subInfo);
      // Super admins are never considered expired
      setIsExpired(isAdmin ? false : checkSubscriptionExpiry(subInfo));
    }
  };

  const refreshSubscription = async () => {
    if (user) {
      await fetchSubscription(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Defer subscription fetch
        if (session?.user) {
          setTimeout(() => {
            fetchSubscription(session.user.id);
          }, 0);
        } else {
          setSubscription(null);
          setIsExpired(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        fetchSubscription(session.user.id);
      }
    });

    return () => authSub.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, metadata?: { school_name?: string; school_address?: string; school_phone?: string }) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, subscription, isExpired, isSuperAdmin, signIn, signUp, signOut, resetPassword, refreshSubscription }}>
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

// Protected Route Component
export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading, isExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Redirect expired users to billing (unless already on billing, contact, settings, or superadmin)
  useEffect(() => {
    if (!loading && user && isExpired) {
      const allowedPaths = ['/billing', '/contact', '/settings', '/superadmin'];
      if (!allowedPaths.includes(location.pathname)) {
        navigate('/billing');
      }
    }
  }, [user, loading, isExpired, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return user ? <>{children}</> : null;
};
