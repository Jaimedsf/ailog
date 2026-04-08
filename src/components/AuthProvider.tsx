'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { db } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

// The authContext definition ensures typescript understands user and perfil
interface AuthContextType {
  user: User | null;
  perfil: string;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  perfil: 'visualizador',
  loading: true,
  logout: () => {}
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<string>('visualizador');
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check initial session
    db.auth.getSession().then(async ({ data: { session } }) => {
      await handleSession(session);
    });

    const { data: { subscription } } = db.auth.onAuthStateChange(async (event, session) => {
      await handleSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  const handleSession = async (session: any) => {
    if (session?.user) {
      setUser(session.user);
      try {
        const { data: perfilData } = await db.from('perfis').select('*').eq('id', session.user.id).single();
        if (perfilData?.perfil) {
          setPerfil(perfilData.perfil);
        }
      } catch (err) {
        console.error('Error fetching perfil:', err);
      }
    } else {
      setUser(null);
      setPerfil('visualizador');
    }
    setLoading(false);
  };

  const logout = async () => {
    await db.auth.signOut();
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ display: 'flex' }}>
        <div style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: '24px', color: 'var(--accent)' }}>SEAS</div>
        <div className="spinner"></div>
        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Carregando...</div>
      </div>
    );
  }

  // Prevent flash of protected content while redirecting
  if (!user && pathname !== '/login') {
    return null; 
  }

  return (
    <AuthContext.Provider value={{ user, perfil, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
