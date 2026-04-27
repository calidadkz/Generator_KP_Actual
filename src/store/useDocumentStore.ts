/**
 * useDocumentStore.ts
 *
 * Zustand store for КП assembly data.
 * Persisted to localStorage under key 'calidad_assembly'.
 *
 * Future ERP integration point: call setAssembly(erpPayload) to
 * pre-fill all fields from an external system.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AssemblyData } from '../types';

const DEFAULT_ASSEMBLY: AssemblyData = {
  client_name: '',
  model: '',
  working_area: '',
  laser_power: '',
  price_m2: 0,
  price_ruida: 0,
  delivery_days: 30,
  manager_name: '',
  manager_phone: '',
  date: new Date().toISOString().slice(0, 10),
};

interface DocumentStore {
  assembly: AssemblyData;
  setField: (key: keyof AssemblyData, value: string | number) => void;
  /** Bulk update — used for ERP integration or form reset */
  setAssembly: (data: Partial<AssemblyData>) => void;
  resetAssembly: () => void;
}

export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set) => ({
      assembly: { ...DEFAULT_ASSEMBLY },

      setField: (key, value) =>
        set((state) => ({
          assembly: { ...state.assembly, [key]: value },
        })),

      setAssembly: (data) =>
        set((state) => ({
          assembly: { ...state.assembly, ...data },
        })),

      resetAssembly: () =>
        set({ assembly: { ...DEFAULT_ASSEMBLY, date: new Date().toISOString().slice(0, 10) } }),
    }),
    { name: 'calidad_assembly' },
  ),
);
