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

/** Extract article-specific patterns (topics, pain points, style markers) from cleaned dialogue */
export async function extractArticlePatterns(
  cleanedText: string,
  provider?: 'gemini' | 'openai',
  model?: string,
): Promise<{ articleTopics: string[]; painPoints: string[]; styleMarkers: string[] }> {
  return apiCall<{ articleTopics: string[]; painPoints: string[]; styleMarkers: string[] }>(
    '/extract-article-patterns',
    'POST',
    { cleanedText, provider, model }
  );
}

/** Extract article topic suggestions and top pain points from batch of dialogues */
export async function extractBatchArticleTopics(
  allExtracted: ExtractedDialogueData[],
  provider?: 'gemini' | 'openai',
  model?: string,
): Promise<{ articleTopicSuggestions: string[]; topPainPoints: string[] }> {
  return apiCall<{ articleTopicSuggestions: string[]; topPainPoints: string[] }>(
    '/extract-batch-article-topics',
    'POST',
    { allExtracted, provider, model }
  );
}

/** Extract speaker's unique style characteristics (StyleDNA) from 3+ dialogue texts */
export async function extractStyleDNA(
  texts: string[],
  provider?: 'gemini' | 'openai',
  model?: string,
): Promise<{
  frequentPhrases: string[];
  avgSentenceLength: 'short' | 'medium' | 'long';
  tone: string;
  thoughtStructure: string;
  additionalNotes?: string;
}> {
  return apiCall<{
    frequentPhrases: string[];
    avgSentenceLength: 'short' | 'medium' | 'long';
    tone: string;
    thoughtStructure: string;
    additionalNotes?: string;
  }>(
    '/extract-style-dna',
    'POST',
    { texts, provider, model }
  );
}

/** Generate initial article draft from topic and extracted patterns */
export async function generateArticleDraft(
  topic: string,
  patterns: { painPoints: string[]; articleTopics: string[] },
  provider?: 'gemini' | 'openai',
  model?: string,
): Promise<string> {
  const result = await apiCall<{ draft: string }>(
    '/generate-article-draft',
    'POST',
    { topic, patterns, provider, model }
  );
  return result.draft;
}

/** Rewrite article draft in speaker's unique style using StyleDNA and few-shot examples */
export async function rewriteArticleInStyle(
  draft: string,
  styleDNA: { frequentPhrases: string[]; tone: string; thoughtStructure: string },
  fewShots?: Array<{ title: string; content: string }>,
  provider?: 'gemini' | 'openai',
  model?: string,
): Promise<string> {
  const result = await apiCall<{ styledContent: string }>(
    '/rewrite-article-style',
    'POST',
    { draft, styleDNA, fewShots, provider, model }
  );
  return result.styledContent;
}

export async function listAvailableModels(): Promise<string[]> {
  const result = await apiCall<{ gemini: string[]; gpt: string[] }>('/available-models', 'GET');
  return result.gemini || [];
}

export function listGptModels(): string[] {
  return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
}
