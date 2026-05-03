import { BatchInsights, ExtractedDialogueData, ModelLogEntry } from '../types';

export interface ProcessResult {
  data: ExtractedDialogueData;
  usedModel: string;
  log: ModelLogEntry[];
}

async function apiCall<T>(endpoint: string, method: 'GET' | 'POST' = 'POST', body?: unknown): Promise<T> {
  const url = `/api${endpoint}`;
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error((errorData as { error?: string }).error || `API error: ${res.status}`);
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (jsonErr) {
    console.error('JSON parse error:', {
      endpoint,
      position: (jsonErr as SyntaxError).message,
      snippet: text.substring(Math.max(0, text.length - 500)),
    });
    throw new Error(`Ошибка парсинга ответа: ${(jsonErr as Error).message}`);
  }
}

/** Step 1: quick AI cleaning of transcription artifacts, preserves style */
export async function cleanDialogueText(rawText: string, provider?: 'gemini' | 'openai'): Promise<string> {
  const { cleanedText } = await apiCall<{ cleanedText: string }>('/clean-text', 'POST', { rawText, provider });
  return cleanedText;
}

/** Step 2: full structured analysis, returns extractedData */
export async function analyzeDialogue(
  cleanedText: string,
  onProgress?: (entry: ModelLogEntry) => void,
  model?: string,
  provider?: 'gemini' | 'openai',
): Promise<ProcessResult> {
  const result = await apiCall<ProcessResult>('/analyze-dialogue', 'POST', { cleanedText, model, provider });
  if (onProgress && result.log) {
    result.log.forEach(onProgress);
  }
  return result;
}

/** Step 3: batch pattern extraction from 5+ analyzed dialogues */
export async function extractBatchInsights(
  allExtracted: ExtractedDialogueData[],
  model?: string,
  provider?: 'gemini' | 'openai',
): Promise<BatchInsights> {
  return apiCall<BatchInsights>('/extract-batch-insights', 'POST', { allExtracted, model, provider });
}

export async function listAvailableModels(): Promise<{ gemini: string[]; gpt: string[] }> {
  return apiCall<{ gemini: string[]; gpt: string[] }>('/available-models', 'GET');
}
