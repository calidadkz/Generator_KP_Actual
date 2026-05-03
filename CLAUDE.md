# CALIDAD Document Generator — Codebase Guide

> Это руководство для AI помощника. Обновляй вместе с архитектурой.

## Quick Start

```bash
npm install
# Скопировать .env.example → .env
# Добавить VITE_GEMINI_API_KEY для Sales модуля
npm run dev  # http://localhost:5173
```

**Architecture:** React SPA (browser) + Node.js Express backend (API routes, runtime secret management). Data in localStorage + IndexedDB (client) + Firestore (server-side persistence, active since April 27, 2026).

---

## Architecture Overview

**React 19 + Vite 6 + TypeScript SPA** для CALIDAD.kz — автоматизация документов для продаж.

| Модуль | Цель | Ключевые технологии |
|---|---|---|
| **КП** | Генерировать коммерческие предложения из PDF-бланков | pdf-lib 1.17, pdfjs-dist 4 |
| **Договор** | Генерировать контракты из HTML-шаблонов | html2canvas, pdf-lib |
| **Sales** | Управлять скриптом звонков, анализировать диалоги через AI | Gemini API, Zustand, IndexedDB |
| **Settings** | Хранить данные компании (логотип, печать, подпись) | SettingsContext, localStorage |

**Деплой:** Docker (Node build + Nginx) → Google Cloud Run (stateless).

---

## Key Architectural Decisions

### PDF-координаты
```
pdf-lib:      origin (0,0) внизу слева → A4 = 595×842pt
Canvas:       origin (0,0) вверху слева → вычисляем через canvasRectToPdfBox()
```
Функция `canvasRectToPdfBox()` в `/src/lib/pdfGenerator.ts` конвертирует координаты.

### Хранилище данных

| Данные | Хранилище | Причина |
|---|---|---|
| PDF-бланки (ArrayBuffer) | IndexedDB (`idb://pdf-...`) | Большой объём (мегабайты) |
| Ссылка на PDF (`idb://pdf-123`) | localStorage (Zustand persist) | Быстрый доступ |
| Договоры (HTML + metadata) | localStorage | Небольшой объём |
| Диалоги (текст) | IndexedDB (dialogueStorage) | Может быть большим |
| Изображения (логотип, печать) | IndexedDB (imageStorage) | Binaries |

**Правило:** Никогда не храни ArrayBuffer/Blob в localStorage — localStorage текстовый, тренирует JSON serialization.

### Шрифты
Кириллица **требует** WOFF, не может быть Arial/Helvetica (браузер не содержит русских глифов).

Доступные семейства:
- Inter (по умолчанию)
- Roboto
- Open Sans
- PT Serif (засечки)

Все в `/public/fonts/` как `.woff` файлы.

### Zustand + localStorage
```typescript
// Store структура
const useStore = create<State>()(
  persist(
    (set, get) => ({
      // state
      items: [],
      // actions
      addItem: (item) => set((s) => ({ items: [...s.items, item] })),
    }),
    {
      name: 'calidad_store_key',  // ключ localStorage
      version: 1,                  // версия схемы
      migrate: (state, version) => {
        if (version < 2) {
          // миграция старых данных
        }
        return state;
      },
    }
  )
);
```

**Важно:** Версионность crucial при изменении структуры state.

---

## Module Structure

### `/src/components/CP/` — КП (Коммерческие предложения)

| Компонент | Роль | Пользователь |
|---|---|---|
| **GeneratorPage** | Выбор шаблона → заполнение текста → live preview → скачать PDF | Менеджер |
| **TemplateMapper** | Загрузка PDF-бланка → drag-to-draw прямоугольников → задание переменных | Администратор |
| **PdfPageCanvas** | Рендер страницы PDF через pdfjs-dist → mouse events для drag | Internal |
| **AssemblyForm** | Форма для ERP-интеграции (сейчас не используется) | Reserved |

**Архитектура:**
1. Администратор в TemplateMapper:
   - Загружает PDF-бланк → IndexedDB
   - Рисует координатные прямоугольники (FieldPin)
   - Задаёт имя переменной, размер, жирность, цвет
   - Сохраняет PdfTemplate в Zustand + localStorage
2. Менеджер в GeneratorPage:
   - Выбирает шаблон из галереи
   - Вводит текст для каждой переменной
   - Настраивает стиль (FieldFormatOverride): шрифт, цвет, выравнивание, padding
   - Видит live preview (CSS overlay на canvas)
   - Скачивает PDF

**Ядро:** `/src/lib/pdfGenerator.ts` — `generateKpPdf(template, values, overrides) → Uint8Array`
- Multi-font caching
- Text wrapping и alignment
- Padding calculation

### `/src/components/Contract/` — Договоры

