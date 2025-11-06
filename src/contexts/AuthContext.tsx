import type { AuthError, Session, User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  userRole: string | null
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: { message: string } | AuthError | null }>
  signInAsGuest: () => Promise<{ error: { message: string } | AuthError | null }>
  signOut: () => Promise<void>
  refreshUserRole: () => Promise<void>
  allowedRoles: string[]
  isVerifiedCook: boolean
  isReadOnly: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  // Base allowed roles now includes cook (with additional verification gating)
  const allowedRoles = ['admin', 'user', 'cook', 'guest']
  const [isVerifiedCook, setIsVerifiedCook] = useState(false)
  const GUEST_EMAIL = import.meta.env.VITE_GUEST_EMAIL as string | undefined
  const GUEST_PASSWORD = import.meta.env.VITE_GUEST_PASSWORD as string | undefined

  // Fetch user role from profiles table
  const fetchUserRole = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }
      
      return profile?.role || null;
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      return null;
    }
  };

  const refreshUserRole = async () => {
    if (user) {
      const role = await fetchUserRole(user.id);
      setUserRole(role);
      if (role === 'cook') {
        const verified = await fetchCookVerification(user.id)
        setIsVerifiedCook(verified)
      } else {
        setIsVerifiedCook(false)
      }
    }
  };

  // Fetch cook verification status
  const fetchCookVerification = async (userId: string): Promise<boolean> => {
    try {
      // Attempt to fetch a cook record linked to this profile/user
      const { data, error } = await supabase
        .from('cooks')
        .select('is_verified')
        .eq('profile_id', userId)
        .maybeSingle();

      if (error) {
        // Log but do not block; treat as unverified
        console.warn('Error fetching cook verification status:', error);
        return false;
      }
      return !!(data as any)?.is_verified;
    } catch (e) {
      console.error('fetchCookVerification error:', e);
      return false;
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      fetchUserRole(user.id).then(role => {
        setUserRole(role);
        if (role === 'cook') {
          fetchCookVerification(user.id).then(v => setIsVerifiedCook(v));
        } else {
          setIsVerifiedCook(false);
        }
      });
    } else {
      setUserRole(null);
      setIsVerifiedCook(false);
    }
  }, [user])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) return { error }

    // Immediately fetch role after successful auth
    const authUser = data.user
    if (authUser) {
      const role = await fetchUserRole(authUser.id)
      setUserRole(role)
      if (!role || !allowedRoles.includes(role)) {
        await supabase.auth.signOut()
        return { error: { message: `Access restricted.` } }
      }
      if (role === 'cook') {
        const verified = await fetchCookVerification(authUser.id)
        setIsVerifiedCook(verified)
        if (!verified) {
          await supabase.auth.signOut()
            return { error: { message: 'Cook not verified yet. Access denied.' } }
        }
      } else {
        setIsVerifiedCook(false)
      }
    }

    return { error: null }
  }

  const signInAsGuest = async () => {
    if (!GUEST_EMAIL || !GUEST_PASSWORD) {
      return { error: { message: 'Guest access is not configured.' } }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: GUEST_EMAIL,
      password: GUEST_PASSWORD,
    })

    if (error) {
      return { error }
    }

    const authUser = data.user
    if (authUser) {
      const role = await fetchUserRole(authUser.id)
      setUserRole(role)

      if (!role || !allowedRoles.includes(role)) {
        await supabase.auth.signOut()
        return { error: { message: 'Guest account is not allowed to access this application.' } }
      }

      if (role === 'cook') {
        const verified = await fetchCookVerification(authUser.id)
        setIsVerifiedCook(verified)
        if (!verified) {
          await supabase.auth.signOut()
          return { error: { message: 'Cook not verified yet. Access denied.' } }
        }
      } else {
        setIsVerifiedCook(false)
      }
    }

    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        userRole,
        isAdmin: userRole === 'admin',
        signIn,
        signInAsGuest,
        signOut,
  refreshUserRole,
  allowedRoles,
  isVerifiedCook,
  isReadOnly: userRole === 'guest',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
