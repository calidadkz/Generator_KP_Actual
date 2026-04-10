import React, { useState, useRef } from 'react';
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Save, 
  Layout as LayoutIcon, 
  ChevronRight,
  ArrowLeft,
  Settings as SettingsIcon,
  Eye,
  EyeOff,
  Code,
  Sparkles,
  FileText,
  Upload,
  Type,
  Image as ImageIcon,
  AlignCenter
} from 'lucide-react';
import { CPBlock, CPTemplate, CPBlockInstance, CPState, CompanyDetails, CPBlockField } from '../../types';
import { CP_BLOCKS } from '../../constants/blocks';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { CPPreview } from './CPPreview';
import { extractFieldsFromHTML } from '../../utils';
import * as pdfjs from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

interface CPBuilderProps {
  onSave: (template: CPTemplate) => void;
  onBack: () => void;
  initialTemplate?: CPTemplate;
  cp: CPState;
  supplier: CompanyDetails;
}

export const CPBuilder: React.FC<CPBuilderProps> = ({ onSave, onBack, initialTemplate, cp, supplier }) => {
  const [name, setName] = useState(initialTemplate?.name || 'Новый шаблон КП');
  const [blocks, setBlocks] = useState<CPBlockInstance[]>(() => {
    return initialTemplate?.blocks || [];
  });
  const [customBlocks, setCustomBlocks] = useState<CPBlock[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showPdfImporter, setShowPdfImporter] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Importer State
  const [importHtml, setImportHtml] = useState('');
  const [importName, setImportName] = useState('');
  const [detectedFields, setDetectedFields] = useState<CPBlockField[]>([]);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const allBlocks = [...CP_BLOCKS, ...customBlocks];

  React.useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  }, []);

  const addBlock = (blockId: string) => {
    const blockDef = allBlocks.find(b => b.id === blockId);
    if (!blockDef) return;

    const initialData: Record<string, any> = {};
    blockDef.fields.forEach(field => {
      initialData[field.id] = field.defaultValue;
    });

    const newInstance: CPBlockInstance = {
      id: Math.random().toString(36).substr(2, 9),
      blockId,
      data: initialData
    };

    setBlocks(prev => [...prev, newInstance]);
    setShowLibrary(false);
    setEditingBlockId(newInstance.id);
  };

  const handleImportHtml = (html: string) => {
    setImportHtml(html);
    const fieldIds = extractFieldsFromHTML(html);
    const fields: CPBlockField[] = fieldIds.map(id => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      type: id.toLowerCase().includes('url') || id.toLowerCase().includes('image') ? 'image' : 'text',
      defaultValue: ''
    }));
    setDetectedFields(fields);
  };

  const saveImportedBlock = () => {
    if (!importName || !importHtml) return alert('Заполните название и HTML');
    
    const newBlock: CPBlock = {
      id: `custom-${Date.now()}`,
      name: importName,
      description: 'Пользовательский блок',
      content: importHtml,
      fields: detectedFields
    };

    setCustomBlocks(prev => [...prev, newBlock]);
    setShowImporter(false);
    setImportHtml('');
    setImportName('');
    setDetectedFields([]);
    
    // Auto add to current template
    const initialData: Record<string, any> = {};
    newBlock.fields.forEach(f => initialData[f.id] = f.defaultValue);
    
    const newInstance: CPBlockInstance = {
      id: Math.random().toString(36).substr(2, 9),
      blockId: newBlock.id,
      data: initialData
    };
    
    setBlocks(prev => [...prev, newInstance]);
    setEditingBlockId(newInstance.id);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPdf(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const pages: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        pages.push(canvas.toDataURL('image/jpeg', 0.8));
      }

      setPdfPages(pages);
      setShowPdfImporter(true);
      setShowLibrary(false);
    } catch (error) {
      console.error('Error processing PDF:', error);
      alert('Ошибка при обработке PDF. Убедитесь, что файл корректен.');
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const createBlockFromPdfPage = (pageDataUrl: string, index: number) => {
    const blockId = `pdf-block-${Date.now()}-${index}`;
    const bgVarName = `pdf_bg_${index}`;
    
    // HTML structure optimized for adaptive background
    const html = `
<div class="relative w-full h-[297mm] overflow-hidden bg-white shadow-lg">
  <img src="{{${bgVarName}}}" class="absolute inset-0 w-full h-full object-cover" style="object-position: center;" alt="PDF Background" />
  <div class="relative z-10 p-12 h-full flex flex-col">
    <!-- Слой для ваших переменных поверх PDF -->
    <div class="mt-auto bg-white/80 backdrop-blur-sm p-8 rounded-3xl border border-white/50">
      <h2 class="text-3xl font-black text-gray-900 uppercase tracking-tight mb-4">{{title_on_pdf}}</h2>
      <p class="text-lg text-gray-700 font-bold">{{description_on_pdf}}</p>
    </div>
  </div>
</div>`.trim();

    const newBlock: CPBlock = {
      id: blockId,
      name: `PDF Стр. ${index + 1}`,
      description: 'Импортировано из PDF шаблона',
      content: html,
      fields: [
        { id: bgVarName, label: 'Фон из PDF', type: 'image', defaultValue: pageDataUrl },
        { id: 'title_on_pdf', label: 'Заголовок поверх PDF', type: 'text', defaultValue: 'Ваш заголовок' },
        { id: 'description_on_pdf', label: 'Описание поверх PDF', type: 'textarea', defaultValue: 'Ваше описание здесь...' }
      ]
    };

    setCustomBlocks(prev => [...prev, newBlock]);
    
    // Auto add to template
    const initialData: Record<string, any> = {};
    newBlock.fields.forEach(f => initialData[f.id] = f.defaultValue);
    
    const newInstance: CPBlockInstance = {
      id: Math.random().toString(36).substr(2, 9),
      blockId: newBlock.id,
      data: initialData
    };
    
    setBlocks(prev => [...prev, newInstance]);
    setEditingBlockId(newInstance.id);
  };

  const importAllPdfPages = () => {
    pdfPages.forEach((page, idx) => createBlockFromPdfPage(page, idx));
    setShowPdfImporter(false);
    setPdfPages([]);
  };

  const insertVariable = (varName: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = importHtml;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = `${before}{{${varName}}}${after}`;
    handleImportHtml(newText);
    
    // Set cursor after the inserted variable
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = start + varName.length + 4;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (editingBlockId === id) setEditingBlockId(null);
  };

  const updateBlockData = (instanceId: string, fieldId: string, value: any) => {
    setBlocks(prev => prev.map(b => 
      b.id === instanceId 
        ? { ...b, data: { ...b.data, [fieldId]: value } }
        : b
    ));
  };

  const handleImageUpload = (instanceId: string, fieldId: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      updateBlockData(instanceId, fieldId, reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!name.trim()) return alert('Введите название шаблона');
    if (blocks.length === 0) return alert('Добавьте хотя бы один блок');
    onSave({
      id: initialTemplate?.id || Date.now().toString(),
      name,
      blocks
    });
  };

  const editingInstance = blocks.find(b => b.id === editingBlockId);
  const editingDef = editingInstance ? allBlocks.find(b => b.id === editingInstance.blockId) : null;

  const currentTemplate: CPTemplate = {
    id: initialTemplate?.id || 'preview',
    name,
    blocks
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-50">
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
            <p className="text-xs text-gray-400">Конструктор шаблонов КП</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all ${
              isPreviewMode 
                ? 'bg-gray-900 text-white hover:bg-black' 
                : 'bg-white text-gray-900 border-2 border-gray-200 hover:border-gray-900'
            }`}
          >
            {isPreviewMode ? (
              <><EyeOff size={18} /> Редактор</>
            ) : (
              <><Eye size={18} /> Предпросмотр</>
            )}
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            <Save size={18} /> Сохранить
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8 bg-gray-100/50">
          <AnimatePresence mode="wait">
            {isPreviewMode ? (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-5xl mx-auto"
              >
                <div className="bg-white shadow-2xl rounded-[40px] overflow-hidden">
                  <CPPreview 
                    cp={cp} 
                    supplier={supplier} 
                    activeCPTemplate={currentTemplate} 
                    totalAmount={cp.prices.m2 + cp.prices.ruida} 
                    customBlocks={customBlocks}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="editor"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-3xl mx-auto w-full"
              >
                <div className="mb-8 flex items-center justify-between">
                  <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Структура КП</h2>
                  <button 
                    onClick={() => setShowLibrary(true)}
                    className="flex items-center gap-2 bg-white text-blue-600 border-2 border-blue-600 px-4 py-2 rounded-xl font-bold hover:bg-blue-50 transition-colors"
                  >
                    <Plus size={18} /> Добавить блок
                  </button>
                </div>

                <Reorder.Group axis="y" values={blocks} onReorder={setBlocks} className="space-y-4">
                  {blocks.map((item, index) => {
                    const block = allBlocks.find(b => b.id === item.blockId);
                    if (!block) return null;
                    
                    const isActive = editingBlockId === item.id;

                    return (
                      <Reorder.Item 
                        key={item.id} 
                        value={item}
                        className={`bg-white p-6 rounded-3xl border-2 transition-all cursor-default ${
                          isActive ? 'border-blue-600 shadow-xl shadow-blue-100' : 'border-transparent shadow-sm hover:border-gray-200'
                        }`}
                        onClick={() => setEditingBlockId(item.id)}
                      >
                        <div className="flex items-center gap-6">
                          <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400">
                            <GripVertical size={24} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Блок {index + 1}</span>
                              <h3 className="font-black text-gray-900 uppercase tracking-tight">{block.name}</h3>
                            </div>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{block.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                removeBlock(item.id);
                              }}
                              className="p-2 hover:bg-red-50 rounded-xl text-gray-300 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>

                {blocks.length === 0 && (
                  <div className="text-center py-24 bg-white rounded-[48px] border-4 border-dashed border-gray-100">
                    <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-200">
                      <LayoutIcon size={40} />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">Ваш шаблон пуст</h3>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-8">Добавьте блоки из библиотеки, чтобы собрать КП</p>
                    <button 
                      onClick={() => setShowLibrary(true)}
                      className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 hover:scale-105"
                    >
                      Открыть библиотеку
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Sidebar Editor */}
        <aside className="w-96 bg-white border-l flex flex-col overflow-hidden">
          {editingInstance && editingDef ? (
            <div className="flex flex-col h-full overflow-hidden">
              <header className="p-6 border-b bg-gray-50/50 shrink-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                    <SettingsIcon size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 uppercase tracking-tight">{editingDef.name}</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Настройка контента</p>
                  </div>
                </div>
              </header>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Mini Preview */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Предпросмотр блока</label>
                  <div className="bg-gray-100 rounded-2xl p-4 overflow-hidden border-2 border-gray-200 scale-[0.6] origin-top-left -mb-[40%] w-[166%] shadow-inner">
                    <div className="bg-white shadow-lg origin-top">
                      <CPPreview 
                        cp={cp} 
                        supplier={supplier} 
                        activeCPTemplate={{ id: 'temp', name: 'temp', blocks: [editingInstance] }} 
                        totalAmount={cp.prices.m2 + cp.prices.ruida} 
                        customBlocks={customBlocks}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-8">
                  {editingDef.fields.map(field => (
                    <div key={field.id} className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{field.label}</label>
                      
                      {field.type === 'text' && (
                        <input 
                          type="text"
                          value={editingInstance.data[field.id] || ''}
                          onChange={(e) => updateBlockData(editingInstance.id, field.id, e.target.value)}
                          className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-2xl transition-all font-bold text-gray-700 outline-none"
                        />
                      )}

                      {field.type === 'textarea' && (
                        <textarea 
                          value={editingInstance.data[field.id] || ''}
                          onChange={(e) => updateBlockData(editingInstance.id, field.id, e.target.value)}
                          rows={4}
                          className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-2xl transition-all font-bold text-gray-700 outline-none resize-none"
                        />
                      )}

                      {field.type === 'richText' && (
                        <div className="space-y-2">
                          <textarea 
                            value={editingInstance.data[field.id] || ''}
                            onChange={(e) => updateBlockData(editingInstance.id, field.id, e.target.value)}
                            rows={6}
                            className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-2xl transition-all font-mono text-xs text-gray-700 outline-none resize-none"
                            placeholder="Введите HTML код..."
                          />
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest italic">* Допускается использование HTML тегов для сложной верстки</p>
                        </div>
                      )}

                      {field.type === 'image' && (
                        <div className="space-y-4">
                          <div className="relative aspect-video bg-gray-100 rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 group">
                            {editingInstance.data[field.id] ? (
                              <img 
                                src={editingInstance.data[field.id]} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                <LayoutIcon size={32} />
                              </div>
                            )}
                            <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white font-bold text-xs uppercase tracking-widest">
                              Загрузить фото
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(editingInstance.id, field.id, file);
                                }}
                              />
                            </label>
                          </div>
                          <input 
                            type="text"
                            value={editingInstance.data[field.id] || ''}
                            onChange={(e) => updateBlockData(editingInstance.id, field.id, e.target.value)}
                            placeholder="Или вставьте URL..."
                            className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-xl transition-all text-[10px] font-bold text-gray-500 outline-none"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200 mb-4">
                <ChevronRight size={32} />
              </div>
              <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Выберите блок</h4>
              <p className="text-xs text-gray-300 font-bold uppercase tracking-widest mt-2">для настройки его содержимого</p>
            </div>
          )}
        </aside>
      </div>

      {/* Library Modal */}
      {showLibrary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[40px] w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <header className="p-8 border-b flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Библиотека блоков</h2>
                <p className="text-sm text-gray-500 font-bold">Выберите готовый блок или создайте свой</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={handlePdfUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={isProcessingPdf}
                  />
                  <button 
                    className={`flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 ${isProcessingPdf ? 'opacity-50' : ''}`}
                  >
                    {isProcessingPdf ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FileText size={16} />
                    )}
                    Импорт из PDF
                  </button>
                </div>
                <button 
                  onClick={() => {
                    setShowLibrary(false);
                    setShowImporter(true);
                  }}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  <Code size={16} />
                  Свой блок (HTML)
                </button>
                <button 
                  onClick={() => setShowLibrary(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Plus size={24} className="rotate-45 text-gray-400" />
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 gap-6">
              {allBlocks.map(block => (
                <button
                  key={block.id}
                  onClick={() => addBlock(block.id)}
                  className="group relative flex flex-col text-left p-6 rounded-[32px] border-2 border-gray-100 hover:border-blue-600 hover:bg-blue-50 transition-all overflow-hidden"
                >
                  <div className="mb-4 bg-gray-50 rounded-2xl p-2 overflow-hidden border border-gray-100 group-hover:bg-white transition-colors h-40 relative">
                    <div className="scale-[0.25] origin-top-left w-[400%] pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
                      <CPPreview 
                        cp={cp} 
                        supplier={supplier} 
                        activeCPTemplate={{ 
                          id: 'temp', 
                          name: 'temp', 
                          blocks: [{ 
                            id: 'temp', 
                            blockId: block.id, 
                            data: Object.fromEntries(block.fields.map(f => [f.id, f.defaultValue])) 
                          }] 
                        }} 
                        totalAmount={cp.prices.m2 + cp.prices.ruida} 
                        customBlocks={customBlocks}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <div>
                      <h3 className="font-black text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight text-sm">{block.name}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{block.description}</p>
                    </div>
                    <Plus size={16} className="text-gray-300 group-hover:text-blue-600 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Importer Modal */}
      <AnimatePresence>
        {showImporter && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowImporter(false)}
              className="absolute inset-0 bg-blue-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-6xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <button onClick={() => { setShowImporter(false); setShowLibrary(true); }} className="p-2 hover:bg-gray-200 rounded-xl transition-colors">
                    <ArrowLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-2xl font-black text-[#0f3c7a] uppercase tracking-tight">Импорт блока из HTML</h3>
                    <p className="text-sm text-gray-500 font-bold">Вставьте HTML код, переменные {"{{variable}}"} будут определены автоматически</p>
                  </div>
                </div>
                <button 
                  onClick={saveImportedBlock}
                  className="flex items-center gap-2 bg-green-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-200"
                >
                  <Sparkles size={18} />
                  Создать и добавить блок
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden flex">
                {/* Editor Side */}
                <div className="w-1/2 p-8 border-r border-gray-100 overflow-y-auto space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Название блока</label>
                    <input 
                      type="text" 
                      value={importName}
                      onChange={(e) => setImportName(e.target.value)}
                      placeholder="Например: Техническая таблица"
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 font-bold text-[#0f3c7a] outline-none focus:border-blue-600 transition-all"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">HTML Код (Tailwind CSS поддерживается)</label>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => insertVariable('new_text')}
                          className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-colors"
                        >
                          <Type size={10} />
                          + Текст
                        </button>
                        <button 
                          onClick={() => insertVariable('new_image')}
                          className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-colors"
                        >
                          <ImageIcon size={10} />
                          + Фото
                        </button>
                      </div>
                    </div>
                    <textarea 
                      ref={textareaRef}
                      value={importHtml}
                      onChange={(e) => handleImportHtml(e.target.value)}
                      placeholder="<div class='p-8 bg-blue-50'>{{myVariable}}</div>"
                      className="w-full h-64 bg-gray-900 text-green-400 font-mono text-xs p-6 rounded-2xl border-2 border-gray-800 outline-none focus:border-blue-600 transition-all resize-none"
                    />
                  </div>
                  
                  {detectedFields.length > 0 && (
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Обнаруженные переменные ({detectedFields.length})</label>
                      <div className="space-y-3">
                        {detectedFields.map((field, idx) => (
                            <div key={field.id} className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                              <div className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center text-[10px] font-black">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-black text-red-700 uppercase tracking-tight">{"{{"}{field.id}{"}}"}</p>
                                <div className="flex gap-2 mt-1">
                                  <select 
                                    value={field.type}
                                    onChange={(e) => {
                                      const newFields = [...detectedFields];
                                      newFields[idx].type = e.target.value as any;
                                      setDetectedFields(newFields);
                                    }}
                                    className="text-[10px] font-black uppercase tracking-widest bg-white border border-red-200 rounded-md px-2 py-1 outline-none text-red-600"
                                  >
                                    <option value="text">Текст</option>
                                    <option value="textarea">Абзац</option>
                                    <option value="image">Картинка</option>
                                    <option value="richText">HTML/Список</option>
                                  </select>
                                  <input 
                                    type="text"
                                    value={field.label}
                                    onChange={(e) => {
                                      const newFields = [...detectedFields];
                                      newFields[idx].label = e.target.value;
                                      setDetectedFields(newFields);
                                    }}
                                    placeholder="Метка поля"
                                    className="flex-1 text-[10px] font-bold bg-white border border-red-200 rounded-md px-2 py-1 outline-none text-red-700 placeholder:text-red-300"
                                  />
                                </div>
                              </div>
                            </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Preview Side */}
                <div className="w-1/2 bg-gray-100 p-8 overflow-y-auto flex items-start justify-center">
                  <div className="w-full max-w-[420px] bg-white shadow-2xl rounded-lg overflow-hidden origin-top scale-[0.85] border-[6px] border-[#86efac]">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ПРЕДПРОСМОТР БЛОКА</span>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      </div>
                    </div>
                    <div className="aspect-[210/297] w-full bg-white relative overflow-hidden">
                      <div className="absolute inset-0 origin-top-left" style={{ width: '210mm', height: '297mm', transform: 'scale(0.25)' }}>
                        <div dangerouslySetInnerHTML={{ __html: importHtml.replace(/{{(.*?)}}/g, (match, p1) => {
                          const field = detectedFields.find(f => f.id === p1);
                          return `<span class="bg-red-200 text-red-800 px-1 rounded font-bold border border-red-400 animate-pulse">${field?.label || p1}</span>`;
                        }) }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PDF Importer Modal */}
      <AnimatePresence>
        {showPdfImporter && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPdfImporter(false)}
              className="absolute inset-0 bg-purple-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-6xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <button onClick={() => { setShowPdfImporter(false); setShowLibrary(true); }} className="p-2 hover:bg-gray-200 rounded-xl transition-colors">
                    <ArrowLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-2xl font-black text-purple-900 uppercase tracking-tight">Импорт страниц PDF</h3>
                    <p className="text-sm text-gray-500 font-bold">Выберите страницы для добавления в библиотеку блоков</p>
                  </div>
                </div>
                <button 
                  onClick={importAllPdfPages}
                  className="flex items-center gap-2 bg-purple-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-purple-700 transition-all shadow-lg shadow-purple-200"
                >
                  <Sparkles size={18} />
                  Добавить все страницы ({pdfPages.length})
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-3 gap-6 bg-gray-50">
                {pdfPages.map((page, idx) => (
                  <div key={idx} className="group relative bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all">
                    <div className="aspect-[210/297] relative">
                      <img src={page} className="w-full h-full object-cover" alt={`Page ${idx + 1}`} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button 
                          onClick={() => {
                            createBlockFromPdfPage(page, idx);
                            const newPages = [...pdfPages];
                            newPages.splice(idx, 1);
                            setPdfPages(newPages);
                            if (newPages.length === 0) setShowPdfImporter(false);
                          }}
                          className="bg-white text-purple-600 px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl"
                        >
                          Добавить эту страницу
                        </button>
                      </div>
                    </div>
                    <div className="p-4 flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Страница {idx + 1}</span>
                      <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-[10px] font-black">
                        {idx + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PDF Importer Modal */}
      <AnimatePresence>
        {showPdfImporter && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPdfImporter(false)}
              className="absolute inset-0 bg-purple-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-6xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <button onClick={() => { setShowPdfImporter(false); setShowLibrary(true); }} className="p-2 hover:bg-gray-200 rounded-xl transition-colors">
                    <ArrowLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-2xl font-black text-purple-900 uppercase tracking-tight">Импорт страниц PDF</h3>
                    <p className="text-sm text-gray-500 font-bold">Выберите страницы для добавления в библиотеку блоков</p>
                  </div>
                </div>
                <button 
                  onClick={importAllPdfPages}
                  className="flex items-center gap-2 bg-purple-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-purple-700 transition-all shadow-lg shadow-purple-200"
                >
                  <Sparkles size={18} />
                  Добавить все страницы ({pdfPages.length})
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-3 gap-6 bg-gray-50">
                {pdfPages.map((page, idx) => (
                  <div key={idx} className="group relative bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all">
                    <div className="aspect-[210/297] relative">
                      <img src={page} className="w-full h-full object-cover" alt={`Page ${idx + 1}`} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button 
                          onClick={() => {
                            createBlockFromPdfPage(page, idx);
                            const newPages = [...pdfPages];
                            newPages.splice(idx, 1);
                            setPdfPages(newPages);
                            if (newPages.length === 0) setShowPdfImporter(false);
                          }}
                          className="bg-white text-purple-600 px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl"
                        >
                          Добавить эту страницу
                        </button>
                      </div>
                    </div>
                    <div className="p-4 flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Страница {idx + 1}</span>
                      <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-[10px] font-black">
                        {idx + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
