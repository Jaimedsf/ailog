'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { db } from '@/lib/supabase';
import { useAuth } from './AuthProvider';

export interface Ano { id?: number; ano: number; }
export interface Obra {
  id: string; ano: number; descricao: string; empresa: string; unidade: string; local: string;
  regiao: string; nup: string; os: string; mapp: string; origem: string; status: string; obs: string;
  data_os: string; inicio: string; termino: string; valor: number; empenhado: number;
}
export interface Mapp { id: string; num: string; valor_total: number; obs: string; ano: number; }
export interface Medicao { id?: string; obra_id: string; num: string; data: string; descricao: string; valor: number; }
export interface Configuracao { id: string; tipo: string; valor: string; descricao: string; ativo: boolean; }

interface DataContextType {
  anos: Ano[];
  obras: Obra[];
  mapps: Mapp[];
  medicoes: Medicao[];
  configs: Configuracao[];
  currentYear: number;
  setCurrentYear: (y: number) => void;
  syncState: string;
  setSyncState: (s: string) => void;
}

const DataContext = createContext<DataContextType>({
  anos: [],
  obras: [],
  mapps: [],
  medicoes: [],
  configs: [],
  currentYear: new Date().getFullYear(),
  setCurrentYear: () => {},
  syncState: 'online',
  setSyncState: () => {}
});

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [anos, setAnos] = useState<Ano[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [mapps, setMapps] = useState<Mapp[]>([]);
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [configs, setConfigs] = useState<Configuracao[]>([]);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [syncState, setSyncState] = useState<string>('online');

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    async function loadData() {
      try {
        const [aRes, oRes, mRes, medRes, cfgRes] = await Promise.all([
          db.from('anos').select('*').order('ano', { ascending: false }),
          db.from('obras').select('*').order('id'),
          db.from('mapps').select('*').order('num'),
          db.from('medicoes').select('*').order('data'),
          db.from('configuracoes').select('*').order('tipo').order('valor'),
        ]);

        if (!isMounted) return;

        const fetchedAnos = aRes.data || [];
        setAnos(fetchedAnos);
        setObras(oRes.data || []);
        setMapps(mRes.data || []);
        setMedicoes(medRes.data || []);
        setConfigs(cfgRes.data || []);

        if (fetchedAnos.length > 0) {
          setCurrentYear(fetchedAnos[0].ano);
        }
      } catch (e) {
        console.error('Error loading data:', e);
        setSyncState('offline');
      }
    }

    loadData();

    // Setup realtime
    const channel = db.channel('all-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'obras' }, async () => {
        const { data } = await db.from('obras').select('*').order('id');
        setObras(data || []);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicoes' }, async () => {
        const { data } = await db.from('medicoes').select('*').order('data');
        setMedicoes(data || []);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mapps' }, async () => {
        const { data } = await db.from('mapps').select('*').order('num');
        setMapps(data || []);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'anos' }, async () => {
        const { data } = await db.from('anos').select('*').order('ano', { ascending: false });
        setAnos(data || []);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, async () => {
        const { data } = await db.from('configuracoes').select('*').order('tipo').order('valor');
        setConfigs(data || []);
      })
      .subscribe();

    return () => {
      isMounted = false;
      db.removeChannel(channel);
    };
  }, [user]);

  return (
    <DataContext.Provider value={{ anos, obras, mapps, medicoes, configs, currentYear, setCurrentYear, syncState, setSyncState }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
