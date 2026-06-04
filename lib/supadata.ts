// Клиент Supadata API для получения транскрипта YouTube-видео.
// Документация: https://docs.supadata.ai
import { formatOffset } from "./youtube";

const BASE_URL = "https://api.supadata.ai/v1";

// Иногда Supadata на первый запрос отдаёт пустой транскрипт, пока подтягивает
// данные с YouTube. Повторяем несколько раз с короткой паузой.
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1200;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface TranscriptSegment {
  text: string;
  offset: number; // миллисекунды от начала видео
  duration: number;
  lang: string;
}

export interface TranscriptResult {
  /** Весь транскрипт одной строкой. */
  plainText: string;
  /** Транскрипт с таймкодами — нужен для режима «главы». */
  timedText: string;
  lang: string;
  availableLangs: string[];
}

export class SupadataError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SupadataError";
    this.status = status;
  }
}

/**
 * Получает транскрипт видео. Запрашиваем сегменты (text=false),
 * чтобы иметь таймкоды, и сами склеиваем простой текст.
 */
export async function fetchTranscript(
  videoId: string,
  lang?: string
): Promise<TranscriptResult> {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) {
    throw new SupadataError(
      "Не задан SUPADATA_API_KEY. Добавьте ключ в переменные окружения.",
      500
    );
  }

  const params = new URLSearchParams({ videoId, text: "false" });
  if (lang) params.set("lang", lang);
  const requestUrl = `${BASE_URL}/youtube/transcript?${params.toString()}`;

  // Запоминаем доступные языки между попытками — пригодятся для понятной ошибки.
  let availableLangs: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(requestUrl, {
        headers: { "x-api-key": apiKey },
        cache: "no-store",
      });
    } catch {
      // Сетевой сбой — пробуем ещё раз, если попытки остались.
      if (attempt < MAX_ATTEMPTS) {
        await delay(RETRY_DELAY_MS);
        continue;
      }
      throw new SupadataError("Не удалось связаться с Supadata. Проверьте интернет.", 502);
    }

    if (!res.ok) {
      // 401/403/404 — постоянные ошибки, повторять смысла нет.
      if (res.status === 401 || res.status === 403) {
        throw new SupadataError("Неверный или просроченный ключ Supadata.", res.status);
      }
      if (res.status === 404) {
        throw new SupadataError(
          "Транскрипт для этого видео не найден (возможно, у видео нет субтитров).",
          404
        );
      }
      // 5xx и прочее — пробуем ещё раз.
      if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
        await delay(RETRY_DELAY_MS);
        continue;
      }
      let detail = "";
      try {
        const body = await res.json();
        detail = body?.message || body?.error || JSON.stringify(body);
      } catch {
        detail = await res.text().catch(() => "");
      }
      throw new SupadataError(
        `Supadata вернул ошибку ${res.status}: ${detail || "неизвестно"}`,
        res.status
      );
    }

    const data = await res.json();

    // Длинные видео Supadata может отдавать асинхронным заданием (jobId).
    if (data?.jobId && !data?.content) {
      throw new SupadataError(
        "Видео слишком длинное — Supadata обрабатывает его в фоне. Попробуйте видео покороче.",
        202
      );
    }

    if (Array.isArray(data?.availableLangs)) availableLangs = data.availableLangs;

    const segments: TranscriptSegment[] = Array.isArray(data?.content)
      ? data.content
      : [];

    if (segments.length > 0) {
      const plainText = segments
        .map((s) => s.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const timedText = segments
        .map((s) => `[${formatOffset(s.offset)}] ${s.text}`)
        .join("\n");
      return {
        plainText,
        timedText,
        lang: data.lang ?? lang ?? "",
        availableLangs,
      };
    }

    // На случай, если пришёл уже простой текст (text=true-подобный ответ).
    if (typeof data?.content === "string" && data.content.trim()) {
      return {
        plainText: data.content,
        timedText: data.content,
        lang: data.lang ?? lang ?? "",
        availableLangs,
      };
    }

    // Пустой транскрипт — возможно, ещё не готов. Пробуем ещё раз.
    if (attempt < MAX_ATTEMPTS) {
      await delay(RETRY_DELAY_MS);
    }
  }

  // Все попытки исчерпаны — транскрипта так и нет.
  const hint = availableLangs.length
    ? ` Доступные субтитры: ${availableLangs.join(", ")}.`
    : "";
  throw new SupadataError(
    "У видео нет распознанной речи или субтитры ещё не готовы. " +
      "Попробуйте другое видео либо повторите попытку чуть позже." +
      hint,
    404
  );
}
