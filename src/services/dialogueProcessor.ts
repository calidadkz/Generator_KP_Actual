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
  return res.json();
}

/** Step 1: quick AI cleaning of transcription artifacts, preserves style */
export async function cleanDialogueText(rawText: string): Promise<string> {
  const { cleanedText } = await apiCall<{ cleanedText: string }>('/clean-text', 'POST', { rawText });
  return cleanedText;
}

/** Step 2: full structured analysis, returns extractedData */
export async function analyzeDialogue(
  cleanedText: string,
  onProgress?: (entry: ModelLogEntry) => void,
): Promise<ProcessResult> {
  const result = await apiCall<ProcessResult>('/analyze-dialogue', 'POST', { cleanedText });
  if (onProgress && result.log) {
    result.log.forEach(onProgress);
  }
  return result;
}

/** Step 3: batch pattern extraction from 5+ analyzed dialogues */
export async function extractBatchInsights(
  allExtracted: ExtractedDialogueData[],
): Promise<BatchInsights> {
  return apiCall<BatchInsights>('/extract-batch-insights', 'POST', { allExtracted });
}

export async function listAvailableModels(): Promise<string[]> {
  const { models } = await apiCall<{ models: string[] }>('/available-models', 'GET');
  return models;
}
