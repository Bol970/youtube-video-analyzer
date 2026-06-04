"use client";

import { useState } from "react";
import Link from "next/link";
import { MODES, type AnalysisMode } from "@/lib/prompts";
import { renderMarkdown } from "@/lib/markdown";
import { useAuth } from "./AuthProvider";
import SubscriptionPlans from "./SubscriptionPlans";
import LangSelect from "./LangSelect";
import Loader from "./Loader";

interface AnalyzeResponse {
  videoId: string;
  mode: AnalysisMode;
  lang: string;
  availableLangs: string[];
  truncated: boolean;
  analysis: string;
  usage?: { used: number; limit: number; plan: string };
  requestedLang?: string; // что выбрал пользователь (добавляем на клиенте)
}

const MODE_TITLES: Record<AnalysisMode, string> = {
  summary: "Краткое содержание",
  keypoints: "Ключевые тезисы",
  chapters: "Главы / таймкоды",
  qa: "Ответ на вопрос",
};

// Языки транскрипта. Значение "" = «Авто» (первый доступный у видео).
const LANGUAGES: { code: string; name: string }[] = [
  { code: "ru", name: "Русский" },
  { code: "", name: "Авто (первый доступный)" },
  { code: "en", name: "English" },
  { code: "uk", name: "Українська" },
  { code: "de", name: "Deutsch" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "pl", name: "Polski" },
  { code: "tr", name: "Türkçe" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "zh", name: "中文" },
  { code: "ar", name: "العربية" },
  { code: "hi", name: "हिन्दी" },
];

const LANG_NAMES: Record<string, string> = Object.fromEntries(
  LANGUAGES.filter((l) => l.code).map((l) => [l.code, l.name])
);

function langLabel(code: string): string {
  return LANG_NAMES[code] || code || "—";
}

export default function AnalyzerForm() {
  const { user, session, usage, refreshUsage } = useAuth();
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<AnalysisMode>("summary");
  const [lang, setLang] = useState("ru"); // язык транскрипта, по умолчанию русский
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [copied, setCopied] = useState(false);
  // Гейты: предложить вход или показать тарифы.
  const [needAuth, setNeedAuth] = useState(false);
  const [needPlan, setNeedPlan] = useState(false);

  const needsQuestion = MODES.find((m) => m.id === mode)?.needsQuestion;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setNeedAuth(false);
    setNeedPlan(false);

    // Разбор доступен только вошедшим — иначе предлагаем войти/зарегистрироваться.
    if (!user || !session) {
      setNeedAuth(true);
      return;
    }
    if (!url.trim()) {
      setError("Вставьте ссылку на YouTube-видео.");
      return;
    }
    if (needsQuestion && !question.trim()) {
      setError("Введите вопрос по видео.");
      return;
    }
    // Лимит исчерпан — сразу показываем тарифы, не дёргая сервер.
    if (usage && usage.used >= usage.limit) {
      setNeedPlan(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ url, mode, question, lang }),
      });
      const data = await res.json();
      if (res.status === 401 || data?.code === "auth_required") {
        setNeedAuth(true);
      } else if (res.status === 402 || data?.code === "quota_exceeded") {
        await refreshUsage();
        setNeedPlan(true);
      } else if (!res.ok) {
        setError(data?.error || "Что-то пошло не так. Попробуйте ещё раз.");
      } else {
        const payload = data as AnalyzeResponse;
        setResult({ ...payload, requestedLang: lang });
        void refreshUsage(); // обновить счётчик в шапке
      }
    } catch {
      setError("Не удалось отправить запрос. Проверьте соединение.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.analysis);
    } catch {
      // Фолбэк для старых браузеров / небезопасного контекста
      const ta = document.createElement("textarea");
      ta.value = result.analysis;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!result) return;
    const blob = new Blob([result.analysis], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `analysis-${result.videoId}-${result.mode}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(href);
  }

  return (
    <>
      <ol className="steps">
        <li><b>1.</b> Вставь ссылку на видео</li>
        <li><b>2.</b> Выбери тип разбора</li>
        <li><b>3.</b> Жми «Разобрать»</li>
      </ol>

      <div className="card bevel-out">
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="grow">
              <label className="field-label" htmlFor="url">
                Ссылка на YouTube-видео
              </label>
              <input
                id="url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div style={{ flex: "0 0 200px" }}>
              <label className="field-label" htmlFor="lang">
                Язык транскрипта
              </label>
              <LangSelect id="lang" value={lang} options={LANGUAGES} onChange={setLang} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <span className="field-label">Тип разбора</span>
            <ul className="modes">
              {MODES.map((m) => (
                <li key={m.id}>
                  <label className={`mode-option ${mode === m.id ? "active" : ""}`}>
                    <input
                      type="radio"
                      name="mode"
                      value={m.id}
                      checked={mode === m.id}
                      onChange={() => setMode(m.id)}
                    />
                    {m.title}
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {needsQuestion && (
            <div style={{ marginTop: 16 }}>
              <label className="field-label" htmlFor="question">
                Ваш вопрос по видео
              </label>
              <textarea
                id="question"
                placeholder="Например: какие 3 главных совета даёт автор?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Разбираю…" : "Разобрать ▶"}
            </button>
          </div>
        </form>
      </div>

      {needAuth && (
        <div className="card bevel-out">
          <p>
            🔒 Чтобы делать разборы, нужно войти в аккаунт.
          </p>
          <div className="toolbar">
            <Link className="btn" href="/login">Войти ▶</Link>
            <Link className="btn-mini" href="/register">Регистрация</Link>
          </div>
          <p className="note" style={{ marginTop: 10 }}>
            Каждому пользователю бесплатно доступно {usage?.limit ?? 10} разборов в месяц.
          </p>
        </div>
      )}

      {needPlan && (
        <SubscriptionPlans reason="Бесплатный лимит разборов на этот месяц исчерпан. Выберите тариф, чтобы продолжить." />
      )}

      {loading && <Loader />}

      {error && !loading && <div className="error-box">⚠ {error}</div>}

      {result && !loading && (
        <div className="card bevel-out">
          <span className="ribbon blue">Результат: {MODE_TITLES[result.mode]}</span>

          <div className="video-embed">
            <iframe
              src={`https://www.youtube.com/embed/${result.videoId}`}
              title="YouTube video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className="meta-line">
            Язык транскрипта: {langLabel(result.lang)}
            {result.availableLangs?.length > 0 &&
              ` · доступны: ${result.availableLangs.join(", ")}`}
            {result.truncated && " · транскрипт обрезан до 120 000 символов"}
          </div>

          {result.requestedLang &&
            result.lang &&
            result.requestedLang !== result.lang && (
              <div className="note" style={{ marginBottom: 10 }}>
                ⓘ Транскрипта на языке «{langLabel(result.requestedLang)}» у этого
                видео нет — показан доступный («{langLabel(result.lang)}»). Разбор
                всё равно сделан на русском.
              </div>
            )}

          <div className="note" style={{ marginBottom: 10 }}>
            ✓ Сохранено в <Link href="/history">«Мои разборы»</Link>
          </div>

          <div className="toolbar">
            <button type="button" className="btn-mini" onClick={handleCopy}>
              {copied ? "✓ Скопировано" : "📋 Скопировать результат"}
            </button>
            <button type="button" className="btn-mini" onClick={handleDownload}>
              ⬇ Скачать .txt
            </button>
          </div>

          <div
            className="result"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(result.analysis) }}
          />
        </div>
      )}
    </>
  );
}
