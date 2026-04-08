'use client';

import { useData } from '@/components/DataContext';
import { useAuth } from '@/components/AuthProvider';
import { db } from '@/lib/supabase';
import { showToast, parseCurrency } from '@/lib/utils';
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

export default function ConfigPage() {
  const { configs, setSyncState, anos, currentYear } = useData();
  const { perfil } = useAuth();
  const isAdmin = perfil === 'admin';

  const [newConfig, setNewConfig] = useState({ tipo: '', valor: '', descricao: '' });
  
  const fileInputRef = useRef(null);
  const [importData, setImportData] = useState([]);
  const [importAno, setImportAno] = useState('');

  if (!isAdmin) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Acesso restrito a administradores.</div>;
  }

  const handleAddConfig = async (tipo) => {
    const val = newConfig.valor.trim();
    const desc = newConfig.descricao.trim();
    if (!val) { showToast('Informe o valor!', '#f85149'); return; }
    
    setSyncState('syncing');
    const { error } = await db.from('configuracoes').insert({ tipo, valor: val, descricao: desc, ativo: true });
    if (error) {
      showToast('Erro ao salvar: ' + error.message, '#f85149');
      setSyncState('offline');
      return;
    }
    
    setNewConfig({ tipo: '', valor: '', descricao: '' });
    setSyncState('online');
    showToast('Configuração salva!');
  };

  const handleDelConfig = async (id) => {
    if (!confirm('Excluir este item?')) return;
    setSyncState('syncing');
    await db.from('configuracoes').delete().eq('id', id);
    setSyncState('online');
    showToast('Item excluído', '#f85149');
  };

  const ConfigSection = ({ tipo, title, hint }) => {
    const items = configs.filter(c => c.tipo === tipo && c.ativo !== false);
    return (
      <div className="config-section">
        <div className="config-section-title">{title} <span className="count-badge">{items.length}</span></div>
        <div className="config-items">
          {items.length === 0 ? <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Nenhum item cadastrado.</span> : null}
          {items.map(c => (
            <div key={c.id} className="config-item">
              <span className="config-item-label">{c.valor}</span>
              {c.descricao && <span className="config-item-desc">— {c.descricao}</span>}
              <button className="config-item-del" onClick={() => handleDelConfig(c.id)}>✕</button>
            </div>
          ))}
        </div>
        <div className="config-add-form">
          <input 
            placeholder={hint} 
            value={newConfig.tipo === tipo ? newConfig.valor : ''}
            onChange={(e) => setNewConfig({ tipo, valor: e.target.value, descricao: newConfig.tipo === tipo ? newConfig.descricao : '' })} 
            onKeyDown={(e) => e.key === 'Enter' && handleAddConfig(tipo)}
          />
          {tipo === 'unidade' && (
            <input 
              placeholder="Unidade/Cidade opcional" 
              value={newConfig.tipo === tipo ? newConfig.descricao : ''}
              onChange={(e) => setNewConfig({ ...newConfig, tipo, descricao: e.target.value })} 
              onKeyDown={(e) => e.key === 'Enter' && handleAddConfig(tipo)}
            />
          )}
          <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={() => handleAddConfig(tipo)}>＋ Adicionar</button>
        </div>
      </div>
    );
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { raw: false, defval: '' });
        
        const mapped = rows.map((r: any, i) => ({
          _row: i + 2,
          unidade: r.unidade || r.Unidade || '',
          descricao: r.descricao || r.Descricao || r['Descrição'] || '',
          empresa: r.empresa || r.Empresa || '',
          local: r.local || r.Local || r.cidade || r.Cidade || '',
          regiao: r.regiao || r.Regiao || r['Região'] || '',
          nup: r.nup || r.NUP || '',
          os: r.os || r.OS || '',
          mapp: String(r.mapp || r.MAPP || ''),
          origem: r.origem || r.Origem || 'SEAS',
          valor: parseCurrency(r.valor || r.Valor || '0'),
          empenhado: parseCurrency(r.empenhado || r.Empenhado || '0'),
          inicio: r.inicio || r.Inicio || r['Início'] || null,
          termino: r.termino || r.Termino || r['Término'] || null,
          status: (r.status || r.Status || 'EM EXECUÇÃO').toUpperCase(),
          obs: r.obs || r.Obs || r['Observações'] || r.observacao || ''
        })).filter(x => x.descricao);

        setImportData(mapped);
      } catch (err) {
        showToast('Erro ao ler arquivo: ' + err.message, '#f85149');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const doImport = async () => {
    if (!importAno || isNaN(parseInt(importAno))) {
      showToast('Selecione ou informe um ano válido!', '#f85149');
      return;
    }
    const ano = parseInt(importAno);
    setSyncState('syncing');

    try {
      // Create year if doesn't exist
      const existingAno = anos.find(a => a.ano === ano);
      if (!existingAno) {
        await db.from('anos').insert({ ano });
      }

      const chunkSize = 50;
      for (let i = 0; i < importData.length; i += chunkSize) {
        const chunk = importData.slice(i, i + chunkSize).map(m => {
          const c = { ...m };
          delete c._row;
          c.ano = ano;
          return c;
        });
        const { error } = await db.from('obras').insert(chunk);
        if (error) throw error;
      }

      setSyncState('online');
      showToast(`${importData.length} registros importados com sucesso!`, '#3fb950');
      setImportData([]);
      setImportAno('');
    } catch (e) {
      setSyncState('offline');
      showToast('Erro na importação: ' + e.message, '#f85149');
    }
  };

  return (
    <div className="tab-content active" style={{ display: 'block' }}>
      
      <div id="section-config" style={{ padding: '0 0 20px 0' }}>
        <div className="section-title" style={{ marginBottom: '20px' }}>⚙️ Configurações do Sistema</div>
        <ConfigSection tipo="cidade" title="🏙️ Cidades Atendidas" hint="Nome da cidade (ex: Fortaleza)" />
        <ConfigSection tipo="regiao" title="🗺️ Regiões" hint="Nome da região (ex: Cariri)" />
        <ConfigSection tipo="empresa" title="🏗️ Empresas Contratadas" hint="Nome da empresa (ex: Construtora A)" />
        <ConfigSection tipo="unidade" title="🏢 Unidades (Centros)" hint="Nome/Sigla da Unidade (ex: CS Murianga)" />
      </div>

      <div id="section-importar" style={{ padding: '20px 0', borderTop: '1px solid var(--border)' }}>
        <div className="section-title" style={{ marginBottom: '20px' }}>📥 Importar Dados de Planilha</div>
        <div className="config-section">
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px', lineHeight: '1.6' }}>
            Importe seus dados históricos a partir de um arquivo <strong style={{ color: 'var(--text)' }}>Excel (.xlsx)</strong> ou <strong style={{ color: 'var(--text)' }}>CSV</strong>. 
            A planilha deve ter colunas parecidas com: <span style={{ fontFamily: "'Source Code Pro', monospace", color: 'var(--accent)' }}>unidade, descricao, empresa, local, nup, mapp, valor, empenhado, status, obs</span>
          </div>
          
          {!importData.length ? (
            <>
              <div 
                className="import-zone" 
                onClick={() => fileInputRef.current?.click()}
                onDrop={(e) => { e.preventDefault(); handleFileSelect({ target: { files: e.dataTransfer.files } }); }}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="icon">📂</div>
                <div style={{ fontSize: '15px', color: 'var(--text)', marginBottom: '8px' }}>Clique ou arraste o arquivo aqui</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Suporta .xlsx, .xls e .csv</div>
              </div>
              <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFileSelect} />
            </>
          ) : (
            <div id="import-preview-wrap">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text)' }}>Preview — <span id="import-count">{importData.length}</span> registros</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="number" 
                    placeholder="Ano de referência (ex: 2023)" 
                    value={importAno}
                    onChange={(e) => setImportAno(e.target.value)}
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', padding: '6px 10px', fontSize: '12px', outline: 'none', width: '180px' }}
                  />
                  <button className="btn btn-primary" onClick={doImport}>✅ Importar tudo</button>
                  <button className="btn" onClick={() => setImportData([])}>✕ Cancelar</button>
                </div>
              </div>
              
              <div className="import-preview">
                <table>
                  <thead>
                    <tr>
                      <th>Linha</th><th>Unidade</th><th>Descrição</th><th>MAPP</th><th>Valor</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.map((r, i) => (
                      <tr key={i}>
                        <td className="muted">{r._row}</td>
                        <td>{r.unidade || '—'}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descricao}</td>
                        <td>{r.mapp || '—'}</td>
                        <td style={{ color: 'var(--accent2)' }}>{r.valor}</td>
                        <td>{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
