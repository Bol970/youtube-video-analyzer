import { NextRequest, NextResponse } from "next/server";
import { extractVideoId } from "@/lib/youtube";
import { fetchTranscript, SupadataError } from "@/lib/supadata";
import { chatCompletion, OpenRouterError } from "@/lib/openrouter";
import { buildMessages, isAnalysisMode } from "@/lib/prompts";
import { getServerClientForToken } from "@/lib/supabaseServer";
import { planLimit, monthStartISO } from "@/lib/plans";

// Транскрипты длинных видео обрезаем, чтобы не упереться в лимиты модели.
const MAX_TRANSCRIPT_CHARS = 120_000;

export const runtime = "nodejs";
export const maxDuration = 60; // секунд (для Vercel)

export async function POST(req: NextRequest) {
  // 0. Аутентификация: разбор доступен только вошедшим пользователям.
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json(
      { error: "Войдите, чтобы делать разборы.", code: "auth_required" },
      { status: 401 }
    );
  }

  const supabase = getServerClientForToken(token);
  if (!supabase) {
    return NextResponse.json(
      { error: "Аутентификация не настроена на сервере." },
      { status: 500 }
    );
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) {
    return NextResponse.json(
      { error: "Сессия истекла. Войдите снова.", code: "auth_required" },
      { status: 401 }
    );
  }

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

  // 1. Проверка квоты: число разборов за текущий месяц против лимита плана.
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const plan = profile?.plan ?? "free";
  const limit = planLimit(plan);

  const { count, error: countErr } = await supabase
    .from("analyses")
    .select("id", { count: "exact", head: true })
    .gte("created_at", monthStartISO());
  const used = countErr ? 0 : count ?? 0;

  if (used >= limit) {
    return NextResponse.json(
      {
        error: "Лимит разборов на этот месяц исчерпан.",
        code: "quota_exceeded",
        plan,
        used,
        limit,
      },
      { status: 402 }
    );
  }

  try {
    // 2. Транскрипт через Supadata
    const transcript = await fetchTranscript(videoId, lang || undefined);

    let plain = transcript.plainText;
    let timed = transcript.timedText;
    let truncated = false;
    if (plain.length > MAX_TRANSCRIPT_CHARS) {
      plain = plain.slice(0, MAX_TRANSCRIPT_CHARS);
      timed = timed.slice(0, MAX_TRANSCRIPT_CHARS);
      truncated = true;
    }

    // 3. Разбор через OpenRouter LLM
    const messages = buildMessages(mode, plain, timed, question);
    const analysis = await chatCompletion(messages);

    // 4. Сохраняем разбор от имени пользователя (RLS: user_id = auth.uid()).
    //    Это же и есть единица учёта квоты.
    await supabase.from("analyses").insert({
      user_id: user.id,
      video_id: videoId,
      mode,
      question: mode === "qa" ? question : null,
      lang: transcript.lang || null,
      analysis,
    });

    return NextResponse.json({
      videoId,
      mode,
      lang: transcript.lang,
      availableLangs: transcript.availableLangs,
      truncated,
      analysis,
      usage: { used: used + 1, limit, plan },
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
