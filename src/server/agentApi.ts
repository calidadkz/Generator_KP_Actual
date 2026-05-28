export interface AgentApiMessage {
  role: 'user' | 'assistant' | 'tool_result';
  text?: string;
  toolCall?: { name: string; args: Record<string, unknown>; id?: string };
  toolName?: string;
  toolResult?: string;
  toolCallId?: string; // id из tool_use блока Anthropic для сопоставления с tool_result
}

export type AgentChatResult =
  | { type: 'text'; content: string; usage?: { inputTokens: number; outputTokens: number } }
  | { type: 'tool_call'; toolCall: { name: string; input: Record<string, unknown>; id: string }; usage?: { inputTokens: number; outputTokens: number } };

// ─── Определения инструментов (Anthropic JSON Schema формат) ─────────────────

const MP_CATEGORIES = ['Открытие', 'Квалификация', 'Возражения', 'Закрытие', 'Общее', 'Формулировки'] as const;
const SCRIPT_CATEGORIES = ['Открытие', 'Квалификация', 'Возражения', 'Закрытие', 'Общее'] as const;

const AGENT_TOOLS = [
  {
    name: 'get_micro_presentations',
    description: 'Получить список атомов знаний (МП). Используй для поиска существующих перед созданием новых.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Фильтр по категории',
          enum: MP_CATEGORIES,
        },
        query: {
          type: 'string',
          description: 'Поиск по тексту в названии или содержании',
        },
      },
    },
  },
  {
    name: 'create_micro_presentation',
    description: 'Создать новый атом знаний как черновик. Перед созданием проверь похожие через get_micro_presentations.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Название — короткое, ёмкое' },
        category: {
          type: 'string',
          description: 'Категория',
          enum: MP_CATEGORIES,
        },
        technical: { type: 'string', description: 'Технический факт: что это, цифры, характеристики' },
        methodology: { type: 'string', description: 'Методология: как объяснить клиенту, что сказать' },
        compromise: { type: 'string', description: 'Компромисс: что предложить при нехватке бюджета' },
        machineTypeIds: {
          type: 'string',
          description: 'ID типов станков через запятую (пусто = универсальная). ID берёшь из get_machine_types.',
        },
        tags: { type: 'string', description: 'Теги через запятую' },
        slotConditions: {
          type: 'string',
          description: 'JSON: условия показа атома по заполненным слотам. Пример: {"material":["акрил","пвх"],"thickness":["до 10"]}. Ключи slot.key из get_machine_types.',
        },
      },
      required: ['title', 'category', 'methodology'],
    },
  },
  {
    name: 'update_micro_presentation',
    description: 'Обновить существующий атом знаний. ID берёшь из get_micro_presentations.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID атома знаний (mp-xxx)' },
        title: { type: 'string', description: 'Новое название' },
        technical: { type: 'string', description: 'Обновлённый технический факт' },
        methodology: { type: 'string', description: 'Обновлённая методология' },
        compromise: { type: 'string', description: 'Обновлённый компромисс' },
        tags: { type: 'string', description: 'Теги через запятую' },
        slotConditions: {
          type: 'string',
          description: 'JSON условий показа по слотам. Пример: {"material":["металл"]}. Передай "" чтобы очистить.',
        },
        isPublished: { type: 'boolean', description: 'true = опубликовать, false = оставить черновиком' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_script_nodes',
    description: 'Получить этапы скрипта продаж.',
    input_schema: {
      type: 'object',
      properties: {
        scriptType: {
          type: 'string',
          description: 'Тип скрипта',
          enum: ['qualification', 'closing', 'calling'],
        },
      },
    },
  },
  {
    name: 'create_script_node',
    description: 'Создать этап скрипта продаж. Источник — conversationSteps из диалогов.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Название этапа' },
        content: { type: 'string', description: 'Что говорить на этом этапе' },
        category: {
          type: 'string',
          description: 'Категория этапа',
          enum: SCRIPT_CATEGORIES,
        },
        scriptType: {
          type: 'string',
          description: 'Тип скрипта',
          enum: ['qualification', 'closing', 'calling'],
        },
        tips: { type: 'string', description: 'Практические советы через | (разделитель)' },
      },
      required: ['title', 'content', 'category'],
    },
  },
  {
    name: 'get_dialogues',
    description: 'Получить список диалогов с метаданными. Используй чтобы найти диалоги для наполнения библиотеки.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Количество (по умолчанию 10, максимум 30)' },
      },
    },
  },
  {
    name: 'get_dialogue_content',
    description: 'Получить полный анализ конкретного диалога: формулировки, техники, боли, предложенные МП, этапы разговора.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID диалога из get_dialogues' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_machine_types',
    description: 'Получить список типов станков с ID и квалификационными слотами. Используй чтобы узнать ID для machineTypeIds и ключи для slotConditions.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'update_machine_type',
    description: 'Обновить квалификационные слоты типа станка. Слот = пара key:label.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID типа станка из get_machine_types' },
        qualifiers: {
          type: 'string',
          description: 'Слоты через | в формате key:label. Например: material:Материал|thickness:Толщина мм. Перезапишет существующие.',
        },
      },
      required: ['id', 'qualifiers'],
    },
  },
  {
    name: 'update_script_node',
    description: 'Обновить существующий этап скрипта. ID берёшь из get_script_nodes.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID этапа из get_script_nodes' },
        title: { type: 'string', description: 'Новое название' },
        content: { type: 'string', description: 'Новое содержание — что говорить на этапе' },
        category: { type: 'string', enum: SCRIPT_CATEGORIES, description: 'Категория этапа' },
        tips: { type: 'string', description: 'Советы через | (перезапишет список). Передай "" чтобы очистить.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_micro_presentation',
    description: 'УДАЛИТЬ атом знаний. Только для дублей — проверь get_micro_presentations перед удалением.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID атома (mp-xxx) из get_micro_presentations' },
        reason: { type: 'string', description: 'Причина удаления: что это дублирует' },
      },
      required: ['id', 'reason'],
    },
  },
  {
    name: 'analyze_dialogue',
    description: 'Запустить AI-анализ диалога. Используй для диалогов с analysisStatus=pending или analysisStatus=error. Занимает 15-30 секунд.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID диалога из get_dialogues' },
        forArticles: {
          type: 'boolean',
          description: 'true = также извлечь темы для статей (articleTopics, painPoints). Используй для реальных звонков с богатым содержанием.',
        },
      },
      required: ['id'],
    },
  },
];

