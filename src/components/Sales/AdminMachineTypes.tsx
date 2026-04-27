import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { MachineType } from '../../types';

function newId() {
  return 'mt-' + Date.now().toString(36);
}

export const AdminMachineTypes: React.FC = () => {
  const { machineTypes, addMachineType, updateMachineType, deleteMachineType } = useSalesStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const handleAdd = () => {
    const t: MachineType = { id: newId(), name: 'Новый тип станка', description: '', qualifiers: [] };
    addMachineType(t);
    setExpanded((p) => ({ ...p, [t.id]: true }));
  };

  const handleQualifierChange = (id: string, qualifiers: string[], idx: number, val: string) => {
    const updated = [...qualifiers];
    updated[idx] = val;
    updateMachineType(id, { qualifiers: updated });
  };

  const addQualifier = (id: string, qualifiers: string[]) =>
    updateMachineType(id, { qualifiers: [...qualifiers, ''] });

  const removeQualifier = (id: string, qualifiers: string[], idx: number) =>
    updateMachineType(id, { qualifiers: qualifiers.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Типы станков</h3>
          <p className="text-xs text-gray-400 mt-0.5">{machineTypes.length} позиций</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-calidad-blue text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors"
        >
          <Plus size={14} /> Добавить
        </button>
      </div>

      {machineTypes.map((mt) => (
        <div key={mt.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div
            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50"
            onClick={() => toggle(mt.id)}
          >
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-black text-calidad-blue">ЧПУ</span>
            </div>
            <input
              className="flex-1 text-sm font-semibold text-gray-800 bg-transparent outline-none"
              value={mt.name}
              onChange={(e) => updateMachineType(mt.id, { name: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              placeholder="Название типа"
            />
            <button
              onClick={(e) => { e.stopPropagation(); deleteMachineType(mt.id); }}
              className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
            >
              <Trash2 size={15} />
            </button>
            {expanded[mt.id] ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
          </div>

          {expanded[mt.id] && (
            <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
              <div className="pt-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Описание</label>
                <textarea
                  className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:border-calidad-blue"
                  rows={2}
                  value={mt.description ?? ''}
                  onChange={(e) => updateMachineType(mt.id, { description: e.target.value })}
                  placeholder="Краткое описание применения..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Квалификационные вопросы</label>
                  <button
                    onClick={() => addQualifier(mt.id, mt.qualifiers ?? [])}
                    className="text-xs text-calidad-blue font-bold hover:underline"
                  >
                    + Добавить
                  </button>
                </div>
                {(mt.qualifiers ?? []).map((q, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <input
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-calidad-blue"
                      value={q}
                      onChange={(e) => handleQualifierChange(mt.id, mt.qualifiers ?? [], i, e.target.value)}
                      placeholder="Вопрос для определения типа..."
                    />
                    <button
                      onClick={() => removeQualifier(mt.id, mt.qualifiers ?? [], i)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {(mt.qualifiers ?? []).length === 0 && (
                  <p className="text-xs text-gray-400 italic">Нет квалификационных вопросов</p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {machineTypes.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Нет типов станков. Добавьте первый.</p>
        </div>
      )}
    </div>
  );
};
