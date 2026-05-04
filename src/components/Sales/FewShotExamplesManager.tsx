import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';

function newId() {
  return 'fshot-' + Date.now().toString(36);
}

export const FewShotExamplesManager: React.FC = () => {
  const { fewShotExamples, addFewShotExample, updateFewShotExample, deleteFewShotExample } = useSalesStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const handleAdd = () => {
    if (fewShotExamples.length >= 10) return;
    const example = {
      id: newId(),
      title: 'Новый пример',
      content: '',
      addedAt: new Date().toISOString(),
    };
    addFewShotExample(example);
    setExpanded((p) => ({ ...p, [example.id]: true }));
  };

  const startEdit = (id: string, title: string, content: string) => {
    setEditingId(id);
    setEditTitle(title);
    setEditContent(content);
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateFewShotExample(editingId, { title: editTitle, content: editContent });
    setEditingId(null);
  };

  const canAddMore = fewShotExamples.length < 10;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Примеры стиля</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Макс. 10 примеров × 1500 символов. Используются для рестайла статей в голосе менеджера.
          </p>
        </div>
        <button
          onClick={handleAdd}
          disabled={!canAddMore}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-calidad-blue text-white rounded-lg text-xs font-bold hover:bg-blue-800 disabled:opacity-50 transition-colors"
        >
          <Plus size={14} /> Добавить
        </button>
      </div>

      {fewShotExamples.map((example) => {
        const isEditing = editingId === example.id;
        const wordCount = example.content.split(/\s+/).length;

        return (
          <div key={example.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {!isEditing ? (
              <>
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggle(example.id)}
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{example.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {wordCount} слов · {new Date(example.addedAt).toLocaleDateString('ru')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFewShotExample(example.id);
                      }}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    {expanded[example.id] ? (
                      <ChevronUp size={14} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={14} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {expanded[example.id] && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100 max-h-48 overflow-y-auto">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{example.content}</p>
                    </div>
                    <button
                      onClick={() => startEdit(example.id, example.title, example.content)}
                      className="mt-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold transition-colors"
                    >
                      Редактировать
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 border-t border-gray-100 bg-blue-50/40">
                <div className="mb-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Название</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-calidad-blue"
                  />
                </div>
                <div className="mb-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Текст примера (макс. 1500 символов)
                  </label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value.slice(0, 1500))}
                    rows={6}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-calidad-blue"
                  />
                  <p className="text-xs text-gray-400 mt-1">{editContent.length} / 1500 символов</p>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={saveEdit}
                    className="px-3 py-1.5 bg-calidad-blue hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {fewShotExamples.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Нет примеров стиля. Добавьте первый пример.</p>
        </div>
      )}
    </div>
  );
};
