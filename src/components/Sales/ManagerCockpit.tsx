import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, ChevronDown, ChevronUp, CheckCircle, Circle, Cpu,
  BookText, Settings, AlertTriangle, X, Send, Phone, RotateCcw,
  Pause, Play, User,
} from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { MicroPresentation, ScriptNode, FeedbackNote, QualificationSlot, QualificationSession } from '../../types';
import {
  createQualSession, updateQualSession, fetchQualSessions, deleteQualSession,
} from '../../lib/dialogueCloud';

// ─── Константы ───────────────────────────────────────────────────────────────

const MANAGER_NAME_KEY = 'calidad_manager_name';

// Универсальные слоты — показываются для ВСЕХ типов станков в начале квалификации
const UNIVERSAL_SLOTS: QualificationSlot[] = [
  { key: 'client_name', label: 'Имя / Компания' },
  { key: 'budget',      label: 'Бюджет' },
  { key: 'timeline',    label: 'Срок' },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Открытие':     'bg-green-100 text-green-700 border-green-200',
  'Квалификация': 'bg-blue-100 text-blue-700 border-blue-200',
  'Возражения':   'bg-orange-100 text-orange-700 border-orange-200',
  'Закрытие':     'bg-purple-100 text-purple-700 border-purple-200',
  'Общее':        'bg-gray-100 text-gray-600 border-gray-200',
};

// ─── Нормализация квалификаторов (миграция string[] → QualificationSlot[]) ──

function normalizeQualifiers(raw: unknown): QualificationSlot[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === 'string') {
      const key = item.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'slot';
      return { key, label: item };
    }
    return item as QualificationSlot;
  });
}

// ─── Типы ────────────────────────────────────────────────────────────────────

interface ManagerCockpitProps {
  onBack: () => void;
}

// ─── Компонент ───────────────────────────────────────────────────────────────

