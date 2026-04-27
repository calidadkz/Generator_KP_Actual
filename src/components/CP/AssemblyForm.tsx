/**
 * AssemblyForm.tsx
 *
 * Sidebar form for filling in AssemblyData (КП fields).
 * Binds directly to useDocumentStore — no prop drilling.
 * Groups: "Клиент и оборудование", "Цены и сроки", "Менеджер"
 */

import React from 'react';
import { Briefcase, Truck, User } from 'lucide-react';
import { CollapsibleSection } from '../UI/Layout';
import { useDocumentStore } from '../../store/useDocumentStore';
import type { AssemblyData } from '../../types';

interface AssemblyFormProps {
  expandedBlocks: Record<string, boolean>;
  toggleBlock: (id: string) => void;
}

const Field: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-gray-400 uppercase">{label}</label>
    {children}
  </div>
);

const inputCls =
  'w-full border-b-2 border-gray-200 focus:border-calidad-blue py-1 outline-none font-medium';

export const AssemblyForm: React.FC<AssemblyFormProps> = ({ expandedBlocks, toggleBlock }) => {
  const { assembly, setField } = useDocumentStore();

  const text = (key: keyof AssemblyData) => (
    <input
      type="text"
      value={String(assembly[key])}
      onChange={(e) => setField(key, e.target.value)}
      className={inputCls}
    />
  );

  const number = (key: keyof AssemblyData) => (
    <input
      type="number"
      value={assembly[key] as number}
      onChange={(e) => setField(key, parseInt(e.target.value) || 0)}
      className={inputCls}
    />
  );

  const date = (
    <input
      type="date"
      value={assembly.date}
      onChange={(e) => setField('date', e.target.value)}
      className={inputCls}
    />
  );

  return (
    <div className="space-y-2">
      <CollapsibleSection
        id="asm_client"
        title="КЛИЕНТ И ОБОРУДОВАНИЕ"
        icon={Briefcase}
        isExpanded={expandedBlocks.asm_client}
        onToggle={() => toggleBlock('asm_client')}
      >
        <div className="space-y-4">
          <Field label="Клиент">{text('client_name')}</Field>
          <Field label="Модель станка">{text('model')}</Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Рабочее поле">{text('working_area')}</Field>
            <Field label="Мощность">{text('laser_power')}</Field>
          </div>
          <Field label="Дата КП">{date}</Field>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="asm_prices"
        title="ЦЕНЫ И СРОКИ"
        icon={Truck}
        isExpanded={expandedBlocks.asm_prices}
        onToggle={() => toggleBlock('asm_prices')}
      >
        <div className="space-y-4">
          <Field label="Цена M2 (₸)">{number('price_m2')}</Field>
          <Field label="Цена Ruida (₸)">{number('price_ruida')}</Field>
          <Field label="Срок поставки (раб. дней)">{number('delivery_days')}</Field>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="asm_manager"
        title="МЕНЕДЖЕР"
        icon={User}
        isExpanded={expandedBlocks.asm_manager}
        onToggle={() => toggleBlock('asm_manager')}
      >
        <div className="space-y-4">
          <Field label="Имя менеджера">{text('manager_name')}</Field>
          <Field label="WhatsApp / Телефон">{text('manager_phone')}</Field>
        </div>
      </CollapsibleSection>
    </div>
  );
};
