'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/supabase';
import { useData } from './DataContext';
import { useAuth } from './AuthProvider';
import { formatCurrency, parseCurrency, showToast, fmtNum, fmtDate, getProgressColor } from '@/lib/utils';

export function ObraModal({ isOpen, onClose, editingId }) {
  const { obras, mapps, medicoes, configs, currentYear, syncState, setSyncState } = useData();
  const { perfil } = useAuth();
  const isAdmin = perfil === 'admin';

  const [tab, setTab] = useState('dados');
  const [formData, setFormData] = useState({
    descricao: '', empresa: '', unidade: '', local: '', regiao: '', nup: '',
    os: '', mapp: '', origem: '', status: 'EM EXECUÇÃO', obs: '', data_os: '', inicio: '', termino: ''
  });
  const [valorStr, setValorStr] = useState('');
  const [empStr, setEmpStr] = useState('');

  const [medsList, setMedsList] = useState([]);
  const [newMed, setNewMed] = useState({ data: '', valor: '', num: '1ª Medição', desc: '' });

  const [inlineMappOpen, setInlineMappOpen] = useState(false);
  const [iMapp, setIMapp] = useState({ num: '', valor: '', obs: '' });

  useEffect(() => {
    if (isOpen) {
      if (editingId) {
        const o = obras.find(x => x.id === editingId);
        if (o) {
          setFormData({
            descricao: o.descricao || '', empresa: o.empresa || '', unidade: o.unidade || '',
            local: o.local || '', regiao: o.regiao || '', nup: o.nup || '', os: o.os || '',
            mapp: o.mapp || '', origem: o.origem || '', status: o.status || 'EM EXECUÇÃO',
            obs: o.obs || '', data_os: o.data_os || '', inicio: o.inicio || '', termino: o.termino || ''
          });
          setValorStr(o.valor ? Number(o.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
          setEmpStr(o.empenhado ? Number(o.empenhado).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
        }
        const ms = medicoes.filter(m => m.obra_id === editingId);
        setMedsList(ms.map(m => ({ ...m, _tmpId: Math.random() })));
      } else {
        setFormData({
          descricao: '', empresa: '', unidade: '', local: '', regiao: '', nup: '',
          os: '', mapp: '', origem: '', status: 'EM EXECUÇÃO', obs: '', data_os: '', inicio: '', termino: ''
        });
        setValorStr(''); setEmpStr('');
        setMedsList([]);
      }
      setTab('dados');
      setInlineMappOpen(false);
    }
  }, [isOpen, editingId, obras, medicoes]);

  if (!isOpen) return null;

  const cfgUnidades = configs.filter(c => c.tipo === 'unidade' && c.ativo !== false);
  const cfgEmpresas = configs.filter(c => c.tipo === 'empresa' && c.ativo !== false);
  const cfgCidades = configs.filter(c => c.tipo === 'cidade' && c.ativo !== false);
  const cfgRegioes = configs.filter(c => c.tipo === 'regiao' && c.ativo !== false);

  const nums = [...new Set([...obras.map(o => o.mapp).filter(Boolean), ...mapps.map(m => m.num)])].sort();

  const handleCurrency = (str, setter) => {
    let v = str.replace(/\D/g, '');
    if (!v) { setter(''); return; }
    v = (parseInt(v, 10) / 100).toFixed(2);
    setter(parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const saveObra = async () => {
    if (!isAdmin) return;
    if (!formData.descricao) { showToast('Preencha a descricao!', '#f85149'); setTab('dados'); return; }
    if (!formData.empresa) { showToast('Selecione a empresa!', '#f85149'); setTab('dados'); return; }
    if (!formData.unidade) { showToast('Selecione a unidade!', '#f85149'); setTab('dados'); return; }

    const obj = {
      ...formData,
      ano: currentYear,
      valor: parseCurrency(valorStr),
      empenhado: parseCurrency(empStr)
    };

    setSyncState('syncing');
    let oId = editingId;
    if (editingId) {
      const { error } = await db.from('obras').update(obj).eq('id', editingId);
      if (error) { showToast('Erro ao salvar!', '#f85149'); setSyncState('offline'); return; }
    } else {
      const { data, error } = await db.from('obras').insert(obj).select();
      if (error || !data) { showToast('Erro ao salvar!', '#f85149'); setSyncState('offline'); return; }
      oId = data[0].id;
    }

    if (oId) {
      await db.from('medicoes').delete().eq('obra_id', oId);
      if (medsList.length > 0) {
        const toInsert = medsList.map(m => ({
          obra_id: oId, num: m.num, data: m.data, valor: Number(m.valor) || 0,
          descricao: m.desc || m.descricao
        }));
        await db.from('medicoes').insert(toInsert);
      }
    }

    setSyncState('online');
    showToast(editingId ? 'Obra atualizada!' : 'Obra adicionada!');
    onClose();
  };

  const deleteObra = async () => {
    if (!isAdmin || !confirm('Excluir esta obra?')) return;
    setSyncState('syncing');
    await db.from('medicoes').delete().eq('obra_id', editingId);
    await db.from('obras').delete().eq('id', editingId);
    setSyncState('online');
    showToast('Obra excluída.', '#f85149');
    onClose();
  };

  const addMedicao = () => {
    const v = parseCurrency(newMed.valor);
    if (!newMed.data) { showToast('Informe a data!', '#f85149'); return; }
    if (!v || v <= 0) { showToast('Informe valor > 0!', '#f85149'); return; }

    const valorObra = parseCurrency(valorStr);
    const mTotal = medsList.reduce((s, m) => s + (Number(m.valor) || 0), 0);
    if (valorObra > 0 && (mTotal + v) > valorObra) {
      showToast('Valor ultrapassa total da obra!', '#f85149'); return;
    }

    setMedsList([...medsList, { _tmpId: Math.random(), data: newMed.data, valor: v, num: newMed.num, desc: newMed.desc }]);
    setNewMed({ data: '', valor: '', num: '1ª Medição', desc: '' });
  };

  const removeMedicao = (id) => {
    setMedsList(medsList.filter(m => m._tmpId !== id));
  };

  const saveMedicoesDireto = async () => {
    if (!editingId) { showToast('Salve a obra primeiro!', '#f85149'); return; }
    setSyncState('syncing');
    await db.from('medicoes').delete().eq('obra_id', editingId);
    if (medsList.length > 0) {
      const toInsert = medsList.map(m => ({
        obra_id: editingId, num: m.num, data: m.data, valor: Number(m.valor) || 0,
        descricao: m.desc || m.descricao
      }));
      await db.from('medicoes').insert(toInsert);
    }
    setSyncState('online');
    showToast('Medições salvas!', '#3fb950');
    onClose();
  };

  const handleCreateMapp = async () => {
    if (!iMapp.num) { showToast('MAPP num missing', '#f85149'); return; }
    const v = parseCurrency(iMapp.valor);
    const existing = mapps.find(m => m.num === iMapp.num && m.ano === currentYear);
    if (existing) {
      await db.from('mapps').update({ valor_total: v, obs: iMapp.obs }).eq('id', existing.id);
    } else {
      await db.from('mapps').insert({ num: iMapp.num, valor_total: v, obs: iMapp.obs, ano: currentYear });
    }
    setFormData({ ...formData, mapp: iMapp.num });
    setInlineMappOpen(false);
    showToast('MAPP criado!');
  };

  const valObra = parseCurrency(valorStr);
  const mTotal = medsList.reduce((s, m) => s + (Number(m.valor) || 0), 0);
  const pct = valObra > 0 ? Math.min(100, Math.round(mTotal / valObra * 100)) : 0;
  const pcColor = getProgressColor(pct);

  return (
    <div className="modal-overlay open" style={{ display: 'flex' }}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{editingId ? 'Editar Obra' : 'Nova Obra'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-tabs">
            <div className={`modal-tab ${tab === 'dados' ? 'active' : ''}`} onClick={() => setTab('dados')}>📋 Dados da Obra</div>
            {editingId && <div className={`modal-tab ${tab === 'medicoes' ? 'active' : ''}`} onClick={() => setTab('medicoes')}>📏 Medições</div>}
          </div>

          <div className={`modal-tab-content ${tab === 'dados' ? 'active' : ''}`}>
            <div className="form-grid">
              <div className="field full"><label>Descrição da Obra *</label><textarea value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} placeholder="Descreva a obra..."></textarea></div>
              <div className="field"><label>Empresa *</label><select value={formData.empresa} onChange={e => setFormData({ ...formData, empresa: e.target.value })}><option value="">Selecione</option>{cfgEmpresas.map(c => <option key={c.valor} value={c.valor}>{c.valor}</option>)}</select></div>
              <div className="field"><label>Unidade *</label><select value={formData.unidade} onChange={e => setFormData({ ...formData, unidade: e.target.value })}><option value="">Selecione</option>{cfgUnidades.map(c => <option key={c.valor} value={c.valor}>{c.valor}</option>)}</select></div>
              <div className="field"><label>Cidade</label><select value={formData.local} onChange={e => setFormData({ ...formData, local: e.target.value })}><option value="">Selecione</option>{cfgCidades.map(c => <option key={c.valor} value={c.valor}>{c.valor}</option>)}</select></div>
              <div className="field"><label>Região</label><select value={formData.regiao} onChange={e => setFormData({ ...formData, regiao: e.target.value })}><option value="">Selecione</option>{cfgRegioes.map(c => <option key={c.valor} value={c.valor}>{c.valor}</option>)}</select></div>
              <div className="field"><label>Nº do Processo (NUP)</label><input value={formData.nup} onChange={e => setFormData({ ...formData, nup: e.target.value })} placeholder="NUP 47011.XXXXX/XXXX-XX" /></div>
              <div className="field"><label>Ordem de Serviço</label><input value={formData.os} onChange={e => setFormData({ ...formData, os: e.target.value })} placeholder="Nº da OS" /></div>
              <div className="field">
                <label>MAPP *</label>
                <select value={formData.mapp} onChange={e => setFormData({ ...formData, mapp: e.target.value })}><option value="">Selecione o MAPP</option>{nums.map(n => <option key={n} value={n}>MAPP {n}</option>)}</select>
                <span className="mapp-inline-btn" onClick={() => setInlineMappOpen(!inlineMappOpen)}>＋ Criar novo MAPP</span>
                {inlineMappOpen && (
                  <div className="mapp-inline-form open">
                    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="field"><label>Nº do MAPP *</label><input value={iMapp.num} onChange={e => setIMapp({ ...iMapp, num: e.target.value })} placeholder="Ex: 27" /></div>
                      <div className="field"><label>Limite (R$)</label><input type="text" value={iMapp.valor} onInput={(e: any) => handleCurrency(e.target.value, (v: string) => setIMapp({ ...iMapp, valor: v }))} placeholder="0,00" /></div>
                      <div className="field full"><label>Descrição</label><input value={iMapp.obs} onChange={e => setIMapp({ ...iMapp, obs: e.target.value })} placeholder="Ex: MAPP Principal" /></div>
                    </div>
                    <div style={{ textAlign: 'right', marginTop: '8px' }}><button className="btn btn-primary" style={{ fontSize: '11px', padding: '5px 10px' }} onClick={handleCreateMapp}>Salvar MAPP</button></div>
                  </div>
                )}
              </div>
              <div className="field"><label>Origem do Recurso</label><select value={formData.origem} onChange={e => setFormData({ ...formData, origem: e.target.value })}><option value="">Selecione</option><option value="SEAS">SEAS</option><option value="SOP">SOP</option></select></div>
              <div className="field"><label>Valor Total (R$)</label><input type="text" value={valorStr} onInput={(e: any) => handleCurrency(e.target.value, setValorStr)} placeholder="0,00" /></div>
              <div className="field"><label>Valor Empenhado (R$)</label><input type="text" value={empStr} onInput={(e: any) => handleCurrency(e.target.value, setEmpStr)} placeholder="0,00" /></div>
              <div className="field"><label>📝 Assinatura da OS</label><input type="date" value={formData.data_os} onChange={e => setFormData({ ...formData, data_os: e.target.value })} /></div>
              <div className="field"><label>🟢 Data de Início</label><input type="date" value={formData.inicio} onChange={e => setFormData({ ...formData, inicio: e.target.value })} /></div>
              <div className="field"><label>🔴 Data de Término</label><input type="date" value={formData.termino} onChange={e => setFormData({ ...formData, termino: e.target.value })} /></div>
              <div className="field full"><label>Status</label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  <option value="EM EXECUÇÃO">Em Execução</option>
                  <option value="CONCLUIDO">Concluído</option>
                  <option value="ARQUIVADO">Arquivado</option>
                  <option value="AGUARDANDO LIMITE FINANCEIRO">Aguardando Limite Financeiro</option>
                  <option value="AGUARDANDO DOTAÇÃO ORÇAMENTÁRIA">Aguardando Dotação Orçamentária</option>
                  <option value="AGUARDANDO ORÇAMENTO">Aguardando Orçamento</option>
                  <option value="ACRECENTAR NUP">Acrescentar NUP</option>
                </select>
              </div>
              <div className="field full"><label>Observações</label><textarea value={formData.obs} onChange={e => setFormData({ ...formData, obs: e.target.value })} placeholder="Observações adicionais..."></textarea></div>
            </div>
          </div>

          <div className={`modal-tab-content ${tab === 'medicoes' ? 'active' : ''}`}>
            <div className="progress-summary" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{ flex: 1, background: 'var(--bg)', borderRadius: '4px', height: '10px', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: pcColor, borderRadius: '4px' }}></div></div>
                <span style={{ fontFamily: "'Merriweather', serif", fontSize: '14px', color: pcColor, fontWeight: 700, minWidth: '40px' }}>{pct}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', fontFamily: "'Source Code Pro', monospace" }}>
                <span>Medido: <span style={{ color: 'var(--text)' }}>{fmtNum(mTotal)}</span></span>
                <span>Total: <span style={{ color: 'var(--text)' }}>{fmtNum(valObra)}</span></span>
                <span>Saldo: <span style={{ color: mTotal > valObra ? '#f85149' : 'var(--accent2)' }}>{fmtNum(valObra - mTotal)}</span></span>
              </div>
            </div>

            <div className="medicao-form">
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="field"><label>Data *</label><input type="date" value={newMed.data} onChange={e => setNewMed({ ...newMed, data: e.target.value })} /></div>
                <div className="field"><label>Valor (R$) *</label><input type="text" value={newMed.valor} onInput={(e: any) => handleCurrency(e.target.value, (v: string) => setNewMed({ ...newMed, valor: v }))} placeholder="0,00" /></div>
                <div className="field"><label>Nº da Medição</label>
                  <select value={newMed.num} onChange={e => setNewMed({ ...newMed, num: e.target.value })}>
                    <option value="1ª Medição">1ª Medição</option><option value="2ª Medição">2ª Medição</option>
                    <option value="3ª Medição">3ª Medição</option><option value="4ª Medição">4ª Medição</option>
                    <option value="5ª Medição">5ª Medição</option><option value="6ª Medição">6ª Medição</option>
                    <option value="Medição Final">Medição Final</option>
                  </select>
                </div>
              </div>
              <div className="field" style={{ marginTop: '10px' }}><label>Descrição</label><input type="text" value={newMed.desc} onChange={e => setNewMed({ ...newMed, desc: e.target.value })} placeholder="Ex: Serviços..." /></div>
              <div style={{ marginTop: '12px', textAlign: 'right' }}><button className="btn btn-primary" onClick={addMedicao}>＋ Adicionar Medição</button></div>
            </div>

            <div id="medicoes-list">
              {medsList.length === 0 ? <div className="empty-med">📏 Nenhuma medição ainda.</div> : medsList.map((m, i) => {
                const acc = medsList.slice(0, i + 1).reduce((s, mj) => s + (Number(mj.valor) || 0), 0);
                const mp = valObra > 0 ? Math.min(100, Math.round(acc / valObra * 100)) : 0;
                return (
                  <div key={m._tmpId} className="medicao-item">
                    <span className="medicao-num">{m.num || `${i + 1}ª`}</span>
                    <div className="medicao-info">
                      <div className="medicao-valor">{fmtNum(m.valor)}</div>
                      <div className="medicao-date">📅 {fmtDate(m.data)}</div>
                      {(m.desc || m.descricao) && <div className="medicao-desc">{m.desc || m.descricao}</div>}
                    </div>
                    <span className="medicao-pct">≈{mp}% acum.</span>
                    <button className="medicao-del" onClick={() => removeMedicao(m._tmpId)}>🗑</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {tab === 'dados' ? (
          <div className="modal-footer">
            {editingId && <button className="btn btn-danger" onClick={deleteObra} style={{ marginRight: 'auto' }}>🗑 Excluir</button>}
            <button className="btn" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={saveObra}>💾 Salvar Obra</button>
          </div>
        ) : (
          <div className="modal-footer">
            <button className="btn" onClick={onClose}>Fechar</button>
            <button className="btn btn-primary" onClick={saveMedicoesDireto} style={{ background: '#3fb950', borderColor: '#3fb950' }}>📏 Salvar Medições</button>
          </div>
        )}
      </div>
    </div>
  );
}
