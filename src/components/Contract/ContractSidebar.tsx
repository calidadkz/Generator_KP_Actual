import React, { useState } from 'react';
import { 
  FileText, 
  User, 
  Building2, 
  Calendar, 
  Truck, 
  Plus, 
  Trash2 
} from 'lucide-react';
import { CollapsibleSection } from '../UI/Layout';
import { ContractState, Specification, LineItem, CompanyDetails } from '../../types';

import { downloadAsPDF } from '../../utils/contractPdf';
import { Download } from 'lucide-react';

interface ContractSidebarProps {
  contract: ContractState;
  updateContract: (path: string, value: any) => void;
  updateBuyer: (field: keyof CompanyDetails, value: string) => void;
  addLineItem: (category: keyof Specification) => void;
  removeLineItem: (category: keyof Specification, id: string) => void;
  updateLineItem: (category: keyof Specification, id: string, field: keyof LineItem, value: any) => void;
  expandedBlocks: Record<string, boolean>;
  toggleBlock: (id: string) => void;
}

export const ContractSidebar: React.FC<ContractSidebarProps> = ({
  contract,
  updateContract,
  updateBuyer,
  addLineItem,
  removeLineItem,
  updateLineItem,
  expandedBlocks,
  toggleBlock
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    const element = document.getElementById('template-preview') || document.getElementById('contract-preview');
    if (!element || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadAsPDF(element.id, `Договор_${contract.number}_${contract.buyer.name}`);
    } catch (err: any) {
      alert('Не удалось создать PDF: ' + (err?.message || String(err)));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-2 pb-20">
      <div className="px-6 py-4">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="w-full flex items-center justify-center gap-2 bg-calidad-red text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed"
        >
          {isDownloading ? (
            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Генерация...</>
          ) : (
            <><Download size={20} /> Скачать в PDF</>
          )}
        </button>
      </div>

      <CollapsibleSection 
        id="doc" 
        title="ОСНОВНЫЕ ДАННЫЕ" 
        icon={FileText} 
        isExpanded={expandedBlocks.doc} 
        onToggle={() => toggleBlock('doc')}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Номер договора</label>
            <input 
              type="text" 
              value={contract.number}
              onChange={e => updateContract('number', e.target.value)}
              className="w-full border-b-2 border-gray-200 focus:border-calidad-blue py-1 outline-none font-medium"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Дата</label>
            <input 
              type="date" 
              value={contract.date}
              onChange={e => updateContract('date', e.target.value)}
              className="w-full border-b-2 border-gray-200 focus:border-calidad-blue py-1 outline-none font-medium"
            />
          </div>
          <div className="space-y-1 col-span-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Срок поставки (раб. дней)</label>
            <input 
              type="number" 
              value={contract.deliveryDays}
              onChange={e => updateContract('deliveryDays', parseInt(e.target.value))}
              className="w-full border-b-2 border-gray-200 focus:border-calidad-blue py-1 outline-none font-medium"
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection 
        id="buyer" 
        title="ПОКУПАТЕЛЬ" 
        icon={User} 
        isExpanded={expandedBlocks.buyer} 
        onToggle={() => toggleBlock('buyer')}
      >
        <div className="space-y-4">
          {(Object.keys(contract.buyer) as Array<keyof CompanyDetails>).map(key => (
            key !== 'stampUrl' && (
              <div key={key}>
                <label className="text-[10px] font-bold text-gray-400 uppercase">{key}</label>
                <input 
                  type="text" 
                  value={contract.buyer[key]}
                  onChange={e => updateBuyer(key, e.target.value)}
                  className="w-full border-b-2 border-gray-200 focus:border-calidad-blue py-1 outline-none font-medium"
                />
              </div>
            )
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection 
        id="spec" 
        title="СПЕЦИФИКАЦИЯ" 
        icon={Truck} 
        isExpanded={expandedBlocks.spec} 
        onToggle={() => toggleBlock('spec')}
      >
        {(Object.keys(contract.spec) as Array<keyof Specification>).map(category => (
          <div key={category} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {category === 'main' ? 'ОСНОВНОЕ' : category === 'components' ? 'КОМПЛЕКТУЮЩИЕ' : 'РАСХОДНИКИ'}
              </h4>
              <button 
                onClick={() => addLineItem(category)}
                className="p-1 text-calidad-blue hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {contract.spec[category].map(item => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2 group">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Наименование"
                      value={item.name}
                      onChange={e => updateLineItem(category, item.id, 'name', e.target.value)}
                      className="flex-1 bg-transparent border-b border-gray-200 py-1 text-xs outline-none focus:border-calidad-blue"
                    />
                    <button 
                      onClick={() => removeLineItem(category, item.id)}
                      className="text-gray-300 hover:text-calidad-red opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-20">
                      <label className="text-[8px] font-bold text-gray-400 uppercase">Кол-во</label>
                      <input 
                        type="number" 
                        value={item.qty}
                        onChange={e => updateLineItem(category, item.id, 'qty', parseInt(e.target.value))}
                        className="w-full bg-transparent border-b border-gray-200 py-1 text-xs outline-none focus:border-calidad-blue"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[8px] font-bold text-gray-400 uppercase">Цена (₸)</label>
                      <input 
                        type="number" 
                        value={item.price}
                        onChange={e => updateLineItem(category, item.id, 'price', parseInt(e.target.value))}
                        className="w-full bg-transparent border-b border-gray-200 py-1 text-xs outline-none focus:border-calidad-blue"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CollapsibleSection>
    </div>
  );
};
