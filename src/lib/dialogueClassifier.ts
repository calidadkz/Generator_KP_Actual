/**
 * Dialogue classification and preprocessing utility
 * Detects whether a dialogue is: real customer call, manager training, or educational material
 */

export type DialogueType = 'real' | 'training' | 'educational';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

interface ClassificationResult {
  type: DialogueType;
  confidence: ConfidenceLevel;
  indicators: string[];
}

const TRAINING_INDICATORS = [
  /^training|тренинг|обучение/im,
  /manager\s+(training|practice)/im,
  /менеджер.*тренирует|тренировка/im,
  /это\s+пример|example dialogue/im,
  /учебный\s+диалог|educational/im,
  /практика|practice call/im,
  /scenario:|сценарий:/im,
];

const REAL_DIALOGUE_INDICATORS = [
  /customer|client|покупатель|клиент/im,
  /quote|quotation|предложение|расчет/im,
  /price|pricing|стоимость|цена/im,
  /delivery|доставка|поставка/im,
  /technical\s+specs|технические\s+характеристики/im,
  /serial|model|модель|артикул/im,
];

/**
 * Classify dialogue based on content analysis
 */
export function classifyDialogue(text: string): ClassificationResult {
  if (!text || text.length < 50) {
    return { type: 'real', confidence: 'low', indicators: ['insufficient text for classification'] };
  }

  const trainingHits = TRAINING_INDICATORS.filter((regex) => regex.test(text)).length;
  const realHits = REAL_DIALOGUE_INDICATORS.filter((regex) => regex.test(text)).length;

  let type: DialogueType = 'real';
  let confidence: ConfidenceLevel = 'low';
  const indicators: string[] = [];

  // Heuristic: training indicators are strong signals
  if (trainingHits > 0) {
    type = 'training';
    confidence = trainingHits > 2 ? 'high' : trainingHits === 1 ? 'medium' : 'low';
    indicators.push(`${trainingHits} training markers detected`);
  }

  // Real dialogue typically has customer/pricing/model references
  if (realHits >= 3 && trainingHits === 0) {
    type = 'real';
    confidence = 'high';
    indicators.push(`${realHits} real dialogue markers detected`);
  } else if (realHits > 0 && trainingHits === 0) {
    type = 'real';
    confidence = 'medium';
    indicators.push(`${realHits} real dialogue markers detected`);
  }

  // If uncertain, default to 'real' but with low confidence
  if (trainingHits === 0 && realHits === 0) {
    type = 'real';
    confidence = 'low';
    indicators.push('no clear classification markers found');
  }

  return { type, confidence, indicators };
}

/**
 * Preprocess raw transcription to fix common artifacts
 * - Removes placeholder indicators ([laughs], [pause], etc.)
 * - Normalizes multiple spaces/newlines
 * - Handles speaker labels (Manager: / Customer:)
 */
export function preprocessTranscription(rawText: string): string {
  let text = rawText;

  // Remove timestamp patterns: [00:12:34] or (00:12:34)
  text = text.replace(/[\[\(]\d{2}:\d{2}:\d{2}[\]\)]/g, '');

  // Remove common transcription artifacts like [laughs], [pause], [background noise], etc.
  text = text.replace(/[\[\(](laughs?|pauses?|silence|noise|inaudible|crosstalk|cough|phone ring|background|um|uh|ah)[\]\)]/gi, '');

  // Normalize speaker labels: "Manager:" → "Manager: " (add space after colon if missing)
  text = text.replace(/^([A-Za-zА-Яа-я]+):\s*/gm, '$1: ');

  // Remove duplicate spaces
  text = text.replace(/\s{2,}/g, ' ');

  // Normalize line breaks: multiple empty lines → single newline
  text = text.replace(/\n{3,}/g, '\n\n');

  // Trim each line
  text = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

  return text.trim();
}

/**
 * Get human-readable description of classification result
 */
export function getClassificationLabel(type: DialogueType): string {
  const labels: Record<DialogueType, string> = {
    real: '📞 Реальный звонок',
    training: '🎓 Тренировка менеджера',
    educational: '📚 Обучающий материал',
  };
  return labels[type];
}

/**
 * Get color for confidence badge
 */
export function getConfidenceColor(confidence: ConfidenceLevel): string {
  const colors: Record<ConfidenceLevel, string> = {
    high: 'bg-green-100 text-green-700 border-green-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return colors[confidence];
}
