import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight, Search, BookOpen, ChevronLeft, ChevronRight as ChevronRightIcon, Cpu } from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { MicroPresentation } from '../../types';

const ALWAYS_SHOWN_CATEGORY = 'Формулировки';
const GENERAL_KEY = '__general__';

const DOT_PALETTE = [
  'bg-yellow-400', 'bg-blue-400', 'bg-purple-400', 'bg-red-400',
  'bg-green-400',  'bg-teal-400', 'bg-indigo-400', 'bg-pink-400',
  'bg-orange-400', 'bg-cyan-400',
];
const ACTIVE_PALETTE = [
  'bg-yellow-50 text-yellow-800 border-l-2 border-yellow-400',
  'bg-blue-50 text-blue-800 border-l-2 border-blue-400',
  'bg-purple-50 text-purple-800 border-l-2 border-purple-400',
  'bg-red-50 text-red-800 border-l-2 border-red-400',
  'bg-green-50 text-green-800 border-l-2 border-green-400',
  'bg-teal-50 text-teal-800 border-l-2 border-teal-400',
  'bg-indigo-50 text-indigo-800 border-l-2 border-indigo-400',
  'bg-pink-50 text-pink-800 border-l-2 border-pink-400',
  'bg-orange-50 text-orange-800 border-l-2 border-orange-400',
  'bg-cyan-50 text-cyan-800 border-l-2 border-cyan-400',
];

function getCategoryStyle(colorIndex: number) {
  const i = colorIndex % DOT_PALETTE.length;
  return { dot: DOT_PALETTE[i], active: ACTIVE_PALETTE[i] };
}

function gapCount(atoms: MicroPresentation[]): number {
  return atoms.filter(
    (mp) => !mp.technical || !(mp.methodology || mp.content) || !mp.compromise,
  ).length;
}

// ─── Atom block fill dots ─────────────────────────────────────────────────────

const AtomBlockDots: React.FC<{ mp: MicroPresentation }> = ({ mp }) => (
  <span className="flex items-center gap-0.5 flex-shrink-0">
    <span title="Технический факт"  className={`w-1.5 h-1.5 rounded-full ${mp.technical ? 'bg-gray-400' : 'bg-gray-200'}`} />
    <span title="Методология"       className={`w-1.5 h-1.5 rounded-full ${(mp.methodology || mp.content) ? 'bg-blue-400' : 'bg-gray-200'}`} />
    <span title="Компромисс"        className={`w-1.5 h-1.5 rounded-full ${mp.compromise ? 'bg-amber-400' : 'bg-gray-200'}`} />
  </span>
);

// ─── Atom detail panel ────────────────────────────────────────────────────────

