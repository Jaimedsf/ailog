import type { Obra, Medicao } from '@/components/DataContext';

export const fmtNum = (v: number | string | null | undefined): string =>
  v ? 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

export const fmtDate = (d: string | null | undefined): string =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

export function parseCurrency(s: string | number | null | undefined): number {
  if (!s || s === '') return 0;
  let v = String(s).trim();
  v = v.replace(/R\$\s*/g, '').trim();
  if (v.includes(',') && v.includes('.')) {
    v = v.replace(/\./g, '').replace(',', '.');
  } else if (v.includes(',')) {
    v = v.replace(',', '.');
  }
  v = v.replace(/[^0-9.]/g, '');
  return parseFloat(v) || 0;
}

export function formatCurrency(valStr: string): string {
  let v = valStr.replace(/\D/g, '');
  if (!v) return '';
  v = (parseInt(v, 10) / 100).toFixed(2);
  return parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getStatusGroup(s: string | null | undefined): string {
  if (!s) return 'OUTROS';
  const su = s.toUpperCase();
  if (su.includes('CONCLU')) return 'CONCLUIDO';
  if (su.includes('EXECU')) return 'EM EXECUÇÃO';
  if (su.includes('ARQUIV')) return 'ARQUIVADO';
  if (su.includes('AGUARD')) return 'AGUARDANDO';
  return 'OUTROS';
}

export function statusClass(s: string | null | undefined): string {
  const g = getStatusGroup(s);
  return g === 'CONCLUIDO' ? 's-concluido' : g === 'EM EXECUÇÃO' ? 's-execucao' : g === 'ARQUIVADO' ? 's-arquivado' : g === 'AGUARDANDO' ? 's-aguardando' : 's-outros';
}

export function statusLabel(s: string | null | undefined): string {
  if (!s) return 'Outros';
  const g = getStatusGroup(s);
  if (g === 'CONCLUIDO') return 'CONCLUÍDO';
  if (g === 'EM EXECUÇÃO') return 'EM EXECUÇÃO';
  if (g === 'ARQUIVADO') return 'ARQUIVADO';
  return s.length > 22 ? s.substring(0, 20) + '…' : s;
}

export function getAndamento(obraId: string | number, obras: Obra[], medicoes: Medicao[]): number {
  const numId = Number(obraId);
  const meds = medicoes.filter(m => Number(m.obra_id) === numId);
  if (!meds.length) return 0;
  const o = obras.find(x => Number(x.id) === numId);
  if (!o || !o.valor || o.valor === 0) return 0;
  const totalMed = meds.reduce((s, m) => s + (Number(m.valor) || 0), 0);
  return Math.min(100, Math.round(totalMed / o.valor * 100));
}

export function getProgressColor(p: number): string {
  return p >= 100 ? '#3fb950' : p >= 50 ? '#f0a500' : '#58a6ff';
}

export function showToast(msg: string, color: string = '#3fb950'): void {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span style="color:${color}">●</span> ${msg}`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
