'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { db } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || '';

interface AuthContextType {
  user: User | null;
  perfil: string;
  nome: string;
  loading: boolean;
  logout: () => void;
  sessionKey: number;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  perfil: 'visualizador',
  nome: '',
  loading: true,
  logout: () => {},
  sessionKey: 0
});

/** Remove all Supabase auth keys from localStorage */
function clearAuthStorage() {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
  } catch { /* SSR safety */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<string>('visualizador');
  const [nome, setNome] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionKey, setSessionKey] = useState<number>(0);
  const router = useRouter();
  const pathname = usePathname();

  /** Fetch profile from DB — always resolves, never blocks auth flow */
  async function loadPerfil(userId: string, fallbackEmail: string) {
    try {
      const { data } = await db.from('perfis').select('*').eq('id', userId).single();
      if (data?.perfil) setPerfil(data.perfil);
      if (data?.nome) setNome(data.nome);
      else setNome(fallbackEmail.split('@')[0] || '');
    } catch {
      setNome(fallbackEmail.split('@')[0] || '');
    }
  }

  // ── Main auth effect ──────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    // 1) Build version check — new deploy invalidates all sessions
    try {
      const storedBuild = localStorage.getItem('seas_build_id');
      if (BUILD_ID && storedBuild && storedBuild !== BUILD_ID) {
        clearAuthStorage();
      }
      if (BUILD_ID) localStorage.setItem('seas_build_id', BUILD_ID);
    } catch { /* SSR safety */ }

    // 2) Validate session with the Supabase server (handles token refresh)
    async function initSession() {
      try {
        const { data: { user: validUser }, error } = await db.auth.getUser();

        if (!isMounted) return;

        if (error || !validUser) {
          clearAuthStorage();
          setUser(null);
          setLoading(false);
          return;
        }

        setUser(validUser);
        await loadPerfil(validUser.id, validUser.email || '');
        if (isMounted) setLoading(false);
      } catch {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    }

    // 3) Listen for future auth events (login, logout, token refresh)
    const { data: { subscription } } = db.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await loadPerfil(session.user.id, session.user.email || '');
        setSessionKey(k => k + 1);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        clearAuthStorage();
        setUser(null);
        setPerfil('visualizador');
        setNome('');
      } else if (event === 'TOKEN_REFRESHED') {
        setSessionKey(k => k + 1);
      }
      // INITIAL_SESSION is ignored — initSession() handles it via getUser()
    });

    initSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Routing guard ─────────────────────────────────────────────────
  useEffect(() => {
    if (!loading) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  // ── Logout ────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await db.auth.signOut({ scope: 'local' });
    } catch { /* ignore */ }
    clearAuthStorage();
    setUser(null);
    setPerfil('visualizador');
    setNome('');
    router.push('/login');
  };

  // ── Render ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="loading-screen" style={{ display: 'flex' }}>
        <div style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: '24px', color: 'var(--accent)' }}>SEAS</div>
        <div className="spinner"></div>
        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Carregando...</div>
      </div>
    );
  }

  if (!user && pathname !== '/login') {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, perfil, nome, loading, logout, sessionKey }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
