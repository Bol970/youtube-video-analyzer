"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AnalysisMode } from "@/lib/prompts";
import { renderMarkdown } from "@/lib/markdown";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuth } from "../AuthProvider";

interface AnalysisRow {
  id: string;
  video_id: string;
  mode: AnalysisMode;
  question: string | null;
  lang: string | null;
  analysis: string;
  created_at: string;
}

const PAGE_SIZE = 10;

const MODE_TITLES: Record<AnalysisMode, string> = {
  summary: "Краткое содержание",
  keypoints: "Ключевые тезисы",
  chapters: "Главы / таймкоды",
  qa: "Вопрос-ответ",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryList() {
  const { user, loading: authLoading, configured } = useAuth();
  const [rows, setRows] = useState<AnalysisRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); // 0-based
  const [from, setFrom] = useState(""); // YYYY-MM-DD
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [titles, setTitles] = useState<Record<string, string | null>>({});
  const fetchedTitles = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    setLoading(true);
    setError(null);

    let q = supabase
      .from("analyses")
      .select("id, video_id, mode, question, lang, analysis, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false });

    if (from) q = q.gte("created_at", `${from}T00:00:00.000Z`);
    if (to) q = q.lte("created_at", `${to}T23:59:59.999Z`);
    q = q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    const { data, count, error: selectError } = await q;
    if (selectError) {
      setError("Не удалось загрузить разборы.");
    } else {
      setRows((data ?? []) as AnalysisRow[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [user, page, from, to]);

  useEffect(() => {
    if (!authLoading && user) load();
    if (!authLoading && !user) setLoading(false);
  }, [authLoading, user, load]);

  // Подтягиваем названия видео (через наш /api/title), по одному на video_id.
  useEffect(() => {
    rows.forEach((row) => {
      if (fetchedTitles.current.has(row.video_id)) return;
      fetchedTitles.current.add(row.video_id);
      fetch(`/api/title?v=${row.video_id}`)
        .then((r) => r.json())
        .then((d) => setTitles((prev) => ({ ...prev, [row.video_id]: d?.title ?? null })))
        .catch(() => setTitles((prev) => ({ ...prev, [row.video_id]: null })));
    });
  }, [rows]);

  async function handleCopy(row: AnalysisRow) {
    try {
      await navigator.clipboard.writeText(row.analysis);
    } catch {
      // Фолбэк для старых браузеров / небезопасного контекста
      const ta = document.createElement("textarea");
      ta.value = row.analysis;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedId(row.id);
    setTimeout(() => setCopiedId((c) => (c === row.id ? null : c)), 2000);
  }

  function handleDownload(row: AnalysisRow) {
    const blob = new Blob([row.analysis], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `razbor-${row.video_id}-${row.mode}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(href);
  }

  function applyFilter(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    setPage(0);
  }

  if (!configured) {
    return (
      <div className="card bevel-out">
        <p className="note">ⓘ Раздел недоступен: не заданы ключи Supabase.</p>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="card bevel-out">
        <p>Загрузка…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card bevel-out">
        <p>
          Чтобы видеть свои разборы, <Link href="/login">войдите</Link> или{" "}
          <Link href="/register">зарегистрируйтесь</Link>.
        </p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilter = Boolean(from || to);

  return (
    <div className="card bevel-out">
      {/* Фильтр по дате */}
      <div className="history-filter">
        <label className="field-label" htmlFor="from">С даты</label>
        <input
          id="from"
          type="date"
          value={from}
          onChange={(e) => applyFilter(e.target.value, to)}
        />
        <label className="field-label" htmlFor="to">По дату</label>
        <input
          id="to"
          type="date"
          value={to}
          onChange={(e) => applyFilter(from, e.target.value)}
        />
        {hasFilter && (
          <button type="button" className="btn-mini" onClick={() => applyFilter("", "")}>
            Сбросить
          </button>
        )}
      </div>

      {loading ? (
        <p>Загрузка…</p>
      ) : error ? (
        <div className="error-box">⚠ {error}</div>
      ) : rows.length === 0 ? (
        <p>
          {hasFilter ? (
            "За выбранный период разборов нет."
          ) : (
            <>
              Пока пусто. <Link href="/">Разобрать первое видео →</Link>
            </>
          )}
        </p>
      ) : (
        <>
          <ul className="history-list">
            {rows.map((row) => {
              const title = titles[row.video_id];
              return (
                <li key={row.id} className="history-item bevel-in">
                  <div className="history-head">
                    <a
                      className="history-thumb"
                      href={`https://www.youtube.com/watch?v=${row.video_id}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Открыть видео на YouTube"
                    >
                      <img
                        src={`https://img.youtube.com/vi/${row.video_id}/mqdefault.jpg`}
                        alt="Превью видео"
                        loading="lazy"
                      />
                    </a>
                    <div className="history-info">
                      <b className="history-title">
                        {title === undefined ? "Загрузка названия…" : title || row.video_id}
                      </b>
                      {row.question && (
                        <span className="history-q"> — «{row.question}»</span>
                      )}
                      <div className="meta-line">
                        {MODE_TITLES[row.mode] ?? row.mode}
                        {row.lang ? ` · ${row.lang}` : ""} · {formatDate(row.created_at)}
                      </div>
                    </div>
                    <div className="toolbar">
                      <button
                        type="button"
                        className="btn-mini"
                        onClick={() => setOpenId(openId === row.id ? null : row.id)}
                      >
                        {openId === row.id ? "Свернуть" : "Открыть"}
                      </button>
                      <button
                        type="button"
                        className="btn-mini"
                        onClick={() => handleCopy(row)}
                      >
                        {copiedId === row.id ? "✓ Скопировано" : "📋 Скопировать"}
                      </button>
                      <button
                        type="button"
                        className="btn-mini"
                        onClick={() => handleDownload(row)}
                      >
                        ⬇ Скачать .txt
                      </button>
                    </div>
                  </div>
                  {openId === row.id && (
                    <div
                      className="result"
                      style={{ marginTop: 10 }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(row.analysis) }}
                    />
                  )}
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="pager">
              <button
                type="button"
                className="btn-mini"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ← Назад
              </button>
              <span className="pager-info">
                Стр. {page + 1} из {totalPages} · всего {total}
              </span>
              <button
                type="button"
                className="btn-mini"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Вперёд →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
