import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Tag, AlertTriangle, CheckCircle } from 'lucide-react';
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
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'drafts'>('all');

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const handleAdd = () => {
    const mp: MicroPresentation = {
      id: newId(),
      title: 'Новый атом знаний',
      content: '',
      category: 'Общее',
      machineTypeIds: [],
      tags: [],
      isPublished: true,
      createdBy: 'human',
    };
    addMicroPresentation(mp);
    setExpanded((p) => ({ ...p, [mp.id]: true }));
  };

  const filtered = microPresentations
    .filter((mp) => !filterCategory || mp.category === filterCategory)
    .filter((mp) => !filterMachineTypeId || (mp.machineTypeIds ?? []).includes(filterMachineTypeId))
    .filter((mp) => {
      if (filterPublished === 'published') return mp.isPublished !== false;
      if (filterPublished === 'drafts') return mp.isPublished === false;
      return true;
    });

  const draftsCount = microPresentations.filter((mp) => mp.isPublished === false).length;

  const toggleMachineType = (mp: MicroPresentation, typeId: string) => {
    const ids = mp.machineTypeIds ?? [];
    const next = ids.includes(typeId) ? ids.filter((x) => x !== typeId) : [...ids, typeId];
    updateMicroPresentation(mp.id, { machineTypeIds: next });
  };

  const handleTagsChange = (id: string, raw: string) => {
    const tags = raw.split(',').map((t) => t.trim()).filter(Boolean);
    updateMicroPresentation(id, { tags });
  };

  const getPreviewText = (mp: MicroPresentation) =>
    mp.methodology || mp.technical || mp.content || '';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Атомы знаний / МП</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {filtered.length} из {microPresentations.length}
            {draftsCount > 0 && (
              <span className="ml-2 text-amber-500 font-semibold">· {draftsCount} черновик{draftsCount > 1 ? 'а' : ''} AI</span>
            )}
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-calidad-blue text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors"
        >
          <Plus size={14} /> Добавить
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-1.5 mb-1">
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

      <div className="flex flex-wrap gap-1.5 mb-1">
        {(['all', 'published', 'drafts'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilterPublished(f)}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
              filterPublished === f ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'Все статусы' : f === 'published' ? '✅ Опубликованные' : '⚠️ Черновики AI'}
          </button>
        ))}
      </div>

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
        <div
          key={mp.id}
          className={`bg-white rounded-xl border overflow-hidden ${
            mp.isPublished === false ? 'border-amber-300' : 'border-gray-200'
          }`}
        >
          <div
            className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50"
            onClick={() => toggle(mp.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    CATEGORY_COLORS[mp.category] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {mp.category}
                </span>
                {mp.isPublished === false && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                    <AlertTriangle size={10} /> AI-черновик
                  </span>
                )}
                {mp.technical && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">🔘 факт</span>
                )}
                {(mp.methodology || (!mp.methodology && mp.content)) && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500">💬 метод</span>
                )}
                {mp.compromise && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-500">💰 компромисс</span>
                )}
              </div>
              <input
                className="w-full text-sm font-semibold text-gray-800 bg-transparent outline-none"
                value={mp.title}
                onChange={(e) => updateMicroPresentation(mp.id, { title: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                placeholder="Название атома знаний"
              />
              {!expanded[mp.id] && (
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{getPreviewText(mp)}</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {mp.isPublished === false ? (
                <button
                  onClick={() => updateMicroPresentation(mp.id, { isPublished: true })}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
                  title="Опубликовать"
                >
                  <CheckCircle size={12} /> Опубликовать
                </button>
              ) : null}
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
              <div className="pt-3 flex items-center justify-between">
                <div className="flex-1">
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
                <div className="ml-4 flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Опубликован</label>
                  <button
                    onClick={() => updateMicroPresentation(mp.id, { isPublished: !(mp.isPublished !== false) })}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      mp.isPublished !== false ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        mp.isPublished !== false ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Three knowledge levels */}
              <div className="space-y-3">
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                  <label className="text-xs font-bold text-gray-600 block mb-1">
                    🔘 ТЕХНИЧЕСКИЕ ЗНАНИЯ — «Что»
                    <span className="font-normal text-gray-400 ml-1">(факт, характеристика, цифра)</span>
                  </label>
                  <textarea
                    className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:border-gray-400"
                    rows={2}
                    value={mp.technical ?? ''}
                    onChange={(e) => updateMicroPresentation(mp.id, { technical: e.target.value || undefined })}
                    placeholder="Мощность охлаждения CW-5200: 1400 Вт. Ресурс трубки без чиллера: 1200 часов..."
                  />
                </div>

                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <label className="text-xs font-bold text-blue-700 block mb-1">
                    💬 МЕТОДОЛОГИЯ ЭКСПЕРТА — «Как»
                    <span className="font-normal text-blue-400 ml-1">(как объяснить клиенту, что сказать)</span>
                  </label>
                  <textarea
                    className="w-full text-sm text-gray-700 bg-white border border-blue-200 rounded-lg p-2.5 resize-none focus:outline-none focus:border-blue-400"
                    rows={3}
                    value={mp.methodology ?? mp.content}
                    onChange={(e) => updateMicroPresentation(mp.id, { methodology: e.target.value, content: e.target.value })}
                    placeholder="Расскажи клиенту о долговечности трубок — это эмоциональный якорь..."
                  />
                </div>

                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <label className="text-xs font-bold text-amber-700 block mb-1">
                    💰 СТРАТЕГИЯ КОМПРОМИССА — «Если бюджет»
                    <span className="font-normal text-amber-500 ml-1">(что предложить когда не хватает денег)</span>
                  </label>
                  <textarea
                    className="w-full text-sm text-gray-700 bg-white border border-amber-200 rounded-lg p-2.5 resize-none focus:outline-none focus:border-amber-400"
                    rows={2}
                    value={mp.compromise ?? ''}
                    onChange={(e) => updateMicroPresentation(mp.id, { compromise: e.target.value || undefined })}
                    placeholder="Если нет бюджета на чиллер — предложи насос, но предупреди о рисках перегрева..."
                  />
                </div>
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
            {filterCategory ? `Нет блоков в категории "${filterCategory}"` : 'Нет атомов знаний. Добавьте первый блок.'}
          </p>
        </div>
      )}
    </div>
  );
};
