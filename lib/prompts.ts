// Промпты для LLM под каждый режим анализа. Всё на русском.

export type AnalysisMode = "summary" | "keypoints" | "chapters" | "qa";

export const MODES: { id: AnalysisMode; title: string; needsQuestion?: boolean }[] = [
  { id: "summary", title: "Краткое summary" },
  { id: "keypoints", title: "Ключевые тезисы" },
  { id: "chapters", title: "Главы / таймкоды" },
  { id: "qa", title: "Вопрос-ответ по видео", needsQuestion: true },
];

export function isAnalysisMode(value: unknown): value is AnalysisMode {
  return MODES.some((m) => m.id === value);
}

const SYSTEM_PROMPT =
  "Ты — ассистент, который анализирует транскрипты YouTube-видео. " +
  "Отвечай всегда на русском языке, по делу, без воды. " +
  "Опирайся только на содержание транскрипта и не выдумывай фактов. " +
  "Используй Markdown для оформления (заголовки, списки, выделение).";

export function buildMessages(
  mode: AnalysisMode,
  transcriptPlain: string,
  transcriptTimed: string,
  question?: string
) {
  let userPrompt: string;

  switch (mode) {
    case "summary":
      userPrompt =
        "Сделай краткий, но содержательный пересказ видео в 2–4 абзацах. " +
        "Передай главную мысль и основные выводы.\n\n" +
        `Транскрипт:\n"""\n${transcriptPlain}\n"""`;
      break;

    case "keypoints":
      userPrompt =
        "Выдели ключевые тезисы видео в виде маркированного списка (7–12 пунктов). " +
        "Каждый пункт — одна законченная мысль. В конце добавь раздел «Главный вывод».\n\n" +
        `Транскрипт:\n"""\n${transcriptPlain}\n"""`;
      break;

    case "chapters":
      userPrompt =
        "На основе транскрипта с таймкодами составь оглавление видео (главы). " +
        "Для каждой главы укажи таймкод начала в формате [мм:сс] и короткое название. " +
        "Сделай 5–12 глав, оформи нумерованным списком.\n\n" +
        `Транскрипт с таймкодами:\n"""\n${transcriptTimed}\n"""`;
      break;

    case "qa":
      userPrompt =
        `Ответь на вопрос пользователя, опираясь ТОЛЬКО на содержание видео. ` +
        `Если в видео нет ответа — честно скажи об этом.\n\n` +
        `Вопрос пользователя: ${question}\n\n` +
        `Транскрипт:\n"""\n${transcriptPlain}\n"""`;
      break;
  }

  return [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: userPrompt },
  ];
}
