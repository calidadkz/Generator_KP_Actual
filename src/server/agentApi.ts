export interface AgentApiMessage {
  role: 'user' | 'assistant' | 'tool_result';
  text?: string;
  toolCall?: { name: string; args: Record<string, unknown> };
  toolName?: string;
  toolResult?: string;
}

export type AgentChatResult =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; toolCall: { name: string; input: Record<string, unknown>; id: string } };

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

const AGENT_TOOLS = [
  {
    name: 'get_micro_presentations',
    description: 'Получить список атомов знаний (МП). Используй для поиска существующих перед созданием новых.',
    parameters: {
      type: 'OBJECT',
      properties: {
        category: {
          type: 'STRING',
          description: 'Фильтр по категории',
          enum: ['Открытие', 'Квалификация', 'Возражения', 'Закрытие', 'Общее'],
        },
        query: {
          type: 'STRING',
          description: 'Поиск по тексту в названии или содержании',
        },
      },
    },
  },
  {
    name: 'create_micro_presentation',
    description: 'Создать новый атом знаний как черновик (isPublished=false). Перед созданием проверь похожие через get_micro_presentations.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Название — короткое, ёмкое' },
        category: {
          type: 'STRING',
          description: 'Категория',
          enum: ['Открытие', 'Квалификация', 'Возражения', 'Закрытие', 'Общее'],
        },
        technical: { type: 'STRING', description: 'Технический факт: что это, цифры, характеристики' },
        methodology: { type: 'STRING', description: 'Методология: как объяснить клиенту, что сказать' },
        compromise: { type: 'STRING', description: 'Компромисс: что предложить при нехватке бюджета' },
        machineTypeIds: {
          type: 'STRING',
          description: 'ID типов станков через запятую (пусто = универсальная)',
        },
        tags: { type: 'STRING', description: 'Теги через запятую' },
      },
      required: ['title', 'category', 'methodology'],
    },
  },
  {
    name: 'update_micro_presentation',
    description: 'Обновить существующий атом знаний. Используй точный ID из get_micro_presentations.',
    parameters: {
      type: 'OBJECT',
      properties: {
        id: { type: 'STRING', description: 'ID атома знаний (mp-xxx)' },
        title: { type: 'STRING', description: 'Новое название' },
        technical: { type: 'STRING', description: 'Обновлённый технический факт' },
        methodology: { type: 'STRING', description: 'Обновлённая методология' },
        compromise: { type: 'STRING', description: 'Обновлённая стратегия компромисса' },
        tags: { type: 'STRING', description: 'Теги через запятую' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_script_nodes',
    description: 'Получить этапы скрипта продаж.',
    parameters: {
      type: 'OBJECT',
      properties: {
        scriptType: {
          type: 'STRING',
          description: 'Тип скрипта',
          enum: ['qualification', 'closing', 'calling'],
        },
      },
    },
  },
  {
    name: 'get_dialogues',
    description: 'Получить список диалогов с метаданными для анализа качества и выявления пробелов.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'NUMBER', description: 'Количество диалогов (по умолчанию 10, максимум 30)' },
      },
    },
  },
];

const SYSTEM_PROMPT_BASE = `Ты — Knowledge Architect системы CALIDAD.kz — B2B продажи лазерного и промышленного оборудования в Казахстане.

Ты знаешь структуру базы знаний и помогаешь руководителю её наполнять и поддерживать.

СТРУКТУРА АТОМА ЗНАНИЙ (три уровня):
- technical: технический факт (что это, цифры, характеристики) — серый фон
- methodology: методология эксперта (как объяснить клиенту, что сказать) — голубой фон
- compromise: стратегия компромисса (что предложить при нехватке бюджета) — янтарный фон

ПРАВИЛА ПОВЕДЕНИЯ:
1. Перед созданием МП — всегда проверяй дубли через get_micro_presentations
2. Создавай атомы как черновики — система покажет руководителю подтверждение перед сохранением
3. Для обновления используй точный ID из get_micro_presentations
4. Для массовых изменений — сначала покажи план, потом выполняй по одному
5. Отвечай на русском языке
6. При создании МП — заполняй все три уровня если есть информация
7. Если задача неясна — уточни, не делай предположений`;

function buildSystemPrompt(stats: { mpCount: number; publishedCount: number; draftCount: number; scriptCount: number; dialogueCount: number }): string {
  return `${SYSTEM_PROMPT_BASE}

ТЕКУЩЕЕ СОСТОЯНИЕ БАЗЫ:
- Атомов знаний: ${stats.mpCount} (${stats.publishedCount} опубликовано, ${stats.draftCount} черновиков)
- Этапов скрипта: ${stats.scriptCount}
- Диалогов: ${stats.dialogueCount}`;
}

function convertMessages(messages: AgentApiMessage[]): GeminiContent[] {
  const contents: GeminiContent[] = [];

  for (const msg of messages) {
    if (msg.role === 'tool_result' && msg.toolName && msg.toolResult !== undefined) {
      contents.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: msg.toolName,
            response: { result: msg.toolResult },
          },
        }],
      });
    } else if (msg.role === 'assistant') {
      if (msg.toolCall) {
        contents.push({
          role: 'model',
          parts: [{ functionCall: { name: msg.toolCall.name, args: msg.toolCall.args } }],
        });
      } else if (msg.text) {
        contents.push({ role: 'model', parts: [{ text: msg.text }] });
      }
    } else if (msg.role === 'user' && msg.text) {
      contents.push({ role: 'user', parts: [{ text: msg.text }] });
    }
  }

  return contents;
}

export async function agentChat(
  messages: AgentApiMessage[],
  stats: { mpCount: number; publishedCount: number; draftCount: number; scriptCount: number; dialogueCount: number },
  apiKey: string,
): Promise<AgentChatResult> {
  const systemPrompt = buildSystemPrompt(stats);
  const contents = convertMessages(messages);

  if (contents.length === 0) {
    return { type: 'text', content: 'Нет сообщений для обработки.' };
  }

  const requestBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    tools: [{ function_declarations: AGENT_TOOLS }],
    generation_config: {
      temperature: 0.7,
      max_output_tokens: 2048,
    },
  };

  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: GeminiPart[] };
    }>;
  };

  const parts = data.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    if (part.functionCall) {
      return {
        type: 'tool_call',
        toolCall: {
          name: part.functionCall.name,
          input: part.functionCall.args,
          id: `call_${Date.now()}_${part.functionCall.name}`,
        },
      };
    }
  }

  const text = parts.find((p) => p.text)?.text ?? '';
  return { type: 'text', content: text };
}
