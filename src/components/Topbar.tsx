'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTheme } from './ThemeProvider';
import { useData } from './DataContext';
import { useAuth } from './AuthProvider';
import { ObraModal } from './ObraModal';
import { getAndamento, statusLabel, showToast } from '@/lib/utils';

const titles: Record<string, string> = {
  '/': '📊 Dashboard',
  '/obras': '🏗️ Obras',
  '/mapp': '💰 MAPPs',
  '/usuarios': '👥 Usuários',
  '/config': '⚙️ Configurações e Importação'
};

interface ThemeItem {
  name: string;
  color: string;
}

const themes: ThemeItem[] = [
  { name: 'Escuro', color: '#0d1117' },
  { name: 'Claro', color: '#f6f8fa' },
  { name: 'Azul', color: '#0a192f' },
  { name: 'Verde', color: '#071a0f' },
  { name: 'Roxo', color: '#13001e' },
  { name: 'Marrom', color: '#1a1209' },
  { name: 'Cinza', color: '#1c1c1e' },
];

interface TopbarProps {
  onMenuToggle: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const pathname = usePathname();
  const title = titles[pathname] || 'SEAS';
  const [themeOpen, setThemeOpen] = useState(false);
  const { currentTheme, applyTheme } = useTheme();

  const { obras, mapps, configs, medicoes, currentYear } = useData();
  const { perfil } = useAuth();
  const isAdmin = perfil === 'admin';
  const [novaObraOpen, setNovaObraOpen] = useState(false);

  const handleApply = (i: number) => {
    applyTheme(i);
    setThemeOpen(false);
  };

  const exportCSV = () => {
    const ob = obras.filter(o => o.ano === currentYear);
    if (!ob.length) { showToast('Sem obras para exportar', '#f85149'); return; }
    const rows = [['Unidade', 'Descrição', 'Empresa', 'Cidade', 'MAPP', 'Valor (R$)', 'Andamento (%)', 'Status']];
    ob.forEach(o => {
      const pct = getAndamento(o.id, obras, medicoes);
      rows.push([
        `"${(o.unidade || '').replace(/"/g, '""')}"`,
        `"${(o.descricao || '').replace(/"/g, '""')}"`,
        `"${(o.empresa || '').replace(/"/g, '""')}"`,
        `"${(o.local || '').replace(/"/g, '""')}"`,
        `"${(o.mapp || '').replace(/"/g, '""')}"`,
        (o.valor || 0).toString(),
        pct.toString(),
        `"${(statusLabel(o.status) || '').replace(/"/g, '""')}"`
      ]);
    });
    const blob = new Blob(['\uFEFF' + rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `obras_seas_${currentYear}.csv`;
    a.click();
    showToast('CSV exportado!');
  };

  const doBackup = () => {
    const backup = {
      obras,
      mapps,
      medicoes,
      configs,
      generatedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup_seas_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('💾 Backup realizado com sucesso!');
  };

  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button className="menu-toggle" onClick={onMenuToggle}>☰</button>
        <div className="topbar-title">{title}</div>
      </div>
      <div className="topbar-actions">
        <div className="theme-wrap">
          <button className="btn" onClick={() => setThemeOpen(!themeOpen)} title="Tema">🎨</button>
          <div className={`theme-dropdown ${themeOpen ? 'open' : ''}`}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: "var(--font-mono)", textTransform: 'uppercase', letterSpacing: '1px' }}>Escolha o tema</div>
            <div className="theme-options">
              {themes.map((t, i) => (
                <div 
                  key={t.name} 
                  className={`theme-option ${i === currentTheme ? 'active' : ''}`} 
                  style={{ background: t.color }} 
                  onClick={() => handleApply(i)} 
                  title={t.name}
                ></div>
              ))}
            </div>
          </div>
        </div>
        
        <button className="btn" onClick={doBackup} title="Fazer Backup do Banco de Dados">💾 Backup</button>
        <button className="btn btn-present" onClick={() => window.location.href = '/apresentacao'}>📽 Apresentação</button>
        <button className="btn" onClick={exportCSV}>⬇ CSV</button>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setNovaObraOpen(true)}>＋ Nova Obra</button>
        )}
      </div>

      {isAdmin && <ObraModal isOpen={novaObraOpen} onClose={() => setNovaObraOpen(false)} editingId={null} />}
    </div>
  );
}