// ─── Системный промпт ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT_BASE = `Ты — Knowledge Architect системы CALIDAD.kz — B2B продажи лазерного и промышленного оборудования в Казахстане.

Ты знаешь структуру базы знаний и помогаешь руководителю её наполнять и поддерживать.

СТРУКТУРА АТОМА ЗНАНИЙ (три уровня):
- technical: технический факт (что это, цифры, характеристики) — серый фон
- methodology: методология эксперта (как объяснить клиенту, что сказать) — голубой фон
- compromise: стратегия компромисса (что предложить при нехватке бюджета) — янтарный фон

КАТЕГОРИИ АТОМОВ:
- Открытие / Квалификация / Возражения / Закрытие / Общее — привязаны к этапу скрипта
- Формулировки — ключевые речевые обороты, показываются менеджеру ВСЕГДА независимо от этапа

НАПОЛНЕНИЕ ИЗ ДИАЛОГОВ (главный сценарий):
1. Вызови get_dialogues → найди диалоги с analysisStatus=done
2. Вызови get_dialogue_content(id) → получишь formulations, techniques, suggestedMicroPresentations, conversationSteps
3. suggestedMicroPresentations — уже готовые МП от AI, используй как основу
4. formulations — ключевые фразы → категория Формулировки
5. conversationSteps — этапы разговора → create_script_node
6. Перед каждым созданием проверяй дубли через get_micro_presentations

УМНЫЙ ПОКАЗ МП (slotConditions):
Атомы с slotConditions показываются менеджеру АВТОМАТИЧЕСКИ когда клиент называет нужные параметры.
Пример: {"material":["акрил","пвх"]} → атом появится когда менеджер укажет материал акрил/пвх.
Ключи слотов берёшь из get_machine_types → qualifiers[].key.

ЗАПОЛНЕНИЕ КВАЛИФИКАЦИОННЫХ СЛОТОВ:
1. get_machine_types → посмотри текущие слоты
2. update_machine_type(id, qualifiers) → формат key:label через |

УПРАВЛЕНИЕ СКРИПТОМ:
- update_script_node(id) — обновить этап: title, content, category, tips (через |)
- create_script_node — создать новый этап

УДАЛЕНИЕ ДУБЛЕЙ:
- delete_micro_presentation(id, reason) — только для явных дублей
- Перед удалением всегда проверь get_micro_presentations

АНАЛИЗ ДИАЛОГОВ:
- analyze_dialogue(id) — запустить AI-анализ pending/error диалогов
- forArticles=true — дополнительно извлечь темы для статей
- После анализа используй get_dialogue_content для чтения результатов

