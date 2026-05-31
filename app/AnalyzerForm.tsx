"use client";

import { useState } from "react";
import { MODES, type AnalysisMode } from "@/lib/prompts";
import { renderMarkdown } from "@/lib/markdown";

interface AnalyzeResponse {
  videoId: string;
  mode: AnalysisMode;
  lang: string;
  truncated: boolean;
  analysis: string;
}

const MODE_TITLES: Record<AnalysisMode, string> = {
  summary: "Краткое summary",
  keypoints: "Ключевые тезисы",
  chapters: "Главы / таймкоды",
  qa: "Ответ на вопрос",
};

export default function AnalyzerForm() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<AnalysisMode>("summary");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const needsQuestion = MODES.find((m) => m.id === mode)?.needsQuestion;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!url.trim()) {
      setError("Вставьте ссылку на YouTube-видео.");
      return;
    }
    if (needsQuestion && !question.trim()) {
      setError("Введите вопрос по видео.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, mode, question }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Что-то пошло не так. Попробуйте ещё раз.");
      } else {
        setResult(data as AnalyzeResponse);
      }
    } catch {
      setError("Не удалось отправить запрос. Проверьте соединение.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ol className="steps">
        <li><b>1.</b> Вставь ссылку на видео</li>
        <li><b>2.</b> Выбери тип анализа</li>
        <li><b>3.</b> Жми «Анализировать»</li>
      </ol>

      <div className="card bevel-out">
        <span className="ribbon red">Новый анализ</span>
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
          </div>

          <div style={{ marginTop: 16 }}>
            <span className="field-label">Тип анализа</span>
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
              {loading ? "Анализирую…" : "Анализировать ▶"}
            </button>
          </div>
        </form>
      </div>

      {loading && (
        <div className="card bevel-out">
          <p className="loader">
            Достаю транскрипт через Supadata и анализирую через нейросеть
          </p>
          <p className="note">Длинное видео может обрабатываться до минуты.</p>
        </div>
      )}

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
            Язык транскрипта: {result.lang || "—"}
            {result.truncated && " · транскрипт обрезан до 120 000 символов"}
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
