# 🎬 YouTube Video Analyzer

Веб-сервис: вставляешь ссылку на YouTube-видео → получаешь его транскрипт
(через [Supadata](https://supadata.ai)) и разбор от нейросети
(через [OpenRouter](https://openrouter.ai)).

Доступные виды разбора:

- **Краткое содержание** — сжатый пересказ видео;
- **Ключевые тезисы** — главные мысли списком;
- **Главы / таймкоды** — оглавление видео с временными метками;
- **Вопрос-ответ** — ответ на твой вопрос строго по содержанию видео.

Дизайн — в ретро-стиле каталогов «Dell 1996»: чёрная рамка, цветные блок-карточки,
рубленые заголовки и объёмные кнопки в духе Windows 95.

Стек: **Next.js 14** (App Router, TypeScript). Разработка — через **Docker**.
Деплой — **Vercel**. Код — **GitHub**.

---

## 🗺️ Как это работает

```
Браузер ──> /api/analyze (сервер Next.js)
                 │
                 ├─1─> Supadata API  (достаёт транскрипт по ссылке)
                 │
                 └─2─> OpenRouter LLM (разбирает транскрипт по выбранному режиму)
                 │
                 <──── готовый разбор ──> показывается на сайте
```

Ключи API хранятся **только на сервере** (в переменных окружения) и никогда
не попадают в браузер.

---

## 🔑 Шаг 1. Получить API-ключи

1. **OpenRouter** (уже есть у тебя): https://openrouter.ai/keys
2. **Supadata**: зайди на https://supadata.ai → зарегистрируйся →
   в Dashboard раздел **API Keys** → создай ключ (есть бесплатный тариф).

Вставь оба ключа в файл **`.env.local`** в корне проекта:

```env
SUPADATA_API_KEY=твой_ключ_supadata
OPENROUTER_API_KEY=твой_ключ_openrouter
OPENROUTER_MODEL=google/gemini-2.0-flash-001
```

> `.env.local` уже в `.gitignore` — ключи не утекут в GitHub.

---

## 💻 Шаг 2. Запуск локально (через Docker)

Node.js ставить **не нужно** — всё работает в контейнере на готовом образе с Docker Hub.

```bash
docker compose up
```

Открой в браузере: **http://localhost:3000**

Первый запуск дольше — контейнер ставит зависимости. Изменения в коде
подхватываются автоматически (hot-reload).

Остановить: `Ctrl+C`, затем при желании `docker compose down`.

---

## 🐙 Шаг 3. Залить код на GitHub

```bash
# создай пустой репозиторий на github.com (без README), затем:
git remote add origin https://github.com/ТВОЙ_ЛОГИН/youtube-video-analyzer.git
git branch -M main
git push -u origin main
```

(Первый коммит уже сделан — см. историю git.)

---

## 🚀 Шаг 4. Деплой на Vercel

1. Зайди на https://vercel.com → войди через GitHub.
2. **Add New… → Project** → выбери свой репозиторий.
3. Vercel сам определит Next.js — настройки сборки менять не нужно.
4. Открой раздел **Environment Variables** и добавь:

   | Name                 | Value                          |
   |----------------------|--------------------------------|
   | `SUPADATA_API_KEY`   | твой ключ Supadata             |
   | `OPENROUTER_API_KEY` | твой ключ OpenRouter           |
   | `OPENROUTER_MODEL`   | `google/gemini-2.0-flash-001`  |

5. Нажми **Deploy**. Через минуту получишь ссылку вида
   `https://твой-проект.vercel.app`.

> После каждого `git push` в `main` Vercel будет деплоить автоматически.

---

## 📁 Структура проекта

```
app/
  layout.tsx          корневой layout + метаданные
  page.tsx            главная страница (шапка + форма)
  globals.css         ретро-стили «Dell 1996»
  AnalyzerForm.tsx    клиентская форма + вывод результата
  api/analyze/route.ts  серверный обработчик: Supadata -> OpenRouter
lib/
  youtube.ts          извлечение videoId, форматирование таймкодов
  supadata.ts         клиент Supadata (получение транскрипта)
  openrouter.ts       клиент OpenRouter (вызов LLM)
  prompts.ts          промпты под 4 режима разбора
  markdown.ts         безопасный рендер ответа LLM в HTML
docker-compose.yml    дев-окружение на образе node
.env.example          шаблон переменных окружения
```

---

## ❓ Частые проблемы

- **«Не задан SUPADATA_API_KEY»** — заполни `.env.local` и перезапусти `docker compose up`.
- **«Транскрипт не найден»** — у видео нет субтитров/распознанной речи; попробуй другое.
- **«Видео слишком длинное»** — Supadata обрабатывает длинные видео в фоне; возьми покороче.
- **На Vercel ошибка ключей** — проверь, что переменные добавлены в Environment Variables
  и сделан повторный деплой.
