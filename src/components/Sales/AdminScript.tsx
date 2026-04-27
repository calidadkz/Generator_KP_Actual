import React, { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { ScriptNode } from '../../types';

function newId() {
  return 'step-' + Date.now().toString(36);
}

const SCRIPT_CATEGORIES = ['Открытие', 'Квалификация', 'Возражения', 'Закрытие', 'Общее'];

const CATEGORY_COLORS: Record<string, string> = {
  'Открытие':      'bg-green-100 text-green-700',
  'Квалификация':  'bg-blue-100 text-blue-700',
  'Возражения':    'bg-orange-100 text-orange-700',
  'Закрытие':      'bg-purple-100 text-purple-700',
  'Формулировки':  'bg-indigo-100 text-indigo-700',
  'Общее':         'bg-gray-100 text-gray-600',
};

export const AdminScript: React.FC = () => {
  const { scriptNodes, microPresentations, addScriptNode, updateScriptNode, deleteScriptNode, saveScriptNodes } =
    useSalesStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const sorted = [...scriptNodes].sort((a, b) => a.order - b.order);

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const handleAdd = () => {
    const maxOrder = sorted.length > 0 ? sorted[sorted.length - 1].order : 0;
    const node: ScriptNode = {
      id: newId(),
      order: maxOrder + 1,
      title: 'Новый этап',
      content: '',
      tips: [],
    };
    addScriptNode(node);
    setExpanded((p) => ({ ...p, [node.id]: true }));
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const updated = [...sorted];
    const tmp = updated[idx - 1].order;
    const a = { ...updated[idx - 1], order: updated[idx].order };
    const b = { ...updated[idx], order: tmp };
    saveScriptNodes(sorted.map((n) => (n.id === a.id ? a : n.id === b.id ? b : n)));
  };

  const moveDown = (idx: number) => {
    if (idx === sorted.length - 1) return;
    const tmp = sorted[idx + 1].order;
    const a = { ...sorted[idx + 1], order: sorted[idx].order };
    const b = { ...sorted[idx], order: tmp };
    saveScriptNodes(sorted.map((n) => (n.id === a.id ? a : n.id === b.id ? b : n)));
  };

  const updateTip = (id: string, tips: string[], idx: number, val: string) => {
    const next = [...tips];
    next[idx] = val;
    updateScriptNode(id, { tips: next });
  };

  const addTip = (id: string, tips: string[]) =>
    updateScriptNode(id, { tips: [...tips, ''] });

  const removeTip = (id: string, tips: string[], idx: number) =>
    updateScriptNode(id, { tips: tips.filter((_, i) => i !== idx) });

  const toggleMpLink = (nodeId: string, currentIds: string[], mpId: string) => {
    const next = currentIds.includes(mpId)
      ? currentIds.filter((x) => x !== mpId)
      : [...currentIds, mpId];
    updateScriptNode(nodeId, { microPresentationIds: next });
  };

  // Drag-and-drop handlers
  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  };
  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const srcIdx = sorted.findIndex((n) => n.id === dragId);
    const tgtIdx = sorted.findIndex((n) => n.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const reordered = [...sorted];
    const [removed] = reordered.splice(srcIdx, 1);
    reordered.splice(tgtIdx, 0, removed);
    saveScriptNodes(reordered.map((n, i) => ({ ...n, order: i + 1 })));
    setDragId(null);
    setDragOverId(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Скрипт продаж</h3>
          <p className="text-xs text-gray-400 mt-0.5">{sorted.length} этапов</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-calidad-blue text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors"
        >
          <Plus size={14} /> Добавить этап
        </button>
      </div>

      {sorted.map((node, idx) => (
        <div
          key={node.id}
          draggable
          onDragStart={() => handleDragStart(node.id)}
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDrop={() => handleDrop(node.id)}
          onDragEnd={() => { setDragId(null); setDragOverId(null); }}
          className={`bg-white rounded-xl border overflow-hidden transition-all ${
            dragOverId === node.id ? 'border-calidad-blue shadow-lg' : 'border-gray-200'
          }`}
        >
          <div
            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50"
            onClick={() => toggle(node.id)}
          >
            <div className="cursor-grab text-gray-300 hover:text-gray-500" onClick={(e) => e.stopPropagation()}>
              <GripVertical size={16} />
            </div>
            <div className="w-7 h-7 rounded-full bg-calidad-blue text-white text-xs font-black flex items-center justify-center flex-shrink-0">
              {idx + 1}
            </div>
            <input
              className="flex-1 text-sm font-semibold text-gray-800 bg-transparent outline-none"
              value={node.title}
              onChange={(e) => updateScriptNode(node.id, { title: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              placeholder="Название этапа"
            />
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30 transition-colors"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => moveDown(idx)}
                disabled={idx === sorted.length - 1}
                className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30 transition-colors"
              >
                <ChevronDown size={14} />
              </button>
              <button
                onClick={() => deleteScriptNode(node.id)}
                className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {expanded[node.id] ? (
              <ChevronUp size={14} className="text-gray-400" />
            ) : (
              <ChevronDown size={14} className="text-gray-400" />
            )}
          </div>

          {expanded[node.id] && (
            <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
              <div className="pt-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Категория этапа
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SCRIPT_CATEGORIES.map((cat) => {
                    const active = node.category === cat;
                    const color = CATEGORY_COLORS[cat] ?? 'bg-gray-100 text-gray-600';
                    return (
                      <button
                        key={cat}
                        onClick={() => updateScriptNode(node.id, { category: active ? undefined : cat })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors border ${
                          active
                            ? color + ' ring-2 ring-offset-1 ring-current'
                            : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Текст скрипта / подсказки менеджеру
                </label>
                <textarea
                  className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:border-calidad-blue"
                  rows={4}
                  value={node.content}
                  onChange={(e) => updateScriptNode(node.id, { content: e.target.value })}
                  placeholder="Текст скрипта для этого этапа..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Советы (tips)
                  </label>
                  <button
                    onClick={() => addTip(node.id, node.tips ?? [])}
                    className="text-xs text-calidad-blue font-bold hover:underline"
                  >
                    + Добавить совет
                  </button>
                </div>
                {(node.tips ?? []).map((tip, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs text-gray-400 w-4 text-right flex-shrink-0">{i + 1}.</span>
                    <input
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-calidad-blue"
                      value={tip}
                      onChange={(e) => updateTip(node.id, node.tips ?? [], i, e.target.value)}
                      placeholder="Совет для менеджера..."
                    />
                    <button
                      onClick={() => removeTip(node.id, node.tips ?? [], i)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {(node.tips ?? []).length === 0 && (
                  <p className="text-xs text-gray-400 italic">Нет советов</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Мини-презентации для этого этапа
                  </label>
                  <span className="text-[10px] text-gray-400">
                    показываются в Cockpit при активации · {(node.microPresentationIds ?? []).length} выбрано
                  </span>
                </div>
                {microPresentations.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Нет мини-презентаций в библиотеке</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {microPresentations.map((mp) => {
                      const linked = (node.microPresentationIds ?? []).includes(mp.id);
                      const colorClass = linked
                        ? 'bg-calidad-blue text-white'
                        : (CATEGORY_COLORS[mp.category] ?? 'bg-gray-100 text-gray-500') + ' hover:opacity-80';
                      return (
                        <button
                          key={mp.id}
                          onClick={() => toggleMpLink(node.id, node.microPresentationIds ?? [], mp.id)}
                          title={mp.content.slice(0, 120)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${colorClass}`}
                        >
                          {mp.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {sorted.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Скрипт пуст. Добавьте первый этап.</p>
        </div>
      )}
    </div>
  );
};
