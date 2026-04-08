'use client';

import { useData } from '@/components/DataContext';
import { useAuth } from '@/components/AuthProvider';
import { fmtNum, getStatusGroup, statusClass, statusLabel, getAndamento, getProgressColor } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { db } from '@/lib/supabase';

export default function MappPage() {
  const { obras, mapps, currentYear, medicoes } = useData();
  const { perfil } = useAuth();
  const isAdmin = perfil === 'admin';

  const [modalOpen, setModalOpen] = useState(false);
  const [newNum, setNewNum] = useState('');
  const [newValor, setNewValor] = useState('');
  const [newObs, setNewObs] = useState('');

  const ob = obras.filter(o => o.ano === currentYear);
  const mp = mapps.filter(m => m.ano === currentYear);
  const nums = useMemo(() => [...new Set([...ob.map(o => o.mapp).filter(Boolean), ...mp.map(m => m.num)])].sort(), [ob, mp]);

  const saveMapp = async () => {
    const num = newNum.trim();
    if (!num) return;
    const valor = parseFloat(newValor.replace(/\D/g, '')) / 100 || 0;
    
    // Check existing
    const existing = mapps.find(m => m.num === num && m.ano === currentYear);
    if (existing) {
      await db.from('mapps').update({ valor_total: valor, obs: newObs }).eq('id', existing.id);
    } else {
      await db.from('mapps').insert({ num, valor_total: valor, obs: newObs, ano: currentYear });
    }
    
    setModalOpen(false);
    setNewNum(''); setNewValor(''); setNewObs('');
  };

  const updateMappValor = async (num, valStr) => {
    if (!isAdmin) return;
    const valor = parseFloat(valStr.replace(/\D/g, '')) / 100 || 0;
    const existing = mapps.find(m => m.num === num && m.ano === currentYear);
    if (existing) {
      await db.from('mapps').update({ valor_total: valor }).eq('id', existing.id);
    } else {
      await db.from('mapps').insert({ num, valor_total: valor, obs: '', ano: currentYear });
    }
  };

  const handleCurrencyInput = (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (!v) { e.target.value = ''; return; }
    v = (parseInt(v, 10) / 100).toFixed(2);
    e.target.value = parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div id="section-mapp" className="tab-content active" style={{ display: 'block' }}>
      <div className="section-header">
        <div className="section-title">Controle por MAPP <span className="count-badge">{nums.length}</span></div>
        {isAdmin && <button className="btn btn-primary" onClick={() => setModalOpen(true)}>＋ Novo MAPP</button>}
      </div>

      <div id="mapp-detail-cards">
        {nums.length === 0 ? (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px' }}>Nenhum MAPP para este ano.</div>
        ) : nums.map(m => {
          const obrasM = ob.filter(o => o.mapp === m);
          const totalV = obrasM.reduce((s, o) => s + (o.valor || 0), 0);
          const totalE = obrasM.reduce((s, o) => s + (o.empenhado || 0), 0);
          const cfg = mp.find(ml => ml.num === m);
          const limite = cfg?.valor_total || 0;
          const saldo = limite - totalV;
          const pctL = limite > 0 ? Math.min(totalV / limite * 100, 100) : 0;
          const color = pctL > 90 ? '#f85149' : pctL > 70 ? '#f0a500' : '#3fb950';

          const concl = obrasM.filter(o => getStatusGroup(o.status) === 'CONCLUIDO').length;
          const exec = obrasM.filter(o => getStatusGroup(o.status) === 'EM EXECUÇÃO').length;
          const agd = obrasM.filter(o => getStatusGroup(o.status) === 'AGUARDANDO').length;

          return (
            <div key={m} className="mapp-detail-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span className="mapp-badge" style={{ fontSize: '14px', padding: '4px 12px' }}>MAPP {m}</span>
                  {cfg?.obs && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{cfg.obs}</span>}
                </div>
                {isAdmin ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Limite (R$):</span>
                    <input 
                      className="mapp-valor-input" 
                      type="text" 
                      defaultValue={limite ? Number(limite).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''} 
                      placeholder="0,00" 
                      onInput={handleCurrencyInput} 
                      onBlur={(e) => updateMappValor(m, e.target.value)} 
                    />
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Limite: <strong style={{ color: 'var(--text)' }}>{fmtNum(limite)}</strong></div>
                )}
              </div>

              {limite > 0 ? (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginBottom: '5px' }}>
                    <span>Comprometido: <strong style={{ color }}>{pctL.toFixed(1)}%</strong></span>
                    <span style={{ color: saldo < 0 ? '#f85149' : 'var(--accent2)' }}>Saldo: {fmtNum(saldo)}</span>
                  </div>
                  <div className="mapp-bar-wrap" style={{ height: '8px' }}><div className="mapp-bar" style={{ width: `${pctL}%`, background: color }}></div></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)', marginTop: '3px', fontFamily: "'Source Code Pro', monospace" }}>
                    <span>Obras: {fmtNum(totalV)}</span><span>Limite: {fmtNum(limite)}</span>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(240,165,0,0.08)', border: '1px dashed rgba(240,165,0,0.2)', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: 'var(--accent)', marginBottom: '12px' }}>
                  ⚠ {isAdmin ? 'Defina o limite acima' : 'Limite não definido'}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '14px' }}>
                {[
                  ['TOTAL', fmtNum(totalV), 'var(--accent)'],
                  ['EMPENHADO', fmtNum(totalE), 'var(--accent2)'],
                  ['CONCLUÍDAS', concl, '#3fb950'],
                  ['EM EXEC.', exec, '#f0a500'],
                  ['AGUARD.', agd, '#58a6ff']
                ].map(([l, v, c], idx) => (
                  <div key={idx} style={{ background: 'var(--surface2)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: 'var(--muted)', marginBottom: '3px', fontFamily: "'Source Code Pro', monospace", textTransform: 'uppercase' }}>{l}</div>
                    <div style={{ fontFamily: "'Merriweather', serif", fontWeight: 700, fontSize: typeof v === 'string' ? '11px' : '16px', color: c as string }}>{v}</div>
                  </div>
                ))}
              </div>

              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '10px', color: 'var(--muted)', fontFamily: "'Source Code Pro', monospace", fontWeight: 500 }}>UNIDADE</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '10px', color: 'var(--muted)', fontFamily: "'Source Code Pro', monospace", fontWeight: 500 }}>DESCRIÇÃO</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '10px', color: 'var(--muted)', fontFamily: "'Source Code Pro', monospace", fontWeight: 500 }}>VALOR</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '10px', color: 'var(--muted)', fontFamily: "'Source Code Pro', monospace", fontWeight: 500 }}>ANDAMENTO</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '10px', color: 'var(--muted)', fontFamily: "'Source Code Pro', monospace", fontWeight: 500 }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {obrasM.map(o => {
                    const pct = getAndamento(o.id, obras, medicoes);
                    const pc = getProgressColor(pct);
                    return (
                      <tr key={o.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                        <td style={{ padding: '7px 8px', fontWeight: 600 }}>{o.unidade || '—'}</td>
                        <td style={{ padding: '7px 8px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--muted)' }}>{o.descricao || '—'}</td>
                        <td style={{ padding: '7px 8px', fontFamily: "'Source Code Pro', monospace", fontSize: '11px', color: 'var(--accent)' }}>{fmtNum(o.valor)}</td>
                        <td style={{ padding: '7px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div className="progress-wrap" style={{ minWidth: '50px' }}><div className="progress-bar" style={{ width: `${pct}%`, background: pc }}></div></div>
                            <span style={{ fontSize: '10px', color: pc, fontFamily: "'Source Code Pro', monospace" }}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '7px 8px' }}><span className={`status-badge ${statusClass(o.status)}`}>{statusLabel(o.status)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div className="modal-title">Novo MAPP</div>
              <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field"><label>Número do MAPP *</label><input value={newNum} onChange={e => setNewNum(e.target.value)} placeholder="Ex: 27, 41..." /></div>
                <div className="field"><label>Limite (R$)</label><input type="text" value={newValor} onInput={handleCurrencyInput} onChange={e => setNewValor(e.target.value)} placeholder="0,00" /></div>
                <div className="field full"><label>Descrição</label><input value={newObs} onChange={e => setNewObs(e.target.value)} placeholder="Ex: MAPP Principal..." /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveMapp}>💾 Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
