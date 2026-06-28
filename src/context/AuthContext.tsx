import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';

type Role = 'owner' | 'student' | null;

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  role: Role;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      const storedRole = await AsyncStorage.getItem('bb_role');
      setRole(storedRole as Role);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        await AsyncStorage.multiRemove(['bb_role', 'bb_student_id', 'bb_student_name', 'onboarding_profile']);
        setRole(null);
      } else {
        const storedRole = await AsyncStorage.getItem('bb_role');
        setRole(storedRole as Role);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await AsyncStorage.multiRemove(['bb_role', 'bb_student_id', 'bb_student_name', 'onboarding_profile']);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
