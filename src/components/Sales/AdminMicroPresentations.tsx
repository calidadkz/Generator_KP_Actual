import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { MicroPresentation } from '../../types';

const CATEGORIES = ['Открытие', 'Квалификация', 'Возражения', 'Закрытие', 'Общее'];

function newId() {
  return 'mp-' + Date.now().toString(36);
}

const CATEGORY_COLORS: Record<string, string> = {
  'Открытие':      'bg-green-100 text-green-700',
  'Квалификация':  'bg-blue-100 text-blue-700',
  'Возражения':    'bg-orange-100 text-orange-700',
  'Закрытие':      'bg-purple-100 text-purple-700',
  'Общее':         'bg-gray-100 text-gray-600',
};

export const AdminMicroPresentations: React.FC = () => {
  const { microPresentations, machineTypes, addMicroPresentation, updateMicroPresentation, deleteMicroPresentation } =
    useSalesStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterMachineTypeId, setFilterMachineTypeId] = useState<string>('');

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const handleAdd = () => {
    const mp: MicroPresentation = {
      id: newId(),
      title: 'Новый блок',
      content: '',
      category: 'Общее',
      machineTypeIds: [],
      tags: [],
    };
    addMicroPresentation(mp);
    setExpanded((p) => ({ ...p, [mp.id]: true }));
  };

  const filtered = microPresentations
    .filter((mp) => !filterCategory || mp.category === filterCategory)
    .filter((mp) => !filterMachineTypeId || (mp.machineTypeIds ?? []).includes(filterMachineTypeId));

  const toggleMachineType = (mp: MicroPresentation, typeId: string) => {
    const ids = mp.machineTypeIds ?? [];
    const next = ids.includes(typeId) ? ids.filter((x) => x !== typeId) : [...ids, typeId];
    updateMicroPresentation(mp.id, { machineTypeIds: next });
  };

  const handleTagsChange = (id: string, raw: string) => {
    const tags = raw.split(',').map((t) => t.trim()).filter(Boolean);
    updateMicroPresentation(id, { tags });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Мини-презентации</h3>
          <p className="text-xs text-gray-400 mt-0.5">{filtered.length} из {microPresentations.length} блоков</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-calidad-blue text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors"
        >
          <Plus size={14} /> Добавить
        </button>
      </div>

      {/* Filter by category */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button
          onClick={() => setFilterCategory('')}
          className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
            filterCategory === '' ? 'bg-calidad-blue text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          Все категории
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat === filterCategory ? '' : cat)}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
              filterCategory === cat
                ? 'bg-calidad-blue text-white'
                : (CATEGORY_COLORS[cat] ?? 'bg-gray-100 text-gray-500') + ' hover:opacity-80'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Filter by machine type */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        <button
          onClick={() => setFilterMachineTypeId('')}
          className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
            filterMachineTypeId === '' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          Все типы
        </button>
        {machineTypes.map((mt) => (
          <button
            key={mt.id}
            onClick={() => setFilterMachineTypeId(mt.id === filterMachineTypeId ? '' : mt.id)}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
              filterMachineTypeId === mt.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {mt.name}
          </button>
        ))}
      </div>

      {filtered.map((mp) => (
        <div key={mp.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div
            className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50"
            onClick={() => toggle(mp.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    CATEGORY_COLORS[mp.category] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {mp.category}
                </span>
              </div>
              <input
                className="w-full text-sm font-semibold text-gray-800 bg-transparent outline-none"
                value={mp.title}
                onChange={(e) => updateMicroPresentation(mp.id, { title: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                placeholder="Название блока"
              />
              {!expanded[mp.id] && (
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{mp.content}</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => deleteMicroPresentation(mp.id)}
                className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
              {expanded[mp.id] ? (
                <ChevronUp size={14} className="text-gray-400" />
              ) : (
                <ChevronDown size={14} className="text-gray-400" />
              )}
            </div>
          </div>

          {expanded[mp.id] && (
            <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
              <div className="pt-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Категория</label>
                <select
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-calidad-blue"
                  value={mp.category}
                  onChange={(e) => updateMicroPresentation(mp.id, { category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Текст блока</label>
                <textarea
                  className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:border-calidad-blue"
                  rows={5}
                  value={mp.content}
                  onChange={(e) => updateMicroPresentation(mp.id, { content: e.target.value })}
                  placeholder="Текст мини-презентации или формулировки..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Применимые типы станков <span className="text-gray-400 font-normal">(пусто = универсальная)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {machineTypes.map((mt) => {
                    const active = (mp.machineTypeIds ?? []).includes(mt.id);
                    return (
                      <button
                        key={mt.id}
                        onClick={() => toggleMachineType(mp, mt.id)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                          active
                            ? 'bg-calidad-blue text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {mt.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Tag size={12} /> Теги <span className="text-gray-400 font-normal">(через запятую)</span>
                </label>
                <input
                  className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-calidad-blue"
                  value={(mp.tags ?? []).join(', ')}
                  onChange={(e) => handleTagsChange(mp.id, e.target.value)}
                  placeholder="дорого, возражение, окупаемость..."
                />
              </div>
            </div>
          )}
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">
            {filterCategory ? `Нет блоков в категории "${filterCategory}"` : 'Нет мини-презентаций. Добавьте первый блок.'}
          </p>
        </div>
      )}
    </div>
  );
};
