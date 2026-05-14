# CALIDAD Document Generator — Codebase Guide

> Это руководство для AI помощника. Обновляй вместе с архитектурой.

## Quick Start

```bash
npm install
npm run dev  # http://localhost:5173
```

**Architecture:** React 19 SPA + Node.js Express backend (API routes, runtime secrets).
Data: localStorage + IndexedDB (client) + **Firestore** (cloud persistence, активно).

---

## Deployment (актуально: май 2026)

| Параметр | Значение |
|---|---|
| **Проект GCP** | `gen-lang-client-0496465292` |
| **Сервис Cloud Run** | `calidad-generator` |
| **Регион** | `us-central1` (Gemini API работает здесь) |
| **Firestore DB** | `(default)` в `us-central1` |
| **URL** | https://calidad-generator-px4juo36mq-uc.a.run.app |
| **CI/CD** | GitHub Actions → `.github/workflows/deploy.yml` |
| **Auth** | `GCP_SA_KEY` secret (service account JSON) |

**Ручной деплой:**
```powershell
echo "y" | gcloud run deploy calidad-generator --source . `
  --region us-central1 --project gen-lang-client-0496465292 `
  --allow-unauthenticated `
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest `
  --set-secrets=OPENAI_API_KEY=OPENAI_API_KEY:latest `
  --memory=512Mi --cpu=1 --timeout=3600
```

**Secrets в Secret Manager:**
- `GEMINI_API_KEY` — Gemini API (создать новый если заблокирован как leaked)
- `OPENAI_API_KEY` — OpenAI GPT

---

## Architecture Overview

**React 19 + Vite 6 + TypeScript SPA** для CALIDAD.kz.

| Модуль | Цель | Ключевые технологии |
|---|---|---|
| **КП** | КП из PDF-бланков | pdf-lib 1.17, pdfjs-dist 4 |
| **Договор** | Контракты из HTML-шаблонов | html2canvas, pdf-lib |
| **Sales** | Скрипт звонков + AI анализ диалогов + статьи | Gemini/OpenAI, Zustand, Firestore |
| **Settings** | Данные компании (логотип, печать, подпись, WordPress) | SettingsContext, localStorage |

---

## Data Storage (актуально)

| Данные | Хранилище | Облако |
|---|---|---|
| PDF-бланки КП | IndexedDB (`idb://pdf-...`) | ❌ только браузер |
| Шаблоны КП (разметка) | localStorage (Zustand persist) | ❌ только браузер |
| Шаблоны договоров | localStorage | ❌ только браузер |
| Настройки компании | localStorage (SettingsContext) | ❌ только браузер |
| Изображения (логотип, печать) | IndexedDB (imageStorage) | ❌ только браузер |
| **Диалоги (метаданные)** | **Firestore** `processed_scripts` | ✅ облако |
| **Диалоги (rawText/cleanedText)** | **IndexedDB + Firestore** | ✅ облако |
| **Скрипт продаж** | **Firestore** `script_nodes` | ✅ облако |
| **Мини-презентации** | **Firestore** `micro_presentations` | ✅ облако |
| **Типы станков** | **Firestore** `machine_types` | ✅ облако |
| **Batch Insights** | **Firestore** `batch_insights` | ✅ облако |
| **Статьи** | **Firestore** `articles` | ✅ облако |
| **StyleDNA** | **Firestore** `style_dna` | ✅ облако |
| **Cleaning Config** | **Firestore** `cleaning_config` | ✅ облако |
| **FewShot Examples** | **Firestore** `few_shot_examples` | ✅ облако |

**Правило:** Никогда не храни ArrayBuffer/Blob в localStorage — только IndexedDB.

---

## Firestore Sync Architecture

**Два слоя синхронизации:**

1. **`src/hooks/useCloudSync.ts`** — загрузка при старте приложения
   - `syncAllDataFromCloud()` — параллельно загружает все 9 коллекций
   - Восстанавливает тексты диалогов из Firestore в IndexedDB если их нет локально
   - Вызывается в `App.tsx` через `useCloudSync()`

