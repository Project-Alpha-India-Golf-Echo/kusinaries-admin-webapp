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
  signOut: () => Promise<void>
  refreshUserRole: () => Promise<void>
  allowedRoles: string[]
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
  const allowedRoles = ['admin', 'user']

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
      });
    } else {
      setUserRole(null);
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
        // Sign out disallowed roles
        await supabase.auth.signOut()
        return { error: { message: `Access restricted.` } }
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
        signOut,
  refreshUserRole,
  allowedRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
