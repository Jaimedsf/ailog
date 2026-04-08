'use client';

import { useData } from '@/components/DataContext';
import { useAuth } from '@/components/AuthProvider';
import { fmtNum, getStatusGroup, statusClass, statusLabel, getAndamento, getProgressColor } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { ObraModal } from '@/components/ObraModal';

export default function ObrasPage() {
  const { obras, mapps, currentYear, medicoes } = useData();
  const { perfil } = useAuth();
  
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [mapp, setMapp] = useState('');
  const [local, setLocal] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const isAdmin = perfil === 'admin';
  const PER_PAGE = 15;

  const ob = useMemo(() => obras.filter(o => o.ano === currentYear), [obras, currentYear]);

  const nums = useMemo(() => [...new Set([...ob.map(o => o.mapp).filter(Boolean), ...mapps.map(m => m.num)])].sort(), [ob, mapps]);
  const locals = useMemo(() => [...new Set(ob.map(o => o.local).filter(Boolean))].sort(), [ob]);
  const empresas = useMemo(() => [...new Set(ob.map(o => o.empresa).filter(Boolean))].sort(), [ob]);

  const filtered = useMemo(() => {
    return ob.filter(o => {
      if (search && !`${o.descricao||''} ${o.unidade||''} ${o.empresa||''} ${o.local||''} ${o.nup||''}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (status && getStatusGroup(o.status) !== status) return false;
      if (mapp && (o.mapp||'') !== mapp) return false;
      if (local && (o.local||'') !== local) return false;
      if (empresa && (o.empresa||'') !== empresa) return false;
      return true;
    });
  }, [ob, search, status, mapp, local, empresa]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      return (typeof av === 'number' ? (av - bv) : String(av).localeCompare(String(bv))) * sortDir;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (k) => {
    if (sortKey === k) setSortDir(d => d * -1);
    else { setSortKey(k); setSortDir(1); }
  };

  const total = sorted.length;
  const totalV = sorted.reduce((s, o) => s + (o.valor || 0), 0);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const validPage = Math.min(currentPage, pages);
  const slice = sorted.slice((validPage - 1) * PER_PAGE, validPage * PER_PAGE);

  return (
    <div id="section-obras" className="tab-content active" style={{ display: 'block' }}>
      <ObraModal isOpen={modalOpen} onClose={() => setModalOpen(false)} editingId={editingId} />

      {(search || status || mapp || local || empresa) && total > 0 && (
        <div className="filter-result show">
          <div><span className="filter-result-text">{total} obra{total > 1 ? 's' : ''} encontrada{total > 1 ? 's' : ''}</span></div>
          <div className="filter-result-valor">Valor total: {fmtNum(totalV)}</div>
        </div>
      )}

      <div className="filter-bar">
        <input type="text" value={search} onChange={e => {setSearch(e.target.value); setCurrentPage(1);}} placeholder="🔍 Buscar obra, unidade, empresa..." />
        <select value={status} onChange={e => {setStatus(e.target.value); setCurrentPage(1);}}>
          <option value="">Todos os Status</option>
          <option value="CONCLUIDO">Concluído</option>
          <option value="EM EXECUÇÃO">Em Execução</option>
          <option value="ARQUIVADO">Arquivado</option>
          <option value="AGUARDANDO">Aguardando</option>
        </select>
        <select value={mapp} onChange={e => {setMapp(e.target.value); setCurrentPage(1);}}>
          <option value="">Todos os MAPPs</option>
          {nums.map(m => <option key={m} value={m}>MAPP {m}</option>)}
        </select>
        <select value={local} onChange={e => {setLocal(e.target.value); setCurrentPage(1);}}>
          <option value="">Todas as Cidades</option>
          {locals.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={empresa} onChange={e => {setEmpresa(e.target.value); setCurrentPage(1);}}>
          <option value="">Todas as Empresas</option>
          {empresas.map(emp => <option key={emp} value={emp}>{emp}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('unidade')}>Unidade</th>
              <th onClick={() => handleSort('descricao')}>Descrição</th>
              <th onClick={() => handleSort('empresa')}>Empresa</th>
              <th onClick={() => handleSort('local')}>Cidade</th>
              <th onClick={() => handleSort('mapp')}>MAPP</th>
              <th onClick={() => handleSort('valor')}>Valor (R$)</th>
              <th>Andamento</th>
              <th onClick={() => handleSort('status')}>Status</th>
              {isAdmin && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {!slice.length ? (
              <tr><td colSpan={isAdmin ? 9 : 8}><div className="empty-state">🔍<br/>Nenhuma obra encontrada</div></td></tr>
            ) : slice.map(o => {
              const pct = getAndamento(o.id, obras, medicoes);
              const pc = getProgressColor(pct);
              return (
                <tr key={o.id} onClick={() => { /* viewObra(o.id) */ }}>
                  <td><strong>{o.unidade || '—'}</strong></td>
                  <td style={{ maxWidth: '230px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }} title={o.descricao || ''}>{o.descricao || '—'}</td>
                  <td>{o.empresa || '—'}</td>
                  <td className="muted">{o.local || '—'}</td>
                  <td><span className="mapp-chip">{o.mapp || '—'}</span></td>
                  <td className="muted">{fmtNum(o.valor)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="progress-wrap"><div className="progress-bar" style={{ width: `${pct}%`, background: pc }}></div></div>
                      <span style={{ fontFamily: "'Source Code Pro', monospace", fontSize: '11px', color: pc, minWidth: '28px' }}>{pct}%</span>
                    </div>
                  </td>
                  <td><span className={`status-badge ${statusClass(o.status)}`}>{statusLabel(o.status)}</span></td>
                  {isAdmin && (
                    <td>
                      <button className="btn" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={(e) => { e.stopPropagation(); setEditingId(o.id); setModalOpen(true); }}>✏</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {pages > 0 && (
          <div className="pagination">
            <span>{total} obras · {fmtNum(totalV)}</span>
            <div className="page-btns">
              <button className="page-btn" onClick={() => setCurrentPage(c => Math.max(1, c - 1))} disabled={validPage === 1}>‹</button>
              {Array.from({ length: pages }, (_, i) => i + 1).filter(p => p === 1 || p === pages || Math.abs(p - validPage) <= 1).map((p, i, a) => {
                const prev = a[i - 1];
                const gap = prev && p - prev > 1 ? <button key={`gap-${p}`} className="page-btn" disabled>…</button> : null;
                return (
                  <span key={p} style={{ display: 'contents' }}>
                    {gap}
                    <button className={`page-btn ${p === validPage ? 'active' : ''}`} onClick={() => setCurrentPage(p)}>{p}</button>
                  </span>
                );
              })}
              <button className="page-btn" onClick={() => setCurrentPage(c => Math.min(pages, c + 1))} disabled={validPage === pages}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
