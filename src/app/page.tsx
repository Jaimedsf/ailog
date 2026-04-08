'use client';

import { useData } from '@/components/DataContext';
import { fmtNum, getStatusGroup } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Dashboard() {
  const { obras, currentYear, mapps } = useData();
  const router = useRouter();
  
  const [dashFilter, setDashFilter] = useState(null);

  const ob = obras.filter(o => o.ano === currentYear);
  const totalValor = ob.reduce((s, o) => s + (o.valor || 0), 0);
  const totalEmp = ob.reduce((s, o) => s + (o.empenhado || 0), 0);
  const concluidas = ob.filter(o => getStatusGroup(o.status) === 'CONCLUIDO').length;
  const emExec = ob.filter(o => getStatusGroup(o.status) === 'EM EXECUÇÃO').length;
  const aguard = ob.filter(o => getStatusGroup(o.status) === 'AGUARDANDO').length;

  const showDashFilter = (label, obras_filtradas) => {
    const totalV = obras_filtradas.reduce((s, o) => s + (o.valor || 0), 0);
    setDashFilter({
      label,
      count: obras_filtradas.length,
      valor: totalV
    });
  };

  const clearDashFilter = () => setDashFilter(null);

  const sg: Record<string, number> = {}; ob.forEach(o => { const g = getStatusGroup(o.status); sg[g] = (sg[g] || 0) + 1; });
  const sc: Record<string, string> = { 'CONCLUIDO': '#3fb950', 'EM EXECUÇÃO': '#f0a500', 'ARQUIVADO': '#8b949e', 'AGUARDANDO': '#58a6ff', 'OUTROS': '#bc8cff' };
  const sl: Record<string, string> = { 'CONCLUIDO': 'Concluído', 'EM EXECUÇÃO': 'Em Execução', 'ARQUIVADO': 'Arquivado', 'AGUARDANDO': 'Aguardando', 'OUTROS': 'Outros' };
  const maxS = Math.max(1, ...Object.values(sg));

  const lg: Record<string, number> = {}; ob.forEach(o => { if (o.local) lg[o.local] = (lg[o.local] || 0) + 1; });
  const maxL = Math.max(1, ...Object.values(lg));

  const ug: Record<string, number> = {}; ob.forEach(o => { if (o.unidade) ug[o.unidade] = (ug[o.unidade] || 0) + 1; });
  const maxU = Math.max(1, ...Object.values(ug));

  // MAPP Overview
  const mp = mapps.filter(m => m.ano === currentYear);
  const nums = [...new Set([...ob.map(o => o.mapp).filter(Boolean), ...mp.map(m => m.num)])].sort();

  return (
    <div id="section-dashboard" className="tab-content active" style={{ display: 'block' }}>
      {dashFilter && (
        <div className="filter-result show">
          <div className="filter-result-text">Filtro: {dashFilter.label} — {dashFilter.count} obras</div>
          <div className="filter-result-valor">Total: {fmtNum(dashFilter.valor)}</div>
          <button className="btn" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={clearDashFilter}>✕ Limpar</button>
        </div>
      )}

      <div className="cards-grid">
        <div className="card yellow" onClick={() => router.push('/obras')}>
          <div className="card-label">Total de Obras</div><div className="card-value">{ob.length}</div>
          <div className="card-sub">cadastradas em {currentYear}</div><div className="card-hint">ver todas →</div>
        </div>
        <div className="card green" onClick={() => { router.push('/obras'); }}>
          <div className="card-label">Valor Total</div><div className="card-value" style={{ fontSize: '15px' }}>{fmtNum(totalValor)}</div>
          <div className="card-sub">empenhado: {fmtNum(totalEmp)}</div><div className="card-hint">ver detalhes →</div>
        </div>
        <div className="card blue" onClick={() => { showDashFilter('Obras Concluídas', ob.filter(o => getStatusGroup(o.status) === 'CONCLUIDO')); }}>
          <div className="card-label">Concluídas</div><div className="card-value">{concluidas}</div>
          <div className="card-sub">{ob.length ? Math.round(concluidas / ob.length * 100) : 0}% do total</div><div className="card-hint">filtrar →</div>
        </div>
        <div className="card red" onClick={() => { showDashFilter('Em Execução', ob.filter(o => getStatusGroup(o.status) === 'EM EXECUÇÃO')); }}>
          <div className="card-label">Em Execução</div><div className="card-value">{emExec}</div>
          <div className="card-sub">{aguard} aguardando</div><div className="card-hint">filtrar →</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">📈 Obras por Status</div>
          <div className="bar-chart">
            {Object.entries(sg).sort((a,b)=>b[1]-a[1]).map(([k,v]) => {
              const filtered = ob.filter(o => getStatusGroup(o.status) === k);
              return (
                <div key={k} className="bar-row" onClick={() => showDashFilter(sl[k] || k, filtered)}>
                  <div className="bar-label" title={sl[k] || k}>{sl[k] || k}</div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${v / maxS * 100}%`, background: sc[k] || '#bc8cff' }}>{v}</div></div>
                  <div className="bar-val">{v}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-title">📍 Obras por Cidade</div>
          <div className="bar-chart">
            {Object.entries(lg).sort((a,b)=>b[1]-a[1]).map(([k,v]) => {
              const filtered = ob.filter(o => o.local === k);
              return (
                <div key={k} className="bar-row" onClick={() => { showDashFilter('Cidade: ' + k, filtered); }}>
                  <div className="bar-label" title={k}>{k}</div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${v / maxL * 100}%`, background: '#58a6ff' }}>{v}</div></div>
                  <div className="bar-val">{v}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">🏢 Obras por Unidade</div>
          <div className="bar-chart">
            {Object.entries(ug).sort((a,b)=>b[1]-a[1]).map(([k,v]) => {
              const filtered = ob.filter(o => o.unidade === k);
              return (
                <div key={k} className="bar-row" onClick={() => { showDashFilter('Unidade: ' + k, filtered); }}>
                  <div className="bar-label" title={k}>{k}</div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${v / maxU * 100}%`, background: '#bc8cff' }}>{v}</div></div>
                  <div className="bar-val">{v} obra{v > 1 ? 's' : ''}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-title">💰 MAPPs</div>
          <div className="mapp-grid" style={{ marginBottom: 0, gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))' }}>
            {nums.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: '12px' }}>Nenhum MAPP cadastrado.</div>
            ) : nums.map(m => {
              const obrasM = ob.filter(o => o.mapp === m);
              const totalV = obrasM.reduce((s, o) => s + (o.valor || 0), 0);
              const cfg = mp.find(ml => ml.num === m);
              const limite = cfg?.valor_total || 0;
              const pct = limite > 0 ? Math.min(totalV / limite * 100, 100) : 0;
              const color = pct > 90 ? '#f85149' : pct > 70 ? '#f0a500' : '#3fb950';

              return (
                <div key={m} className="mapp-card" onClick={() => router.push('/mapp')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="mapp-badge">MAPP {m}</span>
                    <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{obrasM.length} obras</span>
                  </div>
                  <div className="mapp-bar-wrap">
                    <div className="mapp-bar" style={{ width: `${pct}%`, background: color }}></div>
                  </div>
                  <div className="mapp-values">
                    <div>Obras<br /><span>{fmtNum(totalV)}</span></div>
                    <div style={{ textAlign: 'right' }}>Limite<br /><span>{limite > 0 ? fmtNum(limite) : '—'}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
