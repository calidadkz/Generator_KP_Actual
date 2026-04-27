import React, { useEffect, useRef, useState } from 'react';
import {
  Upload, Trash2, ChevronDown, ChevronUp, Sparkles,
  CheckCircle, AlertCircle, Loader, Plus, Cpu, XCircle,
  Wand2, BarChart2, RefreshCw, Download, Edit2, Save, X,
  ShieldCheck, LayoutGrid, List,
} from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { useCloudSync } from '../../hooks/useCloudSync';
import {
  analyzeDialogue,
  cleanDialogueText,
  extractBatchInsights,
  listAvailableModels,
} from '../../services/dialogueProcessor';
import {
  resolveDialogueTexts,
  saveDialogueTexts,
  updateDialogueTexts,
} from '../../lib/dialogueStorage';
import {
  BatchInsights,
  DialogueRecord,
  MicroPresentation,
  ModelLogEntry,
  ScriptNode,
} from '../../types';

const BATCH_THRESHOLD = 5;

function newId() {
  return 'dlg-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? '');
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}

// ─── Small UI atoms ──────────────────────────────────────────────────────────

function ModelLogBadge({ entry }: { entry: ModelLogEntry }) {
  const [tip, setTip] = useState(false);
  const colors = {
    ok: 'bg-green-100 text-green-700 border-green-200',
    blocked: 'bg-orange-100 text-orange-600 border-orange-200',
    error: 'bg-red-100 text-red-600 border-red-200',
  };
  const icons = {
    ok: <CheckCircle size={10} />,
    blocked: <XCircle size={10} />,
    error: <AlertCircle size={10} />,
  };
  return (
    <div className="relative inline-block">
      <span
        className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold cursor-default ${colors[entry.status]}`}
        onMouseEnter={() => setTip(true)}
        onMouseLeave={() => setTip(false)}
      >
        {icons[entry.status]} {entry.model}
      </span>
      {tip && entry.message && (
        <div className="absolute bottom-full left-0 mb-1 w-64 bg-gray-900 text-white text-[10px] rounded-lg p-2 z-50 leading-relaxed shadow-xl">
          {entry.message}
        </div>
      )}
    </div>
  );
}

function ModelLog({ log }: { log: ModelLogEntry[] }) {
  const [open, setOpen] = useState(false);
  const ok = log.find((e) => e.status === 'ok');
  const blocked = log.filter((e) => e.status === 'blocked');
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 flex-wrap">
        {ok && (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold border border-green-200">
            <CheckCircle size={12} /> Рабочая: <strong>{ok.model}</strong>
          </span>
        )}
        {blocked.length > 0 && (
          <button
            onClick={() => setOpen((p) => !p)}
            className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold border border-orange-200 hover:bg-orange-100 transition-colors"
          >
            <XCircle size={12} /> {blocked.length} заблокировано
            {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 flex flex-wrap gap-1">
          {log.map((entry, i) => (
            <ModelLogBadge key={i} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function CleanBadge({ status }: { status: DialogueRecord['cleanStatus'] }) {
  if (status === 'pending') return null;
  if (status === 'cleaning')
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold border border-blue-200">
        <Loader size={9} className="animate-spin" /> Очистка...
      </span>
    );
  if (status === 'ready')
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold border border-green-200">
        <Wand2 size={9} /> Очищено
      </span>
    );
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-bold border border-red-200">
      <XCircle size={9} /> Ошибка очистки
    </span>
  );
}

function AnalysisBadge({ status }: { status: DialogueRecord['analysisStatus'] }) {
  if (status === 'pending') return null;
  if (status === 'analyzing')
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold border border-purple-200">
        <Loader size={9} className="animate-spin" /> Анализ...
      </span>
    );
  if (status === 'done')
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-200">
        <CheckCircle size={9} /> Проанализировано
      </span>
    );
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-bold border border-red-200">
      <AlertCircle size={9} /> Ошибка анализа
    </span>
  );
}

// ─── BatchInsightCard ─────────────────────────────────────────────────────────

function BatchInsightCard({
  insight,
  onDelete,
  onAddFormulation,
  onAddSuggestion,
}: {
  insight: BatchInsights;
  onDelete: () => void;
  onAddFormulation: (text: string) => void;
  onAddSuggestion: (text: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white rounded-xl border border-indigo-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-indigo-50">
        <div>
          <h4 className="text-sm font-bold text-indigo-800">
            Закономерности · {insight.dialogueCount} диалогов
          </h4>
          <p className="text-xs text-indigo-400 mt-0.5">
            {new Date(insight.generatedAt).toLocaleDateString('ru')}
            {insight.usedModel && ` · ${insight.usedModel}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen((p) => !p)}
            className="p-1 text-indigo-500 hover:text-indigo-700 transition-colors"
          >
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {open && (
        <div className="divide-y divide-gray-100">
          {insight.clientPortraits.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Портреты клиентов</p>
              <ul className="space-y-1">
                {insight.clientPortraits.map((p, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                    <span className="text-indigo-500 mt-0.5 flex-shrink-0">›</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {insight.topFormulations.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Топ формулировки</p>
              <div className="space-y-1.5">
                {insight.topFormulations.map((f, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-700 flex-1">{f}</p>
                    <button
                      onClick={() => onAddFormulation(f)}
                      className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 whitespace-nowrap flex-shrink-0"
                    >
                      <Plus size={10} /> В скрипт
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {insight.commonTechniques.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Частые техники</p>
              <div className="flex flex-wrap gap-1.5">
                {insight.commonTechniques.map((t, i) => (
                  <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">{t}</span>
                ))}
              </div>
            </div>
          )}
          {insight.scriptSuggestions.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Рекомендации по скрипту</p>
              <div className="space-y-1.5">
                {insight.scriptSuggestions.map((s, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-700 flex-1">{s}</p>
                    <button
                      onClick={() => onAddSuggestion(s)}
                      className="flex items-center gap-1 text-[10px] font-bold text-green-600 hover:text-green-800 whitespace-nowrap flex-shrink-0"
                    >
                      <Plus size={10} /> В скрипт
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Object.keys(insight.machineTypeBreakdown).length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Запросы по типам станков</p>
              <div className="space-y-1">
                {Object.entries(insight.machineTypeBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{type}</span>
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const AdminDialogues: React.FC = () => {
  const {
    dialogues, addDialogue, updateDialogue, deleteDialogue,
    batchInsights, addBatchInsight, deleteBatchInsight,
    addScriptNode, updateScriptNode, addMicroPresentation,
    scriptNodes, microPresentations,
    migrateOldDialogues,
    machineTypes,
  } = useSalesStore();

  // Initialize cloud sync
  const { pushDialogueToCloud, syncDialogueUpdate, deleteDialogueFromCloud } = useCloudSync();

  const fileRef = useRef<HTMLInputElement>(null);
  const [expandedClean, setExpandedClean] = useState<Record<string, boolean>>({});
  const [expandedAnalysis, setExpandedAnalysis] = useState<Record<string, boolean>>({});
  const [loadedTexts, setLoadedTexts] = useState<Record<string, { raw: string; cleaned: string }>>({});
  const [dragOver, setDragOver] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[] | null>(null);
  const [checkingModels, setCheckingModels] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Dedup flash: keys that are "already exists"
  const [dupFlashKeys, setDupFlashKeys] = useState<Set<string>>(new Set());

  // Inline editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Grouping view
  const [groupByMachine, setGroupByMachine] = useState(false);

  // Duplicate upload warning
  const [dupUploadWarning, setDupUploadWarning] = useState<{ filename: string; file: File } | null>(null);

  useEffect(() => {
    migrateOldDialogues();
  }, []);

  // ── Dedup flash helper ──────────────────────────────────────────────────────

  const flashDup = (key: string) => {
    setDupFlashKeys((prev) => new Set([...prev, key]));
    setTimeout(() => {
      setDupFlashKeys((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }, 2000);
  };

  // ── Upload pipeline ─────────────────────────────────────────────────────────

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const existing = dialogues.find((d) => d.filename === file.name);
      if (existing) {
        setDupUploadWarning({ filename: file.name, file });
        return;
      }
      uploadFile(file);
    });
  };

  const uploadFile = (file: File) => {
    const id = newId();
    addDialogue({
      id,
      filename: file.name,
      uploadedAt: new Date().toISOString(),
      cleanStatus: 'cleaning',
      analysisStatus: 'pending',
    });
    readFileAsText(file)
      .then((rawText) => startCleanPipeline(id, rawText))
      .catch(() =>
        updateDialogue(id, { cleanStatus: 'error', cleanErrorMessage: 'Не удалось прочитать файл' }),
      );
  };

  const startCleanPipeline = async (id: string, rawText: string) => {
    let ref: string;
    try {
      ref = await saveDialogueTexts({ rawText, cleanedText: '' });
      updateDialogue(id, { textRef: ref });
    } catch {
      updateDialogue(id, { cleanStatus: 'error', cleanErrorMessage: 'Ошибка сохранения в хранилище' });
      return;
    }
    await runCleaning(id, ref, rawText);
  };

  const runCleaning = async (id: string, ref: string, rawText: string) => {
    updateDialogue(id, { cleanStatus: 'cleaning', cleanErrorMessage: undefined });
    try {
      const cleanedText = await cleanDialogueText(rawText);
      await updateDialogueTexts(ref, { rawText, cleanedText });
      const updated = { cleanStatus: 'ready' as const };
      updateDialogue(id, updated);
      // Sync to cloud after cleaning completes
      const dialogue = useSalesStore.getState().dialogues.find((d) => d.id === id);
      if (dialogue) {
        try {
          await pushDialogueToCloud(dialogue);
        } catch (cloudErr) {
          console.error('Failed to push dialogue to cloud:', cloudErr);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      updateDialogue(id, { cleanStatus: 'error', cleanErrorMessage: msg });
    }
  };

  const handleRetryClean = async (d: DialogueRecord) => {
    if (!d.textRef) return;
    try {
      const texts = await resolveDialogueTexts(d.textRef);
      if (!texts) {
        updateDialogue(d.id, { cleanStatus: 'error', cleanErrorMessage: 'Текст не найден в хранилище' });
        return;
      }
      await runCleaning(d.id, d.textRef, texts.rawText);
      setLoadedTexts((prev) => { const n = { ...prev }; delete n[d.id]; return n; });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      updateDialogue(d.id, { cleanStatus: 'error', cleanErrorMessage: msg });
    }
  };

  // ── Analysis ────────────────────────────────────────────────────────────────

  const handleAnalyze = async (d: DialogueRecord) => {
    if (!d.textRef) return;
    updateDialogue(d.id, { analysisStatus: 'analyzing', errorMessage: undefined, modelLog: [], usedModel: undefined });
    try {
      const texts = await resolveDialogueTexts(d.textRef);
      if (!texts) throw new Error('Текст не найден в хранилище');
      const result = await analyzeDialogue(texts.cleanedText || texts.rawText, (entry) => {
        const current = useSalesStore.getState().dialogues.find((x) => x.id === d.id)?.modelLog ?? [];
        updateDialogue(d.id, { modelLog: [...current, entry] });
      });
      updateDialogue(d.id, {
        analysisStatus: 'done',
        extractedData: result.data,
        clientType: result.data.clientType,
        machineTypeHint: result.data.machineTypeHint,
        usedModel: result.usedModel,
        modelLog: result.log,
      });
      setExpandedAnalysis((p) => ({ ...p, [d.id]: true }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      updateDialogue(d.id, { analysisStatus: 'error', errorMessage: msg });
    }
  };

  // ── Batch insights ──────────────────────────────────────────────────────────

  const handleBatchInsights = async () => {
    const done = dialogues.filter((d) => d.analysisStatus === 'done' && d.extractedData);
    if (done.length < BATCH_THRESHOLD) return;
    setBatchProcessing(true);
    setBatchError(null);
    try {
      const insights = await extractBatchInsights(done.map((d) => d.extractedData!));
      addBatchInsight(insights);
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : String(err));
    } finally {
      setBatchProcessing(false);
    }
  };

  // ── Add to script/library with dedup ────────────────────────────────────────

  const [stepPicker, setStepPicker] = useState<string | null>(null);
  const [addedStepKeys, setAddedStepKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!stepPicker) return;
    const close = () => setStepPicker(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [stepPicker]);

  const handleAddStepTo = (d: DialogueRecord, stepIdx: number, targetNodeId: 'new' | string) => {
    if (!d.extractedData) return;
    const step = d.extractedData.conversationSteps[stepIdx];
    const key = `${d.id}-step-${stepIdx}`;

    if (targetNodeId === 'new') {
      const content = step.content.trim();
      const isDup = scriptNodes.some((n) => n.content.trim() === content);
      if (isDup) { flashDup(key); setStepPicker(null); return; }
      const maxOrder = scriptNodes.length > 0 ? Math.max(...scriptNodes.map((n) => n.order)) : 0;
      addScriptNode({
        id: 'step-' + Date.now().toString(36) + stepIdx,
        order: maxOrder + 1,
        title: step.title,
        content,
        tips: step.tips ?? [],
      });
    } else {
      const target = scriptNodes.find((n) => n.id === targetNodeId);
      if (target) {
        const variantText = step.content.trim() || step.title;
        const alreadyTip = (target.tips ?? []).some((t) => t.trim() === variantText);
        if (alreadyTip) { flashDup(key); setStepPicker(null); return; }
        updateScriptNode(targetNodeId, { tips: [...(target.tips ?? []), variantText] });
      }
    }

    setAddedStepKeys((prev) => new Set([...prev, key]));
    setTimeout(() => {
      setAddedStepKeys((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }, 2000);
    setStepPicker(null);
  };

  const [acceptedKeys, setAcceptedKeys] = useState<Set<string>>(new Set());

  const handleAddPresentation = (d: DialogueRecord, idx: number) => {
    if (!d.extractedData) return;
    const key = `${d.id}-${idx}`;
    const src = d.extractedData.suggestedMicroPresentations[idx];
    const isDup = microPresentations.some((mp) => mp.content.trim() === src.content.trim());
    if (isDup) { flashDup(key); return; }
    const mp: MicroPresentation = {
      ...src,
      id: 'mp-' + Date.now().toString(36) + idx,
      machineTypeIds: src.machineTypeIds ?? [],
      tags: src.tags ?? [],
    };
    addMicroPresentation(mp);
    setAcceptedKeys((prev) => new Set([...prev, key]));
    setTimeout(() => {
      setAcceptedKeys((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }, 2000);
  };

  const handleAddFormulation = (text: string) => {
    const isDup = microPresentations.some((mp) => mp.content.trim() === text.trim());
    if (isDup) return;
    const mp: MicroPresentation = {
      id: 'mp-' + Date.now().toString(36),
      title: text.length > 50 ? text.slice(0, 50) + '...' : text,
      content: text,
      category: 'Формулировки',
      machineTypeIds: [],
      tags: ['из анализа'],
    };
    addMicroPresentation(mp);
  };

  const handleAddSuggestion = (text: string) => {
    const isDup = scriptNodes.some((n) => n.content.trim() === text.trim());
    if (isDup) return;
    const maxOrder = scriptNodes.length > 0 ? Math.max(...scriptNodes.map((n) => n.order)) : 0;
    const node: ScriptNode = {
      id: 'step-' + Date.now().toString(36),
      order: maxOrder + 1,
      title: text.length > 50 ? text.slice(0, 50) + '...' : text,
      content: text,
      tips: [],
    };
    addScriptNode(node);
  };

  // ── Inline text editor ───────────────────────────────────────────────────────

  const openEditor = async (d: DialogueRecord) => {
    if (!d.textRef) return;
    const texts = loadedTexts[d.id];
    if (texts) {
      setEditDraft(texts.cleaned || texts.raw);
    } else {
      try {
        const t = await resolveDialogueTexts(d.textRef);
        const cleaned = t?.cleanedText || t?.rawText || '';
        setLoadedTexts((prev) => ({ ...prev, [d.id]: { raw: t?.rawText || '', cleaned } }));
        setEditDraft(cleaned);
      } catch {
        setEditDraft('');
      }
    }
    setEditingId(d.id);
  };

  const saveEdit = async (d: DialogueRecord) => {
    if (!d.textRef) return;
    setSavingEdit(true);
    try {
      const stored = await resolveDialogueTexts(d.textRef);
      await updateDialogueTexts(d.textRef, { rawText: stored?.rawText || editDraft, cleanedText: editDraft });
      setLoadedTexts((prev) => ({ ...prev, [d.id]: { raw: stored?.rawText || editDraft, cleaned: editDraft } }));
      setEditingId(null);
    } catch {
      // keep editor open
    } finally {
      setSavingEdit(false);
    }
  };

  const handleReClean = async (d: DialogueRecord) => {
    if (!d.textRef) return;
    const stored = await resolveDialogueTexts(d.textRef);
    if (!stored) return;
    setEditingId(null);
    await runCleaning(d.id, d.textRef, stored.rawText);
    setLoadedTexts((prev) => { const n = { ...prev }; delete n[d.id]; return n; });
  };

  // ── Cloud sync helpers ──────────────────────────────────────────────────────

  const handleDelete = async (dialogueId: string) => {
    deleteDialogue(dialogueId);
    try {
      await deleteDialogueFromCloud(dialogueId);
    } catch (err) {
      console.error('Failed to delete from cloud:', err);
    }
  };

  const handleMachineTypeToggle = async (d: DialogueRecord, machineTypeId: string) => {
    const cur = d.machineTypeIds ?? [];
    const linked = cur.includes(machineTypeId);
    const newIds = linked ? cur.filter((x) => x !== machineTypeId) : [...cur, machineTypeId];
    updateDialogue(d.id, { machineTypeIds: newIds });
    try {
      await syncDialogueUpdate(d.id, { machineTypeIds: newIds });
    } catch (err) {
      console.error('Failed to sync machine type update:', err);
    }
  };

  // ── Download ─────────────────────────────────────────────────────────────────

  const handleDownload = async (d: DialogueRecord) => {
    if (!d.textRef) return;
    const texts = loadedTexts[d.id]
      ? loadedTexts[d.id]
      : await resolveDialogueTexts(d.textRef).then((t) => ({ raw: t?.rawText || '', cleaned: t?.cleanedText || '' }));
    const content = texts.cleaned || texts.raw;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = d.filename.replace(/\.[^.]+$/, '') + '_clean.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Preview load ─────────────────────────────────────────────────────────────

  const loadCleanedText = async (d: DialogueRecord) => {
    if (!d.textRef || loadedTexts[d.id] !== undefined) return;
    try {
      const texts = await resolveDialogueTexts(d.textRef);
      setLoadedTexts((prev) => ({
        ...prev,
        [d.id]: { raw: texts?.rawText || '', cleaned: texts?.cleanedText || texts?.rawText || '' },
      }));
    } catch {
      setLoadedTexts((prev) => ({ ...prev, [d.id]: { raw: 'Ошибка загрузки', cleaned: 'Ошибка загрузки' } }));
    }
  };

  // ── Model check ──────────────────────────────────────────────────────────────

  const handleCheckModels = async () => {
    setCheckingModels(true);
    try {
      const models = await listAvailableModels();
      setAvailableModels(models);
    } catch {
      setAvailableModels([]);
    } finally {
      setCheckingModels(false);
    }
  };

  // ── Grouping ─────────────────────────────────────────────────────────────────

  const groupedDialogues = (): Array<{ label: string; items: DialogueRecord[] }> => {
    if (!groupByMachine) return [{ label: '', items: dialogues }];
    const groups: Record<string, DialogueRecord[]> = {};
    for (const d of dialogues) {
      const ids = d.machineTypeIds ?? [];
      if (ids.length === 0) {
        (groups['__none__'] ??= []).push(d);
      } else {
        for (const mid of ids) {
          (groups[mid] ??= []).push(d);
        }
      }
    }
    return Object.entries(groups).map(([key, items]) => ({
      label: key === '__none__'
        ? 'Без категории'
        : (machineTypes.find((m) => m.id === key)?.name ?? key),
      items,
    }));
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const analyzedCount = dialogues.filter((d) => d.analysisStatus === 'done').length;
  const cleanCount = dialogues.filter((d) => d.isClean).length;

  // ── Render dialogue card ──────────────────────────────────────────────────────

  const renderCard = (d: DialogueRecord) => {
    const isEditing = editingId === d.id;

    return (
      <div key={d.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Card header */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">
                  {d.filename}
                </span>
                {d.isClean && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-200">
                    <ShieldCheck size={9} /> Чистовой
                  </span>
                )}
                <CleanBadge status={d.cleanStatus} />
                <AnalysisBadge status={d.analysisStatus} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(d.uploadedAt).toLocaleDateString('ru')}
                {d.machineTypeHint && ` · ${d.machineTypeHint}`}
              </p>
              {d.clientType && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{d.clientType}</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
              {/* Mark clean toggle */}
              {d.cleanStatus === 'ready' && (
                <button
                  onClick={() => updateDialogue(d.id, { isClean: !d.isClean })}
                  title={d.isClean ? 'Снять пометку чистового' : 'Пометить как чистовой'}
                  className={`p-1.5 rounded-lg transition-colors ${
                    d.isClean
                      ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                      : 'text-gray-300 hover:text-emerald-500'
                  }`}
                >
                  <ShieldCheck size={14} />
                </button>
              )}
              {/* Edit button */}
              {d.cleanStatus === 'ready' && !isEditing && (
                <button
                  onClick={() => openEditor(d)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold transition-colors"
                >
                  <Edit2 size={11} /> Редактировать
                </button>
              )}
              {/* Download button */}
              {d.cleanStatus === 'ready' && (
                <button
                  onClick={() => handleDownload(d)}
                  className="p-1.5 text-gray-300 hover:text-calidad-blue transition-colors"
                  title="Скачать очищенный текст"
                >
                  <Download size={14} />
                </button>
              )}
              {d.cleanStatus === 'error' && (
                <button
                  onClick={() => handleRetryClean(d)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors"
                >
                  <RefreshCw size={11} /> Очистить
                </button>
              )}
              {d.cleanStatus === 'ready' && d.analysisStatus === 'pending' && (
                <button
                  onClick={() => handleAnalyze(d)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-calidad-blue text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors"
                >
                  <Sparkles size={12} /> Анализировать
                </button>
              )}
              {d.analysisStatus === 'error' && (
                <button
                  onClick={() => handleAnalyze(d)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
                >
                  <RefreshCw size={11} /> Повторить
                </button>
              )}
              <button
                onClick={() => handleDelete(d.id)}
                className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Machine type tags */}
          <div className="mt-2 flex flex-wrap gap-1.5 items-center">
            {machineTypes.map((mt) => {
              const linked = (d.machineTypeIds ?? []).includes(mt.id);
              return (
                <button
                  key={mt.id}
                  onClick={() => handleMachineTypeToggle(d, mt.id)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                    linked
                      ? 'bg-calidad-blue text-white'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {mt.name}
                </button>
              );
            })}
          </div>

          {/* Model log */}
          {(d.modelLog ?? []).length > 0 && <ModelLog log={d.modelLog!} />}

          {/* Error messages */}
          {d.cleanErrorMessage && (
            <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs text-red-600">{d.cleanErrorMessage}</p>
            </div>
          )}
          {d.errorMessage && d.analysisStatus === 'error' && (
            <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs text-red-600">{d.errorMessage}</p>
            </div>
          )}
        </div>

        {/* Inline editor */}
        {isEditing && (
          <div className="border-t border-blue-100 px-4 pb-4 pt-3 bg-blue-50/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                <Edit2 size={11} /> Редактирование текста
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReClean(d)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-xs font-bold transition-colors"
                >
                  <Wand2 size={11} /> Авто-правка ИИ
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <textarea
              className="w-full text-xs text-gray-700 border border-blue-200 rounded-lg p-3 resize-none focus:outline-none focus:border-calidad-blue bg-white"
              rows={10}
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={() => saveEdit(d)}
                disabled={savingEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-calidad-blue text-white rounded-lg text-xs font-bold hover:bg-blue-800 disabled:opacity-50 transition-colors"
              >
                {savingEdit ? <Loader size={12} className="animate-spin" /> : <Save size={12} />}
                Сохранить
              </button>
            </div>
          </div>
        )}

        {/* Expandable sections */}
        {!isEditing && (d.cleanStatus === 'ready' || d.analysisStatus === 'done') && (
          <div className="border-t border-gray-100">
            {/* Clean text preview */}
            {d.cleanStatus === 'ready' && d.textRef && (
              <>
                <button
                  onClick={() => {
                    const next = !expandedClean[d.id];
                    setExpandedClean((p) => ({ ...p, [d.id]: next }));
                    if (next) loadCleanedText(d);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold flex items-center gap-1.5">
                    <Wand2 size={11} /> Очищенный текст
                  </span>
                  {expandedClean[d.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {expandedClean[d.id] && (
                  <div className="px-4 pb-3">
                    <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto border border-gray-100">
                      {loadedTexts[d.id] === undefined ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Loader size={11} className="animate-spin" /> Загрузка...
                        </div>
                      ) : (
                        <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                          {loadedTexts[d.id].cleaned || loadedTexts[d.id].raw}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Analysis results */}
            {d.analysisStatus === 'done' && d.extractedData && (
              <>
                <button
                  onClick={() => setExpandedAnalysis((p) => ({ ...p, [d.id]: !p[d.id] }))}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors border-t border-gray-100"
                >
                  <span className="font-semibold flex items-center gap-1.5">
                    <CheckCircle size={11} /> Результаты анализа
                  </span>
                  {expandedAnalysis[d.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {expandedAnalysis[d.id] && (
                  <div className="divide-y divide-gray-100">
                    <div className="px-4 py-3">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Тип клиента</p>
                      <p className="text-sm text-gray-700">{d.extractedData.clientType}</p>
                      {d.extractedData.machineTypeHint && (
                        <p className="text-xs text-calidad-blue font-semibold mt-1">
                          Тип станка: {d.extractedData.machineTypeHint}
                        </p>
                      )}
                    </div>

                    {d.extractedData.conversationSteps.length > 0 && (
                      <div className="px-4 py-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Этапы разговора</p>
                        <div className="space-y-2">
                          {d.extractedData.conversationSteps.map((step, i) => {
                            const pickerKey = `${d.id}-step-${i}`;
                            const isDone = addedStepKeys.has(pickerKey);
                            const isDup = dupFlashKeys.has(pickerKey);
                            const isOpen = stepPicker === pickerKey;
                            return (
                              <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-gray-700">{step.title}</p>
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{step.content}</p>
                                </div>
                                <div className="relative flex-shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                                  <button
                                    onMouseDown={() => !isDone && !isDup && setStepPicker(isOpen ? null : pickerKey)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-all duration-200 ${
                                      isDup
                                        ? 'bg-amber-400 text-white cursor-default'
                                        : isDone
                                        ? 'bg-green-500 text-white'
                                        : 'bg-calidad-blue text-white hover:bg-blue-800'
                                    }`}
                                  >
                                    {isDup ? (
                                      <><XCircle size={10} /> Уже есть</>
                                    ) : isDone ? (
                                      <><CheckCircle size={10} /> Добавлено</>
                                    ) : (
                                      <><Plus size={10} /> В скрипт <ChevronDown size={9} className="ml-0.5" /></>
                                    )}
                                  </button>

                                  {isOpen && (
                                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-56 py-1.5 max-h-64 overflow-y-auto">
                                      <button
                                        onMouseDown={() => handleAddStepTo(d, i, 'new')}
                                        className="w-full text-left px-3 py-2 text-xs font-bold text-calidad-blue hover:bg-blue-50 flex items-center gap-1.5"
                                      >
                                        <Plus size={10} /> Новый этап в скрипте
                                      </button>
                                      {scriptNodes.length > 0 && (
                                        <>
                                          <div className="border-t border-gray-100 my-1" />
                                          <p className="px-3 pt-1 pb-0.5 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                                            Добавить пример в →
                                          </p>
                                          {[...scriptNodes].sort((a, b) => a.order - b.order).map((node) => (
                                            <button
                                              key={node.id}
                                              onMouseDown={() => handleAddStepTo(d, i, node.id)}
                                              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                                            >
                                              <span className="w-4 h-4 rounded-full bg-calidad-blue text-white text-[9px] font-black flex items-center justify-center flex-shrink-0">
                                                {node.order}
                                              </span>
                                              <span className="truncate">{node.title}</span>
                                            </button>
                                          ))}
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {d.extractedData.formulations.length > 0 && (
                      <div className="px-4 py-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Удачные формулировки</p>
                        <ul className="space-y-1">
                          {d.extractedData.formulations.map((f, i) => (
                            <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                              <span className="text-calidad-blue mt-0.5 flex-shrink-0">›</span> {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {d.extractedData.techniques.length > 0 && (
                      <div className="px-4 py-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Техники продаж</p>
                        <div className="flex flex-wrap gap-1.5">
                          {d.extractedData.techniques.map((t, i) => (
                            <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {d.extractedData.suggestedMicroPresentations.length > 0 && (
                      <div className="px-4 py-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Предложенные мини-презентации</p>
                        <div className="space-y-2">
                          {d.extractedData.suggestedMicroPresentations.map((mp, i) => {
                            const key = `${d.id}-${i}`;
                            const done = acceptedKeys.has(key);
                            const isDup = dupFlashKeys.has(key);
                            return (
                              <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-gray-700">{mp.title}</p>
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{mp.content}</p>
                                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold mt-1 inline-block">{mp.category}</span>
                                </div>
                                <button
                                  onClick={() => !done && !isDup && handleAddPresentation(d, i)}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-all duration-300 flex-shrink-0 ${
                                    isDup
                                      ? 'bg-amber-400 text-white cursor-default'
                                      : done
                                      ? 'bg-emerald-500 text-white scale-105'
                                      : 'bg-green-600 text-white hover:bg-green-700'
                                  }`}
                                >
                                  {isDup ? (
                                    <><XCircle size={10} /> Уже есть</>
                                  ) : done ? (
                                    <><CheckCircle size={10} /> Принято</>
                                  ) : (
                                    <><Plus size={10} /> Принять</>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const groups = groupedDialogues();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Диалоги</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {dialogues.length} загружено · {analyzedCount} проанализировано
            {cleanCount > 0 && ` · ${cleanCount} чистовых`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Group by machine toggle */}
          <button
            onClick={() => setGroupByMachine((p) => !p)}
            title={groupByMachine ? 'Показать списком' : 'Группировать по станку'}
            className={`p-1.5 rounded-lg transition-colors ${groupByMachine ? 'bg-calidad-blue text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            {groupByMachine ? <List size={14} /> : <LayoutGrid size={14} />}
          </button>
          <button
            onClick={handleCheckModels}
            disabled={checkingModels}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-600 transition-colors disabled:opacity-50"
          >
            {checkingModels ? <Loader size={12} className="animate-spin" /> : <Cpu size={12} />}
            Проверить ключ
          </button>
        </div>
      </div>

      {/* Duplicate upload warning */}
      {dupUploadWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-amber-800">Файл уже загружен</p>
            <p className="text-xs text-amber-600 mt-0.5">«{dupUploadWarning.filename}» уже есть в библиотеке. Загрузить повторно?</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { uploadFile(dupUploadWarning.file); setDupUploadWarning(null); }}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors"
            >
              Загрузить
            </button>
            <button
              onClick={() => setDupUploadWarning(null)}
              className="px-3 py-1.5 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Available models panel */}
      {availableModels !== null && (
        <div className={`rounded-xl border p-4 ${availableModels.length > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {availableModels.length > 0 ? (
            <>
              <p className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1.5">
                <CheckCircle size={13} /> Доступно {availableModels.length} моделей:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {availableModels.map((m) => (
                  <span key={m} className="px-2 py-0.5 bg-white border border-green-200 text-green-700 rounded-full text-[10px] font-bold">{m}</span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs font-bold text-red-600 flex items-center gap-1.5">
              <AlertCircle size={13} /> Ключ не даёт доступа ни к одной модели
            </p>
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${dragOver ? 'border-calidad-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      >
        <Upload size={24} className="mx-auto text-gray-400 mb-2" />
        <p className="text-sm font-semibold text-gray-500">Перетащите файлы сюда</p>
        <p className="text-xs text-gray-400 mt-1">или нажмите для выбора (.txt, .md)</p>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Batch insights trigger */}
      {analyzedCount >= BATCH_THRESHOLD && (
        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-indigo-800 flex items-center gap-1.5">
                <BarChart2 size={14} /> Анализ закономерностей
              </h4>
              <p className="text-xs text-indigo-500 mt-0.5">Готово к анализу: {analyzedCount} диалогов</p>
            </div>
            <button
              onClick={handleBatchInsights}
              disabled={batchProcessing}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-60 flex-shrink-0"
            >
              {batchProcessing ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Извлечь закономерности
            </button>
          </div>
          {batchError && <p className="mt-2 text-xs text-red-600">{batchError}</p>}
        </div>
      )}

      {/* Batch insight cards */}
      {batchInsights.map((bi) => (
        <BatchInsightCard
          key={bi.id}
          insight={bi}
          onDelete={() => deleteBatchInsight(bi.id)}
          onAddFormulation={handleAddFormulation}
          onAddSuggestion={handleAddSuggestion}
        />
      ))}

      {/* Dialogue cards — grouped or flat */}
      {groups.map((group) => (
        <div key={group.label}>
          {groupByMachine && (
            <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
              <Cpu size={13} className="text-gray-400" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{group.label}</span>
              <span className="text-xs text-gray-400">({group.items.length})</span>
            </div>
          )}
          <div className="space-y-3">
            {group.items.map((d) => renderCard(d))}
          </div>
        </div>
      ))}

      {dialogues.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">Загрузите первый файл с расшифровкой разговора</p>
          <p className="text-xs mt-1">Файл автоматически очистится от артефактов распознавания</p>
        </div>
      )}
    </div>
  );
};
