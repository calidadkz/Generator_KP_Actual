import React from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { CollapsibleSection } from '../UI/Layout';
import { CompanyDetails } from '../../types';
import { useSettings } from '../../context/SettingsContext';

interface SettingsSidebarProps {
  expandedBlocks: Record<string, boolean>;
  toggleBlock: (id: string) => void;
  onResetAll: () => void;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  expandedBlocks,
  toggleBlock,
  onResetAll
}) => {
  const { supplier, updateSupplierField } = useSettings();

  return (
    <div className="space-y-2">
      <CollapsibleSection 
        id="settings_supplier" 
        title="РЕКВИЗИТЫ CALIDAD" 
        icon={Settings} 
        isExpanded={expandedBlocks.settings_supplier} 
        onToggle={() => toggleBlock('settings_supplier')}
      >
        <div className="space-y-4">
          {(Object.keys(supplier) as Array<keyof CompanyDetails>).map(key => (
            key !== 'stampUrl' && (
              <div key={key}>
                <label className="text-[10px] font-bold text-gray-400 uppercase">{key}</label>
                <input 
                  type="text" 
                  value={supplier[key]}
                  onChange={e => updateSupplierField(key, e.target.value)}
                  className="w-full border-b-2 border-gray-200 focus:border-calidad-blue py-1 outline-none font-medium"
                />
              </div>
            )
          ))}
        </div>
      </CollapsibleSection>

      <div className="p-6 border-t border-gray-100 mt-6">
        <button 
          onClick={onResetAll}
          className="w-full flex items-center justify-center gap-2 p-3 border-2 border-red-100 text-red-500 rounded-xl hover:bg-red-50 transition-colors font-bold text-xs uppercase"
        >
          <Trash2 size={16} />
          Сбросить все данные
        </button>
      </div>
    </div>
  );
};
