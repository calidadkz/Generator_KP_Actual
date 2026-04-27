# Current Project Map — CALIDAD Document Generator

> Это живой документ. Обновляй его когда появляются новые идеи, модули или меняется архитектура.
> Клод сверяется с ним в начале каждого контекста.

---

## Суть проекта

**React + Vite SPA** для компании CALIDAD.kz — генератор двух типов документов:

| Документ | Как работает |
|---|---|
| **Договор** | HTML-шаблон с переменными → заполняется через форму → html2canvas → PDF |
| **КП (Коммерческое предложение)** | Дизайнерский PDF-бланк → координатная карта переменных (FieldPin) → pdf-lib рисует текст поверх → PDF |

Деплой: **Google Cloud Run** через Docker + Nginx (статика).

---

## Стек технологий

| Слой | Технология |
|---|---|
| UI-фреймворк | React 19 + TypeScript |
| Сборка | Vite 6 |
| Стили | Tailwind CSS 4 |
| Иконки | Lucide React |
| Состояние | Zustand 5 (с persist в localStorage) |
| PDF-генерация КП | pdf-lib 1.17 + @pdf-lib/fontkit |
| PDF-рендер превью | pdfjs-dist 4 |
| PDF-генерация Договора | html2canvas → pdf-lib |
| Хранилище PDF-бланков | IndexedDB через idb-keyval |
| Хранилище изображений (печать) | IndexedDB через idb-keyval |
| Шрифты в PDF (кириллица) | WOFF-файлы: Inter, Roboto, Open Sans, PT Serif |
| Шрифты для превью в браузере | Google Fonts (те же 4 семейства) |
| Анимации | Framer Motion |

---

## Архитектура: КП-модуль (главное)

```
Администратор                     Менеджер
──────────────                    ─────────────────────────────────────────
TemplateMapper.tsx                GeneratorPage.tsx
  ↓ загружает PDF-бланк             ↓ выбирает шаблон из галереи
  ↓ drag-to-draw прямоугольник      ↓ вводит текст для каждой переменной
  ↓ задаёт: имя переменной,         ↓ настраивает форматирование:
    размер шрифта, жирность,            шрифт / цвет / выравнивание /
    цвет (подсказка)                    отступы (FieldFormatOverride)
  ↓ сохраняет PdfTemplate           ↓ видит live-превью (CSS-оверлей)
    в Zustand + localStorage         ↓ скачивает PDF
```

**Ключевой принцип:** администратор определяет **геометрию** зон, менеджер определяет **стиль** текста.

---

## Файлы: src/

### Точки входа

| Файл | Роль |
|---|---|
| `main.tsx` | ReactDOM.createRoot, монтирование App |
| `App.tsx` | Роутер на AppTab (switch по activeTab в localStorage), обёртка провайдеров |
| `index.css` | Tailwind + Google Fonts импорты + CSS-переменные calidad-blue/red |
| `types.ts` | Все TypeScript-типы: AppTab, FieldPin, PdfTemplate, FieldFormatOverride, ContractState и др. |
| `constants.ts` | Дефолтные данные: DEFAULT_COMPANY, дефолтные шаблоны Договора |
| `utils.ts` | Вспомогательные функции общего назначения |

### src/components/CP/ — модуль КП

| Файл | Роль |
|---|---|
| `TemplateMapper.tsx` | **Администратор.** Загрузка PDF-бланка, drag-to-draw прямоугольников, форма пина (имя переменной, размер/жирность/цвет), сохранение PdfTemplate |
| `GeneratorPage.tsx` | **Менеджер.** Галерея шаблонов → форма заполнения (textarea per key + панель «Оформление»: шрифт/цвет/align/padding) → live-превью → скачать PDF |
| `PdfPageCanvas.tsx` | Рендерит одну страницу PDF в `<canvas>` через pdfjs-dist. Пробрасывает mouse-события для drag в TemplateMapper и onSizeReady для координат оверлея |
| `AssemblyForm.tsx` | Форма связанная с useDocumentStore (AssemblyData). Сейчас не используется в основном флоу, зарезервирована для ERP-интеграции |

### src/components/Contract/ — модуль Договора

| Файл | Роль |
|---|---|
| `ContractBuilder.tsx` | Редактор тела договора (HTML-шаблон с переменными) |
| `ContractSidebar.tsx` | Боковая панель: данные покупателя, спецификация, кнопка скачать PDF |
| `ContractPreview.tsx` | Live-превью договора (рендер HTML-шаблона) |

