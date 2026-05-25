# Архитектура данных — полная схема Firestore

> Единственный источник правды по всем коллекциям системы CALIDAD.
> Проектирована сразу под все модули (не только текущие 4).

**Связи:** [[01_architecture]] [[modules/05_cockpit]] [[modules/06_knowledge_library]] [[modules/07_agent]] [[modules/08_feedback_gear]] [[modules/09_quality_control]] [[modules/10_trainer]] [[modules/11_analytics]] [[modules/15_client_portraits]]

---

## Карта доменов

```
┌─────────────────────────────────────────────────────────────┐
│  ДОМЕН 1: ЯДРО          │  ДОМЕН 2: БАЗА ЗНАНИЙ             │
│  managers               │  knowledge_atoms                  │
│  machine_types          │  client_portraits                 │
├─────────────────────────┼───────────────────────────────────┤
│  ДОМЕН 3: СКРИПТЫ       │  ДОМЕН 4: ДИАЛОГИ                 │
│  script_nodes           │  processed_scripts                │
│  (scriptType field)     │  batch_insights                   │
├─────────────────────────┼───────────────────────────────────┤
│  ДОМЕН 5: КАЧЕСТВО И    │  ДОМЕН 6: ШЕСТЕРЁНКА              │
│  ТРЕНАЖЁР               │  gear_notes                       │
│  quality_assessments    │  agent_tasks                      │
│  training_scenarios     │  agent_audit_log                  │
│  training_sessions      │                                   │
│  manager_progress       │                                   │
├─────────────────────────┼───────────────────────────────────┤
│  ДОМЕН 7: КОНТЕНТ       │  ДОМЕН 8: ИНТЕГРАЦИИ              │
│  articles               │  erp_price_cache                  │
│  style_dna              │  bitrix24_sync                    │
│  few_shot_examples      │                                   │
├─────────────────────────┼───────────────────────────────────┤
│  ДОМЕН 9: АКАДЕМИЯ      │  ДОМЕН 10: СИСТЕМА                │
│  academy_videos         │  cleaning_config                  │
│  (future)               │  cockpit_sessions                 │
│                         │  api_usage_log                    │
└─────────────────────────┴───────────────────────────────────┘
```

---

## ДОМЕН 1: ЯДРО

### `managers`
> Пользователи системы. Firebase Auth uid → профиль.

```typescript
{
  id: string,                          // == Firebase Auth UID
  name: string,
  email: string,
  role: 'admin' | 'manager',
  isActive: boolean,
  createdAt: Timestamp,
  lastSeenAt?: Timestamp
}
```

### `machine_types` ✅ (существует, расширить)
> Каталог типов станков. Основной фильтр для всей системы.

```typescript
{
  id: string,
  name: string,
  description?: string,
  qualifiers?: string[],      // квалификационные вопросы в Кокпите
  siteUrl?: string,           // NEW: ссылка на карточку станка на сайте CALIDAD
  isActive: boolean,
  order?: number              // порядок отображения
}
```

---

## ДОМЕН 2: БАЗА ЗНАНИЙ

### `knowledge_atoms` 🆕 (заменяет `micro_presentations`)
> Атомарные единицы знания. Три уровня: факт / методология / компромисс.
> Каждый атом = один аргумент, одна техника, одно объяснение.

