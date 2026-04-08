'use client';

import { useData } from '@/components/DataContext';
import { fmtNum, getAndamento, statusClass, statusLabel } from '@/lib/utils';
import { useState, useMemo } from 'react';
import Link from 'next/link';

export default function PresentationPage() {
  const { obras, mapps, anos, medicoes } = useData();
  
  const [search, setSearch] = useState('');
  const [fAno, setFAno] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fMapp, setFMapp] = useState('');
  const [fCidade, setFCidade] = useState('');

  const nums = useMemo(() => [...new Set([...obras.map(o => o.mapp).filter(Boolean), ...mapps.map(m => m.num)])].sort(), [obras, mapps]);
  const locais = useMemo(() => [...new Set(obras.map(o => o.local).filter(Boolean))].sort(), [obras]);

  const filtered = useMemo(() => {
    return obras.filter(o => {
      if (search && !`${o.descricao||''} ${o.unidade||''} ${o.empresa||''} ${o.local||''} ${o.nup||''}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (fAno && o.ano !== parseInt(fAno)) return false;
      if (fStatus && (o.status || '').toUpperCase().includes(fStatus)) return false; // Basic matching
      if (fMapp && o.mapp !== fMapp) return false;
      if (fCidade && o.local !== fCidade) return false;
      return true;
    });
  }, [obras, search, fAno, fStatus, fMapp, fCidade]);

  const groupedByCity = useMemo(() => {
    const map: Record<string, typeof obras> = {};
    filtered.forEach(o => {
      const city = o.local || 'Sem Cidade';
      if (!map[city]) map[city] = [];
      map[city].push(o);
    });
    return map;
  }, [filtered]);

  const totalV = filtered.reduce((s, o) => s + (o.valor || 0), 0);
  const totalE = filtered.reduce((s, o) => s + (o.empenhado || 0), 0);
  const concluidas = filtered.filter(o => (o.status || '').toUpperCase().includes('CONCLU')).length;

  return (
    <div className="presentation-overlay open" style={{ position: 'relative', minHeight: '100vh', padding: '28px 24px' }}>
      <div className="pres-header">
        <div>
          <div className="pres-logo">SEAS</div>
          <div className="pres-subtitle">Superintendência do Sistema Estadual de Atendimento Socioeducativo<br/>Infraestrutura · Gestão de Obras</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/" className="exit-pres">✕ Sair da Apresentação</Link>
        </div>
      </div>

      <div className="pres-summary">
        <div className="pres-card"><div className="pres-card-val">{filtered.length}</div><div className="pres-card-label">Obras</div></div>
        <div className="pres-card"><div className="pres-card-val accent" style={{ color: 'var(--accent)' }}>{fmtNum(totalV)}</div><div className="pres-card-label">Valor Total</div></div>
        <div className="pres-card"><div className="pres-card-val" style={{ color: 'var(--accent2)' }}>{fmtNum(totalE)}</div><div className="pres-card-label">Empenhado</div></div>
        <div className="pres-card"><div className="pres-card-val">{concluidas}</div><div className="pres-card-label">Concluídas</div></div>
      </div>

      <div className="pres-filter-bar">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar obra..." />
        <select value={fAno} onChange={e => setFAno(e.target.value)}>
          <option value="">Todos os Anos</option>
          {anos.map(a => <option key={a.ano} value={a.ano}>{a.ano}</option>)}
        </select>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)}>
          <option value="">Todos os Status</option>
          <option value="CONCLU">Concluído</option>
          <option value="EXECU">Em Execução</option>
          <option value="AGUARD">Aguardando</option>
        </select>
        <select value={fMapp} onChange={e => setFMapp(e.target.value)}>
          <option value="">Todos os MAPPs</option>
          {nums.map(m => <option key={m} value={m}>MAPP {m}</option>)}
        </select>
        <select value={fCidade} onChange={e => setFCidade(e.target.value)}>
          <option value="">Todas as Cidades</option>
          {locais.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div id="pres-content">
        {Object.entries(groupedByCity).sort((a,b)=>a[0].localeCompare(b[0])).map(([cidade, obras]) => {
          const cTotal = obras.reduce((s,o)=>s+(o.valor||0),0);
          return (
            <div key={cidade} className="pres-city-group">
              <div className="pres-city-label">📍 {cidade} <span style={{fontSize:'12px',color:'var(--muted)',marginLeft:'8px',fontWeight:'400'}}>{obras.length} obras · {fmtNum(cTotal)}</span></div>
              <table className="pres-table">
                <thead>
                  <tr>
                    <th style={{ width: '4%' }}></th>
                    <th style={{ width: '13%' }}>UNIDADE</th>
                    <th style={{ width: '38%' }}>DESCRIÇÃO</th>
                    <th style={{ width: '15%' }}>VALOR</th>
                    <th style={{ width: '15%' }}>ANDAMENTO</th>
                    <th style={{ width: '15%' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {obras.map(o => {
                    const pct = getAndamento(o.id, obras, medicoes);
                    return (
                      <tr key={o.id}>
                        <td>{o.mapp ? <span className="mapp-chip">MAPP {o.mapp}</span> : ''}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{o.unidade || '—'}</td>
                        <td style={{ color: 'var(--muted)' }}>{o.descricao}</td>
                        <td style={{ color: 'var(--accent)', fontFamily: "'Source Code Pro', monospace" }}>{fmtNum(o.valor)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="pres-progress-wrap"><div className="pres-progress-fill" style={{ width: `${pct}%`, background: pct>=100?'#3fb950':pct>=50?'#f0a500':'#58a6ff' }}></div></div>
                            <span style={{ fontSize: '11px', fontFamily: "'Source Code Pro', monospace", color: pct>=100?'#3fb950':pct>=50?'#f0a500':'#58a6ff' }}>{pct}%</span>
                          </div>
                        </td>
                        <td><span className={`status-badge ${statusClass(o.status)}`}>{statusLabel(o.status)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
