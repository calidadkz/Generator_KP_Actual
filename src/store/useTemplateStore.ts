/**
 * useTemplateStore.ts
 *
 * Zustand store for PDF-based КП templates (PdfTemplate[]).
 * Persisted to localStorage under key 'calidad_pdf_templates'.
 *
 * Each PdfTemplate stores only the idb://pdf-... reference (not the bytes),
 * so localStorage stays small (<1 KB per template).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PdfTemplate } from '../types';
import { deletePdf } from '../lib/pdfStorage';

interface TemplateStore {
  pdfTemplates: PdfTemplate[];
  activeTemplateId: string;
  setActiveTemplate: (id: string) => void;
  saveTemplate: (template: PdfTemplate) => void;
  deleteTemplate: (id: string) => void;
}

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      pdfTemplates: [],
      activeTemplateId: '',

      setActiveTemplate: (id) => set({ activeTemplateId: id }),

      saveTemplate: (template) =>
        set((state) => {
          const existing = state.pdfTemplates.findIndex((t) => t.id === template.id);
          if (existing >= 0) {
            const updated = [...state.pdfTemplates];
            updated[existing] = template;
            return { pdfTemplates: updated };
          }
          return { pdfTemplates: [...state.pdfTemplates, template] };
        }),

      deleteTemplate: async (id) => {
        const template = get().pdfTemplates.find((t) => t.id === id);
        if (template) {
          // Clean up the PDF bytes from IndexedDB
          await deletePdf(template.basePdfRef);
        }
        set((state) => ({
          pdfTemplates: state.pdfTemplates.filter((t) => t.id !== id),
          activeTemplateId: state.activeTemplateId === id ? '' : state.activeTemplateId,
        }));
      },
    }),
    { name: 'calidad_pdf_templates' },
  ),
);
