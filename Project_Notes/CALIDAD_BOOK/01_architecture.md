# 01. Общая архитектура и стек

**Связи:** [[INDEX]] [[00_vision]] [[02_roles_access]] [[decisions/tech_stack]] [[decisions/data_architecture]]

---

## Технологический стек

| Слой | Технология |
|------|-----------|
| UI | React 19 + TypeScript + Vite 6 |
| Стили | Tailwind CSS 4 |
| Состояние | Zustand 5 (persist → localStorage) |
| PDF (КП) | pdf-lib 1.17 + pdfjs-dist 4 |
| PDF (Договор) | html2canvas → pdf-lib |
| Хранилище бинарных данных | IndexedDB (idb-keyval) |
| Облачная БД | Firestore (database `(default)`, us-central1) |
| Бэкенд | Node.js Express (port 8080) |
| AI API | Gemini (Google) + OpenAI GPT |
| Деплой | Google Cloud Run (us-central1) |
| CI/CD | GitHub Actions |

---

## Хранилище данных

| Данные | Где хранится | Облако |
|--------|-------------|--------|
| PDF-бланки КП | IndexedDB | ❌ только браузер |
| Шаблоны КП | localStorage (Zustand) | ❌ только браузер |
| Настройки компании | localStorage | ❌ только браузер |
| Диалоги (тексты) | IndexedDB + Firestore | ✅ |
| Скрипт продаж | Firestore `script_nodes` | ✅ |
| Мини-презентации | Firestore `micro_presentations` | ✅ |
| Типы станков | Firestore `machine_types` | ✅ |
| Диалоги (метаданные) | Firestore `processed_scripts` | ✅ |
| Статьи | Firestore `articles` | ✅ |
| StyleDNA | Firestore `style_dna` | ✅ |
| FewShot примеры | Firestore `few_shot_examples` | ✅ |
| Batch Insights | Firestore `batch_insights` | ✅ |
| Cleaning Config | Firestore `cleaning_config` | ✅ |

**Правило:** никогда не хранить ArrayBuffer/Blob в localStorage — только IndexedDB.

---

## Архитектура API (бэкенд)

```
React SPA (браузер)
  ↓ fetch('/api/*')
Node.js Express (port 8080, Cloud Run)
  ├── /api/clean-text
  ├── /api/analyze-dialogue
  ├── /api/extract-batch-insights
  ├── /api/available-models
  ├── /api/wp-publish
  ├── /api/generate-article-draft
  └── /api/rewrite-article-style
```

API-ключи (GEMINI_API_KEY, OPENAI_API_KEY) инъектируются в runtime через Cloud Run `--set-secrets`. НЕ на этапе сборки.

---

## Firestore синхронизация

Два слоя:
1. **`useCloudSync.ts`** — загрузка при старте, параллельно все 9 коллекций
2. **`cloudSyncManager.ts`** — дебаунсированное сохранение изменений (2000ms), singleton

При загрузке из Firestore использовать `_load*` actions (не CRUD — они тригерят cloudSync обратно).
