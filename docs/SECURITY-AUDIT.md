# Анализ безопасности — YouTube Video Analyzer

Дата: 2026-06-04. Инструменты: `npm audit`, **Semgrep**, `/security-review` (Claude Code).

## 1. npm audit — зависимости

`npm audit` нашёл **7 уязвимостей** (1 critical, 1 high, 5 moderate). Все — в транзитивных
зависимостях Next.js `14.2.35` (сам Next и `postcss`):

| Класс | Примеры (GHSA) |
|---|---|
| HTTP request smuggling в rewrites | GHSA-ggv3-7p47-pfv8 |
| Cache poisoning (middleware / RSC) | GHSA-3g8h-86w9-wvmq, GHSA-wfc6-r584-vfw7, GHSA-vfv6-92ff-j949 |
| XSS (CSP nonce / beforeInteractive) | GHSA-ffhc-5mcf-pf4q, GHSA-gx5p-jg67-6x7h |
| SSRF при WebSocket-upgrade | GHSA-c4j6-fc7j-m34r |
| Несколько DoS | GHSA-q4gf-8mx6-v5v3 и др. |
| PostCSS XSS в выводе стилей | GHSA-qx2v-qp2m-jg93 |

**Рекомендация:** обновить Next.js до актуального патча ветки 14.x (или выше) —
`npm audit fix --force` предлагает мажорный апгрейд (next 16), что является breaking change
и требует отдельной проверки. Большинство из этих CVE задействуют функции (rewrites, image
optimization, middleware i18n), которые в данном приложении не используются.

## 2. Semgrep — статический анализ кода (SAST)

Реестр `semgrep.dev` в окружении недоступен, поэтому скан выполнен **офлайн** с локальным
набором правил [.semgrep/rules.yml](../.semgrep/rules.yml). Прогон: 4 правила, 16 файлов,
**2 находки**.

### S1 (WARNING / CWE-79 XSS) — `dangerouslySetInnerHTML`
[app/AnalyzerForm.tsx:252](../app/AnalyzerForm.tsx#L252) — результат LLM рендерится через
`dangerouslySetInnerHTML={{ __html: renderMarkdown(result.analysis) }}`.

**Оценка: митигировано.** [lib/markdown.ts](../lib/markdown.ts) сначала экранирует `& < >`,
и только потом применяет ограниченную inline-разметку поверх уже экранированного текста —
восстановить HTML-тег или атрибут нельзя. Покрыто тестами в
[tests/markdown.test.ts](../tests/markdown.test.ts) (XSS-кейсы). Остаточный риск низкий.

### S2 (INFO / CWE-770) — нет rate-limiting на API-роуте
[app/api/analyze/route.ts](../app/api/analyze/route.ts) — публичный `POST` без ограничения
частоты проксирует запросы к платным API (Supadata / OpenRouter).

**Оценка: не уязвимость в строгом смысле (DoS/ресурсы), но риск абуза и исчерпания квоты.**
Рекомендация: добавить rate-limiting (например, по IP) — на Vercel удобно через middleware
или Upstash Ratelimit.

Захардкоженных секретов в коде Semgrep **не обнаружил** (правило `hardcoded-api-key`) —
все ключи читаются из `process.env`.

## 3. /security-review — обзор изменений (Claude Code)

Сфокусированный обзор новых изменений (тесты + регистрация Supabase) по методологии
identify → filter-false-positives. **Эксплуатируемых уязвимостей с уверенностью ≥8/10 не
найдено.** Проверено:

- **Публичный anon-ключ Supabase** (`NEXT_PUBLIC_*`) — by design, доступ ограничивается
  политиками Row Level Security, а не секретностью ключа. Service-role ключа в коде нет.
- **Форма регистрации** — `supabase.auth.signUp()` идёт через SDK (нет SQL/шаблонной
  инъекции); вывод — обычная JSX-интерполяция с авто-экранированием React; нет `eval` /
  небезопасного `innerHTML`. Аккаунт создаётся неподтверждённым → нет bypass-а аутентификации.
- **Валидация ввода видео** — `videoId` проверяется строгим `^[a-zA-Z0-9_-]{11}$` до
  попадания в `fetch`, инъекция/SSRF через ссылку исключены.

## Итоговые рекомендации (по приоритету)

1. Обновить Next.js до свежего патча 14.x для закрытия CVE из `npm audit`.
2. Добавить rate-limiting на `/api/analyze` (защита платной квоты от абуза).
3. Для Supabase — настроить подтверждение email и политики RLS на любые пользовательские
   таблицы, которые появятся позже.
4. (Опц.) В CI прогонять `npm audit` и Semgrep, тесты `npm test` как gate.