2. **`src/lib/cloudSyncManager.ts`** — дебаунсированное сохранение изменений
   - Singleton класс, дебаунс 2000ms
   - Дедупликация: одна задача типа заменяет предыдущую
   - `queueSync({ type, data })` — вызывается из Zustand actions
   - `forceSync()` — принудительно при закрытии страницы

**_load actions в useSalesStore** — загрузка из облака без триггера cloudSync:
```typescript
_loadScriptNodes, _loadMicroPresentations, _loadMachineTypes,
_loadArticles, _loadFewShotExamples, _loadCleaningConfig
```
Используй их при загрузке из Firestore (не обычные CRUD actions — они тригерят cloudSync обратно).

---

## Key Architectural Decisions

### PDF-координаты
```
pdf-lib:  origin (0,0) внизу слева → A4 = 595×842pt
Canvas:   origin (0,0) вверху слева → canvasRectToPdfBox() конвертирует
```

### Шрифты (кириллица)
Требует WOFF. Доступны в `/public/fonts/`: Inter, Roboto, Open Sans, PT Serif.

### ErrorBoundary
`App.tsx` оборачивает всё приложение в `ErrorBoundary`. При краше показывает читаемое сообщение вместо белого экрана.

---

## Module Structure

### `/src/components/CP/` — КП

| Компонент | Роль | Кто |
|---|---|---|
| **GeneratorPage** | Выбор шаблона → заполнение → live preview → PDF | Менеджер |
| **TemplateMapper** | Загрузка PDF → drag-to-draw прямоугольников → настройка полей | Руководитель |
| **PdfPageCanvas** | Рендер PDF через pdfjs-dist, mouse events для drag | Internal |

**Ядро:** `src/lib/pdfGenerator.ts` → `generateKpPdf(template, values, overrides): Promise<Uint8Array>`

### `/src/components/Contract/` — Договоры

| Компонент | Роль |
|---|---|
| **ContractBuilder** | Редактор HTML-шаблона с {{переменными}} |
| **ContractSidebar** | Покупатель, спецификация, кнопка PDF |
| **ContractPreview** | Live preview (HTML render) |

### `/src/components/Sales/` — Sales модуль

| Компонент | Роль | Кто |
|---|---|---|
| **ManagerCockpit** | Скрипт + МП во время звонка, мультистанковый флоу | Менеджер |
| **AdminPanel** | Таббед интерфейс: Диалоги/Скрипт/МП/Станки/Библиотека/Статьи | Руководитель |
| **AdminDialogues** | Upload → очистка AI → анализ → добавление в базу | Руководитель |
| **CleaningConfigEditor** | Настройка промптов и моделей для очистки | Руководитель |
| **AdminScript** | CRUD этапов скрипта, drag-n-drop, привязка МП и станков | Руководитель |
| **AdminMicroPresentations** | CRUD мини-презентаций с фильтрами | Руководитель |
| **AdminMachineTypes** | CRUD типов станков + квалификационные вопросы | Руководитель |
| **HolisticLibraryView** | Сводный вид базы знаний по типам станков | Руководитель |
| **AdminArticles** | Статьи + StyleDNA + FewShot + генерация | Руководитель |
| **ArticleGenerationWizard** | 4-шаговый мастер: тема → черновик → рестайл → публикация | Руководитель |
| **StyleDNAPanel** | Извлечение профиля голоса автора из диалогов | Руководитель |
| **FewShotExamplesManager** | Примеры стиля для рестайлинга | Руководитель |
| **WordPressPublisher** | Публикация статей в WordPress через REST API | Руководитель |

### `/src/components/UI/`

| Компонент | Роль |
|---|---|
| **Dashboard** | Стартовая страница с навигацией |
| **DBStatusIndicator** | Индикатор Firestore подключения |
| **WordPressStatusIndicator** | Индикатор WordPress подключения (каждые 30 сек) |

### `/src/lib/` — Core utilities