### src/components/UI/ — общий UI

| Файл | Роль |
|---|---|
| `Dashboard.tsx` | Главная страница с карточками навигации (КП, Договор, Настройки, Библиотека) |
| `Layout.tsx` | Шапка + боковое меню + слот для контента. Управляет activeTab |
| `TemplatesLibrary.tsx` | Библиотека шаблонов Договора (просмотр, выбор, применение) |
| `TemplateControls.tsx` | Кнопки управления шаблонами (создать / редактировать / удалить) |
| `Stamp.tsx` | Компонент печати (перетаскиваемый оверлей на превью договора) |

### src/components/Settings/

| Файл | Роль |
|---|---|
| `SettingsSidebar.tsx` | Настройки компании: реквизиты, логотип, подпись, печать |

### src/lib/ — библиотеки

| Файл | Роль |
|---|---|
| `pdfGenerator.ts` | **Ядро КП.** generateKpPdf(template, values, overrides) → Uint8Array. Мульти-шрифтовой кэш, wrapText, выравнивание, padding, canvasRectToPdfBox |
| `pdfStorage.ts` | savePdf / resolvePdf / deletePdf — IndexedDB через idb-keyval. Ключи вида `idb://pdf-...` |
| `imageStorage.ts` | saveImage / resolveImage / deleteImage — то же для изображений (печать, логотип) |

### src/store/ — Zustand-сторы

| Файл | Роль |
|---|---|
| `useTemplateStore.ts` | PdfTemplate[] + activeTemplateId. persist → `calidad_pdf_templates` |
| `useDocumentStore.ts` | AssemblyData (клиент, модель, цены, менеджер). persist → `calidad_assembly`. Зарезервирован для ERP |

### src/hooks/

| Файл | Роль |
|---|---|
| `useTemplates.ts` | Хук для шаблонов Договора (CRUD, активный шаблон) |
| `useContract.ts` | Хук состояния договора (ContractState) |

### src/context/

| Файл | Роль |
|---|---|
| `SettingsContext.tsx` | React Context с данными компании (CompanyDetails), персистируется в localStorage |

### src/services/

| Файл | Роль |
|---|---|
| `templateService.ts` | Утилиты работы с шаблонами Договора: компиляция переменных, экспорт/импорт |

### src/utils/

| Файл | Роль |
|---|---|
| `contractPdf.ts` | Генерация PDF договора: html2canvas → pdf-lib (сохраняет форматирование HTML) |

### src/components/

| Файл | Роль |
|---|---|
| `Templates.tsx` | Обёртка страницы библиотеки шаблонов |

---

## public/fonts/ — шрифты с кириллицей

| Файл | Используется |
|---|---|
| `Inter-Regular.woff` / `Inter-Bold.woff` | В PDF по умолчанию |
| `Roboto-Regular.woff` / `Roboto-Bold.woff` | Опция менеджера |
| `OpenSans-Regular.woff` / `OpenSans-Bold.woff` | Опция менеджера |
| `PTSerif-Regular.woff` / `PTSerif-Bold.woff` | Опция менеджера (засечки) |
| `Inter-*.ttf` | Устаревшие (были загружены некорректно как HTML). WOFF заменили |

---

## Деплой (корень проекта)

🔒 **DEPLOYMENT LOCK:**
- **GCP Project:** `gen-lang-client-0038297950` (ONLY!)
- **Region:** `asia-east2` (Hong Kong) (NO us-central1!)
- **Cloud Run URL:** https://calidad-generator-225103227035.asia-east2.run.app

**Deploy Command (ONLY THIS):**
```bash
gcloud run deploy calidad-generator --source . --region asia-east2 \
  --allow-unauthenticated --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --project gen-lang-client-0038297950
```

| Файл | Роль |
|---|---|
| `Dockerfile` | Multi-stage: Node build → Nginx static serve (GEMINI_API_KEY в npm run build) |
| `nginx.conf` | SPA-роутинг (все пути → index.html) |
| `vite.config.ts` | Vite конфиг (React plugin, aliases, GEMINI_API_KEY inject) |
| `tailwind.config.js` | Tailwind конфиг (цвета calidad-blue/red) |
| `tsconfig.json` | TypeScript конфиг (strict, paths) |

---

## Ключевые бизнес-правила

