import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { MachineType, ScriptNode, MicroPresentation } from '../../types';

export const HolisticLibraryView: React.FC = () => {
  const { machineTypes, scriptNodes, microPresentations } = useSalesStore();
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['universal']));

  const toggle = (typeId: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeId)) {
        next.delete(typeId);
      } else {
        next.add(typeId);
      }
      return next;
    });
  };

  const getRelevantNodes = (mt: MachineType | null): ScriptNode[] => {
    if (!mt) {
      // Universal: nodes with no machineTypeIds restriction
      return scriptNodes.filter((n) => !n.machineTypeIds || n.machineTypeIds.length === 0);
    }
    // Nodes for this type OR universal nodes
    return scriptNodes.filter((n) => !n.machineTypeIds || n.machineTypeIds.length === 0 || n.machineTypeIds.includes(mt.id));
  };

  const getRelevantMps = (mt: MachineType | null): MicroPresentation[] => {
    if (!mt) {
      return microPresentations.filter((mp) => !mp.machineTypeIds || mp.machineTypeIds.length === 0);
    }
    return microPresentations.filter((mp) => !mp.machineTypeIds || mp.machineTypeIds.length === 0 || mp.machineTypeIds.includes(mt.id));
  };

  const nodeIsUniversal = (node: ScriptNode): boolean => !node.machineTypeIds || node.machineTypeIds.length === 0;
  const mpIsUniversal = (mp: MicroPresentation): boolean => !mp.machineTypeIds || mp.machineTypeIds.length === 0;

  return (
    <div className="space-y-3">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Библиотека по типам станков</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Просмотрите все скриптовые этапы и мини-презентации сгруппированные по типам оборудования
        </p>
      </div>

      {/* Universal section (always first) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
          onClick={() => toggle('universal')}
        >
          <div>
            <h4 className="text-sm font-bold text-gray-800">🌍 Универсальные</h4>
            <p className="text-xs text-gray-400 mt-0.5">Применяются ко всем типам станков</p>
          </div>
          {expandedTypes.has('universal') ? (
            <ChevronUp size={18} className="text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-400" />
          )}
        </div>

        {expandedTypes.has('universal') && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
            {/* Universal nodes */}
            {scriptNodes.filter(nodeIsUniversal).length > 0 && (
              <div>
                <h5 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Этапы</h5>
                <div className="space-y-2">
                  {scriptNodes.filter(nodeIsUniversal).map((node) => (
                    <div key={node.id} className="bg-gray-50 rounded-lg p-3 border-l-4 border-gray-300">
                      <p className="text-sm font-semibold text-gray-800">{node.title}</p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{node.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Universal MPs */}
            {microPresentations.filter(mpIsUniversal).length > 0 && (
              <div>
                <h5 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Мини-презентации</h5>
                <div className="space-y-2">
                  {microPresentations.filter(mpIsUniversal).map((mp) => (
                    <div key={mp.id} className="bg-gray-50 rounded-lg p-3 border-l-4 border-indigo-300">
                      <div className="flex items-start gap-2 justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">{mp.title}</p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{mp.content}</p>
                        </div>
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
                          {mp.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Per-type sections */}
      {machineTypes.map((mt) => {
        const nodes = getRelevantNodes(mt);
        const mps = getRelevantMps(mt);
        return (
          <div key={mt.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => toggle(mt.id)}
            >
              <div>
                <h4 className="text-sm font-bold text-gray-800">{mt.name}</h4>
                {mt.description && (
                  <p className="text-xs text-gray-400 mt-0.5">{mt.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">
                  {nodes.length} этапов · {mps.length} МП
                </span>
                {expandedTypes.has(mt.id) ? (
                  <ChevronUp size={18} className="text-gray-400" />
                ) : (
                  <ChevronDown size={18} className="text-gray-400" />
                )}
              </div>
            </div>

            {expandedTypes.has(mt.id) && (
              <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
                {/* Nodes for this type */}
                {nodes.length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Этапы</h5>
                    <div className="space-y-2">
                      {nodes.map((node) => {
                        const isUniv = nodeIsUniversal(node);
                        return (
                          <div
                            key={node.id}
                            className={`rounded-lg p-3 border-l-4 ${
                              isUniv
                                ? 'bg-gray-50 border-gray-300'
                                : 'bg-blue-50 border-blue-300'
                            }`}
                          >
                            <p className="text-sm font-semibold text-gray-800">{node.title}</p>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{node.content}</p>
                            {isUniv && (
                              <span className="text-[10px] text-gray-500 mt-2 inline-block">Универсальный</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* MPs for this type */}
                {mps.length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Мини-презентации</h5>
                    <div className="space-y-2">
                      {mps.map((mp) => {
                        const isUniv = mpIsUniversal(mp);
                        return (
                          <div
                            key={mp.id}
                            className={`rounded-lg p-3 border-l-4 ${
                              isUniv
                                ? 'bg-gray-50 border-gray-300'
                                : 'bg-indigo-50 border-indigo-300'
                            }`}
                          >
                            <div className="flex items-start gap-2 justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-800">{mp.title}</p>
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{mp.content}</p>
                                {isUniv && (
                                  <span className="text-[10px] text-gray-500 mt-2 inline-block">Универсальная</span>
                                )}
                              </div>
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
                                {mp.category}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
