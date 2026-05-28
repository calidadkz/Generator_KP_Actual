import { collection, doc, setDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebase';

// ─── Типы ─────────────────────────────────────────────────────────────────────

export type ApiModule =
  | 'agent'
  | 'dialogue_clean'
  | 'dialogue_analyze'
  | 'batch_insights'
  | 'article_draft'
  | 'article_restyle'
  | 'article_topics'
  | 'style_dna'
  | 'other';

export interface ApiUsageEntry {
  id: string;
  timestamp: string;
  yearMonth: string;       // 'YYYY-MM' для группировки
  model: string;
  module: ApiModule;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

// ─── Цены за 1M токенов (USD) ─────────────────────────────────────────────────

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6':      { input: 3.0,   output: 15.0  },
  'claude-opus-4-7':        { input: 15.0,  output: 75.0  },
  'claude-haiku-4-5':       { input: 0.8,   output: 4.0   },
  'gemini-2.5-flash':       { input: 0.15,  output: 0.60  },
  'gemini-2.5-pro':         { input: 1.25,  output: 10.0  },
  'gemini-2.0-flash':       { input: 0.075, output: 0.30  },
  'gemini-1.5-flash':       { input: 0.075, output: 0.30  },
  'gpt-4o':                 { input: 2.50,  output: 10.0  },
  'gpt-4o-mini':            { input: 0.15,  output: 0.60  },
  'gpt-4-turbo':            { input: 10.0,  output: 30.0  },
  'gpt-3.5-turbo':          { input: 0.50,  output: 1.50  },
};

export function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  // Ищем модель точно, потом по префиксу
  const rates =
    MODEL_COSTS[model] ??
    Object.entries(MODEL_COSTS).find(([key]) => model.startsWith(key))?.[1] ??
    { input: 1.0, output: 3.0 };
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

// ─── Запись в Firestore ───────────────────────────────────────────────────────

const COLLECTION = 'api_usage_log';

export async function logApiUsage(params: {
  model: string;
  module: ApiModule;
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  try {
    const now = new Date();
    const id = `usage_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const entry: ApiUsageEntry = {
      id,
      timestamp: now.toISOString(),
      yearMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      model: params.model,
      module: params.module,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      costUsd: calcCost(params.model, params.inputTokens, params.outputTokens),
    };
    await setDoc(doc(db, COLLECTION, id), entry);
  } catch (err) {
    // Не ломаем основной флоу если логирование упало
    console.warn('[apiUsageLog] Failed to log usage:', err);
  }
}

// ─── Чтение из Firestore ──────────────────────────────────────────────────────

export async function fetchMonthlyUsage(yearMonth?: string): Promise<ApiUsageEntry[]> {
  try {
    const ym = yearMonth ?? getCurrentYearMonth();
    const q = query(
      collection(db, COLLECTION),
      where('yearMonth', '==', ym),
      orderBy('timestamp', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ApiUsageEntry);
  } catch (err) {
    console.warn('[apiUsageLog] Failed to fetch usage:', err);
    return [];
  }
}

export function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Агрегация ────────────────────────────────────────────────────────────────

export interface CostSummary {
  totalUsd: number;
  byModule: Record<string, number>;
  byModel: Record<string, number>;
  entries: number;
}

export function aggregateCosts(entries: ApiUsageEntry[]): CostSummary {
  const summary: CostSummary = { totalUsd: 0, byModule: {}, byModel: {}, entries: entries.length };
  for (const e of entries) {
    summary.totalUsd += e.costUsd;
    summary.byModule[e.module] = (summary.byModule[e.module] ?? 0) + e.costUsd;
    summary.byModel[e.model] = (summary.byModel[e.model] ?? 0) + e.costUsd;
  }
  return summary;
}

export const MODULE_LABELS: Record<ApiModule, string> = {
  agent:            'Агент (Knowledge Architect)',
  dialogue_clean:   'Очистка диалогов',
  dialogue_analyze: 'Анализ диалогов',
  batch_insights:   'Пакетный анализ',
  article_draft:    'Черновик статьи',
  article_restyle:  'Рестайл статьи',
  article_topics:   'Темы статей',
  style_dna:        'StyleDNA',
  other:            'Прочее',
};
