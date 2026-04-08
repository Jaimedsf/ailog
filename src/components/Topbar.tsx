'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const titles: Record<string, string> = {
  '/': '📊 Dashboard',
  '/obras': '🏗️ Obras',
  '/mapp': '💰 MAPPs',
  '/usuarios': '👥 Usuários',
  '/config': '⚙️ Configurações e Importação'
};

interface ThemeItem {
  name: string;
  key: string;
  color: string;
}

const themes: ThemeItem[] = [
  { name: 'Escuro', key: 'dark', color: '#0d1117' },
  { name: 'Claro', key: 'light', color: '#f6f8fa' },
  { name: 'Azul', key: 'blue', color: '#0a192f' },
  { name: 'Verde', key: 'green', color: '#071a0f' },
  { name: 'Roxo', key: 'purple', color: '#13001e' },
  { name: 'Marrom', key: 'brown', color: '#1a1209' },
  { name: 'Cinza', key: 'gray', color: '#1c1c1e' },
];

interface TopbarProps {
  onMenuToggle: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const pathname = usePathname();
  const title = titles[pathname] || 'SEAS';
  const [themeOpen, setThemeOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('seas-theme');
    if (saved) {
      const idx = parseInt(saved, 10);
      if (idx >= 0 && idx < themes.length) {
        applyTheme(idx);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyTheme = (i: number) => {
    setCurrentTheme(i);
    const t = themes[i];
    // Use data-theme attribute for CSS-based theme switching
    if (t.key === 'dark') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', t.key);
    }
    localStorage.setItem('seas-theme', String(i));
    setThemeOpen(false);
  };

  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button className="menu-toggle" onClick={onMenuToggle}>☰</button>
        <div className="topbar-title">{title}</div>
      </div>
      <div className="topbar-actions">
        <button className="btn btn-present" onClick={() => window.location.href = '/apresentacao'}>📽 Apresentação</button>
        <div className="theme-wrap">
          <button className="btn" onClick={() => setThemeOpen(!themeOpen)} title="Tema">🎨</button>
          <div className={`theme-dropdown ${themeOpen ? 'open' : ''}`}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: "var(--font-mono)", textTransform: 'uppercase', letterSpacing: '1px' }}>Escolha o tema</div>
            <div className="theme-options">
              {themes.map((t, i) => (
                <div 
                  key={t.key} 
                  className={`theme-option ${i === currentTheme ? 'active' : ''}`} 
                  style={{ background: t.color }} 
                  onClick={() => applyTheme(i)} 
                  title={t.name}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
