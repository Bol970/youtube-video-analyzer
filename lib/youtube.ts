// Утилиты для работы с YouTube-ссылками.

/**
 * Извлекает videoId из любой распространённой формы YouTube-ссылки:
 *  - https://www.youtube.com/watch?v=ID
 *  - https://youtu.be/ID
 *  - https://www.youtube.com/embed/ID
 *  - https://www.youtube.com/shorts/ID
 *  - https://www.youtube.com/live/ID
 * Возвращает null, если это не похоже на YouTube-видео.
 */
export function extractVideoId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  // Уже похоже на чистый 11-символьный id
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return isValidId(id) ? id : null;
  }

  if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    const v = url.searchParams.get("v");
    if (v && isValidId(v)) return v;

    const parts = url.pathname.split("/").filter(Boolean);
    // /embed/ID, /shorts/ID, /live/ID, /v/ID
    if (parts.length >= 2 && ["embed", "shorts", "live", "v"].includes(parts[0])) {
      return isValidId(parts[1]) ? parts[1] : null;
    }
  }

  return null;
}

function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}

/** Форматирует миллисекунды смещения в таймкод mm:ss или h:mm:ss. */
export function formatOffset(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