const AtomDetail: React.FC<{
  mp: MicroPresentation;
  breadcrumb: string;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  position: string;
}> = ({ mp, breadcrumb, onPrev, onNext, position }) => {
  const isDraft = mp.isPublished === false;
  const hasSlots = mp.slotConditions && Object.keys(mp.slotConditions).length > 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-4 pb-2 flex-shrink-0">
        <p className="text-[10px] text-gray-400 font-mono tracking-wide truncate mr-2">{breadcrumb}</p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[10px] text-gray-400 mr-1">{position}</span>
          <button onClick={onPrev ?? undefined} disabled={!onPrev}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Предыдущий">
            <ChevronLeft size={14} className="text-gray-500" />
          </button>
          <button onClick={onNext ?? undefined} disabled={!onNext}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Следующий">
            <ChevronRightIcon size={14} className="text-gray-500" />
          </button>
        </div>
      </div>

      <div className="px-6 pb-3 flex-shrink-0">
        <div className="flex items-start gap-2 flex-wrap">
          <h2 className="text-lg font-bold text-gray-900 leading-tight">{mp.title}</h2>
          {isDraft && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200 mt-1 flex-shrink-0">
              черновик
            </span>
          )}
          {hasSlots && (
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200 mt-1 flex-shrink-0">
              авто-показ
            </span>
          )}
        </div>
        {(mp.tags ?? []).length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {(mp.tags ?? []).map((tag) => (
              <span key={tag} className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-3 pb-10">
        {mp.technical ? (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Технический факт</p>
            </div>
            <div className="px-4 py-3 bg-gray-50">
              <p className="text-sm text-gray-700 leading-relaxed">{mp.technical}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-300 mb-1">Технический факт</p>
            <p className="text-xs text-gray-300 italic">не заполнен</p>
          </div>
        )}

        {(mp.methodology || mp.content) ? (
          <div className="rounded-xl border border-blue-200 overflow-hidden">
            <div className="px-4 py-2 bg-blue-100 border-b border-blue-200">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Методология эксперта</p>
            </div>
            <div className="px-4 py-3 bg-blue-50">
              <p className="text-sm text-blue-900 leading-relaxed">{mp.methodology || mp.content}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-blue-100 px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-blue-200 mb-1">Методология эксперта</p>
            <p className="text-xs text-blue-200 italic">не заполнена</p>
          </div>
        )}

        {mp.compromise ? (
          <div className="rounded-xl border border-amber-200 overflow-hidden">
            <div className="px-4 py-2 bg-amber-100 border-b border-amber-200">
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Стратегия компромисса</p>
            </div>
            <div className="px-4 py-3 bg-amber-50">
              <p className="text-sm text-amber-900 leading-relaxed">{mp.compromise}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-amber-100 px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-200 mb-1">Стратегия компромисса</p>
            <p className="text-xs text-amber-200 italic">не заполнена</p>
          </div>
        )}

        {hasSlots && (
          <div className="rounded-xl border border-emerald-200 overflow-hidden">
            <div className="px-4 py-2 bg-emerald-100 border-b border-emerald-200">
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Условия авто-показа</p>
            </div>
            <div className="px-4 py-3 bg-emerald-50 flex flex-wrap gap-1.5">
              {Object.entries(mp.slotConditions!).map(([key, vals]) => (
                <span key={key} className="text-xs bg-white border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded font-mono">
                  {key}: {(vals as string[]).join(' / ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyDetail: React.FC<{ total: number }> = ({ total }) => (
  <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 px-8">
    <BookOpen size={40} className="opacity-10" />
    <div className="text-center space-y-1">
      <p className="text-sm font-semibold text-gray-500">Выбери атом в дереве слева</p>
      <p className="text-xs text-gray-400">
        {total > 0
          ? `${total} атомов в базе — кликни на любой чтобы прочитать`
          : 'База знаний пуста — попроси Агента наполнить из диалогов'}
      </p>
    </div>
    {total > 0 && (
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
        <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
        <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
        техника / методология / компромисс
      </div>
    )}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const HolisticLibraryView: React.FC = () => {
  const { microPresentations, machineTypes } = useSalesStore();
  const [search, setSearch] = useState('');
  const [selectedAtomId, setSelectedAtomId] = useState<string | null>(null);
  const [selectedBreadcrumb, setSelectedBreadcrumb] = useState('');
  const [showDrafts, setShowDrafts] = useState(true);
  const [expandedMachineTypes, setExpandedMachineTypes] = useState<Set<string>>(() => new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(() => new Set());

  // Stable color index per category name (alphabetical order across all atoms)
  const categoryColorMap = useMemo(() => {
    const cats = Array.from(new Set(microPresentations.map((mp) => mp.category).filter(Boolean))).sort();
    const map = new Map<string, number>();
    cats.forEach((cat, i) => map.set(cat, i));
    return map;
  }, [microPresentations]);

  const draftCount = microPresentations.filter((mp) => mp.isPublished === false).length;

  const filtered = useMemo(() => {
    let mps = microPresentations;
    if (!showDrafts) mps = mps.filter((mp) => mp.isPublished !== false);
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
  }, [microPresentations, search, showDrafts]);

  // 3-level tree structure
  const treeData = useMemo(() => {
    const formulationAtoms = filtered.filter((mp) => mp.category === ALWAYS_SHOWN_CATEGORY);
    const nonFormAtoms = filtered.filter((mp) => mp.category !== ALWAYS_SHOWN_CATEGORY);

    const machineTypeNodes = machineTypes.map((mt) => {
      const mtAtoms = nonFormAtoms.filter((mp) => mp.machineTypeIds?.includes(mt.id));
      const cats = Array.from(new Set(mtAtoms.map((mp) => mp.category))).sort();
      return {
        mt,
        categories: cats.map((cat) => ({
          cat,
          atoms: mtAtoms.filter((mp) => mp.category === cat),
        })),
      };
    }).filter((node) => node.categories.length > 0);

    const generalAtoms = nonFormAtoms.filter((mp) => !mp.machineTypeIds?.length);
    const generalCats = Array.from(new Set(generalAtoms.map((mp) => mp.category))).sort();

    return { formulationAtoms, machineTypeNodes, generalAtoms, generalCats };
  }, [filtered, machineTypes]);

  // Flat deduplicated atom list in tree order (for prev/next navigation)
  const flatAtoms = useMemo(() => {
    const seen = new Set<string>();
    const result: MicroPresentation[] = [];
    const add = (mp: MicroPresentation) => {
      if (!seen.has(mp.id)) { seen.add(mp.id); result.push(mp); }
    };
    treeData.formulationAtoms.forEach(add);
    treeData.machineTypeNodes.forEach((node) =>
      node.categories.forEach(({ atoms }) => atoms.forEach(add)),
    );
    treeData.generalCats.forEach((cat) =>
      treeData.generalAtoms.filter((mp) => mp.category === cat).forEach(add),
    );
    return result;
  }, [treeData]);

  const selectedIdx = flatAtoms.findIndex((mp) => mp.id === selectedAtomId);
  const selectedAtom = selectedIdx >= 0 ? flatAtoms[selectedIdx] : null;

  const getBreadcrumbForAtom = useCallback((mp: MicroPresentation): string => {
    if (mp.category === ALWAYS_SHOWN_CATEGORY) return `Библиотека › Формулировки`;
    if (mp.machineTypeIds?.length) {
      const mt = machineTypes.find((m) => mp.machineTypeIds!.includes(m.id));
      if (mt) return `Библиотека › ${mt.name} › ${mp.category}`;
    }
    return `Библиотека › Общие › ${mp.category}`;
  }, [machineTypes]);

  const selectAtom = useCallback((mp: MicroPresentation, breadcrumb: string) => {
    setSelectedAtomId(mp.id);
    setSelectedBreadcrumb(breadcrumb);
  }, []);

  const navigateTo = useCallback((idx: number) => {
    const mp = flatAtoms[idx];
    if (mp) { setSelectedAtomId(mp.id); setSelectedBreadcrumb(getBreadcrumbForAtom(mp)); }
  }, [flatAtoms, getBreadcrumbForAtom]);

  const toggleMT = useCallback((id: string) => {
    setExpandedMachineTypes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleTopic = useCallback((key: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  // ── Tree rendering helpers ──────────────────────────────────────────────────

  const renderAtom = (mp: MicroPresentation, indentPx: number, colorIdx: number, breadcrumb: string) => {
    const isSelected = selectedAtomId === mp.id;
    const style = getCategoryStyle(colorIdx);
    return (
      <button
        key={`${mp.id}|${breadcrumb}`}
        onClick={() => selectAtom(mp, `${breadcrumb} › ${mp.title}`)}
        className={`w-full text-left flex items-center gap-1.5 py-1 text-xs transition-colors ${
          isSelected
            ? `${style.active} font-semibold`
            : mp.isPublished === false
            ? 'text-gray-400 italic hover:bg-gray-100'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${indentPx}px`, paddingRight: '8px' }}
        title={mp.title}
      >
        <span className="flex-1 truncate">{mp.title}</span>
        <AtomBlockDots mp={mp} />
      </button>
    );
  };

  const renderTopicNode = (
    cat: string,
    atoms: MicroPresentation[],
    topicKey: string,
    breadcrumbPrefix: string,
    indentPx: number,
  ) => {
    const isExpanded = expandedTopics.has(topicKey);
    const colorIdx = categoryColorMap.get(cat) ?? 0;
    const style = getCategoryStyle(colorIdx);
    const gaps = gapCount(atoms);
    return (
      <div key={topicKey}>
        <button
          onClick={() => toggleTopic(topicKey)}
          className="w-full flex items-center gap-1.5 py-1 text-left hover:bg-gray-100 transition-colors"
          style={{ paddingLeft: `${indentPx}px`, paddingRight: '8px' }}
        >
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
          <span className="flex-1 text-xs font-semibold text-gray-600 truncate">{cat}</span>
          {gaps > 0 && (
            <span className="text-[8px] text-amber-500 font-bold mr-0.5" title={`${gaps} атомов не заполнены полностью`}>
              ⚠{gaps}
            </span>
          )}
          <span className="text-[9px] text-gray-400 font-mono mr-0.5">{atoms.length}</span>
          {isExpanded
            ? <ChevronDown size={9} className="text-gray-400 flex-shrink-0" />
            : <ChevronRight size={9} className="text-gray-400 flex-shrink-0" />
          }
        </button>
        {isExpanded && atoms.map((mp) =>
          renderAtom(mp, indentPx + 14, colorIdx, breadcrumbPrefix),
        )}
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full gap-0 rounded-2xl border border-gray-200 overflow-hidden bg-white">
      {/* ── LEFT: 3-level tree ──────────────────────────────────────── */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50/60">

        {/* Search */}
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по атомам..."
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-calidad-blue bg-white"
            />
          </div>
        </div>

        {/* Tree body */}
        <div className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <p className="text-xs text-gray-400 text-center mt-8 px-3">
              {search ? 'Ничего не найдено' : 'База знаний пуста'}
            </p>
          )}

          {/* ★ Формулировки — зарезервированный раздел (не в иерархии станков) */}
          {treeData.formulationAtoms.length > 0 && (() => {
            const key = 'formulations';
            const isExpanded = expandedTopics.has(key);
            return (
              <div>
                <button
                  onClick={() => toggleTopic(key)}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-yellow-50 transition-colors"
                >
                  <span className="text-[9px] text-yellow-500 font-black flex-shrink-0">★</span>
                  <span className="flex-1 text-xs font-bold text-yellow-700 truncate">Формулировки</span>
                  <span className="text-[9px] text-gray-400 font-mono mr-1">{treeData.formulationAtoms.length}</span>
                  {isExpanded
                    ? <ChevronDown size={9} className="text-gray-400 flex-shrink-0" />
                    : <ChevronRight size={9} className="text-gray-400 flex-shrink-0" />
                  }
                </button>
                {isExpanded && treeData.formulationAtoms.map((mp) =>
                  renderAtom(mp, 28, categoryColorMap.get(ALWAYS_SHOWN_CATEGORY) ?? 0, 'Библиотека › Формулировки'),
                )}
              </div>
            );
          })()}

          {/* Тип станка → Тема → Атом */}
          {treeData.machineTypeNodes.map(({ mt, categories }) => {
            const isMTExpanded = expandedMachineTypes.has(mt.id);
            const totalAtoms = categories.reduce((s, c) => s + c.atoms.length, 0);
            const totalGaps = categories.reduce((s, c) => s + gapCount(c.atoms), 0);
            return (
              <div key={mt.id}>
                <button
                  onClick={() => toggleMT(mt.id)}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-gray-100 transition-colors"
                >
                  <Cpu size={10} className="text-gray-400 flex-shrink-0" />
                  <span className="flex-1 text-xs font-bold text-gray-700 truncate">{mt.name}</span>
                  {totalGaps > 0 && (
                    <span className="text-[8px] text-amber-500 font-bold mr-0.5" title={`${totalGaps} атомов не заполнены`}>
                      ⚠{totalGaps}
                    </span>
                  )}
                  <span className="text-[9px] text-gray-400 font-mono mr-0.5">{totalAtoms}</span>
                  {isMTExpanded
                    ? <ChevronDown size={10} className="text-gray-400 flex-shrink-0" />
                    : <ChevronRight size={10} className="text-gray-400 flex-shrink-0" />
                  }
                </button>
                {isMTExpanded && categories.map(({ cat, atoms }) =>
                  renderTopicNode(cat, atoms, `${mt.id}|${cat}`, `Библиотека › ${mt.name}`, 16),
                )}
              </div>
            );
          })}

          {/* Общие — атомы без привязки к типу станка */}
          {treeData.generalCats.length > 0 && (() => {
            const isExpanded = expandedMachineTypes.has(GENERAL_KEY);
            const totalGaps = gapCount(treeData.generalAtoms);
            return (
              <div>
                <button
                  onClick={() => toggleMT(GENERAL_KEY)}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-gray-100 transition-colors"
                >
                  <span className="text-[10px] text-gray-400 flex-shrink-0">◎</span>
                  <span className="flex-1 text-xs font-bold text-gray-500 truncate">Общие</span>
                  {totalGaps > 0 && (
                    <span className="text-[8px] text-amber-500 font-bold mr-0.5" title={`${totalGaps} атомов не заполнены`}>
                      ⚠{totalGaps}
                    </span>
                  )}
                  <span className="text-[9px] text-gray-400 font-mono mr-0.5">{treeData.generalAtoms.length}</span>
                  {isExpanded
                    ? <ChevronDown size={10} className="text-gray-400 flex-shrink-0" />
                    : <ChevronRight size={10} className="text-gray-400 flex-shrink-0" />
                  }
                </button>
                {isExpanded && treeData.generalCats.map((cat) =>
                  renderTopicNode(
                    cat,
                    treeData.generalAtoms.filter((mp) => mp.category === cat),
                    `${GENERAL_KEY}|${cat}`,
                    'Библиотека › Общие',
                    16,
                  ),
                )}
              </div>
            );
          })()}
        </div>

        {/* Footer: stats + draft toggle */}
        <div className="p-3 border-t border-gray-200 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span>{filtered.length} атомов</span>
            <div className="flex items-center gap-1" title="серый = техника, синий = методология, янтарный = компромисс">
              <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            </div>
          </div>
          {draftCount > 0 && (
            <button
              onClick={() => setShowDrafts((p) => !p)}
              className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                showDrafts
                  ? 'bg-amber-50 text-amber-600 border border-amber-200'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              <span>{showDrafts ? '◉' : '○'}</span>
              <span>Черновики ({draftCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* ── RIGHT: Atom detail ──────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {selectedAtom ? (
          <AtomDetail
            mp={selectedAtom}
            breadcrumb={selectedBreadcrumb || getBreadcrumbForAtom(selectedAtom)}
            onPrev={selectedIdx > 0 ? () => navigateTo(selectedIdx - 1) : null}
            onNext={selectedIdx < flatAtoms.length - 1 ? () => navigateTo(selectedIdx + 1) : null}
            position={`${selectedIdx + 1} / ${flatAtoms.length}`}
          />
        ) : (
          <EmptyDetail total={filtered.length} />
        )}
      </div>
    </div>
  );
};
