import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search, BookOpen, Pin, Cpu } from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { MicroPresentation, ScriptNode } from '../../types';

// ─── Category → stage label mapping ──────────────────────────────────────────

const STAGE_ORDER = ['Открытие', 'Квалификация', 'Возражения', 'Закрытие', 'Общее'];
const ALWAYS_SHOWN = new Set(['Формулировки']);

const STAGE_COLORS: Record<string, string> = {
  'Открытие':      'bg-blue-50   border-blue-200   text-blue-800',
  'Квалификация':  'bg-purple-50 border-purple-200 text-purple-800',
  'Возражения':    'bg-red-50    border-red-200    text-red-800',
  'Закрытие':      'bg-green-50  border-green-200  text-green-800',
  'Общее':         'bg-gray-50   border-gray-200   text-gray-700',
};

const STAGE_DOT: Record<string, string> = {
  'Открытие':      'bg-blue-400',
  'Квалификация':  'bg-purple-400',
  'Возражения':    'bg-red-400',
  'Закрытие':      'bg-green-400',
  'Общее':         'bg-gray-400',
};

// ─── MpAtomCard ───────────────────────────────────────────────────────────────

const MpAtomCard: React.FC<{ mp: MicroPresentation }> = ({ mp }) => {
  const [expanded, setExpanded] = useState(false);
  const isDraft = mp.isPublished === false;
  const hasSlots = mp.slotConditions && Object.keys(mp.slotConditions).length > 0;

  return (
    <div
      className={`rounded-xl border overflow-hidden cursor-pointer transition-shadow hover:shadow-sm ${isDraft ? 'border-dashed border-gray-200 bg-gray-50/50' : 'border-gray-200 bg-white'}`}
      onClick={() => setExpanded((p) => !p)}
    >
      <div className="flex items-start gap-2 px-3 pt-3 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-sm font-bold ${isDraft ? 'text-gray-500' : 'text-gray-800'}`}>{mp.title}</span>
            {isDraft && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold border border-amber-200">черновик</span>}
            {hasSlots && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold border border-emerald-200" title="Умный показ по слотам">авто</span>}
          </div>
          {(mp.tags ?? []).length > 0 && (
            <div className="flex gap-1 mt-0.5 flex-wrap">
              {(mp.tags ?? []).map((tag) => (
                <span key={tag} className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{tag}</span>
              ))}
            </div>
          )}
        </div>
        <button className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors mt-0.5">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100">
          {mp.technical && (
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Технический факт</p>
              <p className="text-xs text-gray-700 leading-relaxed">{mp.technical}</p>
            </div>
          )}
          {(mp.methodology || mp.content) && (
            <div className="px-3 py-2 bg-blue-50 border-b border-blue-100">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">Методология</p>
              <p className="text-xs text-blue-900 leading-relaxed">{mp.methodology || mp.content}</p>
            </div>
          )}
          {mp.compromise && (
            <div className="px-3 py-2 bg-amber-50">
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-0.5">Компромисс</p>
              <p className="text-xs text-amber-900 leading-relaxed">{mp.compromise}</p>
            </div>
          )}
          {hasSlots && (
            <div className="px-3 py-2 bg-emerald-50 border-t border-emerald-100">
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Условия авто-показа</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(mp.slotConditions!).map(([key, vals]) => (
                  <span key={key} className="text-[9px] bg-white border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded font-mono">
                    {key}: {(vals as string[]).join(' / ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── StageSection ─────────────────────────────────────────────────────────────

const StageSection: React.FC<{
  stage: string;
  scriptNode?: ScriptNode;
  mps: MicroPresentation[];
  defaultOpen?: boolean;
}> = ({ stage, scriptNode, mps, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  const colorClass = STAGE_COLORS[stage] ?? 'bg-gray-50 border-gray-200 text-gray-700';
  const dotClass = STAGE_DOT[stage] ?? 'bg-gray-400';

  if (mps.length === 0 && !scriptNode) return null;

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <button
        className={`w-full flex items-center gap-3 px-4 py-3 ${colorClass} border-b transition-colors`}
        onClick={() => setOpen((p) => !p)}
      >
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotClass}`} />
        <div className="flex-1 min-w-0 text-left">
          <span className="text-sm font-black uppercase tracking-wider">{stage}</span>
          {scriptNode && (
            <span className="ml-2 text-xs font-normal opacity-70 line-clamp-1">{scriptNode.title}</span>
          )}
        </div>
        <span className="text-xs font-bold opacity-60">{mps.length} атомов</span>
        {open ? <ChevronUp size={14} className="opacity-60" /> : <ChevronDown size={14} className="opacity-60" />}
      </button>

      {open && (
        <div className="bg-white">
          {scriptNode && (
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-start gap-2">
                <BookOpen size={12} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-gray-600">{scriptNode.title}</p>
                  {scriptNode.content && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{scriptNode.content}</p>
                  )}
                  {(scriptNode.tips ?? []).length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {(scriptNode.tips ?? []).slice(0, 3).map((tip, i) => (
                        <li key={i} className="text-[10px] text-gray-400 flex items-start gap-1">
                          <span className="text-calidad-blue mt-0.5">›</span> {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {mps.length > 0 && (
            <div className="p-3 grid gap-2">
              {mps.map((mp) => <MpAtomCard key={mp.id} mp={mp} />)}
            </div>
          )}

          {mps.length === 0 && (
            <div className="px-4 py-3 text-xs text-gray-400 italic">Нет атомов для этого этапа</div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── FormulationsSection ──────────────────────────────────────────────────────

const FormulationsSection: React.FC<{ mps: MicroPresentation[] }> = ({ mps }) => {
  const [open, setOpen] = useState(true);
  if (mps.length === 0) return null;
  return (
    <div className="rounded-2xl border-2 border-yellow-300 overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-yellow-50 border-b border-yellow-200"
        onClick={() => setOpen((p) => !p)}
      >
        <Pin size={14} className="text-yellow-600 flex-shrink-0" />
        <span className="flex-1 text-left text-sm font-black text-yellow-800 uppercase tracking-wider">
          Формулировки
        </span>
        <span className="text-xs font-bold text-yellow-600 mr-1">{mps.length} — видны всегда</span>
        {open ? <ChevronUp size={14} className="text-yellow-500" /> : <ChevronDown size={14} className="text-yellow-500" />}
      </button>
      {open && (
        <div className="bg-white p-3 grid gap-2">
          {mps.map((mp) => <MpAtomCard key={mp.id} mp={mp} />)}
        </div>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const HolisticLibraryView: React.FC = () => {
  const { microPresentations, scriptNodes, machineTypes } = useSalesStore();
  const [search, setSearch] = useState('');
  const [selectedMachineType, setSelectedMachineType] = useState<string>('all');
  const [showDrafts, setShowDrafts] = useState(true);

  const draftCount = microPresentations.filter((mp) => mp.isPublished === false).length;

  const filtered = useMemo(() => {
    let mps = microPresentations;
    if (!showDrafts) mps = mps.filter((mp) => mp.isPublished !== false);
    if (selectedMachineType !== 'all') {
      mps = mps.filter(
        (mp) => !mp.machineTypeIds?.length || mp.machineTypeIds.includes(selectedMachineType),
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      mps = mps.filter(
        (mp) =>
          mp.title.toLowerCase().includes(q) ||
          (mp.methodology || mp.content || '').toLowerCase().includes(q) ||
          (mp.technical || '').toLowerCase().includes(q) ||
          (mp.compromise || '').toLowerCase().includes(q) ||
          (mp.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }
    return mps;
  }, [microPresentations, search, selectedMachineType, showDrafts]);

  const getMpsForStage = (stage: string) =>
    filtered.filter((mp) => mp.category === stage);

  const getScriptNodeForStage = (stage: string) =>
    scriptNodes.find((n) => n.category === stage);

  const formulations = getMpsForStage('Формулировки');
  const totalFiltered = filtered.length;

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию, методологии, тегам..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-calidad-blue"
          />
        </div>

        {/* Machine type filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Cpu size={12} className="text-gray-400 flex-shrink-0" />
          <button
            onClick={() => setSelectedMachineType('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${selectedMachineType === 'all' ? 'bg-calidad-blue text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            Все станки
          </button>
          {machineTypes.map((mt) => (
            <button
              key={mt.id}
              onClick={() => setSelectedMachineType(mt.id)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${selectedMachineType === mt.id ? 'bg-calidad-blue text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {mt.name}
            </button>
          ))}
        </div>

        {/* Stats + draft toggle */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{totalFiltered} атомов</span>
          {draftCount > 0 && (
            <button
              onClick={() => setShowDrafts((p) => !p)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors font-bold ${showDrafts ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-gray-100 text-gray-400'}`}
            >
              {showDrafts ? '◉' : '○'} черновики ({draftCount})
            </button>
          )}
        </div>
      </div>

      {/* Formulations pinned at top */}
      <FormulationsSection mps={formulations} />

      {/* Script stages with linked MPs */}
      {STAGE_ORDER.map((stage) => (
        <StageSection
          key={stage}
          stage={stage}
          scriptNode={getScriptNodeForStage(stage)}
          mps={getMpsForStage(stage)}
          defaultOpen={stage === 'Открытие' || stage === 'Квалификация'}
        />
      ))}

      {/* Empty state */}
      {totalFiltered === 0 && (
        <div className="text-center py-12 text-gray-400">
          <BookOpen size={28} className="mx-auto opacity-20 mb-2" />
          <p className="text-sm">Ничего не найдено</p>
          <p className="text-xs mt-1">
            {search ? 'Попробуйте другой запрос' : 'Используйте Агента для наполнения базы знаний'}
          </p>
        </div>
      )}
    </div>
  );
};
