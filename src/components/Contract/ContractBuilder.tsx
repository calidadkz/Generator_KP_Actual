import React, { useState } from 'react';
import { 
  Plus, 
  Save, 
  ArrowLeft,
  FileText,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3
} from 'lucide-react';
import { Template, TemplateField } from '../../types';
import { motion } from 'framer-motion';

interface ContractBuilderProps {
  onSave: (template: Template) => void;
  onBack: () => void;
  onDocxUpload: (file: File) => Promise<{ content: string; fields: TemplateField[] }>;
  initialTemplate?: Template;
  templateType?: 'Contract' | 'CP';
}

export const ContractBuilder: React.FC<ContractBuilderProps> = ({
  onSave,
  onBack,
  onDocxUpload,
  initialTemplate,
  templateType = 'Contract'
}) => {
  const [name, setName] = useState(initialTemplate?.name || (templateType === 'CP' ? 'Новый шаблон КП' : 'Новый шаблон договора'));
  const [content, setContent] = useState(initialTemplate?.content || '');
  const [fields, setFields] = useState<TemplateField[]>(initialTemplate?.fields || []);
  const [isUploading, setIsUploading] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await onDocxUpload(file);
      setContent(result.content);
      setFields(result.fields);
    } catch (error) {
      alert('Ошибка при загрузке файла');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return alert('Введите название шаблона');
    if (!content) return alert('Загрузите файл шаблона');
    
    onSave({
      id: initialTemplate?.id || Date.now().toString(),
      name,
      type: templateType,
      content,
      fields
    });
  };

  const updateField = (id: string, updates: Partial<TemplateField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="text-xl font-bold text-gray-900 bg-transparent border-none focus:ring-0 p-0"
              placeholder="Название шаблона..."
            />
            <p className="text-xs text-gray-400">Конструктор договоров (.docx)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
          >
            <Save size={18} /> Сохранить шаблон
          </button>
        </div>
      </header>

      <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-[1600px] mx-auto w-full">
        {/* Left: Fields Configuration */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Переменные</h2>
              <span className="bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1 rounded-full">{fields.length} найдено</span>
            </div>

            {!content && (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500 shadow-sm">
                  <Upload size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Загрузите .docx файл</h3>
                <p className="text-gray-500 mb-6 text-sm">Мы автоматически найдем переменные в формате <code className="bg-gray-200 px-1 rounded">{"{{переменная}}"}</code></p>
                <label className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 cursor-pointer inline-block">
                  {isUploading ? 'Загрузка...' : 'Выбрать файл'}
                  <input type="file" className="hidden" accept=".docx" onChange={handleFileChange} disabled={isUploading} />
                </label>
              </div>
            )}

            {content && (
              <div className="space-y-4">
                {fields.map(field => (
                  <div 
                    key={field.id}
                    className={`p-4 rounded-2xl border transition-all ${activeFieldId === field.id ? 'border-red-600 bg-red-50 ring-2 ring-red-100' : 'border-gray-100 hover:border-gray-300'}`}
                    onMouseEnter={() => setActiveFieldId(field.id)}
                    onMouseLeave={() => setActiveFieldId(null)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold text-red-600">{"{{"}{field.id}{"}}"}</code>
                        <input 
                          type="text" 
                          value={field.label} 
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          className="font-bold text-gray-900 bg-transparent border-none focus:ring-0 p-0 text-sm"
                          placeholder="Название поля..."
                        />
                      </div>
                      <button 
                        onClick={() => removeField(field.id)}
                        className="p-1.5 hover:bg-red-100 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <select 
                        value={field.type}
                        onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                        className="text-xs bg-white border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="text">Текст</option>
                        <option value="textarea">Многострочный текст</option>
                        <option value="number">Число</option>
                        <option value="richText">Форматированный текст</option>
                      </select>
                      <input 
                        type="text" 
                        value={field.defaultValue} 
                        onChange={(e) => updateField(field.id, { defaultValue: e.target.value })}
                        className="flex-1 text-xs bg-white border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500"
                        placeholder="Значение по умолчанию..."
                      />
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={() => setFields([...fields, { id: `field_${Date.now()}`, label: 'Новое поле', type: 'text', defaultValue: '' }])}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold hover:border-red-300 hover:text-red-500 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Добавить переменную вручную
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[calc(100vh-160px)] sticky top-24">
          <header className="p-6 border-b flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2 text-gray-500">
              <FileText size={20} />
              <span className="font-bold">Предпросмотр структуры</span>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-xs text-red-600 font-bold flex items-center gap-1 cursor-pointer hover:underline">
                <Upload size={14} /> Перезагрузить файл
                <input type="file" className="hidden" accept=".docx" onChange={handleFileChange} />
              </label>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-12 bg-gray-100/30">
            {content ? (
              <div 
                className="bg-white shadow-2xl p-16 min-h-full prose max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300">
                <FileText size={64} strokeWidth={1} className="mb-4" />
                <p className="font-bold">Файл не загружен</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
