import React, { useState } from 'react';
import { DollarSign, RefreshCw, Loader2, TrendingUp } from 'lucide-react';
import { useApiCosts } from '../../hooks/useApiCosts';
import { getCurrentYearMonth, MODULE_LABELS, ApiModule } from '../../lib/apiUsageLog';

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

const MODULE_COLORS: Record<string, string> = {
  agent:            'bg-indigo-500',
  dialogue_clean:   'bg-blue-400',
  dialogue_analyze: 'bg-purple-500',
  batch_insights:   'bg-violet-500',
  article_draft:    'bg-emerald-500',
  article_restyle:  'bg-teal-500',
  article_topics:   'bg-cyan-500',
  style_dna:        'bg-amber-500',
  other:            'bg-gray-400',
};

const MODEL_COLORS: Record<string, string> = {
  'claude-sonnet-4-6': 'bg-orange-500',
  'claude-opus-4-7':   'bg-red-500',
  'claude-haiku-4-5':  'bg-yellow-500',
  'gemini-2.5-flash':  'bg-blue-500',
  'gemini-2.5-pro':    'bg-indigo-500',
  'gemini-2.0-flash':  'bg-sky-500',
  'gpt-4o':            'bg-emerald-600',
  'gpt-4o-mini':       'bg-green-500',
};

function getModelColor(model: string): string {
  return MODEL_COLORS[model] ?? 'bg-gray-400';
}

function Bar({ pct, colorClass }: { pct: number; colorClass: string }) {
  return (
    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${Math.max(pct, 2)}%` }} />
    </div>
  );
}

export const CostDashboard: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth());
  const { summary, loading, refresh } = useApiCosts(selectedMonth);

  const isCurrentMonth = selectedMonth === getCurrentYearMonth();

  const moduleEntries = Object.entries(summary?.byModule ?? {})
    .sort((a, b) => b[1] - a[1]);
  const modelEntries = Object.entries(summary?.byModel ?? {})
    .sort((a, b) => b[1] - a[1]);
  const maxModule = moduleEntries[0]?.[1] ?? 1;
  const maxModel  = modelEntries[0]?.[1] ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
            <DollarSign size={18} className="text-emerald-700" />
          </div>
          <div>
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">Затраты на API</h2>
            <p className="text-xs text-gray-400">Трекинг расходов по модулям</p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Обновить
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSelectedMonth(prevMonth(selectedMonth))}
          className="px-2 py-1 text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          ‹
        </button>
        <span className="text-sm font-bold text-gray-700 min-w-[100px] text-center">
          {monthLabel(selectedMonth)}
        </span>
        <button
          onClick={() => setSelectedMonth(nextMonth(selectedMonth))}
          disabled={isCurrentMonth}
          className="px-2 py-1 text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}

      {!loading && summary && (
        <>
          {/* Total cost card */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Итого за {monthLabel(selectedMonth)}</p>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-black text-emerald-800">
                ${summary.totalUsd.toFixed(4)}
              </span>
              <div className="flex items-center gap-1 text-xs text-emerald-600 font-bold mb-1">
                <TrendingUp size={12} />
                {summary.entries} запросов
              </div>
            </div>
          </div>

          {/* By module */}
          {moduleEntries.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-4">По модулям</h3>
              <div className="space-y-3">
                {moduleEntries.map(([module, cost]) => (
                  <div key={module} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${MODULE_COLORS[module] ?? 'bg-gray-400'}`} />
                    <span className="text-xs text-gray-600 w-40 truncate">
                      {MODULE_LABELS[module as ApiModule] ?? module}
                    </span>
                    <Bar pct={(cost / maxModule) * 100} colorClass={MODULE_COLORS[module] ?? 'bg-gray-400'} />
                    <span className="text-xs font-black text-gray-700 w-20 text-right">
                      ${cost.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By model */}
          {modelEntries.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-4">По моделям</h3>
              <div className="space-y-3">
                {modelEntries.map(([model, cost]) => (
                  <div key={model} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getModelColor(model)}`} />
                    <span className="text-xs text-gray-600 w-40 truncate font-mono">{model}</span>
                    <Bar pct={(cost / maxModel) * 100} colorClass={getModelColor(model)} />
                    <span className="text-xs font-black text-gray-700 w-20 text-right">
                      ${cost.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.entries === 0 && (
            <div className="text-center py-10 text-gray-400">
              <DollarSign size={28} className="mx-auto opacity-20 mb-2" />
              <p className="text-sm">Нет данных за {monthLabel(selectedMonth)}</p>
              <p className="text-xs mt-1">Данные появятся после первых AI-запросов</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
