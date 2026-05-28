import React, { useState, useMemo } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Tag, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { MicroPresentation, QualificationSlot } from '../../types';

// Универсальные слоты (дублируем из Cockpit для редактора)
const UNIVERSAL_SLOTS: QualificationSlot[] = [
  { key: 'client_name', label: 'Имя / Компания' },
  { key: 'budget',      label: 'Бюджет' },
  { key: 'timeline',    label: 'Срок' },
];

// Формулировки — зарезервированная тема: атомы показываются менеджеру всегда.
// Остальные темы — свободные строки, задаёт пользователь/агент.
const ALWAYS_SHOWN_CATEGORY = 'Формулировки';

function newId() {
  return 'mp-' + Date.now().toString(36);
}

const CATEGORY_COLORS: Record<string, string> = {
  'Открытие':      'bg-green-100 text-green-700',
  'Квалификация':  'bg-blue-100 text-blue-700',
  'Возражения':    'bg-orange-100 text-orange-700',
  'Закрытие':      'bg-purple-100 text-purple-700',
  'Общее':         'bg-gray-100 text-gray-600',
  'Формулировки':  'bg-yellow-100 text-yellow-700',
};

export const AdminMicroPresentations: React.FC = () => {
  const { microPresentations, machineTypes, addMicroPresentation, updateMicroPresentation, deleteMicroPresentation } =
    useSalesStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterMachineTypeId, setFilterMachineTypeId] = useState<string>('');
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'drafts'>('all');

  // Редактор slotConditions: отдельный pending-state на каждый MP
  const [condKey, setCondKey] = useState<Record<string, string>>({});
  const [condValues, setCondValues] = useState<Record<string, string>>({});

  // Все доступные слоты: универсальные + из всех типов станков
  const allSlotOptions = useMemo<QualificationSlot[]>(() => {
    const seen = new Set<string>();
    const result: QualificationSlot[] = [...UNIVERSAL_SLOTS];
    UNIVERSAL_SLOTS.forEach((s) => seen.add(s.key));
    machineTypes.forEach((mt) => {
      (mt.qualifiers ?? []).forEach((q) => {
        const slot = typeof q === 'string' ? { key: q, label: q } : q as QualificationSlot;
        if (slot.key && !seen.has(slot.key)) { seen.add(slot.key); result.push(slot); }
      });
    });
    return result;
  }, [machineTypes]);

  // Динамический список тем: Формулировки всегда первая, остальные из существующих атомов
  const allCategories = useMemo(() => {
    const fromAtoms = Array.from(new Set(microPresentations.map((mp) => mp.category).filter(Boolean)));
    const sorted = fromAtoms.filter((c) => c !== ALWAYS_SHOWN_CATEGORY).sort();
    return [ALWAYS_SHOWN_CATEGORY, ...sorted];
  }, [microPresentations]);

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const handleAdd = () => {
    const mp: MicroPresentation = {
      id: newId(),
      title: 'Новый атом знаний',
      content: '',
      category: '',
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

      {/* Filters — compact single row */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-calidad-blue bg-white text-gray-600 font-semibold"
        >
          <option value="">Все темы</option>
          {allCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select
          value={filterPublished}
          onChange={(e) => setFilterPublished(e.target.value as 'all' | 'published' | 'drafts')}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-calidad-blue bg-white text-gray-600 font-semibold"
        >
          <option value="all">Все статусы</option>
          <option value="published">Опубликованные</option>
          <option value="drafts">Черновики AI</option>
        </select>
        <select
          value={filterMachineTypeId}
          onChange={(e) => setFilterMachineTypeId(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-calidad-blue bg-white text-gray-600 font-semibold"
        >
          <option value="">Все типы станков</option>
          {machineTypes.map((mt) => <option key={mt.id} value={mt.id}>{mt.name}</option>)}
        </select>
      </div>

      {/* Grouped by category when no specific category filter active */}
      {(filterCategory ? [filterCategory] : allCategories).map((cat) => {
        const group = filtered.filter((mp) => mp.category === cat);
        if (group.length === 0) return null;
        return (
          <div key={cat}>
            {!filterCategory && (
              <div className={`flex items-center gap-2 px-2 py-1 rounded-lg mb-1 ${CATEGORY_COLORS[cat] ?? 'bg-gray-100 text-gray-600'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest flex-1">{cat}</span>
                <span className="text-[10px] font-bold opacity-60">{group.length}</span>
              </div>
            )}
            {group.map((mp) => (
              <div
                key={mp.id}
                className={`bg-white rounded-xl border overflow-hidden mb-2 ${mp.isPublished === false ? 'border-amber-300' : 'border-gray-200'}`}
              >
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggle(mp.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {filterCategory && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${CATEGORY_COLORS[mp.category] ?? 'bg-gray-100 text-gray-600'}`}>
                          {mp.category}
                        </span>
                      )}
                      {mp.isPublished === false && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                          <AlertTriangle size={10} /> AI-черновик
                        </span>
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
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Тема атома
                    {mp.category === ALWAYS_SHOWN_CATEGORY && (
                      <span className="ml-2 normal-case font-normal text-yellow-600">— показывается менеджеру всегда</span>
                    )}
                  </label>
                  <input
                    list={`cats-${mp.id}`}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-calidad-blue"
                    value={mp.category}
                    onChange={(e) => updateMicroPresentation(mp.id, { category: e.target.value })}
                    placeholder="Например: Охлаждение, Цена, Материалы..."
                  />
                  <datalist id={`cats-${mp.id}`}>
                    {allCategories.map((c) => <option key={c} value={c} />)}
                  </datalist>
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

              {/* ── Slot Conditions (адаптивная фильтрация) ── */}
              <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                <label className="text-xs font-bold text-green-700 block mb-1 flex items-center gap-1.5">
                  <Zap size={12} /> УСЛОВИЯ СЛОТОВ
                  <span className="font-normal text-green-500 ml-1">
                    — МП появляется автоматически когда менеджер заполнил слот
                  </span>
                </label>

                {/* Существующие условия */}
                {Object.keys(mp.slotConditions ?? {}).length > 0 && (
                  <div className="space-y-1 mb-2">
                    {Object.entries(mp.slotConditions ?? {}).map(([key, values]) => {
                      const slotLabel = allSlotOptions.find((s) => s.key === key)?.label ?? key;
                      return (
                        <div key={key} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-green-200">
                          <span className="text-[10px] font-bold text-green-700 flex-shrink-0">{slotLabel}:</span>
                          <span className="text-[10px] text-gray-600 flex-1">{values.join(', ')}</span>
                          <button
                            onClick={() => {
                              const next = { ...(mp.slotConditions ?? {}) };
                              delete next[key];
                              updateMicroPresentation(mp.id, { slotConditions: Object.keys(next).length ? next : undefined });
                            }}
                            className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Добавить условие */}
                <div className="flex gap-1.5">
                  <select
                    className="text-[10px] border border-green-200 rounded-lg px-1.5 py-1 focus:outline-none focus:border-green-400 bg-white"
                    value={condKey[mp.id] ?? ''}
                    onChange={(e) => setCondKey((p) => ({ ...p, [mp.id]: e.target.value }))}
                  >
                    <option value="">Слот...</option>
                    {allSlotOptions.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                  <input
                    className="flex-1 text-[10px] border border-green-200 rounded-lg px-1.5 py-1 focus:outline-none focus:border-green-400 bg-white min-w-0"
                    placeholder="акрил, пвх, дерево..."
                    value={condValues[mp.id] ?? ''}
                    onChange={(e) => setCondValues((p) => ({ ...p, [mp.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const k = condKey[mp.id]; const v = condValues[mp.id];
                        if (!k || !v?.trim()) return;
                        const vals = v.split(',').map((x) => x.trim()).filter(Boolean);
                        updateMicroPresentation(mp.id, {
                          slotConditions: { ...(mp.slotConditions ?? {}), [k]: vals }
                        });
                        setCondKey((p) => ({ ...p, [mp.id]: '' }));
                        setCondValues((p) => ({ ...p, [mp.id]: '' }));
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const k = condKey[mp.id]; const v = condValues[mp.id];
                      if (!k || !v?.trim()) return;
                      const vals = v.split(',').map((x) => x.trim()).filter(Boolean);
                      updateMicroPresentation(mp.id, {
                        slotConditions: { ...(mp.slotConditions ?? {}), [k]: vals }
                      });
                      setCondKey((p) => ({ ...p, [mp.id]: '' }));
                      setCondValues((p) => ({ ...p, [mp.id]: '' }));
                    }}
                    disabled={!condKey[mp.id] || !condValues[mp.id]?.trim()}
                    className="text-[10px] px-2 py-1 bg-green-600 text-white rounded-lg font-bold disabled:opacity-40 hover:bg-green-700 transition-colors flex-shrink-0"
                  >
                    + Добавить
                  </button>
                </div>
                <p className="text-[9px] text-green-500 mt-1">
                  Введи значения через запятую. Совпадение частичное — «акрил» найдёт «акрил 10мм».
                </p>
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
          </div>
        );
      })}

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
