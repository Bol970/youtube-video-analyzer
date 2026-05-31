// Клиент Supadata API для получения транскрипта YouTube-видео.
// Документация: https://docs.supadata.ai
import { formatOffset } from "./youtube";

const BASE_URL = "https://api.supadata.ai/v1";

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

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/youtube/transcript?${params.toString()}`, {
      headers: { "x-api-key": apiKey },
      cache: "no-store",
    });
  } catch {
    throw new SupadataError("Не удалось связаться с Supadata. Проверьте интернет.", 502);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.message || body?.error || JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => "");
    }
    if (res.status === 401 || res.status === 403) {
      throw new SupadataError("Неверный или просроченный ключ Supadata.", res.status);
    }
    if (res.status === 404) {
      throw new SupadataError(
        "Транскрипт для этого видео не найден (возможно, у видео нет субтитров).",
        404
      );
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

  const segments: TranscriptSegment[] = Array.isArray(data?.content)
    ? data.content
    : [];

  if (segments.length === 0) {
    // На случай, если пришёл уже простой текст
    if (typeof data?.content === "string" && data.content.trim()) {
      return {
        plainText: data.content,
        timedText: data.content,
        lang: data.lang ?? lang ?? "",
        availableLangs: data.availableLangs ?? [],
      };
    }
    throw new SupadataError("Транскрипт пустой — у видео нет распознанной речи.", 404);
  }

  const plainText = segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
  const timedText = segments
    .map((s) => `[${formatOffset(s.offset)}] ${s.text}`)
    .join("\n");

  return {
    plainText,
    timedText,
    lang: data.lang ?? lang ?? "",
    availableLangs: data.availableLangs ?? [],
  };
}