| Компонент | Роль |
|---|---|
| **ContractBuilder** | Редактор тела договора (HTML-шаблон с {{переменными}}) |
| **ContractSidebar** | Боковая панель: покупатель, спецификация, скачать |
| **ContractPreview** | Live preview договора (HTML render) |

**Данные:**
- ContractState: контрагент, спецификация, подписанты
- Шаблоны: HTML с переменными {{name}}, {{sum}}, и т.д.

### `/src/components/Sales/` — Sales (Новое)

**Архитектура:**
- Администратор настраивает скрипт, базу мини-презентаций, типы станков
- Менеджер во время звонка смотрит ManagerCockpit — скрипт + релевантные МП
- Административная панель (AdminPanel) анализирует загруженные диалоги: выбор AI модели (Gemini или OpenAI GPT) + параметры анализа
- **Модели:** Gemini (35 моделей, отфильтрованы видео/музыка/другое) или GPT-4 (gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo)

| Компонент | Роль |
|---|---|
| **ManagerCockpit** | Real-time script display (stages, smart MP filtering) |
| **AdminPanel** | Tabbed interface: Dialogues / Script / Micro-presentations / Machine types |
| **AdminDialogues** | Upload → auto-clean (Gemini) → analyze → extract patterns + add to library |
| **AdminScript** | Edit script stages with categories, link MicroPresentations |
| **AdminMicroPresentations** | CRUD mini-presentations (pitch snippets) |
| **AdminMachineTypes** | CRUD machine types (laser, CNC, etc.) |

**Типы данных:**
```typescript
ScriptNode {
  id: string;
  order: number;
  title: string;
  content: string;
  category?: 'Открытие' | 'Квалификация' | 'Возражения' | 'Закрытие';
  tips?: string[];
  microPresentationIds?: string[];  // linked MicroPresentations
  machineTypeIds?: string[];        // applicable to specific machine types
}

MicroPresentation {
  id: string;
  title: string;
  content: string;
  category: string;  // Открытие, Квалификация, Возражения, Закрытие, Общее, Формулировки
  machineTypeIds?: string[];
  tags?: string[];
}

DialogueRecord {
  id: string;
  filename: string;
  uploadedAt: string;
  textRef?: string;  // "idb://dialogue-{id}" in IndexedDB
  
  cleanStatus: 'pending' | 'cleaning' | 'ready' | 'error';
  analysisStatus: 'pending' | 'analyzing' | 'done' | 'error';
  
  clientType?: string;
  machineTypeHint?: string;
  machineTypeIds?: string[];  // manual tagging
  isClean?: boolean;           // marked as final clean version
  extractedData?: ExtractedDialogueData;
  
  usedModel?: string;
  modelLog?: ModelLogEntry[];
}
```

**Services:**
- `dialogueProcessor.ts`: API wrapper for AI analysis (clean text → analyze → batch patterns) with `model?: string` and `provider?: 'gemini' | 'openai'` parameters
- `dialogueStorage.ts`: IndexedDB storage for dialogue texts
- `useSalesStore.ts`: Zustand store for all Sales state + `setDialogues()`, `setBatchInsights()` for Firestore sync

### `/src/lib/` — Core utilities

| Файл | Функция |
|---|---|
| `pdfGenerator.ts` | КП generation: `generateKpPdf(template, values, overrides)` |
| `pdfStorage.ts` | IndexedDB API: `savePdf(buf) → idb://...`, `resolvePdf(ref) → buf` |
| `imageStorage.ts` | IndexedDB API for images (same pattern) |
| `dialogueStorage.ts` | IndexedDB API for dialogue texts: `saveDialogueTexts({rawText, cleanedText})` |
| `dialogueProcessor.ts` | API wrapper: `cleanDialogueText()`, `analyzeDialogue()`, `extractBatchInsights()` with `model?` and `provider?` ('gemini'\|'openai') parameters |

### `/src/server/` — Backend (Express + AI APIs)

| Файл | Функция |
|---|---|
| `geminiApi.ts` | Gemini API integration: `analyzeDialogue()`, `cleanDialogueText()`, `extractBatchInsights()` + `listAvailableModels()`. Model filtering (removed: veo, lyria, aqa, deep-research, gemma-small). Supports `model?: string` for single-model selection |
| `openaiApi.ts` | OpenAI GPT integration (gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo) with identical function signatures as Gemini for provider switching |
| `index.ts` | Express server + routes: `/api/clean-text`, `/api/analyze-dialogue`, `/api/extract-batch-insights`, `/api/available-models`. Runtime secret injection (GEMINI_API_KEY, OPENAI_API_KEY from process.env) |

### `/src/store/` — State Management (Zustand)

