'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { useData } from './DataContext';
import { db } from '@/lib/supabase';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, perfil, logout } = useAuth();
  const { anos, obras, currentYear, setCurrentYear, syncState } = useData();
  const [showAddYear, setShowAddYear] = useState(false);
  const [newYear, setNewYear] = useState('');

  const isAdmin = perfil === 'admin';
  const email = user?.email || '';
  const inicial = email.charAt(0).toUpperCase();
  const nome = email.split('@')[0];

  const handleAddYear = async () => {
    const y = parseInt(newYear);
    if (!y || isNaN(y) || y < 2000 || y > 2100) {
      alert('Ano inválido!');
      return;
    }
    if (anos.find((a) => a.ano === y)) {
      alert('Ano já existe!');
      return;
    }
    const { error } = await db.from('anos').insert({ ano: y });
    if (error) {
      alert('Erro ao adicionar ano: ' + error.message);
      return;
    }
    setCurrentYear(y);
    setNewYear('');
    setShowAddYear(false);
  };

  const NavItem = ({ href, icon, label, adminOnly }: { href: string; icon: string; label: string; adminOnly?: boolean }) => {
    if (adminOnly && !isAdmin) return null;
    const active = pathname === href || (href !== '/' && pathname.startsWith(href));
    return (
      <Link href={href} onClick={onClose} className={`nav-item ${active ? 'active' : ''}`}>
        <span className="icon">{icon}</span> {label}
      </Link>
    );
  };

  return (
    <nav className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
      <div className="sidebar-logo">
        <div className="org">SEAS</div>
        <div className="sub">Gestão de Obras</div>
      </div>
      
      <div id="user-badge-wrap">
        <div className="user-badge">
          <div className="user-avatar">{inicial}</div>
          <div className="user-info">
            <div className="user-name">{nome}</div>
            <div className="user-role">{isAdmin ? 'Administrador' : 'Visualizador'}</div>
          </div>
          <button className="logout-btn" onClick={logout} title="Sair">↪</button>
        </div>
      </div>

      <div className="year-selector">
        <div className="year-label">Ano de Referência</div>
        <div className="year-select-wrap">
          <select value={currentYear} onChange={(e) => setCurrentYear(parseInt(e.target.value))}>
            {anos.map((a) => (
              <option key={a.ano} value={a.ano}>
                {a.ano} ({obras.filter(o => o.ano === a.ano).length} obras)
              </option>
            ))}
          </select>
        </div>
        <button className="add-year-btn" onClick={() => setShowAddYear(!showAddYear)}>＋ Adicionar ano</button>
        {showAddYear && (
          <div id="add-year-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', padding: '0 8px' }}>
            <input 
              type="number" 
              placeholder="Ex: 2025" 
              min="2000" max="2100"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddYear()}
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--accent)', borderRadius: '6px', color: 'var(--text)', padding: '7px 10px', fontSize: '13px', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={handleAddYear} style={{ flex: 1, background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '6px', padding: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>✓ Confirmar</button>
              <button onClick={() => setShowAddYear(false)} style={{ flex: 1, background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px', fontSize: '12px', cursor: 'pointer' }}>✕</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '4px' }}>
        <div className="nav-section">Navegação</div>
        <NavItem href="/" icon="📊" label="Dashboard" />
        <NavItem href="/obras" icon="🏗️" label="Obras" />
        <NavItem href="/mapp" icon="💰" label="MAPPs" />
        
        <div className="nav-section">Administração</div>
        <NavItem href="/usuarios" icon="👥" label="Usuários" adminOnly />
        <NavItem href="/config" icon="⚙️" label="Configurações" adminOnly />
      </div>

      <div style={{ marginTop: 'auto', padding: '10px 8px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '11px', color: 'var(--muted)' }}>
          <span className={`sync-dot ${syncState === 'syncing' ? 'syncing' : syncState === 'offline' ? 'offline' : ''}`} id="sync-dot"></span>
          <span id="sync-label">{syncState === 'syncing' ? 'Salvando...' : syncState === 'offline' ? 'Erro' : 'Conectado'}</span>
        </div>
      </div>
    </nav>
  );
}