- **PDF-координаты:** система A4 = 595×842 pt, origin = нижний левый угол (pdf-lib). Canvas = верхний левый. Конвертация в `canvasRectToPdfBox()`.
- **Хранение PDF-бланков:** только `idb://pdf-...` строка в Zustand. Сам ArrayBuffer — только в IndexedDB. localStorage не разбухает.
- **Шрифты:** TTF/WOFF с кириллицей обязательны — Helvetica/Arial в браузере не содержат русских глифов.
- **Выравнивание и отступы** задаёт **менеджер** при заполнении (FieldFormatOverride), не администратор при создании шаблона.

---

## Модуль Sales (новое)

Инструмент для управления скриптом звонков и AI-анализом диалогов клиентов.

### Компоненты

| Компонент | Роль | Пользователь |
|---|---|---|
| **ManagerCockpit** | Real-time скрипт во время звонка: этапы + мини-презентации (отфильтрованные по категории этапа) | Менеджер |
| **AdminPanel** | 4 вкладки для администратора: Диалоги / Скрипт / Мини-презентации / Типы станков | Администратор |
| **AdminDialogues** | Загрузка расшифровок → авто-очистка Gemini → AI-анализ структуры → извлечение закономерностей | Администратор |
| **AdminScript** | Редактор этапов скрипта (добавить категорию: Открытие/Квалификация/Возражения/Закрытие) | Администратор |
| **AdminMicroPresentations** | Библиотека мини-презентаций (pitch snippets) с категориями и тегами | Администратор |
| **AdminMachineTypes** | Каталог типов станков (лазер, фрезер ЧПУ, плазма и т.д.) с квалификаторами | Администратор |

### Хранилище данных

| Сущность | Хранилище | Примечание |
|---|---|---|
| ScriptNode | Zustand + localStorage | order, category, title, content, tips, microPresentationIds |
| MicroPresentation | Zustand + localStorage | title, content, category, tags, machineTypeIds |
| DialogueRecord | Zustand + IndexedDB (texts) | cleanStatus, analysisStatus, isClean, extractedData |
| BatchInsights | Zustand + localStorage | patterns от 5+ диалогов (портреты, техники, формулировки) |

### Сервисы

| Файл | Функция |
|---|---|
| `dialogueProcessor.ts` | Gemini API: `cleanDialogueText()` → `analyzeDialogue()` → `extractBatchInsights()` |
| `dialogueStorage.ts` | IndexedDB: `saveDialogueTexts({rawText, cleanedText})` → ref |
| `useSalesStore.ts` | Zustand store для всего Sales state |

### Ключевые фичи (апрель 2026)

✅ ManagerCockpit: умная фильтрация МП по категории этапа + переходные на следующий  
✅ AdminDialogues: дедупликация кнопок (flash "Уже есть")  
✅ AdminDialogues: защита от дублей при загрузке файла  
✅ AdminDialogues: inline-редактор очищенного текста + Авто-правка ИИ  
✅ AdminDialogues: скачивание отредактированного диалога как .txt  
✅ AdminDialogues: пометка "Чистовой" (ShieldCheck)  
✅ AdminDialogues: привязка диалога к типам станков (chips)  
✅ AdminDialogues: группировка по типу станка (список/группы)  
✅ AdminScript: выбор категории этапа  

### Firebase roadmap (следующий этап)

-### 🗄️ Database Infrastructure (Google Cloud)
- **Project ID:** "gen-lang-client-0038297950",
- **Database ID:** `databasekp`
- **Location:** `asia-east2` (Hong Kong)
- **Edition:** Standard (Firestore Native Mode)
- **Security Rules:** Open (Test Mode — до 28 мая 2026)
- **Target Collection:** `processed_scripts`
const firebaseConfig = {
  apiKey: "AIzaSyBaBRu2gm_UM49VDVQ0Q2EYN9k-2N4uXUo",
  authDomain: "gen-lang-client-0038297950.firebaseapp.com",
  projectId: "gen-lang-client-0038297950",
  storageBucket: "gen-lang-client-0038297950.firebasestorage.app",
  messagingSenderId: "225103227035",
  appId: "1:225103227035:web:0020220f53c8ca15ac3e3e"
};
---

## Идеи и концепции (добавляй сюда)

<!-- Используй этот раздел как буфер идей. Клод будет их учитывать. -->

- [x] Обновляй описание проекта после каждого изменения
- [ ] Firebase интеграция (Firestore + Storage для диалогов)
- [ ] ERP-интеграция через useDocumentStore (пока зарезервирован)
- [ ] Экспорт/импорт диалогов как ZIP архив (как fallback до Firebase)

---

*Обновлено: апрель 27, 2026 — добавлена Sales архитектура и Firebase roadmap*
