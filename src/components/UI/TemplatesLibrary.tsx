import React from 'react';
import {
  FileText,
  Trash2,
  Edit3,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import { Template } from '../../types';

interface TemplatesLibraryProps {
  templates: Template[];
  onBack: () => void;
  onEditTemplate: (template: Template) => void;
  onDeleteTemplate: (id: string) => void;
  onNewTemplate: () => void;
}

export const TemplatesLibrary: React.FC<TemplatesLibraryProps> = ({
  templates,
  onBack,
  onEditTemplate,
  onDeleteTemplate,
  onNewTemplate,
}) => {
  return (
    <div className="min-h-screen bg-gray-50 p-8 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-4xl font-bold text-gray-900">Библиотека шаблонов</h1>
          </div>
          <button
            onClick={onNewTemplate}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
          >
            <Plus size={18} /> Новый договор
          </button>
        </header>

        <section>
          <div className="flex items-center gap-3 mb-6">
            <FileText className="text-red-500" />
            <h2 className="text-2xl font-bold text-gray-900">Шаблоны договоров</h2>
          </div>
          <div className="space-y-4">
            {templates.filter(t => t.type === 'Contract' || t.type === 'contract').map(template => (
              <div
                key={template.id}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-red-200 transition-all"
              >
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
            {templates.filter(t => t.type === 'Contract' || t.type === 'contract').length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
                <p>Нет шаблонов договоров</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