export const ManagerCockpit: React.FC<ManagerCockpitProps> = ({ onBack }) => {
  const { machineTypes, scriptNodes, microPresentations, addFeedbackNote } = useSalesStore();

  // ── Менеджер ──
  const [managerName, setManagerName] = useState<string>(() => localStorage.getItem(MANAGER_NAME_KEY) ?? '');
  const [nameInput, setNameInput] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);

  // ── Сессии ──
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [savedSessions, setSavedSessions] = useState<QualificationSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStateRef = useRef<Omit<QualificationSession, 'id' | 'managerName' | 'createdAt'>>({
    machineTypeIds: [], focusMachineTypeId: null, status: 'active',
    slots: {}, pendingSlots: [], currentStepId: null,
    completedStepIds: [], completedMachineTypeIds: [], updatedAt: '',
  });

  // ── Состояние звонка ──
  const [clientMachineTypeIds, setClientMachineTypeIds] = useState<string[]>([]);
  const [focusMachineTypeId, setFocusMachineTypeId] = useState<string | null>(null);
  const [completedMachineTypeIds, setCompletedMachineTypeIds] = useState<string[]>([]);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(new Set());
  const [expandedStepIds, setExpandedStepIds] = useState<Set<string>>(new Set());
  const [expandedMpIds, setExpandedMpIds] = useState<Set<string>>(new Set());
  const [slots, setSlots] = useState<Record<string, string>>({});
  const [pendingSlots, setPendingSlots] = useState<Set<string>>(new Set());

  // ── Шестерёнка ──
  const [gearOpen, setGearOpen] = useState(false);
  const [gearText, setGearText] = useState('');
  const [gearUrgent, setGearUrgent] = useState(false);
  const [gearSent, setGearSent] = useState(false);

  // ── Текущий тип станка и его слоты ──
  const focusMachineType = machineTypes.find((m) => m.id === focusMachineTypeId) ?? null;
  const machineSpecificSlots = normalizeQualifiers(focusMachineType?.qualifiers);
  const allSlots = [...UNIVERSAL_SLOTS, ...machineSpecificSlots];

  // ─────────────────────────────────────────────────────────────────────────
  // Загрузка сохранённых сессий при монтировании
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const name = localStorage.getItem(MANAGER_NAME_KEY);
    if (!name) return;
    setLoadingSessions(true);
    fetchQualSessions(name)
      .then(setSavedSessions)
      .finally(() => setLoadingSessions(false));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Синхронизация latestStateRef с текущим состоянием (для авто-сохранения)
  // ─────────────────────────────────────────────────────────────────────────

  latestStateRef.current = {
    machineTypeIds: clientMachineTypeIds,
    focusMachineTypeId,
    status: 'active',
    slots,
    pendingSlots: [...pendingSlots],
    currentStepId,
    completedStepIds: [...completedStepIds],
    completedMachineTypeIds,
    updatedAt: new Date().toISOString(),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Авто-сохранение в Firestore с дебаунсом 800мс
  // ─────────────────────────────────────────────────────────────────────────

  const scheduleSave = () => {
    if (!sessionId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateQualSession(sessionId, latestStateRef.current).catch(console.error);
    }, 800);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Начать новый звонок
  // ─────────────────────────────────────────────────────────────────────────

  const startNewSession = async (name: string, machineIds: string[]) => {
    const newId = 'sess-' + Date.now().toString(36);
    const session: QualificationSession = {
      id: newId,
      managerName: name,
      machineTypeIds: machineIds,
      focusMachineTypeId: machineIds[0] ?? null,
      status: 'active',
      slots: {},
      pendingSlots: [],
      currentStepId: null,
      completedStepIds: [],
      completedMachineTypeIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await createQualSession(session).catch(console.error);
    setSessionId(newId);
    setFocusMachineTypeId(machineIds[0] ?? null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Возобновить сохранённую сессию
  // ─────────────────────────────────────────────────────────────────────────

  const resumeSession = (s: QualificationSession) => {
    setSessionId(s.id);
    setClientMachineTypeIds(s.machineTypeIds);
    setFocusMachineTypeId(s.focusMachineTypeId);
    setCompletedMachineTypeIds(s.completedMachineTypeIds);
    setSlots(s.slots);
    setPendingSlots(new Set(s.pendingSlots));
    setCurrentStepId(s.currentStepId);
    setCompletedStepIds(new Set(s.completedStepIds));
    setExpandedStepIds(new Set());
    setSavedSessions((prev) => prev.filter((x) => x.id !== s.id));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Поставить на паузу / завершить
  // ─────────────────────────────────────────────────────────────────────────

  const pauseSession = () => {
    if (!sessionId) return;
    updateQualSession(sessionId, { ...latestStateRef.current, status: 'paused' }).catch(console.error);
    handleReset();
  };

  const finishSession = () => {
    if (!sessionId) return;
    updateQualSession(sessionId, { ...latestStateRef.current, status: 'done' }).catch(console.error);
    handleReset();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Ввод имени менеджера
  // ─────────────────────────────────────────────────────────────────────────

  const confirmManagerName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem(MANAGER_NAME_KEY, trimmed);
    setManagerName(trimmed);
    setShowNameModal(false);
    setLoadingSessions(true);
    fetchQualSessions(trimmed)
      .then(setSavedSessions)
      .finally(() => setLoadingSessions(false));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Сброс состояния (новый звонок)
  // ─────────────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setSessionId(null);
    setClientMachineTypeIds([]);
    setFocusMachineTypeId(null);
    setCompletedMachineTypeIds([]);
    setCurrentStepId(null);
    setCompletedStepIds(new Set());
    setExpandedStepIds(new Set());
    setSlots({});
    setPendingSlots(new Set());
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Прогресс
  // ─────────────────────────────────────────────────────────────────────────

  const sorted: ScriptNode[] = [...scriptNodes]
    .filter((n) => !focusMachineTypeId || !n.machineTypeIds?.length || n.machineTypeIds.includes(focusMachineTypeId))
    .filter((n) => !n.scriptType || n.scriptType === 'qualification')
    .sort((a, b) => a.order - b.order);

  const total = sorted.length;
  const done = sorted.filter((n) => completedStepIds.has(n.id)).length;
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;
  const currentStep = currentStepId ? sorted.find((n) => n.id === currentStepId) ?? null : null;

  // ─────────────────────────────────────────────────────────────────────────
  // Авто-переход к следующему типу станка при 100%
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (
      focusMachineTypeId &&
      progressPct === 100 &&
      !completedMachineTypeIds.includes(focusMachineTypeId)
    ) {
      const updated = [...completedMachineTypeIds, focusMachineTypeId];
      setCompletedMachineTypeIds(updated);
      const nextIncomplete = clientMachineTypeIds.find((id) => !updated.includes(id));
      if (nextIncomplete) {
        setFocusMachineTypeId(nextIncomplete);
        setCompletedStepIds(new Set());
      }
      scheduleSave();
    }
  }, [progressPct, focusMachineTypeId]);

  // ─────────────────────────────────────────────────────────────────────────
  // МП: адаптивная фильтрация
  // ─────────────────────────────────────────────────────────────────────────

  const ALWAYS_SHOWN_CATEGORIES = new Set(['Общее', 'Формулировки']);

  const matchesMachineType = (mp: MicroPresentation) =>
    !focusMachineTypeId || !mp.machineTypeIds?.length || mp.machineTypeIds.includes(focusMachineTypeId);

  const isPublishedMp = (mp: MicroPresentation) => mp.isPublished !== false;

  // МП показывается если хотя бы одно условие слота выполнено
  const matchesSlotConditions = (mp: MicroPresentation): boolean => {
    if (!mp.slotConditions || Object.keys(mp.slotConditions).length === 0) return false;
    return Object.entries(mp.slotConditions).some(([slotKey, values]) => {
      const filled = slots[slotKey]?.toLowerCase().trim();
      return !!filled && values.some((v) => filled.includes(v.toLowerCase()));
    });
  };

  const relevantMps = (step: ScriptNode | null): { regular: MicroPresentation[]; slotBased: MicroPresentation[] } => {
    const base = microPresentations.filter((mp) => matchesMachineType(mp) && isPublishedMp(mp));

    // МП активированные заполненными слотами — показываем отдельным блоком
    const slotBased = base.filter((mp) => matchesSlotConditions(mp));

    let regular: MicroPresentation[];
    if (!step) {
      regular = base.filter((mp) => ALWAYS_SHOWN_CATEGORIES.has(mp.category) && !matchesSlotConditions(mp));
    } else {
      const linked = step.microPresentationIds ?? [];
      if (linked.length > 0) {
        regular = base.filter((mp) => linked.includes(mp.id) && !matchesSlotConditions(mp));
      } else {
        const currentIdx = sorted.findIndex((n) => n.id === step.id);
        const nextStep = currentIdx >= 0 ? sorted[currentIdx + 1] : null;
        const cats = new Set<string>(ALWAYS_SHOWN_CATEGORIES);
        if (step.category) cats.add(step.category);
        if (nextStep?.category) cats.add(nextStep.category);
        regular = base.filter((mp) => cats.has(mp.category) && !matchesSlotConditions(mp));
      }
    }

    return { regular, slotBased };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Обработчики
  // ─────────────────────────────────────────────────────────────────────────

  const toggleStep = (id: string) => {
    setExpandedStepIds((prev) => {
      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
    });
    setCurrentStepId(id);
    scheduleSave();
  };

  const toggleDone = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCompletedStepIds((prev) => {
      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
    });
    scheduleSave();
  };

  const toggleMp = (id: string) => {
    setExpandedMpIds((prev) => {
      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
    });
  };

  const handleSlotChange = (key: string, value: string) => {
    setSlots((prev) => ({ ...prev, [key]: value }));
    scheduleSave();
  };

  const toggleSlotPending = (key: string) => {
    setPendingSlots((prev) => {
      const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next;
    });
    scheduleSave();
  };

  const handleGearSubmit = () => {
    if (!gearText.trim()) return;
    const note: FeedbackNote = {
      id: 'note-' + Date.now().toString(36),
      authorId: 'manager',
      authorName: managerName || 'Менеджер',
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
    setGearText(''); setGearUrgent(false); setGearSent(true);
    setTimeout(() => { setGearSent(false); setGearOpen(false); }, 1500);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // МП для текущего шага
  // ─────────────────────────────────────────────────────────────────────────

  const { regular: regularMps, slotBased: slotMps } = relevantMps(currentStep);

  // ─────────────────────────────────────────────────────────────────────────
  // Рендер МП карточки
  // ─────────────────────────────────────────────────────────────────────────

  const renderMpCard = (mp: MicroPresentation, badge?: string) => {
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
              {badge && <span className="text-[9px] font-bold bg-white/60 px-1 rounded">{badge}</span>}
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
  };

  // ─────────────────────────────────────────────────────────────────────────
  // РЕНДЕР
  // ─────────────────────────────────────────────────────────────────────────

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

          {/* Имя менеджера */}
          <button
            onClick={() => { setNameInput(managerName); setShowNameModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 hover:border-calidad-blue transition-colors"
          >
            <User size={12} />
            <span>{managerName || 'Указать имя'}</span>
          </button>

          {/* Кнопки сессии */}
          {clientMachineTypeIds.length > 0 && (
            <>
              <button
                onClick={pauseSession}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors"
              >
                <Pause size={12} /> Пауза
              </button>
              <button
                onClick={finishSession}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
              >
                <CheckCircle size={12} /> Завершить
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-500 font-bold text-xs transition-colors"
              >
                Новый
              </button>
            </>
          )}
        </div>

        {/* Прогресс-бар (только когда идёт звонок) */}
        {clientMachineTypeIds.length > 0 && (
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
        )}
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Script + Slots */}
        <div className="w-[55%] flex flex-col border-r border-gray-200 overflow-hidden">

          {/* ── Старт: выбор станков или список сохранённых сессий ── */}
          {clientMachineTypeIds.length === 0 ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Сохранённые сессии */}
              {(savedSessions.length > 0 || loadingSessions) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <RotateCcw size={14} className="text-amber-600" />
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                      Продолжить прерванный звонок
                    </span>
                  </div>
                  {loadingSessions ? (
                    <p className="text-xs text-gray-400">Загрузка...</p>
                  ) : (
                    <div className="space-y-2">
                      {savedSessions.map((s) => {
                        const mtNames = s.machineTypeIds
                          .map((id) => machineTypes.find((m) => m.id === id)?.name ?? id)
                          .join(', ');
                        const filledCount = Object.keys(s.slots).filter((k) => s.slots[k]).length;
                        const date = new Date(s.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                        return (
                          <div key={s.id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-amber-100">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-800 truncate">{mtNames || 'Без станка'}</p>
                              <p className="text-[10px] text-gray-400">{date} · {filledCount} слотов заполнено</p>
                              {s.slots['client_name'] && (
                                <p className="text-[10px] text-gray-500">{s.slots['client_name']}</p>
                              )}
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => resumeSession(s)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors"
                              >
                                <Play size={11} /> Продолжить
                              </button>
                              <button
                                onClick={() => { deleteQualSession(s.id).catch(console.error); setSavedSessions((p) => p.filter((x) => x.id !== s.id)); }}
                                className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Новый звонок: выбор типов станков */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Cpu size={14} className="text-gray-400" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {managerName ? `${managerName} — новый звонок` : 'Новый звонок'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-3">Какие станки интересуют клиента?</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
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
                  onClick={async () => {
                    if (clientMachineTypeIds.length === 0) return;
                    const name = managerName || 'Менеджер';
                    await startNewSession(name, clientMachineTypeIds);
                    setFocusMachineTypeId(clientMachineTypeIds[0]);
                  }}
                  disabled={clientMachineTypeIds.length === 0}
                  className={`w-full px-4 py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                    clientMachineTypeIds.length === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-calidad-blue text-white hover:bg-blue-800'
                  }`}
                >
                  <Phone size={13} /> Начать звонок
                </button>
              </div>
            </div>

          ) : (
            /* ── Активный звонок ── */
            <>
              <div className="bg-white border-b border-gray-100 flex-shrink-0">

                {/* Вкладки типов станков */}
                <div className="px-4 pt-3 pb-0 flex gap-1.5 flex-wrap">
                  {clientMachineTypeIds.map((mtId) => {
                    const isCompleted = completedMachineTypeIds.includes(mtId);
                    const mt = machineTypes.find((m) => m.id === mtId);
                    return (
                      <button
                        key={mtId}
                        onClick={() => { if (!isCompleted) { setFocusMachineTypeId(mtId); setCompletedStepIds(new Set()); scheduleSave(); } }}
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

                {/* Слоты квалификации */}
                <div className="px-4 py-3">
                  {/* Универсальные слоты */}
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Общие данные</p>
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {UNIVERSAL_SLOTS.map((slot) => renderSlotInput(slot))}
                  </div>

                  {/* Слоты типа станка */}
                  {machineSpecificSlots.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        {focusMachineType?.name ?? 'Станок'}
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {machineSpecificSlots.map((slot) => renderSlotInput(slot))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Этапы скрипта */}
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
                        <button onClick={(e) => toggleDone(e, node.id)} className="flex-shrink-0">
                          {isDone
                            ? <CheckCircle size={20} className="text-green-500" />
                            : <Circle size={20} className={isCurrent ? 'text-calidad-blue' : 'text-gray-300'} />
                          }
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
                        {node.category && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${CATEGORY_COLORS[node.category] ?? CATEGORY_COLORS['Общее']}`}>
                            {node.category}
                          </span>
                        )}
                        {isExpanded ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
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

              {/* Кнопка Шестерёнки */}
              <div className="px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
                <button
                  onClick={() => setGearOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors w-full"
                >
                  <Settings size={13} />
                  <span>Зафиксировать пробел / заметку</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* RIGHT: Micro-presentations */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {currentStep ? `Атомы знаний: ${currentStep.title}` : 'Атомы знаний'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {regularMps.length + slotMps.length} блоков
              {slotMps.length > 0 && ` · ${slotMps.length} по заполненным слотам`}
              {!currentStep && ' · Выберите этап слева'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {/* Слот-активированные МП — приоритет */}
            {slotMps.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider px-1">
                  ✦ Актуально для этого клиента
                </p>
                {slotMps.map((mp) => renderMpCard(mp, '⚡ слот'))}
                {regularMps.length > 0 && <div className="border-t border-gray-100 pt-2" />}
              </div>
            )}

            {/* Обычные МП */}
            {regularMps.map((mp) => renderMpCard(mp))}

            {regularMps.length === 0 && slotMps.length === 0 && (
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

      {/* ── Модал: имя менеджера ── */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl w-80 p-6">
            <h3 className="text-sm font-bold text-gray-800 mb-1">Ваше имя</h3>
            <p className="text-xs text-gray-400 mb-4">Используется для сохранения сессий звонков</p>
            <input
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-calidad-blue mb-4"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmManagerName(nameInput); }}
              placeholder="Напр.: Иван"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowNameModal(false)}
                className="flex-1 px-4 py-2 text-xs font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => confirmManagerName(nameInput)}
                disabled={!nameInput.trim()}
                className={`flex-1 px-4 py-2 text-xs font-bold text-white rounded-xl transition-colors ${nameInput.trim() ? 'bg-calidad-blue hover:bg-blue-800' : 'bg-gray-200 cursor-not-allowed'}`}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Модал: Шестерёнка ── */}
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
                      gearUrgent ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500 hover:bg-red-50'
                    }`}
                  >
                    <AlertTriangle size={12} />
                    {gearUrgent ? 'Срочно!' : 'Отметить срочным'}
                  </button>
                  <button
                    onClick={handleGearSubmit}
                    disabled={!gearText.trim()}
                    className={`flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-lg transition-colors ${
                      gearText.trim() ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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

  // ─────────────────────────────────────────────────────────────────────────
  // Вспомогательный рендер слота (вынесен внутрь компонента)
  // ─────────────────────────────────────────────────────────────────────────

  function renderSlotInput(slot: QualificationSlot) {
    const value = slots[slot.key] ?? '';
    const isPending = pendingSlots.has(slot.key);
    const isFilled = !!value;

    return (
      <div key={slot.key} className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          isFilled ? 'bg-green-500' : isPending ? 'bg-amber-400' : 'bg-gray-300'
        }`} />
        <span className="text-[10px] text-gray-500 flex-shrink-0 min-w-[56px]">{slot.label}:</span>
        {isFilled ? (
          <button
            className="text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded flex-1 text-left truncate"
            onClick={() => handleSlotChange(slot.key, '')}
          >
            {value}
          </button>
        ) : (
          <div className="flex gap-1 flex-1">
            <input
              className="flex-1 text-[10px] border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-calidad-blue min-w-0"
              placeholder="уточнить..."
              value={value}
              onChange={(e) => handleSlotChange(slot.key, e.target.value)}
            />
            <button
              onClick={() => toggleSlotPending(slot.key)}
              className={`text-[9px] px-1 py-0.5 rounded flex-shrink-0 ${
                isPending ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400 hover:bg-amber-50'
              }`}
              title="Ждём ответа"
            >
              ⏳
            </button>
          </div>
        )}
      </div>
    );
  }
};
