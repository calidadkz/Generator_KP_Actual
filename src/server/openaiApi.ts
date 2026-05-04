import { ExtractedDialogueData, ModelLogEntry, MicroPresentation, BatchInsights } from '../types.js';

interface ProcessResult {
  data: ExtractedDialogueData;
  usedModel: string;
  log: ModelLogEntry[];
}

const OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];

const ANALYSE_PROMPT = `Проанализируй разговор между продавцом и клиентом. Выделить:
1. Тип клиента (компания, индивидуальный предприниматель, индивидуал)
2. Намёк на тип станка (лазер, ЧПУ, плазма и т.д.)
3. Этапы разговора (открытие, квалификация, возражения, закрытие)
4. Ключевые формулировки продавца для скрипта
5. Техники работы с возражениями
6. Предложения для новых мини-презентаций

Вернуть только JSON без текста:
{
  "clientType": "...",
  "machineTypeHint": "...",
  "conversationSteps": [...],
  "formulations": [...],
  "techniques": [...],
  "suggestedMicroPresentations": [{"title":"...","content":"...","category":"...","tags":[...]}]
}`;

const BATCH_PROMPT = `На основе анализа 5+ диалогов выделить:
1. Портреты целевых клиентов
2. Топ-10 эффективных формулировок
3. Распространённые технологические вопросы
4. Предложения для скрипта
5. Разбор по типам станков

Вернуть JSON:
{
  "clientPortraits": [...],
  "topFormulations": [...],
  "commonTechniques": [...],
  "scriptSuggestions": [...],
  "machineTypeBreakdown": {...}
}`;

const ARTICLE_ANALYSE_PROMPT = `Ты эксперт по продажам и маркетингу промышленного оборудования.
Проанализируй разговор и выделить темы для SEO-статей, боли клиента и стиль менеджера.

Вернуть JSON:
{
  "articleTopics": ["Тема статьи 1 (что можно раскрыть в публикации)", "Тема 2"],
  "painPoints": ["Явная боль или проблема клиента 1", "Проблема 2"],
  "styleMarkers": ["Характерная фраза менеджера", "Оборот речи", "Стиль аргументации"]
}`;

const BATCH_ARTICLE_TOPICS_PROMPT = `На основе анализа 5+ диалогов выделить рекомендуемые темы для блога и топ-боли клиентов.

Вернуть JSON:
{
  "articleTopicSuggestions": ["Рекомендуемая тема 1", "Тема 2", "Тема 3"],
  "topPainPoints": ["Топ-боль 1 (встречается часто)", "Топ-боль 2", "Топ-боль 3"]
}`;

const STYLE_DNA_PROMPT = `На основе выдержек из разговоров менеджера выделить уникальные черты его стиля для написания статей в его голосе.

Вернуть JSON:
{
  "frequentPhrases": ["Характерная фраза 1", "Фраза 2", "Фраза 3"],
  "avgSentenceLength": "short|medium|long",
  "tone": "описание тона",
  "thoughtStructure": "типичная структура аргументов",
  "additionalNotes": "дополнительные наблюдения"
}`;

const ARTICLE_DRAFT_PROMPT = `Напишите логичный, хорошо структурированный черновик статьи для B2B сектора промышленного оборудования на русском языке.
Используй предоставленные боли и аргументы, структурируй статью как: вступление → проблема → решение → преимущества → заключение.
Верни статью в виде простого текста (без markdown).`;

const ARTICLE_STYLE_REWRITE_PROMPT = `Переписать статью, сохраняя смысл и структуру, но используя уникальный стиль автора: его фразы, тон, ритм речи и способ аргументации.
Верни только переписанный текст (без markdown).`;

async function callOpenAI(model: string, apiKey: string, prompt: string): Promise<string> {
  const url = 'https://api.openai.com/v1/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errData = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errData.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in OpenAI response');
  return content;
}

export function listGptModels(): string[] {
  return OPENAI_MODELS;
}

export async function cleanDialogueTextGPT(
  rawText: string,
  apiKey: string,
  customPrompt?: string,
  model?: string,
): Promise<string> {
  if (!apiKey) throw new Error('OPENAI_API_KEY is required for GPT');
  const cleanPrompt = customPrompt ?? `Очисти этот текст телефонного разговора от артефактов (шумы, заикания, ненужные слова). Сохрани смысл и стиль:

"${rawText}"`;
  const selectedModel = model ?? 'gpt-4o-mini';
  const response = await callOpenAI(selectedModel, apiKey, cleanPrompt);
  return response.trim();
}

