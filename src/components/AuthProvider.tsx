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

  /** Fetch profile — never throws, never blocks auth flow */
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

  useEffect(() => {
    let isMounted = true;
    let initialized = false;

    // ── Build version check: new deploy → clear sessions ────────────
    try {
      const stored = localStorage.getItem('seas_build_id');
      if (BUILD_ID && stored && stored !== BUILD_ID) {
        clearAuthStorage();
      }
      if (BUILD_ID) localStorage.setItem('seas_build_id', BUILD_ID);
    } catch {}

    // ── Single listener for ALL auth events ─────────────────────────
    const { data: { subscription } } = db.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      // INITIAL_SESSION — fires immediately from localStorage (no network)
      if (event === 'INITIAL_SESSION') {
        if (initialized) return; // guard against React strict mode double-fire
        initialized = true;
        if (session?.user) {
          setUser(session.user);
          setLoading(false); // unblock UI instantly
          loadPerfil(session.user.id, session.user.email || ''); // background, no await
        } else {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      // SIGNED_IN — fresh login, token is guaranteed valid
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setLoading(false);
        await loadPerfil(session.user.id, session.user.email || '');
        setSessionKey(k => k + 1);
        return;
      }

      // SIGNED_OUT
      if (event === 'SIGNED_OUT') {
        clearAuthStorage();
        setUser(null);
        setPerfil('visualizador');
        setNome('');
        return;
      }

      // TOKEN_REFRESHED — stale token was renewed, reload perfil + data
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        await loadPerfil(session.user.id, session.user.email || '');
        setSessionKey(k => k + 1);
        return;
      }
    });

    // Safety net: if INITIAL_SESSION never fires, unblock after 3s
    const safetyTimeout = setTimeout(() => {
      if (isMounted && !initialized) {
        initialized = true;
        setLoading(false);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
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