| Файл | Функция |
|---|---|
| `firebase.ts` | Firebase init → `db` (Firestore, database `(default)`, us-central1) |
| `dialogueCloud.ts` | Все Firestore операции: upload/update/delete/fetch для всех коллекций |
| `cloudSyncManager.ts` | Singleton дебаунсер для сохранения изменений в Firestore |
| `dialogueStorage.ts` | IndexedDB для текстов диалогов: `saveDialogueTexts`, `resolveDialogueTexts` |
| `pdfGenerator.ts` | `generateKpPdf(template, values, overrides)` |
| `pdfStorage.ts` | IndexedDB: `savePdf / resolvePdf / deletePdf` |
| `imageStorage.ts` | IndexedDB для изображений (логотип, печать) |

### `/src/hooks/`

| Файл | Функция |
|---|---|
| `useCloudSync.ts` | Загрузка всех данных из Firestore при старте + CRUD операции |
| `useDBStatus.ts` | Проверка подключения к Firestore (lightweight query) |

### `/src/server/` — Backend (Express)

| Файл | Функция |
|---|---|
| `index.ts` | Express routes: `/api/clean-text`, `/api/analyze-dialogue`, `/api/extract-batch-insights`, `/api/available-models`, `/api/wp-publish`, `/api/wp-update/:postId`, `/api/extract-article-patterns`, `/api/rewrite-article-style`, `/api/generate-article-draft` |
| `geminiApi.ts` | Gemini integration. `listAvailableModels()` фильтрует: veo/lyria/aqa/gemma-small убраны |
| `openaiApi.ts` | OpenAI GPT (gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo) |

**Secrets инъектируются в runtime** через Cloud Run `--set-secrets`, НЕ на этапе сборки.

### `/src/store/`

| Store | Ключ localStorage | Версия |
|---|---|---|
| `useTemplateStore` | `calidad_pdf_templates` | v1 |
| `useDocumentStore` | `calidad_assembly` | v1 |
| `useSalesStore` | `calidad_sales` | v3 |

`useSalesStore` — основной store для всего Sales модуля. Содержит:
`machineTypes, scriptNodes, microPresentations, dialogues, batchInsights, articles, styleDNA, fewShotExamples, cleaningConfig`

---

## Types (src/types.ts) — ключевые интерфейсы

```typescript
MachineType {
  id, name, description?,
  qualifiers?: string[]   // квалификационные вопросы (видны в AdminMachineTypes, пока НЕ в Cockpit)
}

ScriptNode {
  id, order, title, content,
  category?: 'Открытие'|'Квалификация'|'Возражения'|'Закрытие'|'Общее',
  tips?: string[],
  microPresentationIds?: string[],
  machineTypeIds?: string[]
}

MicroPresentation {
  id, title, content,
  category: string,       // Открытие/Квалификация/Возражения/Закрытие/Общее/Формулировки
  machineTypeIds?: string[],
  tags?: string[]
}

DialogueRecord {
  id, filename, uploadedAt,
  textRef?: string,       // "idb://dialogue-{id}" — ссылка на IndexedDB
  cleanStatus: 'pending'|'cleaning'|'ready'|'error',
  analysisStatus: 'pending'|'analyzing'|'done'|'error',
  machineTypeIds?: string[],
  isClean?: boolean,
  extractedData?: ExtractedDialogueData,
  usedModel?: string,
  modelLog?: ModelLogEntry[]
}

// НЕ хранится в Zustand — только в Firestore документе:
// rawText?: string, cleanedText?: string (поля DialogueWithTexts)

Article {
  id, title, content,
  tags: string[],         // ВАЖНО: всегда инициализировать как [] иначе краш
  status: 'draft'|'published',
  createdAt, updatedAt,
  wordpressPostId?: number, wordpressUrl?: string,
  generationMeta?: { topic, usedStyleDNA, fewShotCount }
}

StyleDNA {
  id, generatedAt, dialogueCount,
  frequentPhrases: string[],   // ВАЖНО: всегда инициализировать как [] иначе краш
  avgSentenceLength: 'short'|'medium'|'long',
  tone, thoughtStructure,
  additionalNotes?, usedModel?
}

BatchInsights {
  id, generatedAt, dialogueCount,
  clientPortraits: string[],   // ВАЖНО: ?.length иначе краш на старых данных
  topFormulations: string[],
  commonTechniques: string[],
  scriptSuggestions: string[],
  machineTypeBreakdown: Record<string, number>,
  articleTopicSuggestions?: string[],
  topPainPoints?: string[]
}
```

