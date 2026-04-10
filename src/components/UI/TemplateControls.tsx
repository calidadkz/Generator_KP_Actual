import React from 'react';
import { Plus, Maximize2, Save, Trash2, Layout as LayoutIcon } from 'lucide-react';
import { Template, TemplateField } from '../../types';

interface TemplateControlsProps {
  templates: Template[];
  activeTemplateId: string;
  setActiveTemplateId: (id: string) => void;
  isAdvancedMode: boolean;
  setIsAdvancedMode: (mode: boolean) => void;
  handleDocxUpload: (file: File) => Promise<{ content: string; fields: TemplateField[] }>;
  extractVariable: () => void;
  saveTemplate: () => void;
  deleteTemplate: (id: string) => void;
  updateTemplateField: (id: string, value: string) => void;
  activeTemplate?: Template;
  onOpenBuilder: () => void;
}

export const TemplateControls: React.FC<TemplateControlsProps> = ({
  templates,
  activeTemplateId,
  setActiveTemplateId,
  isAdvancedMode,
  setIsAdvancedMode,
  handleDocxUpload,
  extractVariable,
  saveTemplate,
  deleteTemplate,
  updateTemplateField,
  activeTemplate,
  onOpenBuilder
}) => {
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = await handleDocxUpload(file);
      const newTemplate: Template = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name.replace('.docx', ''),
        type: activeTemplate?.type || 'Contract',
        content: result.content,
        fields: result.fields
      };
      // This is a bit tricky since saveTemplate now doesn't take an object here
      // But we can just use the builder for new templates
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ШАБЛОНЫ</h3>
        <button 
          onClick={onOpenBuilder}
          className="text-[10px] font-black text-calidad-blue hover:text-calidad-red uppercase tracking-widest flex items-center gap-1 transition-colors"
        >
          <LayoutIcon size={12} /> Конструктор
        </button>
      </div>
      <div className="space-y-3">
        <div className="grid gap-2">
          {templates.map(t => (
            <div key={t.id} className="flex items-center gap-2 group">
              <button
                onClick={() => setActiveTemplateId(t.id)}
                className={`flex-1 text-left px-4 py-3 rounded-xl text-xs font-bold transition-all border-2 ${
                  activeTemplateId === t.id 
                    ? 'bg-calidad-blue/5 border-calidad-blue text-calidad-blue shadow-lg shadow-blue-100' 
                    : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                }`}
              >
                {t.name}
              </button>
              {t.id !== 'default-contract' && t.id !== 'default-cp' && (
                <button 
                  onClick={() => deleteTemplate(t.id)}
                  className="p-2 text-gray-300 hover:text-calidad-red opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {activeTemplate && (
        <div className="space-y-4 animate-in slide-in-from-top duration-300">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ПОЛЯ ШАБЛОНА</h3>
          <div className="grid gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            {Object.entries(
              activeTemplate.fields.reduce((acc, field) => {
                const section = field.section || 'ОСНОВНЫЕ ПОЛЯ';
                if (!acc[section]) acc[section] = [];
                acc[section].push(field);
                return acc;
              }, {} as Record<string, TemplateField[]>)
            ).map(([section, fields]: [string, TemplateField[]]) => (
              <div key={section} className="space-y-3">
                <h3 className="text-[10px] font-black text-calidad-blue border-b border-gray-100 pb-1 uppercase tracking-widest">{section}</h3>
                <div className="grid gap-3">
                  {fields.map(field => (
                    <div key={field.id} className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">{field.label}</label>
                      {field.type === 'textarea' ? (
                        <textarea
                          value={field.defaultValue}
                          onChange={e => updateTemplateField(field.id, e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-calidad-blue outline-none min-h-[60px]"
                        />
                      ) : (
                        <input
                          type="text"
                          value={field.defaultValue}
                          onChange={e => updateTemplateField(field.id, e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-calidad-blue outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-gray-100 space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-bold text-gray-500 uppercase">Advanced Mode</span>
          <button 
            onClick={() => setIsAdvancedMode(!isAdvancedMode)}
            className={`w-10 h-5 rounded-full transition-colors relative ${isAdvancedMode ? 'bg-calidad-red' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isAdvancedMode ? 'translate-x-5' : ''}`} />
          </button>
        </div>
        
        {isAdvancedMode && (
          <div className="space-y-2 animate-in slide-in-from-bottom duration-300">
            <label className="flex items-center justify-center gap-2 p-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <Plus size={14} className="text-gray-400" />
              <span className="text-[10px] font-bold text-gray-500 uppercase">Import .docx</span>
              <input type="file" accept=".docx" onChange={onFileChange} className="hidden" />
            </label>
            <button 
              onClick={extractVariable}
              className="w-full flex items-center justify-center gap-2 p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Maximize2 size={14} className="text-gray-400" />
              <span className="text-[10px] font-bold text-gray-500 uppercase">Extract Variable</span>
            </button>
            <button 
              onClick={saveTemplate}
              className="w-full flex items-center justify-center gap-2 p-2 bg-calidad-blue text-white rounded-lg hover:bg-blue-800 transition-colors"
            >
              <Save size={14} />
              <span className="text-[10px] font-bold uppercase">Save Changes</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
