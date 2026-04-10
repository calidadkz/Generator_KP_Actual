import React from 'react';
import { 
  Briefcase, 
  User, 
  Building2, 
  Calendar, 
  Truck, 
  Youtube, 
  Phone, 
  Plus, 
  Trash2,
  Settings as SettingsIcon
} from 'lucide-react';
import { CollapsibleSection } from '../UI/Layout';
import { CPState, CPTemplate, CompanyDetails } from '../../types';
import { CPPreview } from './CPPreview';

import { downloadAsPDF } from '../../utils/pdf';
import { Download } from 'lucide-react';

interface CPSidebarProps {
  cp: CPState;
  updateCP: (field: keyof CPState, value: any) => void;
  updateCPPrice: (field: keyof CPState['prices'], value: number) => void;
  expandedBlocks: Record<string, boolean>;
  toggleBlock: (id: string) => void;
  cpTemplates: CPTemplate[];
  activeCPTemplateId: string;
  setActiveCPTemplateId: (id: string) => void;
  supplier: CompanyDetails;
}

export const CPSidebar: React.FC<CPSidebarProps> = ({
  cp,
  updateCP,
  updateCPPrice,
  expandedBlocks,
  toggleBlock,
  cpTemplates,
  activeCPTemplateId,
  setActiveCPTemplateId,
  supplier
}) => {
  const handleDownload = () => {
    const element = document.getElementById('template-preview') || document.getElementById('cp-preview');
    if (element) {
      downloadAsPDF(element.id, `КП_${cp.clientName}_${cp.model}`);
    }
  };

  const activeTemplate = cpTemplates.find(t => t.id === activeCPTemplateId);

  return (
    <div className="space-y-2 pb-20">
      <div className="px-6 py-4">
        <button 
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 bg-calidad-blue text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-800 transition-all hover:scale-[1.02] active:scale-95"
        >
          <Download size={20} />
          Скачать в PDF
        </button>
      </div>

      {cpTemplates.length > 0 && (
        <div className="px-6 py-4 bg-blue-50/50 border-b border-blue-100 space-y-4">
          <div>
            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 block">Шаблон КП</label>
            <select 
              value={activeCPTemplateId}
              onChange={(e) => setActiveCPTemplateId(e.target.value)}
              className="w-full bg-white border-2 border-blue-100 rounded-xl px-4 py-2.5 text-xs font-bold text-blue-600 focus:border-blue-600 outline-none transition-all"
            >
              <option value="">Стандартный вид</option>
              {cpTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {activeTemplate && (
            <div className="space-y-3">
              <div className="bg-white rounded-xl p-2 border border-blue-100 overflow-hidden shadow-sm">
                <div className="scale-[0.25] origin-top-left -mb-[240%] w-[400%] pointer-events-none opacity-80">
                  <CPPreview 
                    cp={cp} 
                    supplier={supplier} 
                    activeCPTemplate={activeTemplate} 
                    totalAmount={cp.prices.m2 + cp.prices.ruida} 
                  />
                </div>
              </div>
              
              <button 
                onClick={() => {
                  (window as any).onEditCPTemplate?.(activeTemplate);
                }}
                className="w-full flex items-center justify-center gap-2 bg-white text-blue-600 border-2 border-blue-600 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all"
              >
                <SettingsIcon size={16} />
                Настроить блоки
              </button>
            </div>
          )}
        </div>
      )}

      <CollapsibleSection 
        id="cp_main" 
        title="ОСНОВНЫЕ ДАННЫЕ КП" 
        icon={Briefcase} 
        isExpanded={expandedBlocks.cp_main} 
        onToggle={() => toggleBlock('cp_main')}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Клиент</label>
            <input 
              type="text" 
              value={cp.clientName}
              onChange={e => updateCP('clientName', e.target.value)}
              className="w-full border-b-2 border-gray-200 focus:border-calidad-blue py-1 outline-none font-medium"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Модель станка</label>
            <input 
              type="text" 
              value={cp.model}
              onChange={e => updateCP('model', e.target.value)}
              className="w-full border-b-2 border-gray-200 focus:border-calidad-blue py-1 outline-none font-medium"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Рабочее поле</label>
              <input 
                type="text" 
                value={cp.workingArea}
                onChange={e => updateCP('workingArea', e.target.value)}
                className="w-full border-b-2 border-gray-200 focus:border-calidad-blue py-1 outline-none font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Мощность</label>
              <input 
                type="text" 
                value={cp.power}
                onChange={e => updateCP('power', e.target.value)}
                className="w-full border-b-2 border-gray-200 focus:border-calidad-blue py-1 outline-none font-medium"
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection 
        id="cp_prices" 
        title="ЦЕНЫ И СРОКИ" 
        icon={Truck} 
        isExpanded={expandedBlocks.cp_prices} 
        onToggle={() => toggleBlock('cp_prices')}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Цена M2 (₸)</label>
            <input 
              type="number" 
              value={cp.prices.m2}
              onChange={e => updateCPPrice('m2', parseInt(e.target.value))}
              className="w-full border-b-2 border-gray-200 focus:border-calidad-blue py-1 outline-none font-medium"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Цена Ruida (₸)</label>
            <input 
              type="number" 
              value={cp.prices.ruida}
              onChange={e => updateCPPrice('ruida', parseInt(e.target.value))}
              className="w-full border-b-2 border-gray-200 focus:border-calidad-blue py-1 outline-none font-medium"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Срок поставки</label>
            <input 
              type="text" 
              value={cp.deliveryTime}
              onChange={e => updateCP('deliveryTime', e.target.value)}
              className="w-full border-b-2 border-gray-200 focus:border-calidad-blue py-1 outline-none font-medium"
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection 
        id="cp_manager" 
        title="МЕНЕДЖЕР" 
        icon={User} 
        isExpanded={expandedBlocks.cp_manager} 
        onToggle={() => toggleBlock('cp_manager')}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Имя менеджера</label>
            <input 
              type="text" 
              value={cp.managerName}
              onChange={e => updateCP('managerName', e.target.value)}
              className="w-full border-b-2 border-gray-200 focus:border-calidad-blue py-1 outline-none font-medium"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">WhatsApp</label>
            <input 
              type="text" 
              value={cp.managerPhone}
              onChange={e => updateCP('managerPhone', e.target.value)}
              className="w-full border-b-2 border-gray-200 focus:border-calidad-blue py-1 outline-none font-medium"
            />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
};
