import { BatchInsights, ExtractedDialogueData, MicroPresentation, ModelLogEntry } from '../types';

const PREFERRED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite-001',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

const SKIP_KEYWORDS = ['embedding', 'tts', 'robotics', 'image', 'computer-use'];
const RECOVERABLE_PHRASES = ['new users', 'not found', 'NOT_FOUND', 'no longer available'];

function isRecoverable(msg: string): boolean {
  return RECOVERABLE_PHRASES.some((p) => msg.includes(p));
}

let _availableModels: string[] | null = null;

export async function fetchAvailableModels(apiKey: string): Promise<string[]> {
  if (_availableModels) return _availableModels;
  for (const ver of ['v1beta', 'v1', 'v1alpha']) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/${ver}/models?key=${apiKey}`,
      );
      if (!res.ok) continue;
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      _availableModels = (data.models ?? [])
        .map((m) => m.name.replace('models/', ''))
        .filter((name) => !SKIP_KEYWORDS.some((kw) => name.includes(kw)));
      return _availableModels!;
    } catch { /* try next */ }
  }
  return [];
}

function buildOrderedModels(available: string[]): string[] {
  return [
    ...PREFERRED_MODELS.filter((p) => available.some((a) => a === p || a.startsWith(p))),
    ...available.filter((a) => !PREFERRED_MODELS.some((p) => a === p || a.startsWith(p))),
  ];
}

async function callGenerate(model: string, apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  const data = (await res.json()) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  if (!res.ok) throw new Error((data?.error?.message as string) ?? JSON.stringify(data));
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

const CLEAN_PROMPT = `Это расшифровка телефонного разговора. Исправь ТОЛЬКО явные ошибки распознавания речи:
- слова с сильным искажением (где очевидно что имелось в виду)
- слипшиеся слова
- явные артефакты транскрибации

НЕ меняй:
- стиль и манеру речи
- разговорные выражения (ну, вот, м...)
- структуру диалога
- паузы и заполнители

Верни ТОЛЬКО очищенный текст без пояснений.`;

const ANALYSE_PROMPT = `Ты эксперт по продажам промышленного оборудования (ЧПУ-станки, лазерные резчики, фрезеры).
Тебе дают расшифровку телефонного разговора менеджера с потенциальным клиентом.

Твоя задача — проанализировать разговор и вернуть СТРОГО валидный JSON (без markdown-блоков, без пояснений, только чистый JSON):
{
  "clientType": "Описание типа клиента: его бизнес, уровень осведомлённости, болевые точки, портрет",
  "machineTypeHint": "Тип станка который нужен клиенту, если удалось определить. Пустая строка если не определён.",
  "conversationSteps": [
    {
      "title": "Название этапа разговора",
      "content": "Что делал менеджер на этом этапе, какие вопросы задавал",
      "tips": ["Что сделано хорошо или что стоит улучшить"]
    }
  ],
  "formulations": ["Удачная фраза или вопрос из разговора"],
  "techniques": ["Выявленная техника продаж"],
  "suggestedMicroPresentations": [
    {
      "title": "Короткое название блока",
      "content": "Текст блока для будущих звонков",
      "category": "Открытие",
      "machineTypeIds": [],
      "tags": ["тег"]
    }
  ]
}`;

const BATCH_PROMPT = `Тебе дают проанализированные разговоры о продаже ЧПУ-станков и лазерного оборудования.
Найди закономерности и верни СТРОГО валидный JSON (без markdown-блоков, только чистый JSON):
{
  "clientPortraits": ["Типичный портрет клиента 1", "Типичный портрет клиента 2"],
  "topFormulations": ["Лучшая фраза или вопрос 1", "Лучшая фраза 2"],
  "commonTechniques": ["Часто используемая техника 1", "Техника 2"],
  "scriptSuggestions": ["Рекомендация по структуре скрипта 1", "Рекомендация 2"],
  "machineTypeBreakdown": {"Название типа станка": 3, "Другой тип": 2}
}`;

export interface ProcessResult {
  data: ExtractedDialogueData;
  usedModel: string;
  log: ModelLogEntry[];
}

export async function cleanDialogueText(rawText: string, apiKey: string): Promise<string> {
  const available = await fetchAvailableModels(apiKey);
  const ordered = buildOrderedModels(available);
  if (ordered.length === 0) throw new Error('Нет доступных моделей для этого ключа');

  for (const model of ordered) {
    try {
      const text = await callGenerate(model, apiKey, `${CLEAN_PROMPT}\n\nТЕКСТ РАЗГОВОРА:\n${rawText}`);
      if (text.trim()) return text.trim();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isRecoverable(msg)) continue;
      throw err;
    }
  }
  throw new Error('Все модели перебраны без результата при очистке текста');
}

export async function analyzeDialogue(
  cleanedText: string,
  apiKey: string,
  onProgress?: (entry: ModelLogEntry) => void,
): Promise<ProcessResult> {
  const prompt = `${ANALYSE_PROMPT}\n\nРАЗГОВОР:\n${cleanedText}`;
  const available = await fetchAvailableModels(apiKey);
  const ordered = buildOrderedModels(available);

  if (ordered.length === 0) throw new Error('Нет доступных моделей для этого ключа');

  const log: ModelLogEntry[] = [];
  let lastError = '';

  for (const model of ordered) {
    try {
      const text = await callGenerate(model, apiKey, prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Нет JSON в ответе: ' + text.slice(0, 200));
      const parsed = JSON.parse(jsonMatch[0]) as ExtractedDialogueData;
      if (parsed.suggestedMicroPresentations) {
        parsed.suggestedMicroPresentations = parsed.suggestedMicroPresentations.map(
          (mp: Omit<MicroPresentation, 'id'>) => ({
            ...mp,
            machineTypeIds: mp.machineTypeIds ?? [],
            tags: mp.tags ?? [],
          }),
        );
      }
      const entry: ModelLogEntry = { model, status: 'ok' };
      log.push(entry);
      onProgress?.(entry);
      return { data: parsed, usedModel: model, log };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (isRecoverable(lastError)) {
        const entry: ModelLogEntry = { model, status: 'blocked', message: lastError.slice(0, 120) };
        log.push(entry);
        onProgress?.(entry);
        continue;
      }
      const entry: ModelLogEntry = { model, status: 'error', message: lastError.slice(0, 120) };
      log.push(entry);
      onProgress?.(entry);
      throw err;
    }
  }

  throw new Error('Все модели перебраны без результата. Последняя ошибка: ' + lastError);
}

export async function extractBatchInsights(
  allExtracted: ExtractedDialogueData[],
  apiKey: string,
): Promise<BatchInsights> {
  const available = await fetchAvailableModels(apiKey);
  const ordered = buildOrderedModels(available);
  if (ordered.length === 0) throw new Error('Нет доступных моделей для этого ключа');

  const payload = JSON.stringify(
    allExtracted.map((e) => ({
      clientType: e.clientType,
      machineTypeHint: e.machineTypeHint,
      formulations: e.formulations,
      techniques: e.techniques,
    })),
    null,
    2,
  );
  const prompt = `${BATCH_PROMPT}\n\nДАННЫЕ (${allExtracted.length} разговоров):\n${payload}`;

  for (const model of ordered) {
    try {
      const text = await callGenerate(model, apiKey, prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        id: 'bi-' + Date.now().toString(36),
        generatedAt: new Date().toISOString(),
        dialogueCount: allExtracted.length,
        clientPortraits: parsed.clientPortraits ?? [],
        topFormulations: parsed.topFormulations ?? [],
        commonTechniques: parsed.commonTechniques ?? [],
        scriptSuggestions: parsed.scriptSuggestions ?? [],
        machineTypeBreakdown: parsed.machineTypeBreakdown ?? {},
        usedModel: model,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isRecoverable(msg)) continue;
      throw err;
    }
  }
  throw new Error('Все модели перебраны без результата при пакетном анализе');
}

export async function listAvailableModels(apiKey: string): Promise<string[]> {
  _availableModels = null;
  return fetchAvailableModels(apiKey);
}
