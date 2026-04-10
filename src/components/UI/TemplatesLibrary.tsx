import React from 'react';
import { 
  FileText, 
  Briefcase, 
  Trash2, 
  Edit3, 
  ArrowLeft,
  Plus,
  Layout as LayoutIcon
} from 'lucide-react';
import { Template, CPTemplate, AppTab } from '../../types';
import { motion } from 'framer-motion';

interface TemplatesLibraryProps {
  templates: Template[];
  cpTemplates: CPTemplate[];
  onBack: () => void;
  onEditTemplate: (template: Template) => void;
  onEditCPTemplate: (template: CPTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onDeleteCPTemplate: (id: string) => void;
  onNewTemplate: (type: 'Contract' | 'CP') => void;
}

export const TemplatesLibrary: React.FC<TemplatesLibraryProps> = ({
  templates,
  cpTemplates,
  onBack,
  onEditTemplate,
  onEditCPTemplate,
  onDeleteTemplate,
  onDeleteCPTemplate,
  onNewTemplate
}) => {
  return (
    <div className="min-h-screen bg-gray-50 p-8 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-4xl font-bold text-gray-900">Библиотека шаблонов</h1>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => onNewTemplate('Contract')}
              className="flex items-center gap-2 bg-red-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
            >
              <Plus size={18} /> Новый договор
            </button>
            <button 
              onClick={() => onNewTemplate('CP')}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              <Plus size={18} /> Новое КП
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contracts Section */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <FileText className="text-red-500" />
              <h2 className="text-2xl font-bold text-gray-900">Шаблоны договоров</h2>
            </div>
            <div className="space-y-4">
              {templates.filter(t => t.type === 'Contract' || t.type === 'contract').map(template => (
                <div key={template.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-red-200 transition-all">
                  <div>
                    <h3 className="font-bold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-500">{template.fields.length} переменных</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEditTemplate(template)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => onDeleteTemplate(template.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CP Section */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <LayoutIcon className="text-blue-500" />
              <h2 className="text-2xl font-bold text-gray-900">Шаблоны КП (Блочные)</h2>
            </div>
            <div className="space-y-4">
              {cpTemplates.map(template => (
                <div key={template.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                  <div>
                    <h3 className="font-bold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-500">{template.blockIds.length} блоков</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEditCPTemplate(template)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => onDeleteCPTemplate(template.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {cpTemplates.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
                  <p>Нет созданных шаблонов КП</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
