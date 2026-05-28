import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search, Eye, EyeOff, BookOpen, Layers } from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { MachineType, MicroPresentation, ScriptNode } from '../../types';

// ─── MP Card ─────────────────────────────────────────────────────────────────

const MpCard: React.FC<{ mp: MicroPresentation; isUniversal: boolean }> = ({ mp, isUniversal }) => (
  <div className={`rounded-xl border overflow-hidden ${mp.isPublished === false ? 'opacity-60 border-dashed border-gray-200' : 'border-gray-200'}`}>
    {/* Заголовок */}
    <div className="flex items-start gap-2 px-3 pt-3 pb-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-bold text-gray-800">{mp.title}</span>
          {mp.isPublished === false && (
            <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">черновик</span>
          )}
          {isUniversal && (
            <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">универсальная</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[10px] bg-blue-50 text-calidad-blue px-1.5 py-0.5 rounded font-bold">{mp.category}</span>
          {(mp.tags ?? []).map(tag => (
            <span key={tag} className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{tag}</span>
          ))}
        </div>
      </div>
    </div>

    {/* Три уровня */}
    <div className="space-y-px">
      {mp.technical && (
        <div className="bg-gray-50 px-3 py-2 border-t border-gray-100">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Технический факт</p>
          <p className="text-xs text-gray-700 leading-relaxed">{mp.technical}</p>
        </div>
      )}
      {(mp.methodology || mp.content) && (
        <div className="bg-blue-50 px-3 py-2 border-t border-blue-100">
          <p className="text-[9px] font-bold text-calidad-blue uppercase tracking-wider mb-0.5">Методология эксперта</p>
          <p className="text-xs text-gray-700 leading-relaxed">{mp.methodology || mp.content}</p>
        </div>
      )}
      {mp.compromise && (
        <div className="bg-amber-50 px-3 py-2 border-t border-amber-100">
          <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Компромисс</p>
          <p className="text-xs text-gray-700 leading-relaxed">{mp.compromise}</p>
        </div>
      )}
    </div>
  </div>
);

// ─── Script Node Card ─────────────────────────────────────────────────────────

const NodeCard: React.FC<{ node: ScriptNode; isUniversal: boolean }> = ({ node, isUniversal }) => (
  <div className="rounded-xl border border-gray-200 overflow-hidden">
    <div className="px-3 py-2.5 bg-white">
      <div className="flex items-center gap-1.5 flex-wrap mb-1">
        <span className="text-sm font-bold text-gray-800">{node.title}</span>
        {node.category && (
          <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold">{node.category}</span>
        )}
        {isUniversal && (
          <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">универсальный</span>
        )}
      </div>
      <p className="text-xs text-gray-600 leading-relaxed">{node.content}</p>
    </div>
    {(node.tips ?? []).length > 0 && (
      <div className="bg-gray-50 border-t border-gray-100 px-3 py-2 space-y-0.5">
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Советы</p>
        {node.tips!.map((tip, i) => (
          <div key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
            <span className="text-calidad-blue mt-0.5 flex-shrink-0">›</span>
            {tip}
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─── Group Section ────────────────────────────────────────────────────────────

interface GroupProps {
  id: string;
  title: string;
  subtitle?: string;
  nodes: ScriptNode[];
  mps: MicroPresentation[];
  isUniversalNode: (n: ScriptNode) => boolean;
  isUniversalMp: (m: MicroPresentation) => boolean;
  expanded: boolean;
  onToggle: () => void;
}

const GroupSection: React.FC<GroupProps> = ({
  title, subtitle, nodes, mps, isUniversalNode, isUniversalMp, expanded, onToggle,
}) => {
  if (nodes.length === 0 && mps.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div>
          <h4 className="text-sm font-bold text-gray-800">{title}</h4>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400">
            {nodes.length > 0 && `${nodes.length} эт.`}
            {nodes.length > 0 && mps.length > 0 && ' · '}
            {mps.length > 0 && `${mps.length} атомов`}
          </span>
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
          {nodes.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                <BookOpen size={10} className="inline mr-1" />Этапы скрипта
              </p>
              <div className="space-y-2">
                {nodes.map(n => <NodeCard key={n.id} node={n} isUniversal={isUniversalNode(n)} />)}
              </div>
            </div>
          )}
          {mps.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                <Layers size={10} className="inline mr-1" />Атомы знаний
              </p>
              <div className="space-y-2">
                {mps.map(mp => <MpCard key={mp.id} mp={mp} isUniversal={isUniversalMp(mp)} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const HolisticLibraryView: React.FC = () => {
  const { machineTypes, scriptNodes, microPresentations } = useSalesStore();

  const [query, setQuery] = useState('');
  const [showDrafts, setShowDrafts] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['universal']));

  const toggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Фильтрация ──────────────────────────────────────────────────────────────

  const filteredMps = useMemo(() => {
    let mps = microPresentations;
    if (!showDrafts) mps = mps.filter(mp => mp.isPublished !== false);
    if (query) {
      const q = query.toLowerCase();
      mps = mps.filter(mp =>
        mp.title.toLowerCase().includes(q) ||
        (mp.technical || '').toLowerCase().includes(q) ||
        (mp.methodology || mp.content || '').toLowerCase().includes(q) ||
        (mp.compromise || '').toLowerCase().includes(q) ||
        (mp.tags ?? []).some(t => t.toLowerCase().includes(q)),
      );
    }
    return mps;
  }, [microPresentations, showDrafts, query]);

  const filteredNodes = useMemo(() => {
    if (!query) return scriptNodes;
    const q = query.toLowerCase();
    return scriptNodes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      (n.tips ?? []).some(t => t.toLowerCase().includes(q)),
    );
  }, [scriptNodes, query]);

  // ── Группировка ─────────────────────────────────────────────────────────────

  const isUniversalNode = (n: ScriptNode) => !n.machineTypeIds || n.machineTypeIds.length === 0;
  const isUniversalMp = (mp: MicroPresentation) => !mp.machineTypeIds || mp.machineTypeIds.length === 0;

  const universalNodes = filteredNodes.filter(isUniversalNode);
  const universalMps = filteredMps.filter(isUniversalMp);

  const getMtNodes = (mt: MachineType) =>
    filteredNodes.filter(n => isUniversalNode(n) || (n.machineTypeIds ?? []).includes(mt.id));
  const getMtMps = (mt: MachineType) =>
    filteredMps.filter(mp => isUniversalMp(mp) || (mp.machineTypeIds ?? []).includes(mt.id));

  const totalMps = filteredMps.length;
  const totalNodes = filteredNodes.length;
  const draftCount = microPresentations.filter(mp => mp.isPublished === false).length;

  return (
    <div className="space-y-3">

      {/* Шапка */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">База знаний</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {totalNodes} этапов · {totalMps} атомов
            {draftCount > 0 && ` · ${draftCount} черновиков`}
          </p>
        </div>

        {/* Переключатель черновиков */}
        {draftCount > 0 && (
          <button
            onClick={() => setShowDrafts(p => !p)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition-colors ${
              showDrafts
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
          >
            {showDrafts ? <Eye size={11} /> : <EyeOff size={11} />}
            Черновики {showDrafts ? 'вкл' : 'выкл'}
          </button>
        )}
      </div>

      {/* Поиск */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-calidad-blue bg-white"
          placeholder="Поиск по названию, тексту, тегам..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {/* Универсальные */}
      <GroupSection
        id="universal"
        title="🌍 Универсальные"
        subtitle="Применяются ко всем типам станков"
        nodes={universalNodes}
        mps={universalMps}
        isUniversalNode={isUniversalNode}
        isUniversalMp={isUniversalMp}
        expanded={expandedIds.has('universal')}
        onToggle={() => toggle('universal')}
      />

      {/* По типам станков */}
      {machineTypes.map(mt => (
        <GroupSection
          key={mt.id}
          id={mt.id}
          title={mt.name}
          subtitle={mt.description}
          nodes={getMtNodes(mt)}
          mps={getMtMps(mt)}
          isUniversalNode={isUniversalNode}
          isUniversalMp={isUniversalMp}
          expanded={expandedIds.has(mt.id)}
          onToggle={() => toggle(mt.id)}
        />
      ))}

      {/* Пустое состояние */}
      {totalMps === 0 && totalNodes === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Layers size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {query ? `Ничего не найдено по «${query}»` : 'База знаний пуста'}
          </p>
          <p className="text-xs mt-1">
            {query ? 'Попробуйте другой запрос' : 'Используйте Агента чтобы наполнить библиотеку из диалогов'}
          </p>
        </div>
      )}
    </div>
  );
};
