import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, CheckCircle, Circle, Cpu, BookText } from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { MicroPresentation, ScriptNode } from '../../types';

const CATEGORY_COLORS: Record<string, string> = {
  'Открытие':      'bg-green-100 text-green-700 border-green-200',
  'Квалификация':  'bg-blue-100 text-blue-700 border-blue-200',
  'Возражения':    'bg-orange-100 text-orange-700 border-orange-200',
  'Закрытие':      'bg-purple-100 text-purple-700 border-purple-200',
  'Общее':         'bg-gray-100 text-gray-600 border-gray-200',
};

interface ManagerCockpitProps {
  onBack: () => void;
}

export const ManagerCockpit: React.FC<ManagerCockpitProps> = ({ onBack }) => {
  const { machineTypes, scriptNodes, microPresentations } = useSalesStore();

  const [clientMachineTypeIds, setClientMachineTypeIds] = useState<string[]>([]);
  const [focusMachineTypeId, setFocusMachineTypeId] = useState<string | null>(null);
  const [completedMachineTypeIds, setCompletedMachineTypeIds] = useState<string[]>([]);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(new Set());
  const [expandedStepIds, setExpandedStepIds] = useState<Set<string>>(new Set());
  const [expandedMpIds, setExpandedMpIds] = useState<Set<string>>(new Set());

  const sorted: ScriptNode[] = [...scriptNodes]
    .filter((n) => !focusMachineTypeId || !n.machineTypeIds?.length || n.machineTypeIds.includes(focusMachineTypeId))
    .sort((a, b) => a.order - b.order);

  const total = sorted.length;
  const done = sorted.filter((n) => completedStepIds.has(n.id)).length;
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

  const currentStep = currentStepId ? sorted.find((n) => n.id === currentStepId) ?? null : null;

  const ALWAYS_SHOWN_CATEGORIES = new Set(['Общее', 'Формулировки']);

  const matchesMachineType = (mp: MicroPresentation) =>
    !focusMachineTypeId || !mp.machineTypeIds?.length || mp.machineTypeIds.includes(focusMachineTypeId);

  const relevantMps = (step: ScriptNode | null): MicroPresentation[] => {
    // No step selected — show only neutral categories
    if (!step) {
      return microPresentations.filter(
        (mp) => ALWAYS_SHOWN_CATEGORIES.has(mp.category) && matchesMachineType(mp),
      );
    }

    // Step has explicit MP links — show only those
    const linked = step.microPresentationIds ?? [];
    if (linked.length > 0) {
      return microPresentations.filter((mp) => linked.includes(mp.id) && matchesMachineType(mp));
    }

    // Derive next step category for transitional MPs
    const currentIdx = sorted.findIndex((n) => n.id === step.id);
    const nextStep = currentIdx >= 0 ? sorted[currentIdx + 1] : null;
    const relevantCategories = new Set<string>(ALWAYS_SHOWN_CATEGORIES);
    if (step.category) relevantCategories.add(step.category);
    if (nextStep?.category) relevantCategories.add(nextStep.category);

    return microPresentations.filter(
      (mp) => relevantCategories.has(mp.category) && matchesMachineType(mp),
    );
  };

  const toggleStep = (id: string) => {
    setExpandedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setCurrentStepId(id);
  };

  const toggleDone = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCompletedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleMp = (id: string) => {
    setExpandedMpIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleReset = () => {
    setClientMachineTypeIds([]);
    setFocusMachineTypeId(null);
    setCompletedMachineTypeIds([]);
    setCurrentStepId(null);
    setCompletedStepIds(new Set());
    setExpandedStepIds(new Set());
  };

  const mps = relevantMps(currentStep);

  // Auto-complete machine type when all steps are done
  React.useEffect(() => {
    if (
      focusMachineTypeId &&
      progressPct === 100 &&
      !completedMachineTypeIds.includes(focusMachineTypeId)
    ) {
      setCompletedMachineTypeIds((prev) => [...prev, focusMachineTypeId]);
      // Move to next uncompleted machine type, if any
      const nextIncomplete = clientMachineTypeIds.find(
        (mtId) => !completedMachineTypeIds.concat(focusMachineTypeId).includes(mtId)
      );
      if (nextIncomplete) {
        setFocusMachineTypeId(nextIncomplete);
        setCompletedStepIds(new Set());
      }
    }
  }, [progressPct, focusMachineTypeId, completedMachineTypeIds, clientMachineTypeIds]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 font-bold text-xs transition-colors"
          >
            <ArrowLeft size={14} /> Назад
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-calidad-blue">
              CALIDAD <span className="text-calidad-red">COCKPIT</span>
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Скрипт продаж в режиме реального времени
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-500 font-bold text-xs transition-colors"
          >
            Новый звонок
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-calidad-blue rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs font-bold text-gray-500 w-14 text-right">
            {done}/{total} ({progressPct}%)
          </span>
        </div>
      </header>

      {/* Main content: split layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Script */}
        <div className="w-[60%] flex flex-col border-r border-gray-200 overflow-hidden">
          {/* Machine type selector — two phases */}
          {clientMachineTypeIds.length === 0 ? (
            /* Phase 1: Select client's machines */
            <div className="bg-white border-b border-gray-100 px-5 py-4 flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <Cpu size={14} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Какие станки у клиента?</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {machineTypes.map((mt) => (
                  <button
                    key={mt.id}
                    onClick={() => setClientMachineTypeIds((prev) =>
                      prev.includes(mt.id) ? prev.filter((x) => x !== mt.id) : [...prev, mt.id]
                    )}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      clientMachineTypeIds.includes(mt.id)
                        ? 'bg-calidad-blue text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {mt.name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  if (clientMachineTypeIds.length > 0) {
                    setFocusMachineTypeId(clientMachineTypeIds[0]);
                  }
                }}
                disabled={clientMachineTypeIds.length === 0}
                className={`w-full px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  clientMachineTypeIds.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-calidad-blue text-white hover:bg-blue-800'
                }`}
              >
                Начать звонок
              </button>
            </div>
          ) : (
            /* Phase 2: During call — show client's machines + focus selector */
            <div className="bg-white border-b border-gray-100 px-5 py-3 flex-shrink-0">
              <div className="mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">У клиента:</p>
                <div className="flex flex-wrap gap-1.5">
                  {clientMachineTypeIds.map((mtId) => {
                    const isCompleted = completedMachineTypeIds.includes(mtId);
                    return (
                      <button
                        key={mtId}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          isCompleted
                            ? 'bg-green-100 text-green-700 opacity-70'
                            : focusMachineTypeId === mtId
                            ? 'bg-calidad-blue text-white'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                        onClick={() => {
                          if (!isCompleted) setFocusMachineTypeId(mtId);
                        }}
                      >
                        {isCompleted ? '✓ ' : ''}{machineTypes.find((mt) => mt.id === mtId)?.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Прорабатываем:</p>
                <select
                  value={focusMachineTypeId ?? ''}
                  onChange={(e) => setFocusMachineTypeId(e.target.value || null)}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-bold bg-white focus:outline-none focus:border-calidad-blue"
                >
                  <option value="">Выберите тип...</option>
                  {clientMachineTypeIds
                    .filter((mtId) => !completedMachineTypeIds.includes(mtId))
                    .map((mtId) => {
                      const mt = machineTypes.find((m) => m.id === mtId);
                      return (
                        <option key={mtId} value={mtId}>
                          {mt?.name}
                        </option>
                      );
                    })}
                </select>
              </div>
            </div>
          )}

          {/* Script steps */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {sorted.map((node, idx) => {
              const isDone = completedStepIds.has(node.id);
              const isCurrent = currentStepId === node.id;
              const isExpanded = expandedStepIds.has(node.id);

              return (
                <div
                  key={node.id}
                  className={`rounded-xl border overflow-hidden transition-all cursor-pointer ${
                    isCurrent
                      ? 'border-calidad-blue shadow-md shadow-blue-100'
                      : isDone
                      ? 'border-green-200 bg-green-50/30 opacity-70'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                  onClick={() => toggleStep(node.id)}
                >
                  <div className="flex items-center gap-3 p-4">
                    {/* Done toggle */}
                    <button
                      onClick={(e) => toggleDone(e, node.id)}
                      className="flex-shrink-0 transition-colors"
                    >
                      {isDone ? (
                        <CheckCircle size={20} className="text-green-500" />
                      ) : (
                        <Circle size={20} className={isCurrent ? 'text-calidad-blue' : 'text-gray-300'} />
                      )}
                    </button>

                    {/* Step number + title */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                        isCurrent
                          ? 'bg-calidad-blue text-white'
                          : isDone
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={`flex-1 text-sm font-bold ${
                        isCurrent ? 'text-calidad-blue' : isDone ? 'text-gray-400 line-through' : 'text-gray-800'
                      }`}
                    >
                      {node.title}
                    </span>

                    {isExpanded ? (
                      <ChevronUp size={14} className="text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                    )}
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      {/* Script text */}
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {node.content}
                        </p>
                      </div>

                      {/* Tips */}
                      {(node.tips ?? []).length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Советы</p>
                          <ul className="space-y-1">
                            {(node.tips ?? []).map((tip, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                                <span className="text-calidad-blue mt-0.5 flex-shrink-0">›</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {sorted.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <BookText size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Скрипт пуст. Добавьте этапы в разделе «Управление скриптом».</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Micro-presentations */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {currentStep ? `Мини-презентации: ${currentStep.title}` : 'Мини-презентации'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {mps.length} блоков
              {!currentStep && ' · Выберите этап чтобы отфильтровать'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {mps.map((mp) => {
              const isExpanded = expandedMpIds.has(mp.id);
              const colorClass = CATEGORY_COLORS[mp.category] ?? CATEGORY_COLORS['Общее'];

              return (
                <div
                  key={mp.id}
                  className={`rounded-xl border overflow-hidden cursor-pointer transition-all ${colorClass} hover:shadow-sm`}
                  onClick={() => toggleMp(mp.id)}
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold opacity-70">{mp.category}</span>
                        {(mp.tags ?? []).slice(0, 2).map((tag) => (
                          <span key={tag} className="text-[9px] opacity-60">#{tag}</span>
                        ))}
                      </div>
                      <p className="text-xs font-bold truncate">{mp.title}</p>
                      {!isExpanded && (
                        <p className="text-xs opacity-70 mt-0.5 line-clamp-1">{mp.content}</p>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp size={13} className="flex-shrink-0 opacity-60" /> : <ChevronDown size={13} className="flex-shrink-0 opacity-60" />}
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-current border-opacity-20">
                      <p className="text-xs leading-relaxed mt-2 whitespace-pre-wrap">{mp.content}</p>
                    </div>
                  )}
                </div>
              );
            })}

            {mps.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">
                  {currentStep
                    ? 'Нет мини-презентаций для этого этапа'
                    : 'Нет мини-презентаций'}
                </p>
                <p className="text-xs mt-1">Добавьте блоки в разделе «Управление скриптом»</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
