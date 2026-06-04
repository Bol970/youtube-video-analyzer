import { NextRequest, NextResponse } from "next/server";
import { extractVideoId } from "@/lib/youtube";
import { fetchTranscript, SupadataError } from "@/lib/supadata";
import { chatCompletion, OpenRouterError } from "@/lib/openrouter";
import { buildMessages, isAnalysisMode } from "@/lib/prompts";

// Транскрипты длинных видео обрезаем, чтобы не упереться в лимиты модели.
const MAX_TRANSCRIPT_CHARS = 120_000;

export const runtime = "nodejs";
export const maxDuration = 60; // секунд (для Vercel)

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const { url, mode, question, lang } = (body ?? {}) as {
    url?: string;
    mode?: string;
    question?: string;
    lang?: string;
  };

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Укажите ссылку на YouTube-видео." }, { status: 400 });
  }

  if (!isAnalysisMode(mode)) {
    return NextResponse.json({ error: "Неизвестный режим разбора." }, { status: 400 });
  }

  if (mode === "qa" && (!question || !question.trim())) {
    return NextResponse.json(
      { error: "Для режима «вопрос-ответ» введите вопрос." },
      { status: 400 }
    );
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json(
      { error: "Не похоже на ссылку YouTube. Проверьте адрес видео." },
      { status: 400 }
    );
  }

  try {
    // 1. Транскрипт через Supadata
    const transcript = await fetchTranscript(videoId, lang || undefined);

    let plain = transcript.plainText;
    let timed = transcript.timedText;
    let truncated = false;
    if (plain.length > MAX_TRANSCRIPT_CHARS) {
      plain = plain.slice(0, MAX_TRANSCRIPT_CHARS);
      timed = timed.slice(0, MAX_TRANSCRIPT_CHARS);
      truncated = true;
    }

    // 2. Разбор через OpenRouter LLM
    const messages = buildMessages(mode, plain, timed, question);
    const analysis = await chatCompletion(messages);

    return NextResponse.json({
      videoId,
      mode,
      lang: transcript.lang,
      availableLangs: transcript.availableLangs,
      truncated,
      analysis,
    });
  } catch (err) {
    if (err instanceof SupadataError || err instanceof OpenRouterError) {
      const status = err.status >= 400 && err.status < 600 ? err.status : 500;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error("Неожиданная ошибка /api/analyze:", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера. Попробуйте позже." },
      { status: 500 }
    );
  }
}
