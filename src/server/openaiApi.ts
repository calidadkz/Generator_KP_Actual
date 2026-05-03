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

export async function cleanDialogueTextGPT(rawText: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('OPENAI_API_KEY is required for GPT');
  const prompt = `Очисти этот текст телефонного разговора от артефактов (шумы, заикания, ненужные слова). Сохрани смысл и стиль:

"${rawText}"`;
  const response = await callOpenAI('gpt-4o-mini', apiKey, prompt);
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
