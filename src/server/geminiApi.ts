import { BatchInsights, ExtractedDialogueData, MicroPresentation, ModelLogEntry } from '../types.js';

const PREFERRED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite-001',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

const SKIP_KEYWORDS = [
  'embedding', 'tts', 'robotics', 'image', 'computer-use',
  'veo', 'lyria', 'aqa', 'nano-banana', 'deep-research', 'customtools',
  'gemma-3-1b', 'gemma-3-4b', 'gemma-3n', 'gemma-4-26b',
];
const RECOVERABLE_PHRASES = ['new users', 'not found', 'NOT_FOUND', 'no longer available'];

function isRecoverable(msg: string): boolean {
  return RECOVERABLE_PHRASES.some((p) => msg.includes(p));
}

let _availableModels: string[] | null = null;

export async function fetchAvailableModels(apiKey: string): Promise<string[]> {
  if (_availableModels) return _availableModels;
  const keyPreview = apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 5);
  console.log(`[geminiApi] fetchAvailableModels: apiKey=${keyPreview}, length=${apiKey.length}`);

  for (const ver of ['v1beta', 'v1', 'v1alpha']) {
    try {
      const url = `https://generativelanguage.googleapis.com/${ver}/models?key=${apiKey}`;
      console.log(`[geminiApi] Fetching models via ${ver}...`);
      const res = await fetch(url);
      console.log(`[geminiApi] Response status: ${res.status}`);
      if (!res.ok) {
        const text = await res.text();
        console.error(`[geminiApi] API error on ${ver}: ${res.status} - ${text.substring(0, 200)}`);
        continue;
      }
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      console.log(`[geminiApi] Received ${data.models?.length ?? 0} models from API`);
      _availableModels = (data.models ?? [])
        .map((m) => m.name.replace('models/', ''))
        .filter((name) => !SKIP_KEYWORDS.some((kw) => name.includes(kw)));
      console.log(`[geminiApi] After filtering: ${_availableModels.length} models`);
      return _availableModels!;
    } catch (err) {
      console.error(`[geminiApi] fetchAvailableModels error on ${ver}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.error('[geminiApi] No available models found after trying all versions');
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

const ARTICLE_ANALYSE_PROMPT = `Ты эксперт по продажам и маркетингу промышленного оборудования.
Тебе дают расшифровку телефонного разговора менеджера с потенциальным клиентом.

Твоя задача — выделить темы для SEO-статей, боли клиентов и характерные обороты речи.
Верни СТРОГО валидный JSON (без markdown-блоков, только чистый JSON):
{
  "articleTopics": ["Тема статьи 1 (что можно раскрыть в публикации)", "Тема 2"],
  "painPoints": ["Явная боль или проблема клиента 1", "Проблема 2"],
  "styleMarkers": ["Характерная фраза менеджера", "Оборот речи", "Стиль аргументации"]
}`;

const BATCH_ARTICLE_TOPICS_PROMPT = `Ты эксперт по маркетингу промышленного оборудования.
Тебе дают список тем для статей и болей клиентов из 5+ телефонных разговоров.

Твоя задача — найти пересечения и рекомендовать топ-темы для блога.
Верни СТРОГО валидный JSON (без markdown-блоков, только чистый JSON):
{
  "articleTopicSuggestions": ["Рекомендуемая тема 1", "Тема 2", "Тема 3"],
  "topPainPoints": ["Топ-боль 1 (встречается часто)", "Топ-боль 2", "Топ-боль 3"]
}`;

const STYLE_DNA_PROMPT = `Ты эксперт в анализе стиля речи и аргументации.
Тебе дают выдержки из 3-20 телефонных разговоров менеджера по продажам.

Твоя задача — выделить уникальные черты его стиля, чтобы потом использовать для написания статей в его голосе.
Верни СТРОГО валидный JSON (без markdown-блоков, только чистый JSON):
{
  "frequentPhrases": ["Характерная фраза 1", "Фраза 2", "Фраза 3"],
  "avgSentenceLength": "short|medium|long",
  "tone": "описание тона (уверенный, деловой, без канцеляризмов и т.д.)",
  "thoughtStructure": "типичная структура аргументов (проблема → решение → вывод и т.д.)",
  "additionalNotes": "дополнительные наблюдения о стиле"
}`;

const ARTICLE_DRAFT_PROMPT = `Ты профессиональный копирайтер, специализирующийся на статьях для B2B сектора промышленного оборудования.
Тебе дают тему статьи и извлечённые из диалогов паттерны (боли, аргументы, примеры).

Твоя задача — написать логичный, хорошо структурированный черновик статьи на русском языке.
Используй предоставленные боли и аргументы, структурируй статью как: вступление → проблема → решение → преимущества → заключение.

Верни статью в виде простого текста (без markdown, без HTML).`;

const ARTICLE_STYLE_REWRITE_PROMPT = `Ты редактор, специализирующийся на переписании текстов в уникальные голоса авторов.
Тебе дают: черновик статьи, описание стиля автора (StyleDNA) и примеры текстов в его голосе.

Твоя задача — полностью переписать черновик, сохраняя смысл и структуру, но используя стиль автора:
- Фразы и обороты из его примеров
- Его тон и ритм речи
- Его способ аргументации
- Его пунктуацию и стилистические приёмы

Верни только переписанный текст (без markdown, без HTML).`;

export interface ProcessResult {
  data: ExtractedDialogueData;
  usedModel: string;
  log: ModelLogEntry[];
}

export async function cleanDialogueText(
  rawText: string,
  apiKey: string,
  customPrompt?: string,
  modelOverride?: string,
): Promise<string> {
  const cleanPrompt = customPrompt ?? CLEAN_PROMPT;
  const available = await fetchAvailableModels(apiKey);
  const ordered = modelOverride ? [modelOverride] : buildOrderedModels(available);
  if (ordered.length === 0) throw new Error('Нет доступных моделей для этого ключа');

  for (const model of ordered) {
    try {
      const text = await callGenerate(model, apiKey, `${cleanPrompt}\n\nТЕКСТ РАЗГОВОРА:\n${rawText}`);
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
  model?: string,
  onProgress?: (entry: ModelLogEntry) => void,
): Promise<ProcessResult> {
  const prompt = `${ANALYSE_PROMPT}\n\nРАЗГОВОР:\n${cleanedText}`;
  const available = await fetchAvailableModels(apiKey);
  const ordered = model ? [model] : buildOrderedModels(available);

  if (ordered.length === 0) throw new Error('Нет доступных моделей для этого ключа');

  const log: ModelLogEntry[] = [];
  let lastError = '';

  for (const modelToTry of ordered) {
    try {
      const text = await callGenerate(modelToTry, apiKey, prompt);
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
      const entry: ModelLogEntry = { model: modelToTry, status: 'ok' };
      log.push(entry);
      onProgress?.(entry);
      return { data: parsed, usedModel: modelToTry, log };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (isRecoverable(lastError)) {
        const entry: ModelLogEntry = { model: modelToTry, status: 'blocked', message: lastError.slice(0, 120) };
        log.push(entry);
        onProgress?.(entry);
        continue;
      }
      const entry: ModelLogEntry = { model: modelToTry, status: 'error', message: lastError.slice(0, 120) };
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

export async function extractArticlePatterns(
  cleanedText: string,
  apiKey: string,
  model?: string,
): Promise<{ articleTopics: string[]; painPoints: string[]; styleMarkers: string[] }> {
  const prompt = `${ARTICLE_ANALYSE_PROMPT}\n\nРАЗГОВОР:\n${cleanedText}`;
  const available = await fetchAvailableModels(apiKey);
  const ordered = model ? [model] : buildOrderedModels(available);

  if (ordered.length === 0) throw new Error('Нет доступных моделей для этого ключа');

  let lastError = '';

  for (const modelToTry of ordered) {
    try {
      const text = await callGenerate(modelToTry, apiKey, prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Нет JSON в ответе');
      const parsed = JSON.parse(jsonMatch[0]) as {
        articleTopics?: string[];
        painPoints?: string[];
        styleMarkers?: string[];
      };
      return {
        articleTopics: parsed.articleTopics ?? [],
        painPoints: parsed.painPoints ?? [],
        styleMarkers: parsed.styleMarkers ?? [],
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (isRecoverable(lastError)) continue;
      throw err;
    }
  }

  throw new Error('Все модели перебраны без результата при извлечении тем для статей');
}

export async function extractBatchArticleTopics(
  allExtracted: ExtractedDialogueData[],
  apiKey: string,
  model?: string,
): Promise<{ articleTopicSuggestions: string[]; topPainPoints: string[] }> {
  const payload = JSON.stringify(
    allExtracted.map((e) => ({
      articleTopics: e.articleTopics ?? [],
      painPoints: e.painPoints ?? [],
    })),
    null,
    2,
  );
  const prompt = `${BATCH_ARTICLE_TOPICS_PROMPT}\n\nДАННЫЕ (${allExtracted.length} разговоров):\n${payload}`;

  const available = await fetchAvailableModels(apiKey);
  const ordered = model ? [model] : buildOrderedModels(available);

  if (ordered.length === 0) throw new Error('Нет доступных моделей для этого ключа');

  let lastError = '';

  for (const modelToTry of ordered) {
    try {
      const text = await callGenerate(modelToTry, apiKey, prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Нет JSON в ответе');
      const parsed = JSON.parse(jsonMatch[0]) as {
        articleTopicSuggestions?: string[];
        topPainPoints?: string[];
      };
      return {
        articleTopicSuggestions: parsed.articleTopicSuggestions ?? [],
        topPainPoints: parsed.topPainPoints ?? [],
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (isRecoverable(lastError)) continue;
      throw err;
    }
  }

  throw new Error('Все модели перебраны без результата при пакетном анализе тем для статей');
}

export async function extractStyleDNA(
  texts: string[],
  apiKey: string,
  model?: string,
): Promise<{
  frequentPhrases: string[];
  avgSentenceLength: 'short' | 'medium' | 'long';
  tone: string;
  thoughtStructure: string;
  additionalNotes?: string;
}> {
  // Take max first 20 texts, limit each to 4000 chars
  const excerpt = texts
    .slice(0, 20)
    .map((t) => t.slice(0, 4000))
    .join('\n\n---\n\n');

  const prompt = `${STYLE_DNA_PROMPT}\n\nВЫДЕРЖКИ ИЗ РАЗГОВОРОВ (${texts.length} диалогов):\n${excerpt}`;
  const available = await fetchAvailableModels(apiKey);
  const ordered = model ? [model] : buildOrderedModels(available);

  if (ordered.length === 0) throw new Error('Нет доступных моделей для этого ключа');

  let lastError = '';

  for (const modelToTry of ordered) {
    try {
      const text = await callGenerate(modelToTry, apiKey, prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Нет JSON в ответе');
      const parsed = JSON.parse(jsonMatch[0]) as {
        frequentPhrases?: string[];
        avgSentenceLength?: 'short' | 'medium' | 'long';
        tone?: string;
        thoughtStructure?: string;
        additionalNotes?: string;
      };
      return {
        frequentPhrases: parsed.frequentPhrases ?? [],
        avgSentenceLength: parsed.avgSentenceLength ?? 'medium',
        tone: parsed.tone ?? '',
        thoughtStructure: parsed.thoughtStructure ?? '',
        additionalNotes: parsed.additionalNotes,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (isRecoverable(lastError)) continue;
      throw err;
    }
  }

  throw new Error('Все модели перебраны без результата при извлечении StyleDNA');
}

export async function generateArticleDraft(
  topic: string,
  patterns: { painPoints: string[]; articleTopics: string[] },
  apiKey: string,
  model?: string,
): Promise<string> {
  const patternText = `Боли: ${patterns.painPoints.join(', ')}\nТемы: ${patterns.articleTopics.join(', ')}`;
  const prompt = `${ARTICLE_DRAFT_PROMPT}\n\nТЕМА: ${topic}\n\nПАТТЕРНЫ:\n${patternText}`;

  const available = await fetchAvailableModels(apiKey);
  const ordered = model ? [model] : buildOrderedModels(available);

  if (ordered.length === 0) throw new Error('Нет доступных моделей для этого ключа');

  for (const modelToTry of ordered) {
    try {
      const text = await callGenerate(modelToTry, apiKey, prompt);
      if (text.trim()) return text.trim();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isRecoverable(msg)) continue;
      throw err;
    }
  }

  throw new Error('Все модели перебраны без результата при генерации черновика');
}

export interface StyleDNAForRewrite {
  frequentPhrases: string[];
  tone: string;
  thoughtStructure: string;
}

export interface FewShotExample {
  title: string;
  content: string;
}

export async function rewriteArticleInStyle(
  draft: string,
  styleDNA: StyleDNAForRewrite,
  fewShots: FewShotExample[],
  apiKey: string,
  model?: string,
): Promise<string> {
  const styleSection = `Тон: ${styleDNA.tone}\nСтруктура: ${styleDNA.thoughtStructure}\nФразы: ${styleDNA.frequentPhrases.join(', ')}`;
  const examplesSection = fewShots
    .map((ex) => `Пример "${ex.title}":\n${ex.content}`)
    .join('\n\n---\n\n');

  const fullPrompt = `${ARTICLE_STYLE_REWRITE_PROMPT}\n\nСТИЛЬ АВТОРА:\n${styleSection}\n\nПРИМЕРЫ ТЕКСТОВ:\n${examplesSection}\n\nЧЕРНОВИК:\n${draft}`;

  const available = await fetchAvailableModels(apiKey);
  const ordered = model ? [model] : buildOrderedModels(available);

  if (ordered.length === 0) throw new Error('Нет доступных моделей для этого ключа');

  for (const modelToTry of ordered) {
    try {
      const text = await callGenerate(modelToTry, apiKey, fullPrompt);
      if (text.trim()) return text.trim();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isRecoverable(msg)) continue;
      throw err;
    }
  }

  throw new Error('Все модели перебраны без результата при рестайле статьи');
}

export async function listAvailableModels(apiKey: string): Promise<string[]> {
  _availableModels = null;
  return fetchAvailableModels(apiKey);
}