ИНТЕРФЕЙС СИСТЕМЫ (что видит руководитель в AdminPanel):
- Вкладка "Диалоги": загрузка .txt файлов, очистка AI, кнопка "Анализировать" на каждом диалоге, массовый анализ всех pending
- Вкладка "Скрипт": CRUD этапов скрипта, drag-n-drop порядка
- Вкладка "МП/Атомы": управление атомами, публикация черновиков
- Вкладка "Типы станков": управление типами и квалификационными слотами
- Вкладка "Библиотека": просмотр базы знаний сгруппированной по этапам
- Вкладка "Агент" (ТЫ ЗДЕСЬ): этот чат
- Вкладка "Затраты": дашборд расходов API

КРИТИЧЕСКИ ВАЖНО — ПРИНЦИП САМОДЕЙСТВИЯ:
- Ты можешь запустить анализ диалога САМА через инструмент analyze_dialogue(id) — НЕ спрашивай пользователя нажимать кнопки
- Ты можешь читать, создавать, обновлять данные через свои инструменты
- Задавай уточняющий вопрос ТОЛЬКО если нет подходящего инструмента
- Если нужно выполнить действие — выполняй, не объясняй как это сделать вручную

ПРАВИЛА ПОВЕДЕНИЯ:
1. Перед созданием МП — проверяй дубли через get_micro_presentations
2. Все записи создаются как черновики (isPublished=false) — руководитель подтверждает каждое
3. Для массовых изменений — сначала покажи план, потом выполняй по одному
4. При создании МП — заполняй все три уровня если есть информация
5. machineTypeIds для МП берёшь из get_machine_types`;

function buildSystemPrompt(stats: {
  mpCount: number; publishedCount: number; draftCount: number; scriptCount: number; dialogueCount: number;
}): string {
  return `${SYSTEM_PROMPT_BASE}

ТЕКУЩЕЕ СОСТОЯНИЕ БАЗЫ:
- Атомов знаний: ${stats.mpCount} (${stats.publishedCount} опубликовано, ${stats.draftCount} черновиков)
- Этапов скрипта: ${stats.scriptCount}
- Диалогов: ${stats.dialogueCount}`;
}

// ─── Конвертация сообщений в формат Anthropic ─────────────────────────────────

interface AnthropicContent {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContent[];
}

function convertMessages(messages: AgentApiMessage[]): AnthropicMessage[] {
  const result: AnthropicMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (msg.role === 'user' && msg.text) {
      result.push({ role: 'user', content: msg.text });

    } else if (msg.role === 'assistant') {
      if (msg.toolCall) {
        result.push({
          role: 'assistant',
          content: [{
            type: 'tool_use',
            id: msg.toolCall.id || `toolu_${i}`,
            name: msg.toolCall.name,
            input: msg.toolCall.args,
          }],
        });
      } else if (msg.text) {
        result.push({ role: 'assistant', content: msg.text });
      }

    } else if (msg.role === 'tool_result') {
      result.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: msg.toolCallId || `toolu_${i - 1}`,
          content: msg.toolResult || '',
        }],
      });
    }
  }

  return result;
}

// ─── Основная функция ─────────────────────────────────────────────────────────

export async function agentChat(
  messages: AgentApiMessage[],
  stats: { mpCount: number; publishedCount: number; draftCount: number; scriptCount: number; dialogueCount: number },
  apiKey: string,
  customInstructions?: string,
): Promise<AgentChatResult> {
  const anthropicMessages = convertMessages(messages);

  if (anthropicMessages.length === 0) {
    return { type: 'text', content: 'Нет сообщений для обработки.' };
  }

  const basePrompt = buildSystemPrompt(stats);
  const systemPrompt = customInstructions?.trim()
    ? `${basePrompt}\n\n---\nДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ ОТ РУКОВОДИТЕЛЯ:\n${customInstructions.trim()}`
    : basePrompt;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: anthropicMessages,
      tools: AGENT_TOOLS,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${text.slice(0, 400)}`);
  }

  const data = (await response.json()) as {
    content?: AnthropicContent[];
    stop_reason?: string;
    usage?: { input_tokens: number; output_tokens: number };
  };

  const usage = data.usage
    ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
    : undefined;

  const toolUseBlock = data.content?.find(b => b.type === 'tool_use');
  if (toolUseBlock && toolUseBlock.name && toolUseBlock.input) {
    return {
      type: 'tool_call',
      toolCall: {
        name: toolUseBlock.name,
        input: toolUseBlock.input,
        id: toolUseBlock.id || `toolu_${Date.now()}`,
      },
      usage,
    };
  }

  const textBlock = data.content?.find(b => b.type === 'text');
  return { type: 'text', content: textBlock?.text ?? '', usage };
}
