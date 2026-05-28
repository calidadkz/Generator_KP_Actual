import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft, ChevronDown, ChevronUp, CheckCircle, Circle, Plus,
  BookText, Settings, AlertTriangle, X, Send, Phone, RotateCcw,
  Pause, Play, User, Trash2,
} from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import {
  MicroPresentation, ScriptNode, FeedbackNote,
  QualificationSlot, QualificationTask, QualificationSession,
} from '../../types';
import {
  createQualSession, updateQualSession, fetchQualSessions, deleteQualSession,
} from '../../lib/dialogueCloud';

// ─── Константы ───────────────────────────────────────────────────────────────

const MANAGER_NAME_KEY = 'calidad_manager_name';

// Универсальные слоты — общие для любого звонка, не зависят от типа станка
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

// ─── Миграция старой структуры сессии (до задачного подхода) ─────────────────

function migrateSession(s: QualificationSession): QualificationSession {
  const raw = s as unknown as Record<string, unknown>;
  if (!raw.tasks) {
    const legacyMtIds = (raw.machineTypeIds as string[]) ?? [];
    const legacySlots = (raw.slots as Record<string, string>) ?? {};
    const legacyPendingSlots = (raw.pendingSlots as string[]) ?? [];
    const legacyCompletedStepIds = (raw.completedStepIds as string[]) ?? [];

    const universalKeys = new Set(['client_name', 'budget', 'timeline']);
    const uSlots: Record<string, string> = {};
    const taskSlots: Record<string, string> = {};
    for (const [k, v] of Object.entries(legacySlots)) {
      if (universalKeys.has(k)) uSlots[k] = v;
      else taskSlots[k] = v;
    }

    const tasks: QualificationTask[] = legacyMtIds.map((mtId, i) => ({
      id: 'task-migrated-' + i,
      label: `Задача ${i + 1}`,
      machineTypeId: mtId,
      slots: i === 0 ? taskSlots : {},
      pendingSlots: i === 0 ? legacyPendingSlots.filter(k => !universalKeys.has(k)) : [],
      completedStepIds: legacyCompletedStepIds,
    }));

    return {
      ...s,
      tasks,
      activeTaskId: tasks[0]?.id ?? null,
      universalSlots: uSlots,
      universalPendingSlots: legacyPendingSlots.filter(k => universalKeys.has(k)),
      currentStepId: (raw.currentStepId as string | null) ?? null,
    };
  }
  return s;
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
  const latestStateRef = useRef<Partial<QualificationSession>>({});

  // ── Задачи и слоты ──
  const [tasks, setTasks] = useState<QualificationTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [uSlots, setUSlots] = useState<Record<string, string>>({});   // универсальные
  const [uPending, setUPending] = useState<Set<string>>(new Set());

  // ── Скрипт ──
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [expandedStepIds, setExpandedStepIds] = useState<Set<string>>(new Set());
  const [expandedMpIds, setExpandedMpIds] = useState<Set<string>>(new Set());

  // ── Шестерёнка ──
  const [gearOpen, setGearOpen] = useState(false);
  const [gearText, setGearText] = useState('');
  const [gearUrgent, setGearUrgent] = useState(false);
  const [gearSent, setGearSent] = useState(false);

  // ── Вычисляемые ──
  const activeTask = useMemo(() => tasks.find(t => t.id === activeTaskId) ?? null, [tasks, activeTaskId]);
  const activeMachineType = useMemo(
    () => activeTask?.machineTypeId ? machineTypes.find(m => m.id === activeTask.machineTypeId) ?? null : null,
    [activeTask?.machineTypeId, machineTypes],
  );
  const machineSpecificSlots = useMemo(() => normalizeQualifiers(activeMachineType?.qualifiers), [activeMachineType]);

  // Объединённые слоты для сопоставления условий МП
  const activeSlots = useMemo(
    () => ({ ...uSlots, ...(activeTask?.slots ?? {}) }),
    [uSlots, activeTask?.slots],
  );

  const activeCompletedStepIds = useMemo(
    () => new Set(activeTask?.completedStepIds ?? []),
    [activeTask?.completedStepIds],
  );

  // Этапы скрипта, отфильтрованные по типу станка активной задачи
  const sorted = useMemo(() => {
    const mtId = activeTask?.machineTypeId ?? null;
    return [...scriptNodes]
      .filter(n => !mtId || !n.machineTypeIds?.length || n.machineTypeIds.includes(mtId))
      .filter(n => !n.scriptType || n.scriptType === 'qualification')
      .sort((a, b) => a.order - b.order);
  }, [scriptNodes, activeTask?.machineTypeId]);

  const total = sorted.length;
  const done = sorted.filter(n => activeCompletedStepIds.has(n.id)).length;
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;
  const currentStep = sorted.find(n => n.id === currentStepId) ?? null;

  // ─────────────────────────────────────────────────────────────────────────
  // Загрузка сохранённых сессий
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const name = localStorage.getItem(MANAGER_NAME_KEY);
    if (!name) return;
    setLoadingSessions(true);
    fetchQualSessions(name).then(setSavedSessions).finally(() => setLoadingSessions(false));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Авто-сохранение (debounce 800мс)
  // ─────────────────────────────────────────────────────────────────────────

  latestStateRef.current = {
    status: 'active',
    universalSlots: uSlots,
    universalPendingSlots: [...uPending],
    tasks,
    activeTaskId,
    currentStepId,
    updatedAt: new Date().toISOString(),
  };

  const scheduleSave = () => {
    if (!sessionId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateQualSession(sessionId, latestStateRef.current).catch(console.error);
    }, 800);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Управление сессией
  // ─────────────────────────────────────────────────────────────────────────

  const startNewSession = async () => {
    const name = managerName || 'Менеджер';
    const newId = 'sess-' + Date.now().toString(36);
    const session: QualificationSession = {
      id: newId,
      managerName: name,
      status: 'active',
      tasks: [],
      activeTaskId: null,
      universalSlots: {},
      universalPendingSlots: [],
      currentStepId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await createQualSession(session).catch(console.error);
    setSessionId(newId);
  };

  const resumeSession = (s: QualificationSession) => {
    const m = migrateSession(s);
    setSessionId(m.id);
    setTasks(m.tasks ?? []);
    setActiveTaskId(m.activeTaskId);
    setUSlots(m.universalSlots ?? {});
    setUPending(new Set(m.universalPendingSlots ?? []));
    setCurrentStepId(m.currentStepId);
    setExpandedStepIds(new Set());
    setSavedSessions(prev => prev.filter(x => x.id !== s.id));
  };

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

  const handleReset = () => {
    setSessionId(null);
    setTasks([]);
    setActiveTaskId(null);
    setUSlots({});
    setUPending(new Set());
    setCurrentStepId(null);
    setExpandedStepIds(new Set());
  };

  const confirmManagerName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem(MANAGER_NAME_KEY, trimmed);
    setManagerName(trimmed);
    setShowNameModal(false);
    setLoadingSessions(true);
    fetchQualSessions(trimmed).then(setSavedSessions).finally(() => setLoadingSessions(false));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Управление задачами
  // ─────────────────────────────────────────────────────────────────────────

  const addTask = () => {
    const taskId = 'task-' + Date.now().toString(36);
    const newTask: QualificationTask = {
      id: taskId,
      label: `Задача ${tasks.length + 1}`,
      machineTypeId: null,
      slots: {},
      pendingSlots: [],
      completedStepIds: [],
    };
    setTasks(prev => [...prev, newTask]);
    setActiveTaskId(taskId);
    setCurrentStepId(null);
    setExpandedStepIds(new Set());
    scheduleSave();
  };

  const updateTask = (taskId: string, patch: Partial<QualificationTask>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...patch } : t));
    scheduleSave();
  };

  const removeTask = (taskId: string) => {
    const remaining = tasks.filter(t => t.id !== taskId);
    setTasks(remaining);
    if (activeTaskId === taskId) {
      setActiveTaskId(remaining[remaining.length - 1]?.id ?? null);
      setCurrentStepId(null);
      setExpandedStepIds(new Set());
    }
    scheduleSave();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Прогресс задачи для отображения в табе
  // ─────────────────────────────────────────────────────────────────────────

  const getTaskProgress = (task: QualificationTask): { done: number; total: number } => {
    const mtId = task.machineTypeId;
    const taskSteps = scriptNodes
      .filter(n => !mtId || !n.machineTypeIds?.length || n.machineTypeIds.includes(mtId))
      .filter(n => !n.scriptType || n.scriptType === 'qualification');
    return {
      done: taskSteps.filter(n => task.completedStepIds.includes(n.id)).length,
      total: taskSteps.length,
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Этапы скрипта
  // ─────────────────────────────────────────────────────────────────────────

  const toggleStep = (id: string) => {
    setExpandedStepIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    setCurrentStepId(id);
    scheduleSave();
  };

  const toggleDone = (e: React.MouseEvent, stepId: string) => {
    e.stopPropagation();
    if (!activeTaskId) return;
    setTasks(prev => prev.map(t => {
      if (t.id !== activeTaskId) return t;
      const doneSet = new Set(t.completedStepIds);
      doneSet.has(stepId) ? doneSet.delete(stepId) : doneSet.add(stepId);
      return { ...t, completedStepIds: [...doneSet] };
    }));
    scheduleSave();
  };

  const toggleMp = (id: string) => {
    setExpandedMpIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Слоты
  // ─────────────────────────────────────────────────────────────────────────

  const handleUSlotChange = (key: string, value: string) => {
    setUSlots(prev => ({ ...prev, [key]: value }));
    scheduleSave();
  };
  const toggleUPending = (key: string) => {
    setUPending(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
    scheduleSave();
  };
  const handleTaskSlotChange = (key: string, value: string) => {
    if (!activeTaskId) return;
    setTasks(prev => prev.map(t =>
      t.id === activeTaskId ? { ...t, slots: { ...t.slots, [key]: value } } : t,
    ));
    scheduleSave();
  };
  const toggleTaskPending = (key: string) => {
    if (!activeTaskId) return;
    setTasks(prev => prev.map(t => {
      if (t.id !== activeTaskId) return t;
      const p = new Set(t.pendingSlots);
      p.has(key) ? p.delete(key) : p.add(key);
      return { ...t, pendingSlots: [...p] };
    }));
    scheduleSave();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Адаптивная фильтрация МП
  // ─────────────────────────────────────────────────────────────────────────

  const ALWAYS_SHOWN_CATEGORIES = new Set(['Общее', 'Формулировки']);

  const matchesMachineType = (mp: MicroPresentation) =>
    !activeTask?.machineTypeId || !mp.machineTypeIds?.length || mp.machineTypeIds.includes(activeTask.machineTypeId);

  // МП показывается если ВСЕ указанные условия слотов выполнены
  // (every = AND логика: материал=фанера И толщина>15мм → показать МП про фрезер)
  const matchesSlotConditions = (mp: MicroPresentation): boolean => {
    if (!mp.slotConditions || Object.keys(mp.slotConditions).length === 0) return false;
    return Object.entries(mp.slotConditions).every(([slotKey, values]) => {
      const filled = activeSlots[slotKey]?.toLowerCase().trim();
      return !!filled && values.some(v => filled.includes(v.toLowerCase()));
    });
  };

  const relevantMps = (step: ScriptNode | null): { regular: MicroPresentation[]; slotBased: MicroPresentation[] } => {
    const base = microPresentations.filter(mp => matchesMachineType(mp) && mp.isPublished !== false);
    const slotBased = base.filter(mp => matchesSlotConditions(mp));
    let regular: MicroPresentation[];
    if (!step) {
      regular = base.filter(mp => ALWAYS_SHOWN_CATEGORIES.has(mp.category) && !matchesSlotConditions(mp));
    } else {
      const linked = step.microPresentationIds ?? [];
      if (linked.length > 0) {
        regular = base.filter(mp => linked.includes(mp.id) && !matchesSlotConditions(mp));
      } else {
        const idx = sorted.findIndex(n => n.id === step.id);
        const nextStep = idx >= 0 ? sorted[idx + 1] : null;
        const cats = new Set<string>(ALWAYS_SHOWN_CATEGORIES);
        if (step.category) cats.add(step.category);
        if (nextStep?.category) cats.add(nextStep.category);
        regular = base.filter(mp => cats.has(mp.category) && !matchesSlotConditions(mp));
      }
    }
    return { regular, slotBased };
  };

  const { regular: regularMps, slotBased: slotMps } = relevantMps(currentStep);

  // ─────────────────────────────────────────────────────────────────────────
  // Шестерёнка (Gear)
  // ─────────────────────────────────────────────────────────────────────────

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
        machineTypeId: activeTask?.machineTypeId ?? undefined,
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

  // ─────────────────────────────────────────────────────────────────────────
  // Вспомогательный рендер: слот
  // ─────────────────────────────────────────────────────────────────────────

  const renderSlot = (
    slot: QualificationSlot,
    value: string,
    isPending: boolean,
    onChange: (key: string, val: string) => void,
    onTogglePending: (key: string) => void,
  ) => {
    const isFilled = !!value;
    return (
      <div key={slot.key} className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          isFilled ? 'bg-green-500' : isPending ? 'bg-amber-400' : 'bg-gray-300'
        }`} />
        <span className="text-[10px] text-gray-500 flex-shrink-0 w-[72px]">{slot.label}:</span>
        <input
          className={`flex-1 text-[10px] border rounded px-1.5 py-0.5 focus:outline-none min-w-0 ${
            isFilled
              ? 'border-green-200 bg-green-50 text-green-700 font-bold focus:border-green-400'
              : 'border-gray-200 focus:border-calidad-blue'
          }`}
          placeholder="уточнить..."
          value={value}
          onChange={e => onChange(slot.key, e.target.value)}
        />
        <button
          onClick={() => onTogglePending(slot.key)}
          title="Ждём ответа"
          className={`text-[9px] px-1 py-0.5 rounded flex-shrink-0 ${
            isPending ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400 hover:bg-amber-50'
          }`}
        >⏳</button>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Вспомогательный рендер: карточка МП
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
              {(mp.tags ?? []).slice(0, 2).map(tag => (
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

  const isCallActive = !!sessionId;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Шапка ── */}
      <header className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 font-bold text-xs transition-colors"
          >
            <ArrowLeft size={14} /> Назад
          </button>
          <div className="flex-1">
            <h1 className="text-base font-black text-calidad-blue leading-tight">
              CALIDAD <span className="text-calidad-red">COCKPIT</span>
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Скрипт продаж · живой звонок
            </p>
          </div>
          <button
            onClick={() => { setNameInput(managerName); setShowNameModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 hover:border-calidad-blue transition-colors"
          >
            <User size={12} /> <span>{managerName || 'Указать имя'}</span>
          </button>
          {isCallActive && (
            <>
              <button onClick={pauseSession} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors">
                <Pause size={12} /> Пауза
              </button>
              <button onClick={finishSession} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors">
                <CheckCircle size={12} /> Завершить
              </button>
              <button onClick={handleReset} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-500 font-bold text-xs transition-colors">
                Новый
              </button>
            </>
          )}
        </div>

        {/* Вкладки задач + прогресс-бар (только во время звонка) */}
        {isCallActive && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {tasks.map(task => {
                const isActive = task.id === activeTaskId;
                const mt = task.machineTypeId ? machineTypes.find(m => m.id === task.machineTypeId) : null;
                const { done: tDone, total: tTotal } = getTaskProgress(task);
                return (
                  <button
                    key={task.id}
                    onClick={() => {
                      setActiveTaskId(task.id);
                      setCurrentStepId(null);
                      setExpandedStepIds(new Set());
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      isActive
                        ? 'bg-calidad-blue text-white border-calidad-blue'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-calidad-blue hover:text-calidad-blue'
                    }`}
                  >
                    <span className="max-w-[100px] truncate">{task.label}</span>
                    {mt && (
                      <span className={`text-[10px] ${isActive ? 'opacity-70' : 'text-gray-400'}`}>
                        · {mt.name}
                      </span>
                    )}
                    {tTotal > 0 && (
                      <span className={`text-[10px] tabular-nums ${isActive ? 'opacity-70' : 'text-gray-400'}`}>
                        {tDone}/{tTotal}
                      </span>
                    )}
                  </button>
                );
              })}
              <button
                onClick={addTask}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-dashed border-gray-300 text-gray-400 hover:border-calidad-blue hover:text-calidad-blue transition-colors"
              >
                <Plus size={12} /> Задача
              </button>
            </div>

            {/* Прогресс активной задачи */}
            {activeTask && total > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-calidad-blue rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-gray-400 tabular-nums w-16 text-right">
                  {done}/{total} ({progressPct}%)
                </span>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── Основная область ── */}
      {!isCallActive ? (

        /* ══════════════════════════════════════════════════════════════════
           СТАРТОВЫЙ ЭКРАН — полная ширина, без правой панели МП
           ══════════════════════════════════════════════════════════════════ */
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-xl mx-auto px-6 py-8 space-y-5">

            {/* Кнопка нового звонка — всегда сверху */}
            <button
              onClick={startNewSession}
              className="w-full py-3.5 bg-calidad-blue text-white rounded-2xl text-sm font-black hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-200"
            >
              <Phone size={16} />
              {managerName ? `${managerName} — начать звонок` : 'Начать новый звонок'}
            </button>

            {/* Незакрытые звонки */}
            {loadingSessions && (
              <p className="text-xs text-center text-gray-400">Загрузка сессий...</p>
            )}

            {!loadingSessions && savedSessions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Незакрытые звонки ({savedSessions.length})
                  </p>
                  {savedSessions.length > 1 && (
                    <button
                      onClick={() => {
                        const empties = savedSessions.filter(s => {
                          const m = migrateSession(s);
                          return m.tasks.length === 0 && !m.universalSlots?.client_name;
                        });
                        empties.forEach(s => deleteQualSession(s.id).catch(console.error));
                        setSavedSessions(prev => prev.filter(s => {
                          const m = migrateSession(s);
                          return m.tasks.length > 0 || !!m.universalSlots?.client_name;
                        }));
                      }}
                      className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                    >
                      Очистить пустые
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {savedSessions.map(s => {
                    const m = migrateSession(s);
                    const clientName = m.universalSlots?.client_name?.trim() || '';
                    const budget = m.universalSlots?.budget?.trim() || '';
                    const hasTasks = m.tasks.length > 0;

                    // Возраст сессии
                    const ageDays = Math.floor((Date.now() - new Date(s.updatedAt).getTime()) / 86_400_000);
                    const isStale = ageDays >= 7;

                    const timeLabel = ageDays === 0
                      ? new Date(s.updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                      : ageDays === 1 ? 'вчера'
                      : `${ageDays} дн. назад`;

                    return (
                      <div
                        key={s.id}
                        className={`bg-white rounded-xl border px-4 py-3 ${
                          isStale ? 'border-red-100' : hasTasks ? 'border-gray-200' : 'border-gray-100 opacity-70'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Статус-точка */}
                          <div className="mt-1 flex-shrink-0">
                            <div className="w-2 h-2 rounded-full bg-amber-400" title="На паузе" />
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Клиент + время */}
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-gray-800 truncate">
                                {clientName || 'Клиент не указан'}
                              </span>
                              <span className={`text-[10px] flex-shrink-0 ${isStale ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                                {timeLabel}
                              </span>
                            </div>

                            {/* Задачи */}
                            {hasTasks ? (
                              <div className="space-y-0.5 mb-1.5">
                                {m.tasks.map(t => {
                                  const mt = t.machineTypeId
                                    ? machineTypes.find(x => x.id === t.machineTypeId)
                                    : null;
                                  const { done: tDone, total: tTotal } = getTaskProgress(t);
                                  return (
                                    <div key={t.id} className="flex items-center gap-1.5">
                                      <span className="text-[10px] text-gray-500">•</span>
                                      <span className="text-xs text-gray-700 font-medium">{t.label}</span>
                                      {mt && (
                                        <span className="text-[10px] text-calidad-blue bg-blue-50 px-1.5 py-0.5 rounded font-bold">
                                          {mt.name}
                                        </span>
                                      )}
                                      {tTotal > 0 && (
                                        <span className="text-[10px] text-gray-400 ml-auto">{tDone}/{tTotal}</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 mb-1.5">Задачи не добавлены</p>
                            )}

                            {/* Бюджет если заполнен */}
                            {budget && (
                              <span className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                                💰 {budget}
                              </span>
                            )}
                          </div>

                          {/* Кнопки */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => resumeSession(s)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-calidad-blue text-white text-xs font-bold rounded-lg hover:bg-blue-800 transition-colors"
                            >
                              <Play size={11} /> Продолжить
                            </button>
                            <button
                              onClick={() => {
                                deleteQualSession(s.id).catch(console.error);
                                setSavedSessions(p => p.filter(x => x.id !== s.id));
                              }}
                              className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

      ) : (

        /* ══════════════════════════════════════════════════════════════════
           АКТИВНЫЙ ЗВОНОК — две колонки: скрипт + МП
           ══════════════════════════════════════════════════════════════════ */
        <div className="flex flex-1 overflow-hidden">

        {/* ── ЛЕВАЯ ПАНЕЛЬ ── */}
        <div className="w-[55%] flex flex-col border-r border-gray-200 overflow-hidden">
          {/* ── Активный звонок ── */}
          <>
              {/* Панель данных: задача + слоты */}
              <div className="bg-white border-b border-gray-100 flex-shrink-0 px-4 py-3 space-y-3">

                {/* Активная задача: название + тип станка */}
                {activeTask ? (
                  <div className="border border-calidad-blue/20 rounded-xl p-3 bg-blue-50/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        className="flex-1 text-xs font-bold text-gray-800 bg-transparent border-b border-calidad-blue/30 focus:outline-none focus:border-calidad-blue py-0.5 placeholder:text-gray-400"
                        value={activeTask.label}
                        onChange={e => updateTask(activeTask.id, { label: e.target.value })}
                        placeholder="Название задачи клиента..."
                      />
                      <button
                        onClick={() => removeTask(activeTask.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                        title="Удалить задачу"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {/* Выбор типа станка */}
                    <div className="flex flex-wrap gap-1">
                      {machineTypes.map(mt => (
                        <button
                          key={mt.id}
                          onClick={() => updateTask(activeTask.id, {
                            machineTypeId: activeTask.machineTypeId === mt.id ? null : mt.id,
                          })}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                            activeTask.machineTypeId === mt.id
                              ? 'bg-calidad-blue text-white'
                              : 'bg-white text-gray-500 border border-gray-200 hover:border-calidad-blue'
                          }`}
                        >
                          {mt.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  tasks.length === 0 && (
                    <div className="text-center py-1">
                      <p className="text-xs text-gray-400">
                        Нажмите <strong className="text-calidad-blue">+ Задача</strong> выше, чтобы добавить задачу клиента
                      </p>
                    </div>
                  )
                )}

                {/* Универсальные слоты */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Общие данные</p>
                  <div className="space-y-1">
                    {UNIVERSAL_SLOTS.map(slot => renderSlot(
                      slot,
                      uSlots[slot.key] ?? '',
                      uPending.has(slot.key),
                      handleUSlotChange,
                      toggleUPending,
                    ))}
                  </div>
                </div>

                {/* Слоты специфичные для типа станка активной задачи */}
                {machineSpecificSlots.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      {activeMachineType?.name ?? 'Станок'}
                    </p>
                    <div className="space-y-1">
                      {machineSpecificSlots.map(slot => renderSlot(
                        slot,
                        activeTask?.slots[slot.key] ?? '',
                        new Set(activeTask?.pendingSlots ?? []).has(slot.key),
                        handleTaskSlotChange,
                        toggleTaskPending,
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Этапы скрипта */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {sorted.map((node, idx) => {
                  const isDone = activeCompletedStepIds.has(node.id);
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
                      <div className="flex items-center gap-3 p-3">
                        <button onClick={e => toggleDone(e, node.id)} className="flex-shrink-0">
                          {isDone
                            ? <CheckCircle size={18} className="text-green-500" />
                            : <Circle size={18} className={isCurrent ? 'text-calidad-blue' : 'text-gray-300'} />
                          }
                        </button>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                          isCurrent ? 'bg-calidad-blue text-white' : isDone ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {idx + 1}
                        </div>
                        <span className={`flex-1 text-xs font-bold ${
                          isCurrent ? 'text-calidad-blue' : isDone ? 'text-gray-400 line-through' : 'text-gray-800'
                        }`}>
                          {node.title}
                        </span>
                        {node.category && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 border ${CATEGORY_COLORS[node.category] ?? CATEGORY_COLORS['Общее']}`}>
                            {node.category}
                          </span>
                        )}
                        {isExpanded
                          ? <ChevronUp size={13} className="text-gray-400 flex-shrink-0" />
                          : <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />
                        }
                      </div>
                      {isExpanded && (
                        <div className="px-4 pb-3 border-t border-gray-100">
                          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{node.content}</p>
                          </div>
                          {(node.tips ?? []).length > 0 && (
                            <div className="mt-2">
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Советы</p>
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
                    <p className="text-sm">Скрипт пуст.</p>
                    <p className="text-xs mt-1">Добавьте этапы в разделе «Управление скриптом».</p>
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
        </div>

        {/* ── ПРАВАЯ ПАНЕЛЬ: МП ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {currentStep ? `Атомы знаний: ${currentStep.title}` : 'Атомы знаний'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {regularMps.length + slotMps.length} блоков
              {slotMps.length > 0 && ` · ${slotMps.length} по слотам`}
              {!currentStep && isCallActive && ' · Выберите этап слева'}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {slotMps.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider px-1">
                  ✦ Актуально для этого клиента
                </p>
                {slotMps.map(mp => renderMpCard(mp, '⚡ слот'))}
                {regularMps.length > 0 && <div className="border-t border-gray-100 pt-2" />}
              </div>
            )}
            {regularMps.map(mp => renderMpCard(mp))}
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

      )}

      {/* ── Модал: имя менеджера ── */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl w-80 p-6">
            <h3 className="text-sm font-bold text-gray-800 mb-1">Ваше имя</h3>
            <p className="text-xs text-gray-400 mb-4">Используется для сохранения сессий звонков</p>
            <input
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-calidad-blue mb-4"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmManagerName(nameInput); }}
              placeholder="Напр.: Иван"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setShowNameModal(false)} className="flex-1 px-4 py-2 text-xs font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Отмена
              </button>
              <button
                onClick={() => confirmManagerName(nameInput)}
                disabled={!nameInput.trim()}
                className={`flex-1 px-4 py-2 text-xs font-bold text-white rounded-xl transition-colors ${
                  nameInput.trim() ? 'bg-calidad-blue hover:bg-blue-800' : 'bg-gray-200 cursor-not-allowed'
                }`}
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
                {activeTask?.machineTypeId && (
                  <> · Станок: <strong>{machineTypes.find(m => m.id === activeTask.machineTypeId)?.name}</strong></>
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
                  onChange={e => setGearText(e.target.value)}
                  placeholder="Клиент спросил про... / Не знал как ответить на... / Нужна кнопка..."
                  autoFocus
                />
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setGearUrgent(p => !p)}
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
};
