# Технологический стек

**Связи:** [[01_architecture]]

---

## Frontend

| Технология | Версия | Роль |
|-----------|--------|------|
| React | 19 | UI фреймворк |
| TypeScript | — | Типизация |
| Vite | 6 | Сборка |
| Tailwind CSS | 4 | Стили |
| Zustand | 5 | Состояние (persist → localStorage) |
| Framer Motion | — | Анимации |
| Lucide React | — | Иконки |

## Backend

| Технология | Роль |
|-----------|------|
| Node.js + Express | API сервер (port 8080) |
| Firebase SDK | Firestore доступ |

## PDF

| Библиотека | Роль |
|-----------|------|
| pdf-lib 1.17 | Генерация КП (рисует текст поверх PDF) |
| pdfjs-dist 4 | Рендер превью PDF в canvas |
| html2canvas | Снимок HTML → изображение |
| @pdf-lib/fontkit | Кириллические шрифты в PDF |

## Хранилище

| Технология | Роль |
|-----------|------|
| Firestore | Облачная БД (us-central1) |
| IndexedDB (idb-keyval) | PDF-бланки, изображения, тексты диалогов |
| localStorage | Zustand persist (шаблоны, настройки) |

## AI / API

| Сервис | Роль |
|--------|------|
| Gemini API | Основная AI (очистка, анализ, RAG) |
| OpenAI GPT | Альтернативный провайдер |
| Anthropic Claude API | Агент, тренажёр, оценка (планируется) |

## Инфраструктура

| Сервис | Роль |
|--------|------|
| Google Cloud Run | Хостинг (us-central1) |
| Cloud Build | Docker сборка |
| Secret Manager | API ключи в runtime |
| GitHub Actions | CI/CD (push → deploy) |
| Cloud Scheduler | Расписание рутин агента (планируется) |
| Firebase Auth | Роли и доступы (планируется) |

## Шрифты (кириллица в PDF)
`/public/fonts/`: Inter, Roboto, Open Sans, PT Serif — WOFF формат.  
Arial/Helvetica не поддерживают кириллицу в pdf-lib.