export async function analyzeDialogueGPT(
  cleanedText: string,
  apiKey: string,
  model = 'gpt-4o',
  onProgress?: (entry: ModelLogEntry) => void,
): Promise<ProcessResult> {
  if (!apiKey) throw new Error('OPENAI_API_KEY is required for GPT');
  const prompt = `${ANALYSE_PROMPT}\n\nРАЗГОВОР:\n${cleanedText}`;
  const log: ModelLogEntry[] = [];

  try {
    const text = await callOpenAI(model, apiKey, prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response: ' + text.slice(0, 200));
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
    const msg = err instanceof Error ? err.message : String(err);
    const entry: ModelLogEntry = { model, status: 'error', message: msg.slice(0, 120) };
    log.push(entry);
    onProgress?.(entry);
    throw err;
  }
}

export async function extractBatchInsightsGPT(
  allExtracted: ExtractedDialogueData[],
  apiKey: string,
  model = 'gpt-4o',
): Promise<BatchInsights> {
  if (!apiKey) throw new Error('OPENAI_API_KEY is required for GPT');
  const payload = JSON.stringify(
    allExtracted.map((e) => ({
      clientType: e.clientType,
      machineTypeHint: e.machineTypeHint,
      formulations: e.formulations,
      techniques: e.techniques,
    })),
  );
  const prompt = `${BATCH_PROMPT}\n\nДиалоги:\n${payload}`;

  try {
    const text = await callOpenAI(model, apiKey, prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const data = JSON.parse(jsonMatch[0]) as BatchInsights;
    return {
      id: `batch-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      dialogueCount: allExtracted.length,
      usedModel: model,
      clientPortraits: data.clientPortraits ?? [],
      topFormulations: data.topFormulations ?? [],
      commonTechniques: data.commonTechniques ?? [],
      scriptSuggestions: data.scriptSuggestions ?? [],
      machineTypeBreakdown: data.machineTypeBreakdown ?? {},
    };
  } catch (err) {
    console.error('Failed to extract batch insights from GPT:', err);
    throw err;
  }
}

export async function extractArticlePatternsGPT(
  cleanedText: string,
  apiKey: string,
  model = 'gpt-4o-mini',
): Promise<{ articleTopics: string[]; painPoints: string[]; styleMarkers: string[] }> {
  if (!apiKey) throw new Error('OPENAI_API_KEY is required for GPT');
  const prompt = `${ARTICLE_ANALYSE_PROMPT}\n\nРАЗГОВОР:\n${cleanedText}`;

  try {
    const text = await callOpenAI(model, apiKey, prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
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
    console.error('Failed to extract article patterns from GPT:', err);
    throw err;
  }
}

export async function extractBatchArticleTopicsGPT(
  allExtracted: ExtractedDialogueData[],
  apiKey: string,
  model = 'gpt-4o-mini',
): Promise<{ articleTopicSuggestions: string[]; topPainPoints: string[] }> {
  if (!apiKey) throw new Error('OPENAI_API_KEY is required for GPT');
  const payload = JSON.stringify(
    allExtracted.map((e) => ({
      articleTopics: e.articleTopics ?? [],
      painPoints: e.painPoints ?? [],
    })),
  );
  const prompt = `${BATCH_ARTICLE_TOPICS_PROMPT}\n\nДиалоги:\n${payload}`;

  try {
    const text = await callOpenAI(model, apiKey, prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]) as {
      articleTopicSuggestions?: string[];
      topPainPoints?: string[];
    };
    return {
      articleTopicSuggestions: parsed.articleTopicSuggestions ?? [],
      topPainPoints: parsed.topPainPoints ?? [],
    };
  } catch (err) {
    console.error('Failed to extract batch article topics from GPT:', err);
    throw err;
  }
}

export async function extractStyleDNAGPT(
  texts: string[],
  apiKey: string,
  model = 'gpt-4o-mini',
): Promise<{
  frequentPhrases: string[];
  avgSentenceLength: 'short' | 'medium' | 'long';
  tone: string;
  thoughtStructure: string;
  additionalNotes?: string;
}> {
  if (!apiKey) throw new Error('OPENAI_API_KEY is required for GPT');
  const excerpt = texts
    .slice(0, 20)
    .map((t) => t.slice(0, 4000))
    .join('\n\n---\n\n');

  const prompt = `${STYLE_DNA_PROMPT}\n\nВЫДЕРЖКИ ИЗ РАЗГОВОРОВ (${texts.length} диалогов):\n${excerpt}`;

  try {
    const text = await callOpenAI(model, apiKey, prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
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
    console.error('Failed to extract StyleDNA from GPT:', err);
    throw err;
  }
}

export async function generateArticleDraftGPT(
  topic: string,
  patterns: { painPoints: string[]; articleTopics: string[] },
  apiKey: string,
  model = 'gpt-4o-mini',
): Promise<string> {
  if (!apiKey) throw new Error('OPENAI_API_KEY is required for GPT');
  const patternText = `Боли: ${patterns.painPoints.join(', ')}\nТемы: ${patterns.articleTopics.join(', ')}`;
  const prompt = `${ARTICLE_DRAFT_PROMPT}\n\nТЕМА: ${topic}\n\nПАТТЕРНЫ:\n${patternText}`;

  try {
    const text = await callOpenAI(model, apiKey, prompt);
    if (!text.trim()) throw new Error('Empty response');
    return text.trim();
  } catch (err) {
    console.error('Failed to generate article draft from GPT:', err);
    throw err;
  }
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

export async function rewriteArticleInStyleGPT(
  draft: string,
  styleDNA: StyleDNAForRewrite,
  fewShots: FewShotExample[],
  apiKey: string,
  model = 'gpt-4o-mini',
): Promise<string> {
  if (!apiKey) throw new Error('OPENAI_API_KEY is required for GPT');
  const styleSection = `Тон: ${styleDNA.tone}\nСтруктура: ${styleDNA.thoughtStructure}\nФразы: ${styleDNA.frequentPhrases.join(', ')}`;
  const examplesSection = fewShots
    .map((ex) => `Пример "${ex.title}":\n${ex.content}`)
    .join('\n\n---\n\n');

  const fullPrompt = `${ARTICLE_STYLE_REWRITE_PROMPT}\n\nСТИЛЬ АВТОРА:\n${styleSection}\n\nПРИМЕРЫ ТЕКСТОВ:\n${examplesSection}\n\nЧЕРНОВИК:\n${draft}`;

  try {
    const text = await callOpenAI(model, apiKey, fullPrompt);
    if (!text.trim()) throw new Error('Empty response');
    return text.trim();
  } catch (err) {
    console.error('Failed to rewrite article in style from GPT:', err);
    throw err;
  }
}