| Store | Содержит |
|---|---|
| `useTemplateStore` | PdfTemplate[] + activeTemplateId (КП templates) |
| `useDocumentStore` | AssemblyData (客户, model, 价格 — reserved для ERP) |
| `useSalesStore` | machineTypes, scriptNodes, microPresentations, dialogues, batchInsights |

Все используют `persist` middleware → localStorage.

### `/src/context/` — React Context

| Context | Назначение |
|---|---|
| `SettingsContext` | CompanyDetails (реквизиты, логотип, печать, подпись) |

---

## Coding Patterns

### React Components
**Full-page routes:**
```tsx
// App.tsx: switch на activeTab
if (activeTab === 'kp-generator') return <GeneratorPage />;
if (activeTab === 'contract-builder') return <ContractBuilder />;
```

**Layout + sidebar:**
```tsx
return (
  <Layout>
    <Sidebar ... /> {/* left */}
    <Preview ... />  {/* right */}
  </Layout>
);
```

**Live preview:**
- КП: Canvas overlay с CSS-оверлеем (TemplateMapper)
- Договор: HTML render (ContractPreview)

### TypeScript
- Все типы в `/src/types.ts`
- Интерфейсы для state, props, API
- `strict: true` в tsconfig

### Zustand Actions
```tsx
// Arrow functions, never named functions
addItem: (item) => set((s) => ({ items: [...s.items, item] })),
deleteItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
```

### PDF Work
```tsx
// pdfGenerator.ts exports
generateKpPdf(
  template: PdfTemplate,
  values: Record<string, string>,
  overrides?: Record<string, FieldFormatOverride>
): Promise<Uint8Array>;

// Convert canvas rect to PDF coords
canvasRectToPdfBox(rect: {x, y, w, h}): {x, y, w, h};
```

---

## Common Gotchas

❌ **DON'T:**
- Store ArrayBuffer in localStorage (not JSON-serializable)
- Use Arial/Helvetica in PDF (no Cyrillic glyphs)
- Forget migrate function when changing Zustand schema version
- Mutate state directly (always use set() with new object)
- Forget to persist() middleware for cross-session data

✅ **DO:**
- Use IndexedDB for large binaries + idb-keyval library
- Use WOFF fonts for Cyrillic
- Test PDF generation in browser (not headless)
- Check coordinate system (canvas vs pdf-lib)
- Clear localStorage/IndexedDB when debugging state issues

---

## Testing & Debugging

### Manual Testing
```bash
npm run dev
# КП: Dashboard → Генератор КП → выбрать шаблон → заполнить → скачать PDF
# Договор: Dashboard → Договор → заполнить → скачать PDF
# Sales: Dashboard → Cockpit менеджера / Управление скриптом
#   → загрузить диалог .txt → Анализировать → Добавить в скрипт
```

### Debugging
```typescript
// localStorage inspection
console.log(localStorage.getItem('calidad_pdf_templates'));
console.log(localStorage.getItem('calidad_assembly'));

// IndexedDB inspection
// DevTools → Application → IndexedDB → calidad-db

// Zustand debugging
const store = useTemplateStore;
console.log(store.getState());
```

### Chrome DevTools
- **Application tab** → localStorage, IndexedDB, Cookies
- **Network tab** → check Gemini API calls
- **Console** → check for TypeScript errors

---

## CI/CD & Deployment

**File:** `cloudbuild.yaml`

```yaml
steps:
  # 1. Build Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/PROJECT/app', '.']
  # 2. Push to registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/PROJECT/app']
  # 3. Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/run'
    args: ['deploy', 'calidad-generator', '--image', 'gcr.io/PROJECT/app']
```

**Build args:**
- VITE_GEMINI_API_KEY (Gemini API key)
- VITE_FIREBASE_* (Firebase config, when added)

**Nginx routing:** All paths → index.html (SPA routing)

---

## Future: Firebase Integration

**Goal:** Persist dialogues + batch insights across deployments for team.

**Firestore:**
- Collection `dialogues` → documents of DialogueRecord type
- Collection `batch_insights` → documents of BatchInsights type

**Storage:**
- Bucket `dialogues/` → text files (.txt)

**Sync:**
- On app load: fetch all dialogues from Firestore + hydrate store
- On upload: save to IndexedDB + parallel upload to Firestore + Storage
- On edit: update Firestore document
- On delete: delete from Firestore + Storage

**Auth:** Start with anonymous access, move to service account when needed.

---

## References

- **Project Map:** [Project_Notes/Current_Project_Map.md](./Project_Notes/Current_Project_Map.md)
- **Gemini API:** https://ai.google.dev/docs
- **pdf-lib:** https://pdfme.js.org/
- **Zustand:** https://github.com/pmndrs/zustand
- **IndexedDB idb-keyval:** https://github.com/jakearchibald/idb-keyval

---

*Last updated: April 27, 2026*
