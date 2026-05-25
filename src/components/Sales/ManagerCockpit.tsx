import React, { useState } from 'react';
import {
  ArrowLeft, ChevronDown, ChevronUp, CheckCircle, Circle, Cpu,
  BookText, Settings, AlertTriangle, X, Send,
} from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { MicroPresentation, ScriptNode, FeedbackNote } from '../../types';

const CATEGORY_COLORS: Record<string, string> = {
  'Открытие':      'bg-green-100 text-green-700 border-green-200',
  'Квалификация':  'bg-blue-100 text-blue-700 border-blue-200',
  'Возражения':    'bg-orange-100 text-orange-700 border-orange-200',
  'Закрытие':      'bg-purple-100 text-purple-700 border-purple-200',
  'Общее':         'bg-gray-100 text-gray-600 border-gray-200',
};

interface QualSlot {
  key: string;
  label: string;
  value: string;
  status: 'empty' | 'filled' | 'pending';
}

interface ManagerCockpitProps {
  onBack: () => void;
}

export const ManagerCockpit: React.FC<ManagerCockpitProps> = ({ onBack }) => {
  const { machineTypes, scriptNodes, microPresentations, addFeedbackNote } = useSalesStore();

  const [clientMachineTypeIds, setClientMachineTypeIds] = useState<string[]>([]);
  const [focusMachineTypeId, setFocusMachineTypeId] = useState<string | null>(null);
  const [completedMachineTypeIds, setCompletedMachineTypeIds] = useState<string[]>([]);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(new Set());
  const [expandedStepIds, setExpandedStepIds] = useState<Set<string>>(new Set());
  const [expandedMpIds, setExpandedMpIds] = useState<Set<string>>(new Set());

  // Qualification slots
  const [slots, setSlots] = useState<Record<string, string>>({});
  const [pendingSlots, setPendingSlots] = useState<Set<string>>(new Set());

  // Gear note modal
  const [gearOpen, setGearOpen] = useState(false);
  const [gearText, setGearText] = useState('');
  const [gearUrgent, setGearUrgent] = useState(false);
  const [gearSent, setGearSent] = useState(false);

  const DEFAULT_SLOTS: QualSlot[] = [
    { key: 'material',   label: 'Материал',           value: slots['material'] ?? '',   status: slots['material'] ? 'filled' : pendingSlots.has('material') ? 'pending' : 'empty' },
    { key: 'thickness',  label: 'Толщина / размер',    value: slots['thickness'] ?? '',  status: slots['thickness'] ? 'filled' : pendingSlots.has('thickness') ? 'pending' : 'empty' },
    { key: 'workArea',   label: 'Рабочее поле',        value: slots['workArea'] ?? '',   status: slots['workArea'] ? 'filled' : pendingSlots.has('workArea') ? 'pending' : 'empty' },
    { key: 'volume',     label: 'Объём / серийность',  value: slots['volume'] ?? '',     status: slots['volume'] ? 'filled' : pendingSlots.has('volume') ? 'pending' : 'empty' },
    { key: 'power',      label: 'Питание',             value: slots['power'] ?? '',      status: slots['power'] ? 'filled' : pendingSlots.has('power') ? 'pending' : 'empty' },
    { key: 'budget',     label: 'Бюджет',              value: slots['budget'] ?? '',     status: slots['budget'] ? 'filled' : pendingSlots.has('budget') ? 'pending' : 'empty' },
  ];

  const sorted: ScriptNode[] = [...scriptNodes]
    .filter((n) => !focusMachineTypeId || !n.machineTypeIds?.length || n.machineTypeIds.includes(focusMachineTypeId))
    .filter((n) => !n.scriptType || n.scriptType === 'qualification')
    .sort((a, b) => a.order - b.order);

  const total = sorted.length;
  const done = sorted.filter((n) => completedStepIds.has(n.id)).length;
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

  const currentStep = currentStepId ? sorted.find((n) => n.id === currentStepId) ?? null : null;

  const ALWAYS_SHOWN_CATEGORIES = new Set(['Общее', 'Формулировки']);

  const matchesMachineType = (mp: MicroPresentation) =>
    !focusMachineTypeId || !mp.machineTypeIds?.length || mp.machineTypeIds.includes(focusMachineTypeId);

  const isPublishedMp = (mp: MicroPresentation) => mp.isPublished !== false;

  const relevantMps = (step: ScriptNode | null): MicroPresentation[] => {
    const base = microPresentations.filter((mp) => matchesMachineType(mp) && isPublishedMp(mp));

    if (!step) {
      return base.filter((mp) => ALWAYS_SHOWN_CATEGORIES.has(mp.category));
    }

    const linked = step.microPresentationIds ?? [];
    if (linked.length > 0) {
      return base.filter((mp) => linked.includes(mp.id));
    }

    const currentIdx = sorted.findIndex((n) => n.id === step.id);
    const nextStep = currentIdx >= 0 ? sorted[currentIdx + 1] : null;
    const relevantCategories = new Set<string>(ALWAYS_SHOWN_CATEGORIES);
    if (step.category) relevantCategories.add(step.category);
    if (nextStep?.category) relevantCategories.add(nextStep.category);

    return base.filter((mp) => relevantCategories.has(mp.category));
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
    setSlots({});
    setPendingSlots(new Set());
  };

  const handleSlotChange = (key: string, value: string) => {
    setSlots((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSlotPending = (key: string) => {
    setPendingSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleGearSubmit = () => {
    if (!gearText.trim()) return;
    const note: FeedbackNote = {
      id: 'note-' + Date.now().toString(36),
      authorId: 'manager',
      text: gearText.trim(),
      isPrivate: false,
      isUrgent: gearUrgent,
      autoContext: {
        source: 'cockpit',
        scriptType: 'qualification',
        stageName: currentStep?.title,
        machineTypeId: focusMachineTypeId ?? undefined,
        scriptNodeId: currentStepId ?? undefined,
      },
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    addFeedbackNote(note);
    setGearText('');
    setGearUrgent(false);
    setGearSent(true);
    setTimeout(() => { setGearSent(false); setGearOpen(false); }, 1500);
  };

  React.useEffect(() => {
    if (
      focusMachineTypeId &&
      progressPct === 100 &&
      !completedMachineTypeIds.includes(focusMachineTypeId)
    ) {
      setCompletedMachineTypeIds((prev) => [...prev, focusMachineTypeId]);
      const nextIncomplete = clientMachineTypeIds.find(
        (mtId) => !completedMachineTypeIds.concat(focusMachineTypeId).includes(mtId)
      );
      if (nextIncomplete) {
        setFocusMachineTypeId(nextIncomplete);
        setCompletedStepIds(new Set());
      }
    }
  }, [progressPct, focusMachineTypeId, completedMachineTypeIds, clientMachineTypeIds]);

  const mps = relevantMps(currentStep);

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

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Script + Slots */}
        <div className="w-[55%] flex flex-col border-r border-gray-200 overflow-hidden">

          {/* Phase 1: select machine types */}
          {clientMachineTypeIds.length === 0 ? (
            <div className="bg-white border-b border-gray-100 px-5 py-4 flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <Cpu size={14} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Какие станки интересуют клиента?</span>
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
                  if (clientMachineTypeIds.length > 0) setFocusMachineTypeId(clientMachineTypeIds[0]);
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
            /* Phase 2: machine tabs + qualification slots */
            <div className="bg-white border-b border-gray-100 flex-shrink-0">
              {/* Machine type tabs */}
              <div className="px-4 pt-3 pb-0 flex gap-1.5">
                {clientMachineTypeIds.map((mtId) => {
                  const isCompleted = completedMachineTypeIds.includes(mtId);
                  const mt = machineTypes.find((m) => m.id === mtId);
                  return (
                    <button
                      key={mtId}
                      onClick={() => { if (!isCompleted) setFocusMachineTypeId(mtId); }}
                      className={`px-3 py-1.5 rounded-t-lg text-xs font-bold border-b-2 transition-colors ${
                        isCompleted
                          ? 'bg-green-50 text-green-600 border-green-300'
                          : focusMachineTypeId === mtId
                          ? 'bg-white text-calidad-blue border-calidad-blue'
                          : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {isCompleted ? '✓ ' : ''}{mt?.name}
                    </button>
                  );
                })}
              </div>

              {/* Qualification slots */}
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Слоты квалификации</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEFAULT_SLOTS.map((slot) => (
                    <div key={slot.key} className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        slot.status === 'filled' ? 'bg-green-500' :
                        slot.status === 'pending' ? 'bg-amber-400' : 'bg-gray-300'
                      }`} />
                      <span className="text-[10px] text-gray-500 w-20 flex-shrink-0">{slot.label}:</span>
                      {slot.status === 'filled' ? (
                        <button
                          className="text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded flex-1 text-left truncate"
                          onClick={() => handleSlotChange(slot.key, '')}
                        >
                          {slot.value}
                        </button>
                      ) : (
                        <div className="flex gap-1 flex-1">
                          <input
                            className="flex-1 text-[10px] border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-calidad-blue min-w-0"
                            placeholder="уточнить..."
                            value={slot.value}
                            onChange={(e) => handleSlotChange(slot.key, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && slot.value) handleSlotChange(slot.key, slot.value);
                            }}
                          />
                          <button
                            onClick={() => toggleSlotPending(slot.key)}
                            className={`text-[9px] px-1 py-0.5 rounded flex-shrink-0 ${
                              pendingSlots.has(slot.key)
                                ? 'bg-amber-100 text-amber-600'
                                : 'bg-gray-100 text-gray-400 hover:bg-amber-50'
                            }`}
                            title="Ждём ответа"
                          >
                            ⏳
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
                    <button onClick={(e) => toggleDone(e, node.id)} className="flex-shrink-0 transition-colors">
                      {isDone ? (
                        <CheckCircle size={20} className="text-green-500" />
                      ) : (
                        <Circle size={20} className={isCurrent ? 'text-calidad-blue' : 'text-gray-300'} />
                      )}
                    </button>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                      isCurrent ? 'bg-calidad-blue text-white' : isDone ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {idx + 1}
                    </div>
                    <span className={`flex-1 text-sm font-bold ${
                      isCurrent ? 'text-calidad-blue' : isDone ? 'text-gray-400 line-through' : 'text-gray-800'
                    }`}>
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
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{node.content}</p>
                      </div>
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

          {/* ⚙️ Gear button — fixed bottom-left */}
          {clientMachineTypeIds.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
              <button
                onClick={() => setGearOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors w-full"
              >
                <Settings size={13} />
                <span>Зафиксировать пробел / заметку</span>
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Micro-presentations (three levels) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {currentStep ? `Атомы знаний: ${currentStep.title}` : 'Атомы знаний'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {mps.length} блоков
              {!currentStep && ' · Выберите этап слева для фильтрации'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {mps.map((mp) => {
              const isExpanded = expandedMpIds.has(mp.id);
              const colorClass = CATEGORY_COLORS[mp.category] ?? CATEGORY_COLORS['Общее'];
              const methodText = mp.methodology || mp.content;

              return (
                <div
                  key={mp.id}
                  className={`rounded-xl border overflow-hidden cursor-pointer transition-all hover:shadow-sm ${colorClass}`}
                  onClick={() => toggleMp(mp.id)}
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-[10px] font-bold opacity-70">{mp.category}</span>
                        {mp.technical && <span className="text-[9px] opacity-60">🔘</span>}
                        {methodText && <span className="text-[9px] opacity-60">💬</span>}
                        {mp.compromise && <span className="text-[9px] opacity-60">💰</span>}
                        {(mp.tags ?? []).slice(0, 2).map((tag) => (
                          <span key={tag} className="text-[9px] opacity-50">#{tag}</span>
                        ))}
                      </div>
                      <p className="text-xs font-bold truncate">{mp.title}</p>
                      {!isExpanded && methodText && (
                        <p className="text-xs opacity-70 mt-0.5 line-clamp-1">{methodText}</p>
                      )}
                    </div>
                    {isExpanded
                      ? <ChevronUp size={13} className="flex-shrink-0 opacity-60" />
                      : <ChevronDown size={13} className="flex-shrink-0 opacity-60" />
                    }
                  </div>

                  {isExpanded && (
                    <div className="border-t border-current border-opacity-20 space-y-2 p-3 pt-2">
                      {mp.technical && (
                        <div className="rounded-lg bg-white/70 p-2.5">
                          <p className="text-[10px] font-bold text-gray-500 mb-1">🔘 ФАКТ</p>
                          <p className="text-xs leading-relaxed whitespace-pre-wrap">{mp.technical}</p>
                        </div>
                      )}
                      {methodText && (
                        <div className="rounded-lg bg-white/70 p-2.5">
                          <p className="text-[10px] font-bold text-blue-600 mb-1">💬 КАК СКАЗАТЬ</p>
                          <p className="text-xs leading-relaxed whitespace-pre-wrap">{methodText}</p>
                        </div>
                      )}
                      {mp.compromise && (
                        <div className="rounded-lg bg-amber-50/80 p-2.5">
                          <p className="text-[10px] font-bold text-amber-600 mb-1">💰 ЕСЛИ БЮДЖЕТ</p>
                          <p className="text-xs leading-relaxed whitespace-pre-wrap">{mp.compromise}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {mps.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">
                  {currentStep ? 'Нет атомов знаний для этого этапа' : 'Нет атомов знаний'}
                </p>
                <p className="text-xs mt-1">Добавьте блоки в разделе «Управление»</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ⚙️ Gear modal */}
      {gearOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-start p-6 bg-black/20">
          <div className="bg-white rounded-2xl shadow-2xl w-96 p-5 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-amber-600" />
                <h3 className="text-sm font-bold text-gray-800">Зафиксировать пробел</h3>
              </div>
              <button onClick={() => setGearOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            {/* Auto-context badge */}
            {currentStep && (
              <div className="mb-3 px-2 py-1.5 bg-gray-50 rounded-lg text-[10px] text-gray-500">
                📍 Этап: <strong>{currentStep.title}</strong>
                {focusMachineTypeId && (
                  <> · Станок: <strong>{machineTypes.find((m) => m.id === focusMachineTypeId)?.name}</strong></>
                )}
              </div>
            )}

            {gearSent ? (
              <div className="text-center py-4 text-green-600 font-bold text-sm">
                ✓ Заметка отправлена руководителю
              </div>
            ) : (
              <>
                <textarea
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:border-amber-400 mb-3"
                  rows={4}
                  value={gearText}
                  onChange={(e) => setGearText(e.target.value)}
                  placeholder="Клиент спросил про... / Не знал как ответить на... / Нужна кнопка..."
                  autoFocus
                />

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setGearUrgent((p) => !p)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                      gearUrgent
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-500 hover:bg-red-50'
                    }`}
                  >
                    <AlertTriangle size={12} />
                    {gearUrgent ? 'Срочно!' : 'Отметить срочным'}
                  </button>

                  <button
                    onClick={handleGearSubmit}
                    disabled={!gearText.trim()}
                    className={`flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-lg transition-colors ${
                      gearText.trim()
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Send size={12} /> Отправить
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
