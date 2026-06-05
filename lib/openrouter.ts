// Клиент OpenRouter для вызова LLM.
// Документация: https://openrouter.ai/docs

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

export class OpenRouterError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenRouterError";
    this.status = status;
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Вызывает LLM на OpenRouter и возвращает текст ответа. */
export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError(
      "Не задан OPENROUTER_API_KEY. Добавьте ключ в переменные окружения.",
      500
    );
  }

  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  // Необязательные заголовки для рейтинга приложения в OpenRouter.
  if (process.env.OPENROUTER_APP_URL) headers["HTTP-Referer"] = process.env.OPENROUTER_APP_URL;
  if (process.env.OPENROUTER_APP_TITLE) headers["X-Title"] = process.env.OPENROUTER_APP_TITLE;

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
      }),
      cache: "no-store",
    });
  } catch {
    throw new OpenRouterError("Не удалось связаться с OpenRouter. Проверьте интернет.", 502);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message || body?.message || JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => "");
    }
    if (res.status === 401) {
      throw new OpenRouterError("Неверный ключ OpenRouter.", 401);
    }
    throw new OpenRouterError(
      `OpenRouter вернул ошибку ${res.status}: ${detail || "неизвестно"}`,
      res.status
    );
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new OpenRouterError(
      "OpenRouter вернул некорректный ответ. Попробуйте ещё раз позже.",
      502
    );
  }
  const content =
    isRecord(data) &&
    Array.isArray(data.choices) &&
    isRecord(data.choices[0]) &&
    isRecord(data.choices[0].message) &&
    typeof data.choices[0].message.content === "string"
      ? data.choices[0].message.content
      : undefined;

  if (!content || !content.trim()) {
    throw new OpenRouterError("LLM вернул пустой ответ. Попробуйте ещё раз.", 502);
  }

  return content.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