```typescript
{
  id: string,
  title: string,

  // Три уровня знания (хотя бы одно обязательно)
  technical?: string,          // «Что» — технический факт (серый фон)
  methodology?: string,        // «Как» — метод эксперта (голубой фон)
  compromise?: string,         // «Если бюджет» — путь компромисса (янтарный)

  // Обратная совместимость с micro_presentations
  content?: string,            // legacy поле — при миграции переносим в methodology

  // Классификация
  category: string,            // 'Открытие'|'Квалификация'|'Возражения'|'Закрытие'|'Общее'
  machineTypeIds: string[],    // [] = применимо ко всем
  tags: string[],

  // ERP-переменные в тексте атома
  erpVariables?: string[],     // ['ERP_Option_Price_ID_55'] — список переменных в тексте

  // Связи
  scriptNodeIds?: string[],    // в каких узлах скрипта используется
  relatedPortraitIds?: string[], // рекомендован для каких портретов клиентов
  relatedAtomIds?: string[],   // связанные атомы (cross-reference)

  // Происхождение
  sourceDialogueIds?: string[], // из каких диалогов извлечён
  createdBy: 'human' | 'agent',
  isPublished: boolean,         // false = AI-черновик, не видно менеджеру
  publishedAt?: Timestamp,

  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Миграция:** `micro_presentations` → `knowledge_atoms`:
- `content` → `methodology`
- остальные поля совпадают

### `client_portraits` 🆕
> Типажи клиентов. Используются для адаптации Кокпита в реальном времени.

```typescript
{
  id: string,
  name: string,               // 'Технарь-Инженер'
  description: string,        // развёрнутое описание
  aiSummary?: string,         // краткое резюме для быстрого показа

  // Определение типажа
  indicators: string[],       // маркеры в речи: ['ArtCam', 'SolidWorks', 'технические вопросы']
  detectKeywords: string[],   // ключевые слова для авто-определения в Кокпите

  // Работа с типажом
  typicalObjections: string[],
  recommendedApproach: string,
  pitfalls: string[],         // подводные камни

  // Связи
  recommendedAtomIds: string[],        // knowledge_atoms которые работают с этим типажом
  machineTypePreferences?: string[],   // какие станки чаще интересуют

  // Происхождение
  sourceDialogueIds?: string[],
  tags: string[],
  isPublished: boolean,

  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## ДОМЕН 3: СКРИПТЫ

### `script_nodes` ✅ (существует, расширить)
> Все типы скриптов в одной коллекции. Поле `scriptType` разделяет.

```typescript
{
  id: string,
  order: number,
  title: string,
  content: string,
  category: 'Открытие' | 'Квалификация' | 'Возражения' | 'Закрытие' | 'Общее',
  tips?: string[],

  // Связи
  knowledgeAtomIds?: string[],  // заменяет microPresentationIds
  microPresentationIds?: string[], // legacy — оставить для совместимости
  machineTypeIds?: string[],

  // NEW: тип скрипта
  scriptType: 'qualification' | 'closing' | 'calling',
  // qualification = Кокпит (разработка)
  // closing      = Дожим (планируется)
  // calling      = Прозвон базы (планируется)

  isActive: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## ДОМЕН 4: ДИАЛОГИ

### `processed_scripts` ✅ (существует, расширить)
> Метаданные загруженных диалогов. Тексты хранятся в IndexedDB + Firestore.

```typescript
{
  id: string,
  filename: string,
  uploadedAt: Timestamp,
  textRef?: string,           // 'idb://dialogue-{id}'

  cleanStatus: 'pending' | 'cleaning' | 'ready' | 'error',
  analysisStatus: 'pending' | 'analyzing' | 'done' | 'error',

  machineTypeIds?: string[],
  isClean?: boolean,
  extractedData?: ExtractedDialogueData,
  usedModel?: string,
  modelLog?: ModelLogEntry[],

  // NEW: классификация типа диалога
  dialogueType?: 'real' | 'training' | 'educational',
  dialogueTypeConfidence?: number,  // 0-1

  // NEW: контекст звонка
  managerId?: string,              // кто вёл звонок
  callDate?: Timestamp,            // дата звонка (не загрузки)
  durationSec?: number,            // длительность в секундах

  // NEW: результаты анализа
  clientPortraitId?: string,       // определённый типаж
  qualityAssessmentId?: string     // ссылка на оценку качества
}
```

### `batch_insights` ✅ (существует, расширить)

```typescript
{
  // существующие поля остаются
  id: string,
  generatedAt: Timestamp,
  dialogueCount: number,
  clientPortraits: string[],
  topFormulations: string[],
  commonTechniques: string[],
  scriptSuggestions: string[],
  machineTypeBreakdown: Record<string, number>,
  articleTopicSuggestions?: string[],
  topPainPoints?: string[],

  // NEW
  portraitBreakdown?: Record<string, number>,  // сколько диалогов каждого типажа
  dialogueTypeBreakdown?: Record<string, number> // real/training/educational breakdown
}
```

---

## ДОМЕН 5: КАЧЕСТВО И ТРЕНАЖЁР

### `quality_assessments` 🆕
> Оценки реальных звонков. Один документ = один разобранный звонок.

```typescript
{
  id: string,
  dialogueId: string,          // ссылка на processed_scripts
  managerId: string,
  evaluatedAt: Timestamp,
  evaluatedBy: 'ai' | 'human' | 'ai_confirmed', // ai_confirmed = AI сделал, человек утвердил

  // 7 блоков чек-листа (0-10 каждый)
  scores: {
    expertPosition: number,    // Блок 1: Позиция эксперта
    openQuestions: number,     // Блок 2: Открытые вопросы
    pauseDiscipline: number,   // Блок 3: Заполнение пауз
    programming: number,       // Блок 4: «Программирование» клиента
    qualifyFirst: number,      // Блок 5: Квалификация до презентации
    summarization: number,     // Блок 6: Резюмирование (вилка)
    nextStep: number           // Блок 7: Договорённость о следующем шаге
  },
  totalScore: number,          // средневзвешенный

  // Анализ
  systemicErrors: string[],    // ошибки повторившиеся 3+ раз = системные
  positiveHighlights: string[], // что сработало хорошо
  recommendations: string[],   // конкретные советы

  // AI-комментарий с цитатами из транскрипта
  aiComments?: string,

  // Оценка использования скрипта
  scriptNodeEvals?: {
    nodeId: string,
    wasUsed: boolean,
    effectiveness?: number      // 0-10, если использовался
  }[]
}
```

### `training_scenarios` 🆕
> Сценарии для тренажёра. Создаются вручную или агентом из реальных диалогов.

```typescript
{
  id: string,
  title: string,
  description: string,

  scriptType: 'qualification' | 'closing' | 'calling',
  machineTypeIds: string[],
  clientPortraitId?: string,      // типаж AI-клиента
  difficulty: 'easy' | 'medium' | 'hard',

  // AI-клиент: персона
  clientPersona: string,          // системный промт для AI-клиента
  clientObjections: string[],     // возражения которые клиент будет использовать
  clientGoal: string,             // что хочет клиент в этом сценарии

  // Учебные цели
  targetScriptNodeIds: string[],  // какие узлы скрипта отрабатываются
  targetAtomIds: string[],        // какие атомы знаний должны применяться

  // Происхождение
  sourceDialogueId?: string,      // создан на основе реального звонка
  createdBy: 'human' | 'agent',
  isActive: boolean,

  createdAt: Timestamp
}
```

### `training_sessions` 🆕
> Записи тренировочных сессий менеджеров.

```typescript
{
  id: string,
  managerId: string,
  scenarioId: string,
  startedAt: Timestamp,
  completedAt?: Timestamp,

  // История диалога
  messages: {
    role: 'manager' | 'client',
    content: string,
    timestamp: Timestamp
  }[],

  // Оценка по тем же 7 блокам
  scores?: {
    expertPosition: number,
    openQuestions: number,
    pauseDiscipline: number,
    programming: number,
    qualifyFirst: number,
    summarization: number,
    nextStep: number
  },
  totalScore?: number,
  aiComments?: string,

  // Использованные атомы знаний (что применил менеджер)
  atomsUsed?: string[],

  status: 'active' | 'completed' | 'abandoned',

  // Назначение от руководителя
  assignmentId?: string     // ссылка на training_assignments
}
```

### `training_assignments` 🆕
> Наряды-задания: руководитель назначает менеджеру конкретный сценарий.

```typescript
{
  id: string,
  managerId: string,
  scenarioId: string,
  assignedBy: string,        // managerId руководителя
  assignedAt: Timestamp,
  dueDate?: Timestamp,

  reason: string,            // почему назначено (напр. "слабые Возражения по звонку X")
  sourceAssessmentId?: string, // из какой оценки звонка назначено

  status: 'pending' | 'in_progress' | 'completed' | 'overdue',
  completedAt?: Timestamp,
  sessionId?: string         // ссылка на выполненную training_session
}
```

### `manager_progress` 🆕
> Агрегированные показатели по каждому менеджеру. Обновляется агентом.

```typescript
{
  id: string,                // == managerId
  managerId: string,
  updatedAt: Timestamp,

  // За последние 30 дней
  realCallsCount: number,
  trainingsCount: number,
  avgRealCallScore: number,
  avgTrainingScore: number,

  // Слабые места (блоки ниже 6/10 в среднем)
  weakestBlocks: string[],

  // Динамика по неделям
  weeklyScores: {
    weekStart: Timestamp,
    avgScore: number,
    callsCount: number
  }[]
}
```

---

## ДОМЕН 6: ШЕСТЕРЁНКА И АГЕНТ

### `gear_notes` 🆕
> Заметки менеджеров из Кокпита/Тренажёра. Сырой ввод → агент классифицирует.

```typescript
{
  id: string,
  createdAt: Timestamp,
  managerId: string,

  // Автоконтекст (заполняется системой)
  context: {
    source: 'cockpit' | 'trainer' | 'manual',
    scriptNodeId?: string,
    knowledgeAtomId?: string,
    machineTypeId?: string,
    scriptType?: string,
    cockpitSessionId?: string
  },

  content: string,           // что написал менеджер

  // Агент классифицирует
  type?: 'script_gap' | 'dev_task' | 'unclear',
  agentStatus: 'new' | 'processing' | 'resolved' | 'rejected',

  // Результат работы агента
  draftAtomId?: string,      // ID созданного AI-черновика в knowledge_atoms
  devPrompt?: string,        // промт для Claude Code если dev_task
  agentComment?: string,

  // Дубликаты
  duplicateOfId?: string,    // если агент нашёл похожую заметку

  resolvedAt?: Timestamp
}
```

### `agent_tasks` 🆕
> Задачи для Агента (Knowledge Architect). Очередь выполнения.

```typescript
{
  id: string,
  createdAt: Timestamp,
  type: 'create_atom' | 'update_atom' | 'create_portrait' | 'create_scenario'
      | 'gap_analysis' | 'batch_digest' | 'dev_task',

  priority: 'high' | 'medium' | 'low',
  status: 'pending' | 'running' | 'done' | 'failed',

  input: Record<string, any>,   // зависит от type
  output?: Record<string, any>,

  // Источники
  sourceNoteIds?: string[],     // gear_notes которые породили задачу
  sourceDialogueIds?: string[],

  // Проверка руководителем
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'edited',
  reviewedBy?: string,
  reviewedAt?: Timestamp,

  completedAt?: Timestamp,
  errorMessage?: string
}
```

### `agent_audit_log` 🆕
> Полная история действий агента. Основа для отката изменений.

```typescript
{
  id: string,
  timestamp: Timestamp,
  taskId: string,
  action: 'create' | 'update' | 'delete',
  collection: string,
  documentId: string,
  before?: Record<string, any>,  // состояние до
  after?: Record<string, any>,   // состояние после
  revertedAt?: Timestamp         // если было откатано
}
```

---

## ДОМЕН 7: КОНТЕНТ

### `articles` ✅ (существует — не менять)
### `style_dna` ✅ (существует — не менять)
### `few_shot_examples` ✅ (существует — не менять)

---

## ДОМЕН 8: ИНТЕГРАЦИИ

### `erp_price_cache` 🆕
> Кэш актуальных цен из ERP. Синхронизируется раз в N часов.
> Используется для подстановки `{ERP_Option_Price_ID_55}` в атомах знаний.

```typescript
{
  id: string,                    // 'ERP_Option_Price_ID_55' — совпадает с переменной в тексте
  erpId: number,                 // числовой ID в ERP
  type: 'option_price' | 'model_name' | 'stock',
  value: string,                 // '145 000 ₸' или 'CW-5200' или 'в наличии'
  machineTypeId?: string,
  lastSyncAt: Timestamp,
  isActive: boolean
}
```

### `bitrix24_sync` 🆕
> Синхронизированные лиды из Битрикс24.

```typescript
{
  id: string,                    // Bitrix24 Lead ID
  bitrixLeadId: string,
  bitrixDealId?: string,
  bitrixContactId?: string,

  // Связи с нашей системой
  managerId?: string,
  dialogueId?: string,           // если загружен транскрипт этого звонка
  clientPortraitId?: string,     // определённый типаж

  // Данные лида
  clientName?: string,
  phone?: string,
  machineInterest?: string[],    // machineTypeIds
  stage?: string,                // этап воронки в Битрикс24
  budget?: number,

  lastSyncAt: Timestamp,
  syncDirection: 'bitrix_to_calidad' | 'calidad_to_bitrix' | 'bidirectional'
}
```

---

## ДОМЕН 9: АКАДЕМИЯ (Будущее)

### `academy_videos` 🆕 (future)
> Видеотека с RAG-поиском по расшифровкам.

```typescript
{
  id: string,
  title: string,
  type: 'internal' | 'external',  // internal = видео Евгения, external = YouTube
  url: string,

  // Контент для RAG-поиска
  transcript?: string,            // полный текст расшифровки (short videos)
  transcriptRef?: string,         // 'idb://academy-{id}' для длинных

  // Embeddings для семантического поиска (Gemini Embedding API)
  // Хранятся как вектор — Firestore vector search или отдельный индекс
  embeddingUpdatedAt?: Timestamp,

  // Классификация
  tags: string[],
  machineTypeIds: string[],
  durationSec?: number,
  thumbnailUrl?: string,

  // Связи с базой знаний
  relatedAtomIds?: string[],
  relatedScriptNodeIds?: string[],

  isActive: boolean,
  publishedAt?: Timestamp,
  createdAt: Timestamp
}
```

---

## ДОМЕН 10: СИСТЕМА

### `cleaning_config` ✅ (существует — не менять)

### `cockpit_sessions` 🆕 (analytics)
> Сессии работы в Кокпите. Основа для аналитики использования.

```typescript
{
  id: string,
  managerId: string,
  startedAt: Timestamp,
  endedAt?: Timestamp,

  scriptType: 'qualification' | 'closing' | 'calling',
  machineTypeIds: string[],
  clientPortraitId?: string,     // определённый в ходе сессии

  // Исход звонка
  outcome?: 'deal' | 'kp_sent' | 'callback' | 'rejected' | 'unknown',

  // Заполненные слоты квалификации
  slots?: Record<string, string>, // { material: 'дуб', thickness: '40мм', ... }

  // Что использовал менеджер
  atomsViewed: string[],
  gearNotesCreated: string[],

  // Связь с загруженным транскриптом
  dialogueId?: string
}
```

### `api_usage_log` 🆕
> Расходы API по операциям. Для мониторинга и оптимизации.

```typescript
{
  id: string,
  timestamp: Timestamp,
  operation: 'clean_dialogue' | 'analyze_dialogue' | 'batch_insights'
           | 'generate_article' | 'rewrite_style' | 'embeddings' | 'trainer_turn',
  provider: 'gemini' | 'openai',
  model: string,
  inputTokens: number,
  outputTokens: number,
  costUsd?: number,
  managerId?: string,
  success: boolean
}
```

---

## Сводная таблица всех коллекций

| Коллекция | Статус | Модуль | Приоритет реализации |
|-----------|--------|--------|----------------------|
| `managers` | 🆕 Новая | 02_roles_access | Высокий |
| `machine_types` | ✅ Есть | 05_cockpit | — |
| `knowledge_atoms` | 🔄 Заменяет micro_presentations | 06_knowledge_library | Высокий |
| `client_portraits` | 🆕 Новая | 15_client_portraits | Высокий |
| `script_nodes` | ✅ Расширить | 05_cockpit | Средний (добавить scriptType) |
| `processed_scripts` | ✅ Расширить | 09_quality_control | Средний |
| `batch_insights` | ✅ Расширить | 11_analytics | Низкий |
| `quality_assessments` | 🆕 Новая | 09_quality_control | Высокий |
| `training_scenarios` | 🆕 Новая | 10_trainer | Средний |
| `training_sessions` | 🆕 Новая | 10_trainer | Средний |
| `training_assignments` | 🆕 Новая | 10_trainer | Средний |
| `manager_progress` | 🆕 Новая | 11_analytics | Средний |
| `gear_notes` | 🆕 Новая | 08_feedback_gear | Высокий |
| `agent_tasks` | 🆕 Новая | 07_agent | Высокий |
| `agent_audit_log` | 🆕 Новая | 07_agent | Средний |
| `articles` | ✅ Есть | 12_articles_seo | — |
| `style_dna` | ✅ Есть | 12_articles_seo | — |
| `few_shot_examples` | ✅ Есть | 12_articles_seo | — |
| `erp_price_cache` | 🆕 Новая | 13_erp_integration | Средний |
| `bitrix24_sync` | 🆕 Новая | 14_bitrix24 | Средний |
| `academy_videos` | 🆕 Будущее | 18_academy | Низкий |
| `cockpit_sessions` | 🆕 Новая | 11_analytics | Низкий |
| `api_usage_log` | 🆕 Новая | decisions/api_costs | Низкий |
| `cleaning_config` | ✅ Есть | 09_quality_control | — |

**Итого:** 9 существующих коллекций + 15 новых планируемых

---

## Ключевые связи между коллекциями

```
processed_scripts
  → quality_assessments (один диалог → одна оценка)
  → batch_insights (N диалогов → одна пачка инсайтов)
  → client_portraits (определяется в ходе анализа)

knowledge_atoms
  → script_nodes (атом привязан к узлам скрипта)
  → client_portraits (рекомендован для типажа)
  → erp_price_cache (через ERP-переменные в тексте)
  → training_scenarios (какие атомы должен применить менеджер)

quality_assessments
  → training_assignments (слабый блок → наряд на тренировку)

gear_notes
  → agent_tasks (шестерёнка → задача для агента)
  → knowledge_atoms (результат: черновик атома)

cockpit_sessions
  → processed_scripts (после звонка: загружаем транскрипт)
  → client_portraits (определили типаж в ходе квалификации)
  → knowledge_atoms (что смотрел менеджер)
```

---

## Правила хранения

- **Никогда** не хранить ArrayBuffer/Blob в localStorage — только IndexedDB
- Тексты диалогов: IndexedDB (`idb://dialogue-{id}`) + backup в Firestore `processed_scripts`
- Расшифровки видео Академии: IndexedDB (`idb://academy-{id}`) для длинных (>50KB)
- PDF-бланки КП: IndexedDB (`idb://pdf-{id}`) — только браузер, в облако не идут
- Embeddings (Академия): отдельный механизм — Firestore vector search или Vertex AI

---

## Миграция micro_presentations → knowledge_atoms

```
Когда реализовывать: перед началом разработки модуля 06 (Библиотека знаний)

Шаги:
1. Скрипт миграции: читаем все micro_presentations
2. Для каждой: создаём knowledge_atom с content → methodology
3. Сохраняем старые micro_presentations IDs как knowledgeAtomIds в script_nodes
4. После проверки — удаляем micro_presentations коллекцию
5. Обновляем все места в коде где читается micro_presentations
```
