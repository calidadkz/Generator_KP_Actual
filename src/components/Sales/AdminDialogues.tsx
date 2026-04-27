import React, { useEffect, useRef, useState } from 'react';
import {
  Upload, Trash2, ChevronDown, ChevronUp, Sparkles,
  CheckCircle, AlertCircle, Loader, Plus, Cpu, XCircle,
  Wand2, BarChart2, RefreshCw,
} from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
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
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Портреты клиентов
              </p>
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
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Топ формулировки
              </p>
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
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Частые техники
              </p>
              <div className="flex flex-wrap gap-1.5">
                {insight.commonTechniques.map((t, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {insight.scriptSuggestions.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Рекомендации по скрипту
              </p>
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
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Запросы по типам станков
              </p>
              <div className="space-y-1">
                {Object.entries(insight.machineTypeBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{type}</span>
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {count}
                      </span>
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
    addScriptNode, updateScriptNode, addMicroPresentation, scriptNodes,
    migrateOldDialogues,
  } = useSalesStore();

  const fileRef = useRef<HTMLInputElement>(null);
  const [expandedClean, setExpandedClean] = useState<Record<string, boolean>>({});
  const [expandedAnalysis, setExpandedAnalysis] = useState<Record<string, boolean>>({});
  const [loadedTexts, setLoadedTexts] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[] | null>(null);
  const [checkingModels, setCheckingModels] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  useEffect(() => {
    migrateOldDialogues();
  }, []);

  // ── Upload pipeline ─────────────────────────────────────────────────────────

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
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
    });
  };

  const startCleanPipeline = async (id: string, rawText: string) => {
    // Save rawText to IndexedDB immediately so retry is always possible
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
      updateDialogue(id, { cleanStatus: 'ready' });
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
      // Clear stale cached preview
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

  // ── Add to script/library ────────────────────────────────────────────────────

  const [stepPicker, setStepPicker] = useState<string | null>(null);
  const [addedStepKeys, setAddedStepKeys] = useState<Set<string>>(new Set());

  // Close step picker when clicking outside
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
      const maxOrder = scriptNodes.length > 0 ? Math.max(...scriptNodes.map((n) => n.order)) : 0;
      addScriptNode({
        id: 'step-' + Date.now().toString(36) + stepIdx,
        order: maxOrder + 1,
        title: step.title,
        content: step.content,
        tips: step.tips ?? [],
      });
    } else {
      const target = scriptNodes.find((n) => n.id === targetNodeId);
      if (target) {
        const variantText = step.content.trim() || step.title;
        updateScriptNode(targetNodeId, {
          tips: [...(target.tips ?? []), variantText],
        });
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

  // ── Preview ──────────────────────────────────────────────────────────────────

  const loadCleanedText = async (d: DialogueRecord) => {
    if (!d.textRef || loadedTexts[d.id] !== undefined) return;
    try {
      const texts = await resolveDialogueTexts(d.textRef);
      setLoadedTexts((prev) => ({
        ...prev,
        [d.id]: texts?.cleanedText || texts?.rawText || 'Текст не найден',
      }));
    } catch {
      setLoadedTexts((prev) => ({ ...prev, [d.id]: 'Ошибка загрузки' }));
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

  // ── Derived ──────────────────────────────────────────────────────────────────

  const analyzedCount = dialogues.filter((d) => d.analysisStatus === 'done').length;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Диалоги</h3>
          <p className="text-xs text-gray-400 mt-0.5">{dialogues.length} загружено · {analyzedCount} проанализировано</p>
        </div>
        <button
          onClick={handleCheckModels}
          disabled={checkingModels}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-600 transition-colors disabled:opacity-50"
        >
          {checkingModels ? <Loader size={12} className="animate-spin" /> : <Cpu size={12} />}
          Проверить ключ
        </button>
      </div>

      {/* Available models panel */}
      {availableModels !== null && (
        <div className={`rounded-xl border p-4 ${availableModels.length > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {availableModels.length > 0 ? (
            <>
              <p className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1.5">
                <CheckCircle size={13} /> Доступно {availableModels.length} моделей для вашего ключа:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {availableModels.map((m) => (
                  <span key={m} className="px-2 py-0.5 bg-white border border-green-200 text-green-700 rounded-full text-[10px] font-bold">
                    {m}
                  </span>
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

      {/* Batch insights trigger panel */}
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
          {batchError && (
            <p className="mt-2 text-xs text-red-600">{batchError}</p>
          )}
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

      {/* Dialogue cards */}
      {dialogues.map((d) => (
        <div key={d.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Card header */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">
                    {d.filename}
                  </span>
                  <CleanBadge status={d.cleanStatus} />
                  <AnalysisBadge status={d.analysisStatus} />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(d.uploadedAt).toLocaleDateString('ru')}
                  {d.machineTypeHint && ` · ${d.machineTypeHint}`}
                </p>
                {d.clientType && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                    {d.clientType}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
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
                  onClick={() => deleteDialogue(d.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Model log (during/after analysis) */}
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

          {/* Expandable sections */}
          {(d.cleanStatus === 'ready' || d.analysisStatus === 'done') && (
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
                            {loadedTexts[d.id]}
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
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Тип клиента
                        </p>
                        <p className="text-sm text-gray-700">{d.extractedData.clientType}</p>
                        {d.extractedData.machineTypeHint && (
                          <p className="text-xs text-calidad-blue font-semibold mt-1">
                            Тип станка: {d.extractedData.machineTypeHint}
                          </p>
                        )}
                      </div>

                      {d.extractedData.conversationSteps.length > 0 && (
                        <div className="px-4 py-3">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Этапы разговора
                          </p>
                          <div className="space-y-2">
                            {d.extractedData.conversationSteps.map((step, i) => {
                              const pickerKey = `${d.id}-step-${i}`;
                              const isDone = addedStepKeys.has(pickerKey);
                              const isOpen = stepPicker === pickerKey;
                              return (
                                <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-700">{step.title}</p>
                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{step.content}</p>
                                  </div>
                                  {/* Smart step picker */}
                                  <div className="relative flex-shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                                    <button
                                      onMouseDown={() => setStepPicker(isOpen ? null : pickerKey)}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-all duration-200 ${
                                        isDone
                                          ? 'bg-green-500 text-white'
                                          : 'bg-calidad-blue text-white hover:bg-blue-800'
                                      }`}
                                    >
                                      {isDone ? <CheckCircle size={10} /> : <Plus size={10} />}
                                      {isDone ? 'Добавлено' : 'В скрипт'}
                                      {!isDone && <ChevronDown size={9} className="ml-0.5" />}
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
                                            {[...scriptNodes]
                                              .sort((a, b) => a.order - b.order)
                                              .map((node) => (
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
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Удачные формулировки
                          </p>
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
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Техники продаж
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {d.extractedData.techniques.map((t, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {d.extractedData.suggestedMicroPresentations.length > 0 && (
                        <div className="px-4 py-3">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Предложенные мини-презентации
                          </p>
                          <div className="space-y-2">
                            {d.extractedData.suggestedMicroPresentations.map((mp, i) => (
                              <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-gray-700">{mp.title}</p>
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{mp.content}</p>
                                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold mt-1 inline-block">
                                    {mp.category}
                                  </span>
                                </div>
                                {(() => {
                                  const key = `${d.id}-${i}`;
                                  const done = acceptedKeys.has(key);
                                  return (
                                    <button
                                      onClick={() => handleAddPresentation(d, i)}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-all duration-300 flex-shrink-0 ${
                                        done
                                          ? 'bg-emerald-500 text-white scale-105'
                                          : 'bg-green-600 text-white hover:bg-green-700'
                                      }`}
                                    >
                                      {done ? <CheckCircle size={10} /> : <Plus size={10} />}
                                      {done ? 'Принято ✓' : 'Принять'}
                                    </button>
                                  );
                                })()}
                              </div>
                            ))}
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