---

## Common Gotchas

❌ **НЕ делай:**
- `const { gemini, gpt } = await listAvailableModels()` — функция возвращает `string[]`, не объект
- `.length` на полях BatchInsights без `?.` — старые данные в localStorage могут не иметь полей
- `article.tags.length` без `?.` — tags может быть undefined в старых записях
- `styleDNA.frequentPhrases.length` без `?.` — аналогично
- Хранить ArrayBuffer в localStorage
- Использовать Arial/Helvetica в PDF (нет кириллицы)
- Коммитить новые файлы без `git add` — файл есть локально но не в репо, Docker build падает

✅ **Делай:**
- `const gemini = await listAvailableModels()` — правильный вызов
- `insight.clientPortraits?.length ?? 0` — безопасный доступ
- `_load*` actions для загрузки из Firestore (не CRUD actions — они тригерят cloudSync)
- Проверять `git status` перед деплоем — все файлы должны быть закоммичены
- Использовать WOFF шрифты для кириллицы

---

## Services: dialogueProcessor.ts

```typescript
// Все функции поддерживают provider и model параметры
cleanDialogueText(rawText, provider?, cleaningPrompt?, model?): Promise<string>
analyzeDialogue(cleanedText, provider?, model?): Promise<ProcessResult>
extractBatchInsights(allExtracted, provider?, model?): Promise<BatchInsights>
extractArticlePatterns(cleanedText, provider?, model?): Promise<ArticlePatterns>
generateArticleDraft(topic, patterns, provider?, model?): Promise<string>
rewriteArticleInStyle(draft, styleDNA, fewShots, provider?, model?): Promise<string>
listAvailableModels(): Promise<string[]>   // возвращает string[], НЕ {gemini, gpt}
listGptModels(): string[]                  // фиксированный список GPT моделей
```

---

## CI/CD (актуально)

**`.github/workflows/deploy.yml`:**
- Триггер: push в `main`
- Auth: `google-github-actions/auth@v2` с `credentials_json: ${{ secrets.GCP_SA_KEY }}`
- Deploy: `gcloud run deploy --source . --region us-central1 ...`

**Cloud Build SA permissions** (уже выданы):
- `550172160790@cloudbuild.gserviceaccount.com` → `roles/run.admin`, `roles/iam.serviceAccountUser`, `roles/artifactregistry.writer`

**Dockerfile:** двухэтапная сборка (builder → alpine runtime). Запускает Express сервер на port 8080.

---

## Session Memory

Настроены инструменты для сохранения контекста между сессиями:

- **Stop hook** (`.claude/settings.json`) — автозапись `last_session_auto.md` при завершении
- **`/session-save`** — Claude пишет интеллектуальное резюме сессии в memory/
- **`/session-start`** — Claude читает last_session.md + MEMORY.md + git log, даёт сводку

Memory папка: `C:\Users\torew\.claude\projects\d--MyProjectCalidad-...\memory\`

---

## References

- **Product Description:** `memory/product_description.md`
- **Firestore Config:** `memory/firestore_database_config.md`
- **GCP Config:** `memory/gcp_deployment_config.md`
- **Gemini API:** https://ai.google.dev/docs
- **pdf-lib:** https://pdf-lib.js.org/
- **Zustand:** https://github.com/pmndrs/zustand
- **Firebase JS SDK:** https://firebase.google.com/docs/firestore/quickstart

---

*Last updated: May 14, 2026 — полная перезапись. Firestore активен, деплой us-central1, все актуальные паттерны.*
